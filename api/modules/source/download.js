import { isArray, isEmail, isSourceId, isString } from "@fxi/mx_valid";
import { join } from "path";
import { mkdir, writeFile, access } from "fs/promises";
import { randomString, parseTemplate, attrToPgCol } from "#mapx/helpers";
import { settings } from "#root/settings";
import { archiverProgress } from "#mapx/archiver_progress";
import { validateTokenHandler } from "#mapx/authentication";
import { asyncSpawn } from "#mapx/async_spawn";
import { getColumnsNames, isLayerValid, getLayerTitle } from "#mapx/db-utils";
import { sendMailAuto } from "#mapx/mail";
import { templates } from "#mapx/template";
import { t } from "#mapx/language";
import { getSourceMetadata } from "./getSourceMetadata.js";
import { getParamsValidator } from "#mapx/route_validation";
import { getFormatExt } from "#mapx/file_formats";
import slugify from "slugify";

const validateParamsHandlerText = getParamsValidator({
  required: ["email", "idSource", "idUser", "idProject", "token", "idSocket"],
  expected: ["filename", "iso3codes", "epsgCode", "language", "format"],
});

const maxMergeMessage = 20;

/**
 * Set port / url
 */
const apiHost = settings.api.host_public;
const apiPort = settings.api.port_public * 1;

let apiHostUrl = "";
if (apiPort === 443) {
  apiHostUrl = "https://" + apiHost;
} else if (apiPort === 80) {
  apiHostUrl = "http://" + apiHost;
} else {
  apiHostUrl = "http://" + apiHost + ":" + apiPort;
}

/**
 * Request handler / middleware
 */
export const mwDownloadSource = [
  validateParamsHandlerText,
  validateTokenHandler,
  exportHandler,
];

async function exportHandler(req, res, next) {
  try {
    await extractFromPostgres(res, req.query);
    res.end();
  } catch (e) {
    await res.notifyInfoError({
      message: e.message,
    });
    next(e);
  }
}

export async function ioDownloadSource(socket, options) {
  try {
    await extractFromPostgres(socket, options);
  } catch (e) {
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

/**
 * Exportation script
 */
async function extractFromPostgres(res, config) {
  const idGroup = randomString("download_source");
  const idProgressConversion = randomString("progress");
  const idProgressCompression = randomString("progress");

  let isShapefile = false;
  let {
    email,
    idSource,
    filename,
    language = "en",
    epsgCode = 4326,
    iso3codes = [],
    format = "GPKG",
  } = config;

  /*
   * Extra validation :
   * should be already handled in route validation
   */
  if (!isSourceId(idSource)) {
    throw Error("No source id");
  }
  if (!isEmail(email)) {
    throw Error("No email");
  }
  const layername = filename ? slugify(filename, "_") : idSource;
  const ext = getFormatExt(config.format);
  const title = await getLayerTitle(idSource, language);

  /**
   * folder local path. eg. /shared/download/mx_dl_1234 and /shared/download/mx_dl_1234.zip
   */
  const folderName = randomString("mx_dl");
  const folderPath = join(settings.vector.path.download, folderName);
  const filePath = join(folderPath, layername + ext[0]);
  const folderPathZip = folderPath + ".zip";
  /**
   * url lcoation. eg /download/mx_dl_1234.zip
   */
  const folderPathPublic = settings.vector.path.download_url;
  const folderPathPublicZip = join(folderPathPublic, folderName + ".zip");
  const dataUrl = new URL(apiHostUrl); // don't mutate original URL
  dataUrl.pathname = folderPathPublicZip;

  if (isString(iso3codes)) {
    iso3codes = iso3codes.split(",");
  }

  if (iso3codes && isArray(iso3codes)) {
    iso3codes = iso3codes.filter((i) => {
      return i && i.length === 3;
    });
  }
  const hasCountryClip = isArray(iso3codes) && iso3codes.length > 0;

  if (ext === "shp") {
    isShapefile = true;
  }

  await res.notifyInfoMessage({
    idGroup: idGroup,
    message: t("get_source_email_dl_link", language, {
      email: email,
      url: dataUrl,
      title: title,
    }),
  });

  /**
   * Extract metadata ->  attached file
   */
  const metadata = await getSourceMetadata({ id: idSource });

  await res.notifyInfoVerbose({
    idGroup: idGroup,
    message: t("get_source_meta_extracted", language),
  });

  /**
   * Set SQL
   */
  let sqlOGR;
  const attributes = await getColumnsNames(idSource);
  const attributesExclude = ["_mx_valid", "gid"];

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
    sqlOGR = await getSqlClip(idSource, iso3codes, attrPg, language);
  }

  /**
   * Create folder
   */
  try {
    await access(folderPath);
  } catch {
    await mkdir(folderPath);
  }

  await res.notifyInfoMessage({
    idGroup: idGroup,
    message: t("get_source_extraction_wait", language, {
      format: format,
    }),
  });

  /**
   *
   * Launch ogr spawn
   *
   */
  const args = [
    "-f",
    format,
    "-nln",
    layername,
    "-sql",
    sqlOGR,
    "-skipfailures",
    "-s_srs",
    "EPSG:4326",
    "-t_srs",
    "EPSG:" + epsgCode,
    "-progress",
    "-overwrite",
    filePath,
    settings.db.stringRead,
  ];

  if (isShapefile) {
    args.push(...["-lco", "ENCODING=UTF-8"]);
  }
  /**
   * Convert using system ogr2ogr
   * @NOTE : a the time of writting, more predictible than dedicated package.
   */
  try {
    await asyncSpawn(["ogr2ogr", args], {
      onStdout: ogrStdout,
      onStderr: ogrStderr,
      maxError: maxMergeMessage,
    });
  } catch (e) {
    const msg = t("get_source_conversion_error", language, {
      error: e,
    });
    throw Error(msg);
  }

  /**
   * Add files
   */
  const txtTimeStamp = t("get_source_file_timestamp", language, {
    date: String(Date()),
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
          name: layername,
        },
      ],
      onProgress: (percent) => {
        res.notifyProgress({
          idGroup: idGroup,
          idMerge: idProgressCompression,
          type: "progress",
          message: t("get_source_zip_progress", language),
          value: percent,
        });
      },
      onWarning: (err) => {
        res.notifyInfoWarning({
          idGroup: idGroup,
          message: t("get_source_zip_warning", language, {
            err: err,
          }),
        });
      },
    });
  } catch (e) {
    const err = t("get_source_zip_error", language, {
      err: e,
    });
    throw Error(err);
  }

  /**
   * Send success messages
   */
  await res.notifyInfoSuccess({
    idGroup: idGroup,
    message: t("get_source_conversion_done_link", language, {
      url: dataUrl,
      format: format,
      title: title,
    }),
    data: {
      url: dataUrl,
      format: format,
      title: title,
    },
  });

  if (email) {
    await sendMailAuto({
      to: email,
      subject: "Export success",
      content: t("get_source_conversion_done_email", language, {
        url: dataUrl,
        title: title,
      }),
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
    let text = data.toString("utf8");
    let useFakeProg = text.indexOf("Progress turned off") > -1;

    if (useFakeProg) {
      res.notifyProgress({
        idGroup: idGroup,
        idMerge: idProgressConversion,
        message: t("get_source_conversion_progress", language),
        value: fakeProg++,
      });
    } else {
      /* handling infamous 10..20..30 progress */
      const progs = stringToProgress(text);
      isProg = progs.length > 0;
      for (let i = 0, iL = progs.length; i < iL; i++) {
        res.notifyProgress({
          idGroup: idGroup,
          idMerge: idProgressConversion,
          message: t("get_source_conversion_progress", language),
          value: progs[i],
        });
      }
    }

    if (!isProg && text.length > 5) {
      res.notifyInfoVerbose({
        idGroup: idGroup,
        message: t("get_source_conversion_stdout", language, {
          stdout: text,
        }),
      });
    }
  }
  /**
   * Handle ogr stderr (ogr warnings)
   */
  function ogrStderr(data) {
    res.notifyInfoWarning({
      idGroup: idGroup,
      message: t("get_source_conversion_stderr", language, {
        stderr: data.toString("utf8"),
      }),
    });
  }
}

async function getSqlClip(idSource, iso3codes, attrPg, language) {
  /* Clip requires valid geom */
  const test = await isLayerValid(idSource, true, false);

  if (!test.valid) {
    throw new Error(
      t("get_source_invalid_geom", language, {
        idLayer: test.id,
        title: test.title,
      })
    );
  }

  const iso3string = `'${iso3codes.join(`','`)}'`;

  const sql = parseTemplate(templates.getIntersectionCountry, {
    idLayer: idSource,
    attributes: attrPg,
    idLayerCountry: "mx_countries",
    idIso3: iso3string,
  });

  return sql;
}

function stringToProgress(str) {
  const progressNums = str.split(".");
  return progressNums.reduce((a, p) => {
    p = parseFloat(p);
    if (!isNaN(p) && isFinite(p)) {
      a.push(p);
    }
    return a;
  }, []);
}
