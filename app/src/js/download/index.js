import { el } from "./../el/src/index.js";
import { isEmpty, isJSON, isString } from "./../is_test/index.js";

/**
 * Download JSON data
 * @param {String|Object} data JSON string or stringifiable data
 * @param {String} filename File name
 * @return {Promise<Boolean>}
 */
export async function downloadJSON(data, filename) {
  const text = isJSON(data) ? data : JSON.stringify(data);
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
 * Download canvas
 * @param {HTMLCanvasElement} canvas
 * @param {String} filename File name
 * @param {String} type File mimetype
 * @return {Promise<Boolean>}
 */
export async function downloadCanvas(canvas, filename, type) {
  const blob = await canvasToBlob(canvas, type || "image/png");
  return downloadBlob(blob, filename);
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return reject("canvasToBlob : empty blob");
      }
      resolve(blob);
    }, type || "image/png");
  });
}

export function downloadBlob(blob, filename) {
  const state = {
    done: true,
  };
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);

    setTimeout(() => {
      if (!state.done) {
        cancel("timeout");
      }
    }, 10e3);

    const elA = el("a", {
      href: url,
      download: isEmpty(filename) ? "download" : filename,
      on: [
        "click",
        done,
        {
          once: true,
        },
      ],
    });

    elA.click();

    function done() {
      state.done = true;
      resolve(true);
      clean();
    }
    function cancel(e) {
      reject(`downloadBlob: canceled, ${e}`);
      clean();
    }
    function clean() {
      setTimeout((_) => {
        URL.revokeObjectURL(url);
      }, 1e3);
    }
  });
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
