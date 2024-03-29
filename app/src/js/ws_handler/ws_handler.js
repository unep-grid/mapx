import { Manager } from "socket.io-client";
import { isObject, isFunction, isEmpty } from "../is_test/index.js";
import { bindAll } from "../bind_class_methods";
import { makeId } from "../mx_helpers.js";
import { settings } from "./../mx.js";

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
   * Emit with promisified cb
   */
  emitAsync(type, data, timeout) {
    const ws = this;
    return new Promise((resolve, reject) => {
      const maxTime = timeout || ws._opt.timeout;
      if (maxTime > 0) {
        setTimeout(() => {
          return reject(`emitAsync timeout ${maxTime} on ${type}`);
        }, maxTime);
      }
      ws.socket.emit(type, data, (response) => {
        return resolve(response);
      });
    });
  }

  /**
   * Emit and get result
   * ⚠️  Use acknowledgements callback in emit instead ⚠️
   * -> implemented in emitAsync
   * @param {String} type Route/Identifier for the request handler.
   *                 eg. "ws/get/project/layers/list"
   * @param {Object} data
   * @param {Number} timeout Timeout in milliseconds
   * @return {Promise<Object>}
   */
  emitGet(type, data, timeout) {
    const ws = this;
    if (isEmpty(type)) {
      throw new Error(`emitGet : missing route`);
    }
    const request = { input: data, _id: makeId(10) };
    const maxTime = timeout || ws._opt.timeout;

    return new Promise((resolve, reject) => {
      ws.socket.on("response", handler);
      ws.emit(type, request);

      if (maxTime > 0) {
        setTimeout(() => {
          clear();
          reject(new Error(`Timeout ${timeout} [ms]`));
        }, maxTime);
      }

      function clear() {
        ws.socket.off("response", handler);
      }
      function handler(response) {
        if (response._id === request._id) {
          clear();
          if (response.type === "error") {
            reject(response);
          } else {
            resolve(response);
          }
        }
      }
    });
  }
}

export { WsHandler };
