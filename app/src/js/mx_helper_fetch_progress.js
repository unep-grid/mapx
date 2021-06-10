export async function fetchJsonProgress(url, opt) {
  const r = await fetchProgress(url, opt);
  if (!r || !r.json) {
    /**
     * Response not implemented ?
     * -> try with xhr
     */
    return fetchJsonProgress_xhr(url, opt);
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
  headerContentLength: 'content-length'
};

/**
 * Produce a promise that reject after mx.settings.maxTimeFetch ms ellapsed
 * @return {Promise}
 */

function getPromMaxTime() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(
        `fetchProgress : timeout exceeded ( ${mx.settings.maxTimeFetch} ms )`
      );
      resolve(null);
    }, mx.settings.maxTimeFetch);
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
  let err = '';
  let loaded = 1;
  let total = 1;

  const promTimeout = getPromMaxTime();
  const promFetch = fetch(url, {cache: 'no-cache'});
  const response = await Promise.race([promFetch, promTimeout]);

  if (!response.ok) {
    err = response.status + ' ' + response.statusText;
    throw new Error(err);
  }

  const contentLength =
    response.headers.get('Mapx-Content-Length') ||
    response.headers.get('content-length');

  if (!modeProgress || !contentLength) {
    opt.onProgress({
      loaded: loaded,
      total: total
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
      }
    })
  );

  /**
   * Read helper
   */

  async function read(reader, controller) {
    try {
      const {done, value} = await reader.read();
      if (done) {
        opt.onComplete({
          loaded: loaded,
          total: total
        });
        controller.close();
        return;
      }
      loaded += value.byteLength;
      opt.onProgress({
        loaded: loaded,
        total: total
      });
      controller.enqueue(value);
      read(reader, controller);
    } catch (e) {
      controller.error(error);
      throw new Error(error);
    }
  }
}

/**
 *  Fetch : wrapper around XMLHttp request + progress + json
 *  @param {String} url url to fetch
 *  @param {Object} opt options
 */
export function fetchJsonProgress_xhr(url, opt) {
  opt = Object.assign({}, defProgress, opt);
  let hasMapxContentLength = false;

  const promTimeout = getPromMaxTime();
  const promFetch = new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', url, true);
    xmlhttp.onprogress = (d) => {
      let p = {
        total: d.total,
        loaded: d.loaded
      };
      if (p.total === 0 || !d.lengthComputable) {
        let cLength =
          (d.target.getResponseHeader('mapx-content-length') ||
            d.target.getResponseHeader('content-length')) * 1;
        if (cLength > 0) {
          p.total = cLength;
          hasMapxContentLength = true;
        }
      }

      if (hasMapxContentLength) {
        p.loaded = d.target.response.length;
      }
      opt.onProgress(p);
    };
    xmlhttp.onerror = (err) => {
      reject(err);
    };
    xmlhttp.onload = onLoad;

    xmlhttp.send();

    /**
     * Helpers
     */
    function onLoad() {
      var that = this;
      if (that.status !== 200) {
        reject(`Unable to fetch ${url} ${that.responseText}`);
      } else {
        let data = JSON.parse(that.responseText);
        resolve(data);
      }
      opt.onComplete();
    }
  });

  return Promise.race([promFetch, promTimeout]);
}

/**
 *  Fetch : wrapper around XMLHttp request + progress
 *  @param {String} url url to fetch
 *  @param {Object} opt options
 */
export async function fetchProgress_xhr(url, opt) {
  opt = Object.assign({}, defProgress, opt);

  const promTimeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(
        `fetchProgress_xhr : timeout exceeded ( ${
          mx.settings.maxTimeFetch
        } ms )`
      );
    }, mx.settings.maxTimeFetch);
  });

  const promFetch = new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();
    let hasContentLength = false;

    xmlhttp.open('GET', url, true);
    xmlhttp.onprogress = (d) => {
      let p = {
        total: d.total,
        loaded: d.loaded
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
    xmlhttp.onerror = (err) => {
      reject(err);
    };
    xmlhttp.onload = onLoad;

    xmlhttp.send();

    /**
     * Helpers
     */
    function onLoad() {
      var that = this;
      if (that.status !== 200) {
        reject(`Unable to fetch ${url} ${that.responseText}`);
      } else {
        resolve(that.responseText);
      }
      opt.onComplete();
    }
  });

  return Promise.race([promFetch, promTimeout]);
}

/**
 * Fetch using MapX mirror : bypass cors browser verification
 * @param {Object} opt Option
 * @param {String} opt.endpoint Endpoint to query
 * @param {Object|String} opt.query Query
 * @return Fetch response
 */
export async function fetchMirror(opt) {
  const h = mx.helpers;
  const esc = encodeURIComponent;

  if (!h.isUrl(opt.endpoint)) {
    throw new Error('Invalid endpoint', opt.endpoint);
  }

  if (h.isObject(opt.query)) {
    opt.query = h.objToParams(opt.query);
  }

  const urlMirror = h.getApiUrl('/get/mirror');
  const urlFetch = esc(`${opt.endpoint}?${opt.query}`);
  const url = `${urlMirror}?url=${urlFetch}`;
  return fetchProgress(url, opt);
}
