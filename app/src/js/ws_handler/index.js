import io from 'socket.io-client';
import {isObject, isFunction} from '../is_test/index.js';
import {bindAll} from '../bind_class_methods';

/**
 * Wrapper for socket-io
 */

const def = {
  url: '',
  onError: console.log,
  auth: {
    idUser: null,
    idProject: null,
    token: null,
    isGuest: true
  },
  handlers: {
    server_state: console.log,
    job_state: console.log,
    error: console.warn
  }
};
const cache = {
  io: null
};

class WsHandler {
  constructor(opt) {
    const ws = this;
    ws.opt = Object.assign({}, def, opt);
    bindAll(ws);
    ws.init();
  }
  async init() {
    const ws = this;
    if (ws._init) {
      return;
    }
    ws._init = true;
    await ws.connect();
    /**
     * Register handlers
     */
    Object.keys(ws.opt.handlers).forEach((k) => {
      ws.io.on(k, ws.opt.handlers[k].bind(ws));
    });
  }
  async connect() {
    const ws = this;
    //const authA = [];
    const authO = {};
    const auth = ws.opt.auth;
    if (cache.io) {
      ws.close();
    }
    if (isFunction(auth)) {
      const authF = await auth();
      if (isObject(authF)) {
        Object.assign(authO, authF);
      }
    }
    const query = Object.assign({}, def.auth, authO);
    const arrQuery = [];
    for (let k in query) {
      arrQuery.push(`${k}=${JSON.stringify(query[k])}`);
    }
    const url = `${ws.opt.url}?${arrQuery.join('&')}`;
    ws.io = io(url, {transports: ['websocket']});
    cache.io = ws.io;
  }

  close() {
    const ws = this;
    if (ws.io) {
      ws.io.close();
    }
  }

  emit(type, opt) {
    const ws = this;
    ws.io.emit(type, opt);
  }

  handleJobState(m) {
    console.log(m);
  }

  handleServerState(m) {
    console.log(m);
  }

  handleError(m) {
    console.log(m);
  }
}

export {WsHandler};
