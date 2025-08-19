import { Manager } from "socket.io-client";
import { isObject, isFunction } from "../is_test/index.js";
import { bindAll } from "../bind_class_methods";
import { settings } from "../settings";

const cache = new Map();

/**
 * Wrapper for socket-io
 */
const def = {
  url: "",
  onError: console.log,
  timeout: settings.maxTimeFetchQuick,
  auth: {
    idUser: null,
    idProject: null,
    token: null,
    isGuest: true,
  },
  tests: (id, ws) => {
    console.log(`No tests defined. ${id}`, ws);
  },
  handlers: {
    /**
     * Default handlers
     */
    notify: console.log,
    error: console.warn,
    echo: console.log,
  },
};

class WsHandler {
  constructor(opt) {
    const ws = this;
    ws._opt = Object.assign({}, def, opt);
    bindAll(ws);
  }

  get socket() {
    return this?._socket;
  }

  get id() {
    return this.socket.id || null;
  }

  get connected() {
    const ws = this;
    return ws.socket && ws.socket.connected;
  }

  destroy() {
    const ws = this;
    if (ws.connected) {
      ws.socket.disconnect();
    }
    ws.removeHandlers();
    delete ws._socket;
  }

  async connect() {
    const ws = this;
    const auth = {};

    if (ws.connected) {
      ws.destroy();
    }

    if (isFunction(ws._opt.auth)) {
      const authF = await ws._opt.auth();
      if (isObject(authF)) {
        Object.assign(auth, authF);
      }
    }

    if (isFunction(ws._opt.url)) {
      ws._opt.url = await ws._opt.url();
    }

    ws._auth = Object.assign({}, def.auth, auth);

    ws._manager = new Manager(ws._opt.url, {
      transports: ["websocket"],
      withCredentials: true,
    });

    ws._socket = ws._manager.socket("/", {
      auth: ws._auth,
    });

    ws.initHandlers();
  }

  initHandlers() {
    const ws = this;
    if (ws._init_handler) {
      return;
    }
    for (const key in ws._opt.handlers) {
      const handler = ws._opt.handlers[key].bind(ws);
      ws.socket.on(key, handler);
    }
    ws._init_handler = true;
  }

  removeHandlers() {
    const ws = this;
    for (const key in ws._opt.handlers) {
      const handler = ws._opt.handlers[key].bind(ws);
      ws.socket.off(key, handler);
    }
    ws._init_handler = false;
  }

  /*
   * Launch simple test for diagnostic / ci
   * @return {Promise<Object>}
   */
  async test(id) {
    const ws = this;
    return ws._opt.tests[id](id, ws);
  }

  /**
   * Run all tests at once < 10ms
   * @return {Promise<boolean>}
   */
  async tests() {
    const ws = this;
    const ids = Object.keys(ws._opt.tests);
    const res = await Promise.all(ids.map((id) => ws.test(id)));
    const pass = res.reduce((a, c) => a && c, true);
    return pass;
  }

  /**
   * Clear the static data cache
   */
  clearStaticCache() {
    cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache size information
   */
  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }

  /**
   * Generic emit wrapper
   * @param {String} type emit route/type
   * @param {Object} data
   * @param {Function} callback Acknowledge function
   */
  emit(type, data, callback) {
    const ws = this;
    return ws.socket.emit(type, data, callback);
  }

  /**
   * Asynchronously emits data of a specified type, returning a promise that resolves upon acknowledgement.
   * @param {string} type - The event type to emit.
   * @param {*} data - The data to emit with the event.
   * @param {number} [timeout=0] - Optional. The maximum time (in milliseconds) to wait for an acknowledgement. Defaults to `this._opt.timeout`.
   * @param {boolean} [cache=false] - Whether to cache the response for static/session-independent data (e.g., JSON schemas, configuration).
   * @returns {Promise<*>} A promise that resolves with the acknowledgement response, or rejects if the operation times out.
   */
  async emitAsync(type, data, timeout, cache = false) {
    const ws = this;
    return new Promise((resolve, reject) => {
      const maxTime = timeout || ws._opt.timeout;
      /**
       * Resolve in all case
       * ( ignored if already resolved )
       */
      const to = setTimeout(() => {
        return resolve(null);
      }, maxTime + 10);

      const key = cache ? createCacheKey(type, data) : null;

      if (key) {
        const res = getCache(key);
        if (res) {
          clearTimeout(to);
          return resolve(res);
        }
      }
      if (maxTime > 0) {
        ws.socket.timeout(maxTime).emit(type, data, (error, response) => {
          clearTimeout(to);
          if (error instanceof Error) {
            return reject(error);
          }

          if (cache) {
            setCache(key, response);
          }

          return resolve(response);
        });
      } else {
        ws.socket.emit(type, data, (response) => {
          clearTimeout(to);
          if (cache) {
            setCache(key, response);
          }
          return resolve(response);
        });
      }
    });
  }
}

export { WsHandler };

/**
 * Create a stable cache key for static data
 * @param {string} path - The event type/path
 * @param {*} params - The parameters to include in the key
 * @returns {string} A stable cache key
 */
function createCacheKey(path, params) {
  // Handle null/undefined params
  if (params === null || params === undefined) {
    return `${path}?null`;
  }

  // Create a stable string representation
  let stableParams;
  if (typeof params === "object" && params !== null) {
    // Sort object keys for consistent ordering
    stableParams = JSON.stringify(params, Object.keys(params).sort());
  } else {
    // For primitives, arrays, etc., use standard JSON.stringify
    stableParams = JSON.stringify(params);
  }

  return `${path}?${stableParams}`;
}

/**
 * Get cached static data
 * @param {string} key - Cache key
 * @returns {*} Cached data or undefined
 */
function getCache(key) {
  return cache.get(key);
}

/**
 * Set cached static data
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 */
function setCache(key, data) {
  cache.set(key, data);
}
