import archiver from "archiver";
import fs from "fs";
import getFolderSize from "get-folder-size";

/**
 * Wrapper for promisified archiver
 * @param {Object} options
 * @param {String} options.zipPath Archive path
 * @param {Array} options.folders Array of folders to add. e.g {folder:"/tmp/test",name:"myFolder"}
 * @param {Function} options.onProgress Callback for progress
 * @param {Function} options.onWarning Callback for warning
 * @return Promise
 */
export async function archiverProgress(options) {
  let size_total = 0;

  if (options.folders) {
    for (const folder of options.folders) {
      size_total += await getFolderSize.loose(folder.path);
    }
  }

  const res = await _archiver(options, size_total);

  return res;
}

function _archiver(options, size_total) {
  return new Promise((resolve, reject) => {
    try {
      options = {
        maxWarning: 10,
        ...options,
      };

      if (options.onProgress) {
        options.onProgress(0.1);
      }

      /**
       * ZIP IT
       */
      const zipFile = fs.createWriteStream(options.zipPath);

      const archive = archiver("zip", {
        zlib: { level: 9 }, // Sets the compression level.
      });

      /**
       * pipe archive data to the file
       */
      archive.pipe(zipFile);

      /**
       *  When close, resolve for all archive data to be written
       * 'close' event is fired only when a file descriptor is involved
       */
      zipFile.on("close", () => {
        resolve(true);
      });

      /**
       * In any case, at the end
       * @see: https://nodejs.org/api/stream.html#stream_event_end
       */
      zipFile.on("end", () => {
        try {
          if (options.onProgress) {
            options.onProgress(100);
          }
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });

      archive.on("progress", (prog) => {
        try {
          const percent = (prog.fs.processedBytes / size_total) * 100;
          if (options.onProgress) {
            options.onProgress(percent);
          }
        } catch (e) {
          reject(e);
        }
      });

      let archiveWarningCount = 0;
      archive.on("warning", (err) => {
        try {
          if (err.code === "ENOENT") {
            if (
              archiveWarningCount++ < options.maxWarning &&
              options.onWarning
            ) {
              options.onWarning(err);
            }
          } else {
            reject(err);
          }
        } catch (e) {
          reject(e);
        }
      });

      archive.on("error", reject);

      /**
       * Add folders
       */
      if (options.folders) {
        for (const t of options.folders) {
          /**
           * Archivers consider / as subfolder...
           */
          t.name = t.name.replace(/\//gi, "");
          archive.directory(t.path, t.name);
        }
      }

      archive.finalize();
    } catch (e) {
      reject(e);
    }
  });
}
