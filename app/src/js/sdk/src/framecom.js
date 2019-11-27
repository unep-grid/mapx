import {Events} from './events.js';
import * as settings from './settings.json'; 

class FrameManager extends Events {
  constructor(opt) {
    super();
    this.opt = Object.assign({}, settings, opt);
    this._url = null;
    this._req = [];
    this.init();
    this.reqCounter = 0;
  }

  init() {
    this.setUrl();
    this.build();
    this.setUrl();
    this.setParams();
    this.render();
    this.initListener();
  }

  destroy() {
    this.removeListener();
    this.iframe.remove();
  }

  build() {
    this.iframe = document.createElement('iframe');
    for (let s in this.opt.style) {
      this.iframe.style[s] = this.opt.style[s];
    }
    if(!(this.opt.container instanceof Element)){
      this.opt.container = document.querySelector(this.opt.container);
    }
    this.opt.container.appendChild(this.iframe);
  }

  setUrl(url) {
    this._url = new URL(url || this.opt.url);
  }
  get url() {
    return this._url;
  }
  render() {
    this.iframe.src = this.url;
  }
  setParams(params) {
    var p = (this.opt.params = params || this.opt.params);
    for (let i in p) {
      this.setParam(i, p[i]);
    }
  }
  setParam(key, value) {
    this.url.searchParams.set(key, value);
  }
  post(request) {
    this.iframe.contentWindow.postMessage(JSON.stringify(request), '*');
  }
  initListener() {
    this._msg_handler = this.handleWorkerMessage.bind(this);
    window.addEventListener('message', this._msg_handler);
  }
  removeListener() {
    window.removeEventListener('message', this._msg_handler);
  }
  handleWorkerMessage(msg) {
    try {
      const request = JSON.parse(msg.data);
      if (request === 'ready') {
        this.fire('ready');
        console.log('ready received');
      } else if (request.idRequest > -1) {
        const req = this._req.find((r) => r.id === request.idRequest);
        if (req) {
          const reqPos = this._req.indexOf(req);
          this._req.splice(reqPos, 1);
          req.onResponse(request.result);
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }
  ask(idResolver, data) {
    const fw = this;
    return new Promise((resolve) => {
      var request = {
        id: fw.reqCounter++,
        idResolver: idResolver,
        data: data
      };
      fw.post(request);
      request.onResponse = (res) => {
        resolve(res);
      };
      fw._req.push(request);
    });
  }
}

const settingsWorker = {
  resolvers: {}
};

class FrameWorker {
  constructor(opt) {
    this.opt = Object.assign({}, settingsWorker, opt);
    this.init();
  }
  init() {
    if (this.isNested()) {
      this.initListener();
      this.post('ready');
      console.log('ready posted');
    }
  }
  isNested() {
    return window.parent !== window;
  }
  destroy() {
    this.removeListener();
  }

  post(data) {
    window.parent.postMessage(JSON.stringify(data), '*');
  }
  initListener() {
    this._msg_handler = this.handleManagerMessage.bind(this);
    window.addEventListener('message', this._msg_handler, false);
  }
  removeListener() {
    window.removeEventListener('message', this._msg_handler);
  }
  handleManagerMessage(msg) {
    console.log(msg);
    try {
      const fw = this;
      const request = JSON.parse(msg.data);
      const idRequest = request.id;
      const idResolver = request.idResolver;
      const resolver = this.opt.resolvers[idResolver];
      return new Promise((resolve) => {
        if (resolver instanceof Function) {
          const result = resolver(request.data);
          resolve(result);
        } else {
          resolve(null);
        }
      })
        .then((res) => {
          fw.post({
            idRequest: idRequest,
            result: res
          });
        })
        .catch((e) => console.error(e));
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }
}

export {FrameManager, FrameWorker};
