import multer from "multer";
import { ioAddViewVt } from "#mapx/view/";
import { ioSendJobClient } from "#mapx/io";
import { access, unlink } from "fs/promises";
import { constants } from "fs";
import { spawn } from "child_process";
import { ioChunkWriter } from "#mapx/chunks";
import { sendMailAuto } from "#mapx/mail";
import { handleErrorText } from "#mapx/error";
import { settings } from "#root/settings";
import { randomString } from "#mapx/helpers";
import { t } from "#mapx/language";
const { emailAdmin } = settings.mail.config;
import {
  removeSource,
  removeView,
  isLayerValid,
  tableHasValues,
  registerOrRemoveSource,
} from "#mapx/db_utils";
import {
  validateTokenHandler,
  validateRoleHandlerFor,
} from "#mapx/authentication";

import { isEmail, isProjectId, isSourceId } from "@fxi/mx_valid";

/**
 * Set multer storage
 */
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const pathTemp = settings.vector.path.temporary;
    cb(null, pathTemp);
  },
  filename: (_, file, cb) => {
    const now = Date.now();
    const regSpaces = new RegExp(/\s+/, "g");
    const name = file.originalname.replace(regSpaces, "_");
    const filename = `${now}_${name}`;
    cb(null, filename);
  },
});

const uploadHandler = multer({ storage: storage }).single("vector");

/**
 * Upload's middleware
 */
export const mwUpload = [
  uploadHandler,
  validateTokenHandler,
  validateRoleHandlerFor("publisher"),
  saveHandler,
];

/**
 * io upload middleware
 * @param {Socket | Request} socket or request object
 * @param {Object} chunk
 * @property {string} chunk.chunk.id_request - The unique identifier for the request.
 * @property {boolean} chunk.first - A flag indicating if it's the first request.
 * @property {boolean} chunk.last - A flag indicating if it's the last request.
 * @property {number} chunk.start - The start index of the data.
 * @property {number} chunk.end chunk.- The end index of the data.
 * @property {number} chunk.on chunk.- A number representing some state.
 * @property {Array} chunk.data chunk.- An array of data.
 * @property {number} chunk.id_file - The unique identifier for the file.
 * @property {number} chunk.n_files - The total number of files.
 * @property {boolean} chunk.canceled - A flag indicating if the request was canceled.
 * @property {string} chunk.filename - The filename.
 * @property {string} chunk.mimetype - The MIME type of the file.
 * @property {string} chunk.driver - The Driver to use
 * @property {string} chunk.title - The title of the file.
 * @property {boolean} chunk.create_view - A flag indicating if a view should be created.
 * @property {boolean} chunk.enable_download - A flag indicating if download is enabled.
 * @property {boolean} chunk.enable_wms - A flag indicating if WMS is enabled.
 * @property {boolean} chunk.assign_srs - A flag indicating if the SRS should be assigned.
 * @property {number} chunk.source_srs - The source SRS identifier.
 */
export async function ioUploadSource(socket, chunk, callback) {
  try {
    /*
     * Test for role
     */
    const session = socket.session;
    if (!session.user_roles.publisher) {
      return;
    }
    // Handle chunked data
    const config = await ioChunkWriter(socket, chunk);

    callback({ status: "uploaded" });

    if (config) {
      await save(socket, config);
    }
    //callback({ status: "ok" });
  } catch (e) {
    callback({ status: "error", message: e?.message || e });
  }
}

/**
 * Convert handler
 */
async function saveHandler(req, res, next) {
  try {
    const config = req.body;
    config.file = req.file; // multer;
    await save(res, config);
    res.status(200).end();
  } catch (e) {
    res.status(403).end();
  } finally {
    next();
  }
}

/**
 * Complete save process
 */
async function save(socket, config) {
  config.idSource = newIdSource();
  config.idView = newIdView();
  try {
    await ioConvertOgr(socket, config);
    await ioAddSource(socket, config);
    await ioAddViewVt(socket, config);
    await handleSuccess(socket, config);
  } catch (e) {
    await handleFailure(socket, config, e);

    throw new Error(e);
  } finally {
    await cleanFile(config?.file?.path);
  }
}

async function handleSuccess(socket, config) {
  try {
    const userEmail = config?.email || socket?.session?.user_email;
    const filename = config?.file?.name || config?.file?.filename;
    const idSource = config?.idSource;

    const msg = t("upl_api_save_success", config.language, {
      filename,
      idSource,
      title: config.title,
    });

    const msgSubject = t("upl_api_save_success_title", config.language, {
      filename,
    });

    socket.notifyInfoSuccess({
      idGroup: config.id_request,
      message: msg,
    });

    if (isEmail(userEmail)) {
      sendMailAuto({
        to: userEmail,
        subject: msgSubject,
        content: msg,
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleFailure(socket, config, e) {
  try {
    const userEmail = config?.email || socket?.session?.user_email;
    const filename = config?.file?.name || config?.file?.filename;
    const idSource = config?.idSource;
    const idView = config?.idView;
    const sourceRemoved = await removeSource(idSource);
    const viewRemoved = await removeView(idView);

    const msg = t("upl_api_save_failed", config.language, {
      title: config.title,
      sourceRemoved,
      viewRemoved,
      filename,
      error: e.message || e,
    });

    const msgSubject = t("upl_api_save_failed_title", config.language, {
      filename,
    });

    socket.notifyInfoError({
      idGroup: config.id_request,
      message: msg,
    });

    await sendMailAuto({
      to: [userEmail, emailAdmin],
      subject: msgSubject,
      content: msg,
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * Convert data
 */
export async function ioConvertOgr(res, config) {
  const { assign_srs, source_srs, file, id_request, idSource } = config;

  // handle both multer file // chunk writer file
  const filename = file?.name || file?.originalname;
  const mimetype = file?.type || file?.mimetype;
  const filepath = file?.path;

  // throw an error if not accessible
  await access(filepath, constants.R_OK);

  const isZipped =
    mimetype === "application/zip" ||
    mimetype === "application/x-zip-compressed" ||
    mimetype === "multipart/x-zip";
  const isCsv = mimetype === "text/csv" || !!filename.match(/.csv$/);

  return fileToPostgres({
    isZipped: isZipped,
    isCsv: isCsv,
    idSource: idSource,
    filename: filename,
    filepath: filepath,
    sourceSrs: assign_srs ? source_srs : "",
    onMessage: async (message) => {
      await res.notifyInfoMessage({
        idGroup: id_request,
        message: message,
      });
    },
    onVerbose: async (message) => {
      await res.notifyInfoVerbose({
        idGroup: id_request,
        idMerge: "verbose_message",
        message: message,
      });
    },
    onProgress: async (value) => {
      await res.notifyProgress({
        idMerge: "postgres_write",
        idGroup: id_request,
        message: t("upl_import_db"),
        value: value,
      });
    },
    onWarning: async (message) => {
      await res.notifyInfoWarning({
        idGroup: id_request,
        message: message,
      });
    },
  });
}

/**
 * Handler for adding reccord in source table
 */
async function ioAddSource(socket, config) {
  const { title, idSource, id_request, enable_wms, enable_download } = config;
  const idProject = socket?.session?.project_id || config.idProject;
  const idUser = (socket?.session?.user_id || config.idUser) * 1;

  if (!isProjectId(idProject)) {
    throw Error("Not a valid project id");
  }

  const file = config.file;
  const fileName = file.name || file.originalname;
  const mimetype = file.type || file.mimetype;
  const isCsv = mimetype === "text/csv" || !!fileName.match(/.csv$/);
  const sourceType = isCsv ? "tabular" : "vector";
  const isVector = sourceType === "vector";

  const reg = await registerOrRemoveSource(
    idSource,
    idUser,
    idProject,
    title,
    sourceType,
    enable_download,
    enable_wms
  );

  if (!reg.registered) {
    throw Error(
      "The can't be registered, check if table has at least one row with valid values"
    );
  }

  if (!isVector) {
    return true;
  }

  /**
   * Layer validation
   */
  const validationResult = await isLayerValid({
    idLayer: idSource,
    useCache: false,
    autoCorrect: false,
    analyze: true,
    validate: true,
    onProgress: async (data) => {
      await socket.notifyProgress({
        idGroup: id_request,
        idMerge: "geom_validation",
        message: t("upl_api_save_validation"),
        value: data.percent * 100,
      });
    },
  });

  await socket.notifyProgress({
    idGroup: id_request,
    idMerge: "geom_validation",
    message: t("upl_api_save_validation"),
    value: 100,
  });

  const isValid = validationResult.valid;

  await socket.notifyInfo({
    type: isValid ? "info" : "warning",
    idGroup: id_request,
    message: t("upl_api_save_validation_geom_count", config.language, {
      count: validationResult.stat.invalid,
    }),
  });

  /**
   * Trigger source_added
   * TODO: this will be removed after shiny transition over
   * e.g. : trigger update source list in shiny app
   *        ws -> handler -> shiny -> update view list
   */
  await ioSendJobClient(socket, "source_added", {
    idSource,
  });

  return true;
}

/**
 * If imported file exists, remove it
 */
async function cleanFile(fileToRemove) {
  let removed = true;
  try {
    await access(fileToRemove);
    await unlink(fileToRemove);
  } catch (e) {
    removed = false;
  }
  return removed;
}

/**
 * Helper to write file in postgres
 *
 * @param {Object} config Config
 * @param {String} config.filepath Filepath
 * @param {String} config.idSource Source/Layer id
 * @param {String} config.sourceSrs Original SRS
 * @param {Boolean} config.isCsv CSV mode -> type tabular
 * @param {Boolean} config.isZipped Is zipped -> type shapefile
 * @param {Function} config.onMessage Callback on message
 * @param {Function} config.onVerbose Callback on verbose message
 * @param {Function} config.onProgress Callback on progress
 * @param {Function} config.onWarning Callback on warning
 */
export async function fileToPostgres(config) {
  return new Promise((resolve, reject) => {
    config = config || {};
    const {
      idSource,
      filepath,
      sourceSrs,
      onMessage = function () {},
      onVerbose = function () {},
      onProgress = function () {},
      onWarning = function () {},
    } = config;

    const isZipped = Boolean(config.isZipped);
    const isCsv = Boolean(config.isCsv);

    if (!isSourceId(idSource)) {
      reject("Not a valid source id");
      return false;
    }

    const filepathfull = isZipped ? "/vsizip/" + filepath : filepath;

    onMessage("Conversion : please wait ...");

    /**
     * NOTE: PGDump OGR driver was needed because OGR PG was not compatible with
     * PG_POOL : connection were never closed.
     *
     * pg-copy-stream
     * --------------
     * pg-copy-stream needed a stream from a file containing a simple table.
     * Streaming from a spawn stdout did not work. OGR make a dump and not
     * only a table : which means a lot of command to prepare the copy query.
     * Streaming through node-pg-copy-stream is _maybe_ not even possible
     * because of this. *Streaming directly to og using node-pg seems to
     * be the cleanest way of doing this*
     *
     * ogr and psql as spawn
     * ---------------------
     * Piping a ogr2ogr spawn to a spawn of psql did not work
     *
     * ogr and psal as script
     * ----------------------
     * Given the limited time to work on this, a warkaround has been found,
     * using a script. This should be a temporary fix.
     */
    const args = [
      new URL("./sh/import_vector.sh", import.meta.url).pathname,
      filepathfull,
      idSource,
      sourceSrs || "",
      isCsv ? "yes" : "no",
    ];

    const ogr = spawn("sh", args);

    /**
     * Handle stdout
     */
    ogr.stdout.on("data", (data) => {
      data = data.toString("utf8");
      const progressNums = data.split(".");
      let hasProg = false;
      for (const prog of progressNums) {
        const progFloat = parseFloat(prog);
        hasProg = !isNaN(progFloat) && isFinite(progFloat);
        if (hasProg) {
          onProgress(progFloat);
        }
      }

      if (!hasProg) {
        onVerbose(data);
      }
    });

    /**
     * Handle "error".. -> seems to be just warnings.
     */
    ogr.stderr.on("data", (data) => {
      data = data.toString("utf8");
      onWarning(handleErrorText(data));
    });

    /*
     * Handle exit
     */
    ogr.on("exit", async (code, signal) => {
      try {
        if (code !== 0) {
          throw Error(
            `The import function exited with code ${code} ( ${signal} )`
          );
        }
        const hasValues = await tableHasValues(idSource);

        if (!hasValues) {
          throw Error(
            `The table ${idSource} is not valid. At least one attribute with value is required.`
          );
        }

        /**
         * Here is the resolve
         */
        resolve(idSource);
      } catch (e) {
        const err = handleErrorText(e);
        reject(err);
        return false;
      }
    });
  });
}

function newIdSource() {
  return randomString("mx_vector", 4, 5, true, false);
}
function newIdView() {
  return randomString("MX", 3, 5, false, true, "-");
}
