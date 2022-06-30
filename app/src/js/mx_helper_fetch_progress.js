import { settings } from "./settings";

export async function fetchJsonProgress(url, opt) {
  const r = await fetchProgress(url, opt);
  if (!r || !r.json) {
    /**
     * Response not implemented ?
     * -> try with xhr
     */
    const data = await fetchProgress_xhr(url, opt);
    return JSON.parse(data);
  } else {
    return r.json();
  }
}

const defProgress = {
  onProgress: () => {},
  onComplete: () => {},
  onError: (e) => {
    throw new Error(e);
  },
  maxSize: Infinity,
  headerContentLength: "content-length",
};

/**
 * Produce a promise that reject after settings.maxTimeFetch ms ellapsed
 * @return {Promise}
 */
function getPromMaxTime(ms) {
  if (!ms) {
    ms = settings.maxTimeFetch;
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject({ message: `fetchProgress : timeout exceeded ( ${ms} ms )` });
      resolve(null);
    }, ms);
  });
}

/**
 *  Fetch : wrapper around fetch + progress
 *  @param {String} url url to fetch
 *  @param {Object} opt options
 */
export async function fetchProgress(url, opt) {
  opt = Object.assign({}, defProgress, opt);

  const modeProgress = window.Response && window.ReadableStream;
  let err = "";
  let loaded = 1;
  let total = 1;

  const promTimeout = getPromMaxTime();
  const promFetch = fetch(url, { cache: "no-cache" });
  const response = await Promise.race([promFetch, promTimeout]);

  if (!response.ok) {
    err = response.status + " " + response.statusText;
    throw new Error(err);
  }

  const contentLength =
    response.headers.get("Mapx-Content-Length") ||
    response.headers.get("content-length");

  if (!modeProgress || !contentLength) {
    opt.onProgress({
      loaded: loaded,
      total: total,
    });
    return response;
  }

  total = parseInt(contentLength, 10);
  loaded = 0;

  /**
   * Return readable stream instead of json
   */

  return new Response(
    new ReadableStream({
      start(controller) {
        const reader = response.body.getReader();
        read(reader, controller);
      },
    })
  );

  /**
   * Read helper
   */

  async function read(reader, controller) {
    try {
      const { done, value } = await reader.read();
      if (done) {
        opt.onComplete({
          loaded: loaded,
          total: total,
        });
        controller.close();
        return;
      }
      loaded += value.byteLength;
      opt.onProgress({
        loaded: loaded,
        total: total,
      });
      controller.enqueue(value);
      read(reader, controller);
    } catch (e) {
      throw new Error(e);
    }
  }
}

/**
 *  Fetch : wrapper around XMLHttp request + progress
 *  @param {String} url url to fetch
 *  @param {Object} opt options
 */
export async function fetchProgress_xhr(url, opt) {
  opt = Object.assign({}, defProgress, opt);

  const promTimeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        `fetchProgress_xhr : timeout exceeded ( ${settings.maxTimeFetch} ms )`
      );
    }, settings.maxTimeFetch);
  });

  const promFetch = new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();
    let hasContentLength = false;

    xmlhttp.open("GET", url, true);
    xmlhttp.onprogress = (d) => {
      let p = {
        total: d.total,
        loaded: d.loaded,
      };
      if (p.total === 0 || !d.lengthComputable) {
        let cLength = d.target.getResponseHeader(opt.headerContentLength) * 1;
        if (cLength > 0) {
          p.total = cLength;
          hasContentLength = true;
        }
      }

      if (hasContentLength) {
        p.loaded = d.target.response.length;
      }
      if (opt.maxSize < Infinity) {
        if (p.loaded >= opt.maxSize) {
          xmlhttp.abort();
          reject(
            `fetchProgress_xhr : Size limit exceeded ( ${opt.maxSize} B )`
          );
        }
      }
      opt.onProgress(p);
    };
    xmlhttp.onerror = () => {
      /*
       * Only network issue. If status code, handled ni onload
       */
      reject(`fetchProgress_xhr : Network/Security issue e.g. missing CORS`);
    };
    /**
     * ⚠️  Using this require function instead of arrow function
     */
    xmlhttp.onload = function (e) {
      const res = this;
      if (res.status !== 200) {
        /**
         * Handle non-newtork issue / result
         */
        reject(res.responseText);
      } else {
        resolve(res.responseText);
      }
      opt.onComplete();
    };

    xmlhttp.send();
  });

  return Promise.race([promFetch, promTimeout]);
}
