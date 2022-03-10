import {isArray, isString} from '@fxi/mx_valid';
import {join} from 'path';
import {mkdir, writeFile, access} from 'fs/promises';
import {randomString, parseTemplate, attrToPgCol} from '#mapx/helpers';
import {settings} from '#root/settings';
import {archiverProgress} from '#mapx/archiver_progress';
import {validateTokenHandler} from '#mapx/authentication';
import {asyncSpawn} from '#mapx/async_spawn';
import {getColumnsNames, isLayerValid, getLayerTitle} from '#mapx/db-utils';
import {sendMailAuto} from '#mapx/mail';
import {templates} from '#mapx/template';
import {t} from '#mapx/language';
import {getSourceMetadata} from './getSourceMetadata.js';
import {getParamsValidator} from '#mapx/route_validation';
import {getFormatExt} from '#mapx/file_formats';

const validateParamsHandlerText = getParamsValidator({
  required: ['email', 'idSource', 'idUser', 'idProject', 'token', 'idSocket'],
  expected: ['filename', 'iso3codes', 'epsgCode', 'srid', 'language', 'format']
});

const maxMergeMessage = 20;

/**
 * Set port / url
 */
const apiHost = settings.api.host_public;
const apiPort = settings.api.port_public * 1;

let apiHostUrl = '';
if (apiPort === 443) {
  apiHostUrl = 'https://' + apiHost;
} else if (apiPort === 80) {
  apiHostUrl = 'http://' + apiHost;
} else {
  apiHostUrl = 'http://' + apiHost + ':' + apiPort;
}

/**
 * Request handler / middleware
 */
export const mwGet = [
  validateParamsHandlerText,
  validateTokenHandler,
  exportHandler
];

async function exportHandler(req, res, next) {
  try {
    await extractFromPostgres(req.query, res);
    next();
  } catch (e) {
    await res.notifyInfoError('job_state', {
      message: e.message
    });
    next(e);
  }
}

/**
 * Exportation script
 */
async function extractFromPostgres(config, res) {
  let isShapefile = false;
  let {
    email,
    idSource,
    filename,
    language = 'en',
    epsgCode = 4326,
    iso3codes = [],
    format = 'GPKG'
  } = config;

  /*
   * Extra validation :
   * should be already handled in route validation
   */
  if (!idSource) {
    throw Error('No source id');
  }
  if (!email) {
    throw Error('No email');
  }
  const layername = filename ? filename : idSource;
  const ext = getFormatExt(config.format);
  const title = await getLayerTitle(idSource, language);

  /**
   * folder local path. eg. /shared/download/mx_dl_1234 and /shared/download/mx_dl_1234.zip
   */
  const folderName = randomString('mx_dl');
  const folderPath = join(settings.vector.path.download, folderName);
  const filePath = join(folderPath, layername + ext[0]);
  const folderPathZip = folderPath + '.zip';
  /**
   * url lcoation. eg /download/mx_dl_1234.zip
   */
  const folderPathPublic = settings.vector.path.download_url;
  const folderPathPublicZip = join(folderPathPublic, folderName + '.zip');
  const dataUrl = new URL(apiHostUrl); // don't mutate original URL
  dataUrl.pathname = folderPathPublicZip;

  if (isString(iso3codes)) {
    iso3codes = iso3codes.split(',');
  }

  if (iso3codes && isArray(iso3codes)) {
    iso3codes = iso3codes.filter((i) => {
      return i && i.length === 3;
    });
  }
  const hasCountryClip = isArray(iso3codes) && iso3codes.length > 0;

  if (ext === 'shp') {
    isShapefile = true;
  }

  await res.notifyInfoMessage('job_state', {
    message: t(language, 'get_source_email_dl_link', {
      email: email,
      url: dataUrl,
      title: title
    })
  });

  /**
   * Extract metadata ->  attached file
   */
  const metadata = await getSourceMetadata({id: idSource});

  await res.notifyInfoVerbose('job_state', {
    message: t(language, 'get_source_meta_extracted')
  });

  /**
   * Set SQL
   */
  let sqlOGR;
  const attributes = await getColumnsNames(idSource);
  const attributesExclude = ['_mx_valid', 'gid'];

  for (const a of attributesExclude) {
    const pos = attributes.indexOf(a);
    if (pos > -1) {
      attributes.splice(pos, 1);
    }
  }

  const attrPg = attrToPgCol(attributes);

  if (!hasCountryClip) {
    sqlOGR = `SELECT ${attrPg} from ${idSource}`;
  } else {
    sqlOGR = await getSqlClip(idSource, iso3codes, attrPg);
  }

  /**
   * Create folder
   */
  try {
    await access(folderPath);
  } catch {
    await mkdir(folderPath);
  }

  await res.notifyInfoMessage('job_state', {
    message: t(language, 'get_source_extraction_wait', {
      format: format
    })
  });

  /**
   *
   * Launch ogr spawn
   *
   */
  const args = [
    '-f',
    format,
    '-nln',
    layername,
    '-sql',
    sqlOGR,
    '-skipfailures',
    '-s_srs',
    'EPSG:4326',
    '-t_srs',
    'EPSG:' + epsgCode,
    '-progress',
    '-overwrite',
    filePath,
    settings.db.stringRead
  ];

  if (isShapefile) {
    args.push(...['-lco', 'ENCODING=UTF-8']);
  }
  /**
   * Convert using system ogr2ogr
   * @NOTE : a the time of writting, more predictible than dedicated package.
   */
  try {
    await asyncSpawn(['ogr2ogr', args], {
      onStdout: ogrStdout,
      onStderr: ogrStderr,
      maxError: maxMergeMessage
    });
  } catch (e) {
    const msg = t(language, 'get_source_conversion_error', {
      error: e
    });
    throw Error(msg);
  }

  /**
   * Add files
   */
  const txtTimeStamp = t(language, 'get_source_file_timestamp', {
    date: String(Date())
  });
  await writeFile(`${folderPath}/info.txt`, txtTimeStamp);
  await writeFile(
    `${folderPath}/metadata.json`,
    JSON.stringify(metadata, 0, 2)
  );

  /**
   * Archive data
   */
  try {
    await archiverProgress({
      zipPath: folderPathZip,
      folders: [
        {
          path: folderPath,
          name: title
        }
      ],
      onProgress: (percent) => {
        res.notifyProgress('job_state', {
          idMerge: 'get_source_zip_progress',
          type: 'progress',
          message: t(language, 'get_source_zip_progress'),
          value: percent
        });
      },
      onWarning: (err) => {
        res.notifyInfoWarning('job_state', {
          message: t(language, 'get_source_zip_warning', {
            err: err
          })
        });
      }
    });
  } catch (e) {
    const err = t(language, 'get_source_zip_error', {
      err: e
    });
    throw Error(err);
  }

  /**
   * Send messages
   */
  await res.notifyProgress('job_state', {
    idMerge: 'get_source_zip_progress',
    message: t(language, 'get_source_zip_progress'),
    value: 100
  });

  await res.notifyInfoSuccess('job_state', {
    message: t(language, 'get_source_conversion_done_link', {
      url: dataUrl,
      format: format,
      title: title
    }),
    data: {
      url: dataUrl,
      format: format,
      title: title
    }
  });

  await res.notifyBrowser('job_state', {
    title: t(language, 'get_source_conversion_done_browser_title'),
    message: t(language, 'get_source_conversion_done_browser', {
      title: title
    })
  });

  if (email) {
    sendMailAuto({
      to: email,
      subject: 'Export success',
      content: t(language, 'get_source_conversion_done_email', {
        url: dataUrl,
        title: title
      })
    });
  }

  /**
   * End
   */
  res.end();

  /**
   * Helpers
   */

  /**
   * Handle ogr stdout
   */
  let fakeProg = 0;
  function ogrStdout(data) {
    let isProg = false;
    let text = data.toString('utf8');
    let useFakeProg = text.indexOf('Progress turned off') > -1;

    if (useFakeProg) {
      res.notifyProgress('job_state', {
        idMerge: 'get_source_conversion_progress',
        message: t(language, 'get_source_conversion_progress'),
        value: fakeProg++
      });
    } else {
      /* handling infamous 10..20..30 progress */
      const progs = stringToProgress(text);
      isProg = progs.length > 0;
      for (let i = 0, iL = progs.length; i < iL; i++) {
        res.notifyProgress('job_state', {
          idMerge: 'get_source_conversion_progress',
          message: t(language, 'get_source_conversion_progress'),
          value: progs[i]
        });
      }
    }

    if (!isProg && text.length > 5) {
      res.notifyInfoVerbose('job_state', {
        message: t(language, 'get_source_conversion_stdout', {
          stdout: text
        })
      });
    }
  }
  /**
   * Handle ogr stderr (ogr warnings)
   */
  function ogrStderr(data) {
    res.notifyInfoWarning('job_state', {
      idMerge: 'get_source_conversion_stderr',
      message: t(language, 'get_source_conversion_stderr', {
        stderr: data.toString('utf8')
      })
    });
  }
}

async function getSqlClip(idSource, iso3codes, attrPg) {
  /* Clip requires valid geom */
  const test = await isLayerValid(idSource, true, false);
  if (!test.valid) {
    throw new Error(
      t(language, 'get_source_invalid_geom', {
        idLayer: test.id,
        title: test.title
      })
    );
  }

  const iso3string = `'${iso3codes.join(`','`)}'`;

  const sql = parseTemplate(templates.getIntersectionCountry, {
    idLayer: idSource,
    attributes: attrPg,
    idLayerCountry: 'mx_countries',
    idIso3: iso3string
  });

  return sql;
}

function stringToProgress(str) {
  const progressNums = str.split('.');
  return progressNums.reduce((a, p) => {
    p = parseFloat(p);
    if (!isNaN(p) && isFinite(p)) {
      a.push(p);
    }
    return a;
  }, []);
}
