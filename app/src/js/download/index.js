import { el } from "./../el/src/index.js";
import { isEmpty, isJSON, isString } from "./../is_test/index.js";

/**
 * Download JSON data
 * @param {String|Object} data JSON string or stringifiable data
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadJSON(data, filename) {
  const text = isJSON(data) ? data : JSON.stringify(data, 0, 2);
  const blob = new Blob([text], { type: "application/json" });
  return downloadBlob(blob, filename);
}

/**
 * Download CSV
 * @param {String|Array} data CSV string or nested array
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadCSV(data, filename, headers) {
  const text = isString(data) ? data : await tableToCsv(data, headers);
  const blob = new Blob([text], { type: "text/csv" });
  return downloadBlob(blob, filename);
}

/**
 * Download HTML
 * @param {String} data String string or nested array
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadHTML(data, filename) {
  const blob = new Blob([data], { type: "text/html" });
  return downloadBlob(blob, filename);
}

/**
 * Download Markdown
 * @param {String} data String string or nested array
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadMarkdown(data, filename) {
  const blob = new Blob([data], { type: "text/markdown" });
  return downloadBlob(blob, filename);
}

/**
 * Download Markdown
 * @param {JSZip} zip Zip instance
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadZip(zip, filename, newTab) {
  const zipFile = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipFile, filename, newTab);
}

/**
 * Download canvas
 * @param {HTMLCanvasElement} canvas
 * @param {String} filename File name
 * @param {String} type File mimetype
 * @param {Boolean} newTab Open in new tab
 * @return {Promise<Boolean>}
 */
export async function downloadCanvas(canvas, filename, type, newTab) {
  const blob = await canvasToBlob(canvas, type || "image/png");
  return downloadBlob(blob, filename, newTab);
}

/**
 * Convert canvas to blob
 * @param {Canvas} canvas
 * @param {type} mimetype
 */
export function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return reject("canvasToBlob : empty blob");
      }
      resolve(blob);
    }, type || "image/png");
  });
}

/**
 * Initiates the download of a blob as a file or opens it in a new browser tab.
 * Returns a Promise that resolves when the blob is successfully downloaded or
 * opened in a new tab, or rejects in the event of an error or timeout.
 *
 * @param {Blob} blob - The blob to be downloaded or opened in a new tab.
 * @param {string} filename - The name to use for the downloaded file. Ignored if newTab is true.
 * @param {boolean} newTab - If true, the blob will be opened in a new tab. Otherwise, it will be downloaded.
 * @returns {Promise<boolean>} Resolves with `true` when successful, otherwise rejects with an error message.
 */
export function downloadBlob(blob, filename, newTab) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject("timeout");
    }, 10e3);
  });

  const downloadPromise = new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    if (newTab) {
      const openedWindow = window.open(url, "_blank");
      if (!openedWindow) {
        reject(
          "Failed to open the blob in a new tab. Pop-up might have been blocked.",
        );
        clean();
        return;
      }
      window.addEventListener("blur", done);
    } else {
      triggerDownload(url, filename, done);
    }

    function done() {
      resolve(true);
      clean();
    }

    function clean() {
      if (newTab) {
        window.removeEventListener("blur", done);
      } else {
        // Don't keep the url active more than n seconds
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10e3);
      }
    }
  });

  return Promise.race([downloadPromise, timeoutPromise]);
}

/**
 * Initiates the download of a resource by simulating a click on an anchor element.
 *
 * @param {string} url - The URL of the resource to download.
 * @param {string} filename - The name to use for the downloaded file.
 * @param {function} callback - The function to call once the download is triggered.
 */
function triggerDownload(url, filename, callback) {
  const elA = el("a", {
    href: url,
    download: isEmpty(filename) ? "download" : filename,
    on: [
      "click",
      callback,
      {
        once: true,
      },
    ],
  });
  elA.click();
}

async function tableToCsv(table, headers) {
  return new Promise((resolve, reject) => {
    const CSVWorker = require("./array_to_csv.mxworker.js");
    const worker = new CSVWorker();
    worker.onmessage = (e) => {
      if (isEmpty(e.data)) {
        return reject("tableToCsv : empty");
      }
      resolve(e.data);
    };
    worker.postMessage({
      table,
      headers,
    });
  });
}
