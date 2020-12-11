const archiver = require('archiver');
const fs = require('fs');

module.exports = archiverProgress;

/**
 * Wrapper for promisified archiver
 * @param {Object} options
 * @param {String} options.zipPath Archive path
 * @param {Array} options.textFiles Array of text file to add e.g {text:"hello",name:"test.txt"}
 * @param {Array} options.folders Array of folders to add. e.g {folder:"/tmp/test",name:"myFolder"}
 * @param {Function} options.onProgress Callback for progress
 * @param {Function} options.onWarning Callback for warning
 * @return Promise
 */
function archiverProgress(options) {
  return new Promise((resolve, reject) => {
    try {
      options = Object.assign({}, {maxWarning: 10}, options);

      /**
       * ZIP IT
       */
      const zipFile = fs.createWriteStream(options.zipPath);

      const archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
      });

      /**
       *  When close, resolve for all archive data to be written
       * 'close' event is fired only when a file descriptor is involved
       */
      zipFile.on('close', () => {
        resolve(true);
      });

      /**
       * In any case, at the end
       * @see: https://nodejs.org/api/stream.html#stream_event_end
       */
      zipFile.on('end', () => {
        try {
          if (options.onProgress) {
            options.onProgress(100);
          }
        } catch (e) {
          reject(e);
        }
      });

      archive.on('progress', (prog) => {
        try {
          const percent = (prog.fs.processedBytes / prog.fs.totalBytes) * 100;
          if (options.onProgress) {
            options.onProgress(percent);
          }
        } catch (e) {
          reject(e);
        }
      });

      let archiveWarningCount = 0;
      archive.on('warning', (err) => {
        try {
          if (err.code === 'ENOENT') {
            if (archiveWarningCount++ < options.maxWarning) {
              if (options.onWarning) {
                options.onWarning(err);
              }
            }
          } else {
            reject(err);
          }
        } catch (e) {
          reject(e);
        }
      });

      archive.on('error', reject);

      /**
       * pipe archive data to the file
       */
      archive.pipe(zipFile);

      /**
       * Add text files
       */
      if (options.textFiles) {
        options.textFiles.forEach((t) => {
          archive.append(t.text, {name: t.name});
        });
      }

      /**
       * Add folders
       */
      if (options.folders) {
        options.folders.forEach((t) => {
          /**
          * Archivers consider / as subfolder... 
          */
          t.name = t.name.replace(/\//gi,"");
          archive.directory(t.path, t.name);
        });
      }

      /**
       * We're done, let's go
       */
      archive.finalize();
    } catch (e) {
      reject(e);
    }
  });
}
