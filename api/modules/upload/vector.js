import multer from "multer";
import { access, unlink } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

import { sendMailAuto } from "#mapx/mail";
import { handleErrorText } from "#mapx/error";
import { settings } from "#root/settings";
import { toRes, randomString } from "#mapx/helpers";
import {
  removeSource,
  isLayerValid,
  tableHasValues,
  registerOrRemoveSource,
} from "#mapx/db-utils";
import {
  validateTokenHandler,
  validateRoleHandlerFor,
} from "#mapx/authentication";

/*
 * Shortcut
 */
const { emailAdmin } = settings.mail.config;

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
  convertOgrHandler,
  addSourceHandler,
];

/**
 * Convert data
 */
export async function convertOgrHandler(req, res, next) {
  const hasBody = typeof req.body === "object" && req.file;

  if (!hasBody) {
    throw Error("Empty body");
  }

  const userEmail = req.body.email;
  const { sourceSrs, title } = req.body;
  const fileName = req.file.filename;
  const isZipped =
    req.file.mimetype === "application/zip" ||
    req.file.mimetype === "application/x-zip-compressed" ||
    req.file.mimetype === "multipart/x-zip";
  const isCsv = req.file.mimeType === "text/csv" || !!fileName.match(/.csv$/);

  await fileToPostgres({
    isZipped: isZipped,
    isCsv: isCsv,
    fileName: fileName,
    sourceSrs: sourceSrs,
    onSuccess: (idSource) => {
      req.body.idSource = idSource;
      next();
    },
    onMessage: (data) => {
      if (data.msg) {
        res.write(
          toRes({
            type: data.type,
            msg: data.msg,
          })
        );
      }
    },
    onError: async (data) => {
      const subject = `MapX conversion of "${title}" failed`;
      const err = `Error during the conversion of "${title}": ${data.msg}`;

      res.write(
        toRes({
          type: "error",
          msg: err,
        })
      );

      await sendMailAuto({
        to: [userEmail, emailAdmin].join(","),
        content: data.msg,
        subject: subject,
      });

      res.status(500).end();
    },
  });
}

/**
 * Handler for adding reccord in source table
 */
async function addSourceHandler(req, res) {
  const { title, email, idSource } = req.body;
  const idProject = req.body.project;
  const idUser = req.body.idUser * 1;
  const fileToRemove = req.file.path;
  const fileName = req.file.filename;
  const msg = {};
  const isCsv = req.file.mimetype === "text/csv" || !!fileName.match(/.csv$/);
  const sourceType = isCsv ? "tabular" : "vector";
  const isVector = sourceType === "vector";
  let isValid = true;

  msg.waitValidation = `Geometry validation – This could take a while, please wait. If an error occurs, a message will be displayed `;
  msg.addedNewEntry = `Added new entry "${title}" ( ${idSource} ) in project ${idProject}.`;
  msg.invalidGeom = `Some geometries were not valid and some MapX functions will therefore not work properly. Please correct those geometries.`;
  msg.sourceNotRegistered = `The source can't be registered, check if attributes table has at least one row`;
  msg.titleMailSuccess = `MapX import success for source ${title}`;
  msg.titleMailError = `MapX import failed for source ${title}`;

  try {
    const reg = await registerOrRemoveSource(
      idSource,
      idUser,
      idProject,
      title,
      sourceType
    );

    if (!reg.registered) {
      throw Error(msg.sourceNotRegistered);
    }

    /**
     * Layer validation
     */
    if (isVector) {
      res.write(
        toRes({
          type: "message",
          msg: msg.waitValidation,
        })
      );
      const layerTest = await isLayerValid(idSource, false);
      isValid = layerTest.valid;
      if (!isValid) {
        res.write(
          toRes({
            type: "warning",
            msg: msg.invalidGeom,
          })
        );
      }
    }

    const fileRemoved = await cleanFile(fileToRemove);

    res.write(
      toRes({
        type: "message",
        msg: `Cleaned temporary files: ${fileRemoved}`,
      })
    );

    res.write(
      toRes({
        type: "end",
        msg: msg.addedNewEntry,
      })
    );

    if (email) {
      await sendMailAuto({
        to: [email],
        content: isValid
          ? msg.addedNewEntry
          : msg.addedNewEntry + "\n" + msg.invalidGeom,
        subject: msg.titleMailSuccess,
      });
    }

    res.status(200).end();
  } catch (err) {
    try {
      /**
       * In case of error, send a mail
       */
      var msgError = msg.titleMailError + ": " + err;
      res.write(
        toRes({
          type: "error",
          msg: msgError,
        })
      );
      await sendMailAuto({
        to: [email, emailAdmin].join(","),
        content: msgError,
        subject: msg.titleMailError,
      });

      await cleanAll(fileToRemove, idSource, res);
      res.status("403").end();
    } catch (err) {
      res.write(
        toRes({
          type: "error",
          msg: `Unexpected error :  ${err} `,
        })
      );

      res.status("403").end();
    }
  }
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
    console.error("cleanFile error", e);
    removed = false;
  }
  return removed;
}

/**
 * In case of faillure, clean the db : remove added entry and table
 */
async function cleanAll(fileToRemove, idSource, res) {
  const sourceRemoved = await removeSource(idSource);
  const fileRemoved = await cleanFile(fileToRemove);
  res.write(
    toRes({
      type: "message",
      msg: `Removed source : ${sourceRemoved}; Removed file : ${fileRemoved}`,
    })
  );
}

/**
 * Helper to write file in postgres
 *
 * @param {Object} config Config
 * @param {String} config.fileName Filename
 * @param {String} config.sourceSrs Original SRS
 * @param {Boolean} config.isCsv CSV mode -> type tabular
 * @param {Boolean} config.isZipped Is zipped -> type shapefile
 * @param {Function} config.onError Callback on error
 * @param {Function} config.onMessage Callback on message
 * @param {Function} config.onSuccess Callback on success
 */
export async function fileToPostgres(config) {
  config = config || {};
  const {
    fileName,
    sourceSrs,
    onMessage = function () {},
    onError = function () {},
    onSuccess = function () {},
  } = config;

  try {
    const idSource = randomString("mx_vector", 4, 5).toLowerCase();

    const isZipped = Boolean(config.isZipped);
    const isCsv = Boolean(config.isCsv);

    if (!fileName) {
      throw Error("No filename given");
    }

    let filePath = path.format({
      dir: settings.vector.path.temporary,
      base: fileName,
    });

    if (isZipped) {
      filePath = "/vsizip/" + filePath;
    }

    onMessage({
      msg: "Conversion : please wait ...",
      type: "message",
    });

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
      filePath,
      idSource,
      sourceSrs,
      isCsv ? "yes" : "no",
    ];
    const ogr = spawn("sh", args);

    ogr.stdout.on("data", (data) => {
      data = data.toString("utf8");
      let progressNums = data.split(".");
      let hasProg = false;
      let progFloat;
      for (const prog of progressNums) {
        progFloat = parseFloat(prog);
        if (!isNaN(progFloat) && isFinite(progFloat)) {
          hasProg = true;
          onMessage({
            msg: progFloat,
            type: "progress",
          });
        }
      }
      if (!hasProg) {
        onMessage({
          msg: data,
          type: "message",
        });
      }
    });

    ogr.stderr.on("data", (data) => {
      data = data.toString("utf8");
      onMessage({
        msg: handleErrorText(data),
        type: "warning",
      });
    });

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

        onMessage({
          msg: `The import was successful`,
          type: "message",
        });

        onSuccess(idSource);
      } catch (e) {
        const err = handleErrorText(e);
        const sourceRemoved = await removeSource(idSource);
        onError({
          msg: `${err}. Source removed : ${sourceRemoved}`,
        });
        return;
      }
    });
  } catch (e) {
    onError({
      msg: `An error occured in import function (${handleErrorText(e)})`,
    });
  }
}
