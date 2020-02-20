import {Events} from './events.js';
import * as settings from './settings.json';

/**
 * Class to create a manager to build an iframe and post message to a worker inside
 * @extends Events
 */
class FrameManager extends Events {
  /**
   * Create a manager
   * @param {object} opt options
   */
  constructor(opt) {
    super();
    const fm = this;
    fm.init(opt);
  }

  /**
   * Init manager
   * @private
   */
  init(opt) {
    const fm = this;
    if (fm._init) {
      fm.message('warning', `Already initialized, ignoring`);
      return;
    }
    fm._emitter = 'manager';
    fm._init = true;
    fm.opt = Object.assign({}, settings, fm.opt, opt);
    fm._url = null;
    fm._req = [];
    fm.reqId = 0;
    fm.reqCounter = 0;

    fm.setUrl();
    fm.build();
    fm.setUrl();
    fm.setParams();
    fm.render();
    fm.initListener();
  }

  /**
   * Destroy manager
   */
  destroy() {
    const fm = this;
    fm.removeListener();
    fm.iframe.remove();
    fm._init = false;
  }

  /**
   * Build iframe and set its properties
   * @private
   */
  build() {
    const fm = this;
    fm.iframe = document.createElement('iframe');
    fm.iframe.classList.add('framecom');
    for (let s in fm.opt.style) {
      fm.iframe.style[s] = fm.opt.style[s];
    }
    if (!(fm.opt.container instanceof Element)) {
      fm.opt.container = document.querySelector(fm.opt.container);
    }
    fm.opt.container.appendChild(fm.iframe);
  }

  /**
   * Get bounding client rect of the iframe
   */
  get rect() {
    const fm = this;
    return fm.iframe.getBoundingClientRect();
  }
  /**
   * Set iframe width
   * @param {number|string} w Width in px
   */
  set width(w) {
    const fm = this;
    w = isFinite(w) ? w + 'px' : w || fm.rect.width + 'px';
    fm.iframe.style.width = w;
  }
  get width() {
    const fm = this;
    return fm.rect.width;
  }
  /**
   * Set iframe height
   * @param {number|string} h height in px
   */
  set height(h) {
    const fm = this;
    h = isFinite(h) ? h + 'px' : h || fm.rect.height + 'px';
    fm.iframe.style.height = h;
  }
  get height() {
    const fm = this;
    return fm.rect.height;
  }

  /**
   * Set url
   * @param {string|url} Url to use when rendering
   */
  setUrl(url) {
    const fm = this;
    fm._url = new URL(url || fm.opt.url);
  }
  /**
   * get url
   * @return url object
   */
  get url() {
    const fm = this;
    return fm._url;
  }
  /**
   * Render the iframe : set the selected url
   * @private
   */
  render() {
    const fm = this;
    fm.iframe.src = fm._url;
  }
  /**
   * Set url search params using an object
   * @param {Object} Object representing the worker url params
   * @private
   */
  setParams(params) {
    const fm = this;
    var p = (fm.opt.params = params || fm.opt.params);
    for (let i in p) {
      fm.setParam(i, p[i]);
    }
  }
  /**
   * Set single url param by key value
   * @param {String} key Key of the param
   * @param {Any} value to set
   * @private
   */
  setParam(key, value) {
    const fm = this;
    fm.url.searchParams.set(key, value);
  }
  /**
   * Post data to the worker
   * @param {Object} request
   * @private
   */
  post(request) {
    const fm = this;
    fm.iframe.contentWindow.postMessage(JSON.stringify(request), '*');
  }

  /**
   * Init message listener
   * @private
   */
  initListener() {
    const fm = this;
    fm._msg_handler = fm.handleWorkerMessage.bind(fm);
    window.addEventListener('message', fm._msg_handler);
  }

  /**
   * Remove message listener
   * @private
   */
  removeListener() {
    const fm = this;
    window.removeEventListener('message', fm._msg_handler);
  }

  /**
   * Handle worker message, trigger callbacks
   * @param {Message} worker message
   * @private
   */
  handleWorkerMessage(msg) {
    const fm = this;
    try {
      const request = JSON.parse(msg.data);
      if (request === 'ready') {
        fm.fire('ready');
        fm.message('log', `Sent ready state`);
      } else if (request.idRequest > -1) {
        const req = fm._req.find((r) => r.id === request.idRequest);
        if (req) {
          const reqPos = fm._req.indexOf(req);
          fm._req.splice(reqPos, 1);
          req.onResponse(request.result);
        }
      }
    } catch (e) {
      fm.message('error', `Failed to parse message ${msg}`, e);
    }
  }

  /**
   * Ask / request method to the worker
   * @param {String} Id of the request/resolver
   * @param {String} data Optional data to send to the resolver
   * @return {Promise} Promise that resolve to the resolver result
   */
  ask(idResolver, data) {
    const fm = this;
    const nR = fm.reqCounter;
    const mR = fm.opt.maxSimultaneousRequest;
    if (nR > mR) {
      fm.message('error', `Too much request (${nR}/${mR})`);
      return;
    }
    return new Promise((resolve) => {
      fm.reqCounter++;
      var request = {
        id: fm.reqId++,
        idResolver: idResolver,
        data: data
      };
      fm.post(request);
      request.onResponse = (res) => {
        resolve(res);
      };
      fm._req.push(request);
    }).finally(() => {
      fm.reqCounter--;
      fm.message('log', `${fm.reqCounter} request in queue`);
    });
  }
}

const settingsWorker = {
  resolvers: {}
};

/**
 * Class to create a worker / listener inside an application
 * @extends Events
 */
class FrameWorker extends Events {
  /**
   * Create a worke
   * @param {object} opt options
   */
  constructor(opt) {
    super();
    const fw = this;
    fw.opt = Object.assign({}, settingsWorker, opt);
    fw.init();
  }

  /**
   * Init worker
   * @private
   */
  init() {
    const fw = this;
    fw._emitter = 'worker';
    if (fw._init) {
      fw.message('warning', `Already initialized`);
      return;
    }
    fw._init = true;
    if (fw.isNested()) {
      fw.initListener();
      fw.post('ready');
      fw.message('message', `Ready`);
    }
  }

  /**
   * Check if the worker has a parent (is nested)
   * @return {boolean} True if the worker has a parent (is inside an iframe)
   */
  isNested() {
    return window.parent !== window;
  }
  /**
   * Destroy the worker
   */
  destroy() {
    const fw = this;
    fw.removeListener();
  }

  /**
   * Post message to the parent
   * @param {Object} data Object to send to the parent
   * @private
   */
  post(data) {
    window.parent.postMessage(JSON.stringify(data), '*');
  }
  /**
   * Init message listener
   * @param {data}
   * @private
   */
  initListener() {
    const fw = this;
    fw._msg_handler = fw.handleManagerMessage.bind(fw);
    window.addEventListener('message', fw._msg_handler, false);
  }
  /**
   * Remove message listener
   */
  removeListener() {
    const fw = this;
    window.removeEventListener('message', fw._msg_handler);
  }
  /**
   * Handle message : activate resolvers
   * @param {msg} Message object with data attribute.
   * @private
   */
  handleManagerMessage(msg) {
    let idRequest = '';
    const fw = this;
    const request = JSON.parse(msg.data);
    idRequest = request.id;
    const idResolver = request.idResolver;
    const resolver = fw.opt.resolvers[idResolver];
    if (!resolver) {
      fw.message('error', `Unknown resolver '${idResolver}'`);
      return;
    }
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
      .catch((e) => {
        fw.message('error', `Failed to handle message ${idRequest}`, e);
      });
  }
}

export {FrameManager, FrameWorker};
