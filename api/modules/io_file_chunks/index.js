//import { appendFile } from "node:fs/promises";
import { mkdirSync, appendFileSync } from "node:fs";

import path from "node:path";
import os from "node:os";
import { t } from "#mapx/language";
import slugify from "slugify";

const options = {
  tmp: os.tmpdir(),
};

/**
 * Handle chunk
 * @param {Object} socket Socket io instance
 * @param {Object} chunk
 * @param {String} idRequest Id request for this chunk
 * @param {String} language Language
 * @param {ArrayBuffer} data Array of chunked data
 * @param {String} filename Original filename
 * @param {String} mimetype Original mimetype
 */
export async function chunkWriter(socket, chunk) {
  if (!chunk.canceled) {
    chunk.outDir = path.join(options.tmp, chunk.idRequest);
    chunk.filename = slugify(chunk.filename, "_");
    chunk.filepath = path.join(chunk.outDir, chunk.filename);

    // Sync operation
    // is required to keep the correct order
    // TODO: probably better to use a queing system...

    try {
      if (chunk.first) {
        mkdirSync(chunk.outDir);
      }

      appendFileSync(chunk.filepath, chunk.data);

      await socket.notifyProgress({
        idGroup: chunk.idRequest,
        idMerge: "file_upload",
        type: "progress",
        message: t("upl_file_upload_progress", chunk.language, {
          filename: chunk.filename,
        }),
        value: chunk.last ? 100 : (chunk.to / chunk.on) * 100,
      });

      if (chunk.last) {
        return {
          name: chunk.filename,
          path: chunk.filepath,
          mimetype: chunk.mimetype,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
