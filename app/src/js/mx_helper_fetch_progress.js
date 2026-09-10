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

/** A single measured response, owning its reader, deadline and cancellation. */
export class FetchProgressRequest {
  /** @param {string | URL} url @param {Object} [options] */
  constructor(url, options) {
    this.url = url;
    this.options = { ...defProgress, ...options };
    this.controller = new AbortController();
    this.loaded = 0;
    this.onAbort = () => this.controller.abort();
    if (this.options.signal?.aborted) {
      this.controller.abort();
    }
    this.options.signal?.addEventListener("abort", this.onAbort, {
      once: true,
    });
  }

  cleanup() {
    clearTimeout(this.timer);
    this.options.signal?.removeEventListener("abort", this.onAbort);
  }

  /** @returns {Promise<Response>} */
  async run() {
    this.timer = setTimeout(
      () => this.controller.abort(),
      settings.maxTimeFetch,
    );
    try {
      const response = await fetch(this.url, {
        cache: "no-cache",
        signal: this.controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const explicitLength = response.headers.get("Mapx-Content-Length");
      const total = Number(
        explicitLength || response.headers.get("content-length"),
      );
      const encoding = response.headers.get("content-encoding");
      this.total = total;
      this.measurable =
        Number.isFinite(total) &&
        total > 0 &&
        (!!explicitLength || !encoding || encoding === "identity");
      if (!response.body?.getReader || typeof ReadableStream === "undefined") {
        this.options.onProgress({
          loaded: 0,
          total: 0,
          lengthComputable: false,
        });
        this.cleanup();
        return response;
      }
      this.reader = response.body.getReader();
      if (!this.measurable) {
        this.options.onProgress({
          loaded: 0,
          total: 0,
          lengthComputable: false,
        });
      }
      return new Response(
        new ReadableStream({
          pull: (controller) => this.read(controller),
          cancel: async (reason) => {
            this.cleanup();
            this.controller.abort();
            await this.reader.cancel(reason);
            this.reader.releaseLock();
          },
        }),
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
      );
    } catch (error) {
      this.cleanup();
      this.controller.abort();
      throw error;
    }
  }

  /** @param {ReadableStreamDefaultController<Uint8Array>} controller */
  async read(controller) {
    try {
      const { done, value } = await this.reader.read();
      if (done) {
        this.cleanup();
        this.options.onComplete({ loaded: this.loaded, total: this.total });
        this.reader.releaseLock();
        controller.close();
        return;
      }
      this.loaded += value.byteLength;
      if (this.loaded > this.options.maxSize) {
        throw new Error("Response exceeds maximum size");
      }
      this.options.onProgress({
        loaded: this.loaded,
        total: this.measurable ? this.total : 0,
        lengthComputable: this.measurable && this.loaded <= this.total,
      });
      controller.enqueue(value);
    } catch (error) {
      this.cleanup();
      this.controller.abort();
      controller.error(error);
      try {
        await this.reader.cancel(error);
      } catch {
        /* Already failed. */
      }
      this.reader.releaseLock();
    }
  }
}

/** Legacy transport entry point. @param {string | URL} url @param {Object} opt */
export function fetchProgress(url, opt) {
  return new FetchProgressRequest(url, opt).run();
}

/**
 *  Fetch : wrapper around XMLHttp request + progress
 *  @param {String} url url to fetch
 *  @param {Object} opt options
 */
export async function fetchProgress_xhr(url, opt) {
  opt = Object.assign({}, defProgress, opt);

  const promFetch = new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", url, true);
    xmlhttp.timeout = settings.maxTimeFetch;
    xmlhttp.ontimeout = () => reject(new Error("Response timed out"));
    xmlhttp.onprogress = (d) => {
      let p = {
        total: d.total,
        loaded: d.loaded,
        lengthComputable: d.lengthComputable,
      };
      if (p.total === 0 || !d.lengthComputable) {
        let cLength = d.target.getResponseHeader(opt.headerContentLength) * 1;
        if (cLength > 0) {
          p.total = cLength;
          p.lengthComputable = true;
        }
      }

      if (opt.maxSize < Infinity) {
        if (p.loaded >= opt.maxSize) {
          xmlhttp.abort();
          reject(
            `fetchProgress_xhr : Size limit exceeded ( ${opt.maxSize} B )`,
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

  return promFetch;
}
