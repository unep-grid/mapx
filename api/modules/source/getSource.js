import {isArray} from '@fxi/mx_valid';
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

const isString = (a) => typeof a === 'string';

const apiPort = settings.api.port_public;
const apiHost = settings.api.host_public;

let apiHostUrl = '';
if (apiPort === 443 || apiPort === '443') {
  apiHostUrl = 'https://' + apiHost;
} else if (apiPort === 80) {
  apiHostUrl = 'http://' + apiHost;
} else {
  apiHostUrl = 'http://' + apiHost + ':' + apiPort;
}

const maxMergeMessage = 20;
const fileFormat = {
  GPKG: {
    ext: 'gpkg'
  },
  GML: {
    ext: 'gml'
  },
  KML: {
    ext: 'kml'
  },
  GPX: {
    ext: 'gpx'
  },
  GeoJSON: {
    ext: 'geojson'
  },
  'ESRI Shapefile': {
    ext: 'shp'
  },
  CSV: {
    ext: 'csv'
  },
  DXF: {
    ext: 'dxf'
  },
  SQLite: {
    ext: 'sqlite'
  }
};

const formatDefault = 'GPKG';
/**
 * Request handler / middleware
 */
export const mwGet = [validateTokenHandler, exportHandler];

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
  const id = config.layer || config.idSource;
  const {email = 'en', language, epsgCode = 4326, filename = id} = config;
  const {ext} = fileFormat[config.format];
  const layername = filename;
  let title = await getLayerTitle(id, language);
  let {format} = config;
  let {iso3codes} = config;
  let isShapefile = false;
  /**
   * OGR sql -> select and/or clipping
   */
  let sqlOGR = `SELECT * from ${id}`;

  /**
   * folder local path. eg. /shared/download/mx_dl_1234 and /shared/download/mx_dl_1234.zip
   */
  const folderName = randomString('mx_dl');
  const folderPath = settings.vector.path.download + '/' + folderName;
  const filePath = folderPath + '/' + filename + '.' + ext;
  const folderPathZip = folderPath + '.zip';
  /**
   * url lcoation. eg /download/mx_dl_1234.zip
   */
  const folderUrl = settings.vector.path.download_url;
  const folderUrlZip = folderUrl + folderName + '.zip';
  const dataUrl = apiHostUrl + folderUrlZip;

  if (!id) {
    throw Error('No id');
  }
  if (!email) {
    throw Error('No email');
  }

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

  if (!format || !fileFormat[format]) {
    await res.notifyInfoWarning('job_state', {
      message: t(language, 'get_source_format_invalid', {format, formatDefault})
    });
    format = formatDefault;
  }

  /**
   * Extract metadata ->  attached file
   */
  const metadata = await getSourceMetadata({id: id});

  await res.notifyInfoVerbose('job_state', {
    message: t(language, 'get_source_meta_extracted')
  });

  /*
   *  Get attributes
   */
  const attr = await getColumnsNames(id);

  /**
   * Set SQL for clipping
   */
  if (hasCountryClip) {
    const test = await isLayerValid(id, true, false);
    if (test.valid) {
      sqlOGR = getSqlClip(id, iso3codes, attr);
    } else {
      throw Error(
        t(language, 'get_source_invalid_geom', {
          idLayer: test.id,
          title: test.title
        })
      );
    }
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

function getSqlClip(idSource, iso3codes, attributes) {
  const attrNoGeom = attributes.filter((a) => a !== 'geom');
  const attrPg = attrToPgCol(attrNoGeom);
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
