//import { appendFile } from "node:fs/promises";
import { mkdirSync, appendFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { getFormatInfo } from "#mapx/file_formats";
import path from "node:path";
import os from "node:os";
import { t } from "#mapx/language";
import slugify from "slugify";

const options = {
  tmp: os.tmpdir(),
};

// Client id (makeId): used as a directory name, must not escape options.tmp
const regRequestId = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Handle chunk
 * @param {Object} socket Socket io instance
 * @param {Object} chunk
 * @param {String} id_request Id request for this chunk
 * @param {String} language Language
 * @param {ArrayBuffer} data Array of chunked data
 * @param {String} filename Original filename
 * @param {String} mimetype Original mimetype
 * @return {Object} config
 */
export async function ioChunkWriter(socket, chunk) {
  const idRequest = chunk?.id_request;
  if (typeof idRequest !== "string" || !regRequestId.test(idRequest)) {
    throw new Error("Invalid upload request");
  }
  const outDir = path.join(options.tmp, idRequest);

  if (chunk.canceled) {
    await rm(outDir, { recursive: true, force: true });
    return;
  }

  chunk.outDir = outDir;
  chunk.filename = slugify(chunk.filename, "_");
  chunk.filepath = path.join(outDir, chunk.filename);
  if (path.dirname(chunk.filepath) !== outDir) {
    throw new Error("Invalid upload request");
  }

  // Sync operation
  // is required to keep the correct order
  // TODO: probably better to use a queing system...

  try {
    if (chunk.first) {
      mkdirSync(chunk.outDir);
    }

    appendFileSync(chunk.filepath, chunk.data);

    await socket.notifyProgress({
      idGroup: chunk.id_request,
      idMerge: "file_upload",
      type: "progress",
      message: t("upl_file_upload_progress", chunk.language, {
        filename: chunk.filename,
      }),
      value: chunk.last ? 100 : (chunk.to / chunk.on) * 100,
    });

    if (chunk.last) {
      delete chunk.data;
      const config = chunk;
      const fi = getFormatInfo(chunk.driver);

      if (fi.multiple) {
        const ext = fi.fileExt[0];
        const name = path.parse(chunk.filename).name;
        config.filename = `${name}${ext}`;
        config.filepath = path.join(config.outDir, config.filename);
      }

      config.file = {
        name: chunk.filename,
        path: chunk.filepath,
      };

      return config;
    }
  } catch (e) {
    console.error(e);
    // a missing chunk corrupts the file: drop the partial upload
    await rm(outDir, { recursive: true, force: true });
  }
  return false;
}
