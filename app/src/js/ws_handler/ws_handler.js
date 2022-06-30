import { Manager } from "socket.io-client";
import { isObject, isFunction, isEmpty } from "../is_test/index.js";
import { bindAll } from "../bind_class_methods";
import { makeId } from "../mx_helpers.js";
/**
 * Wrapper for socket-io
 */
const def = {
  url: "",
  onError: console.log,
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
     * Example :
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

  get id() {
    return this?._socket?.id || null;
  }

  get connected() {
    const ws = this;
    return ws._socket && ws._socket.connected;
  }

  destroy() {
    const ws = this;
    if (ws.connected) {
      ws._socket.disconnect();
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
      ws._socket.on(key, handler);
    }
    ws._init_handler = true;
  }

  removeHandlers() {
    const ws = this;
    for (const key in ws._opt.handlers) {
      const handler = ws._opt.handlers[key].bind(ws);
      ws._socket.off(key, handler);
    }
    ws._init_handler = false;
  }

  /*
   * Launch simple test for diagnostic / ci
   * @return {Promise<Object>}
   */
  async test(id) {
    const ws = this;
    return ws._opt.tests(id, ws);
  }

  /**
   * Generic emit wrapper
   * @param {String} type emit route/type
   * @param {Object} data
   */
  emit(type, data) {
    const ws = this;
    return ws._socket.emit(type,data);
  }

  /**
   * Emit and get result
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
    const request = {};
    request.input = data;
    request._id = makeId(10);
    timeout = timeout || 1e3 * 60;

    return new Promise((resolve, reject) => {
      ws._socket.on("response", handler);
      ws.emit(type, request);

      if (timeout > 0) {
        setTimeout(() => {
          clear();
          reject(new Error(`Timeout ${timeout} [ms]`));
        }, timeout);
      }

      function clear() {
        ws._socket.off("response", handler);
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
