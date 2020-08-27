import {Events} from './events.js';
import * as settings from './settings.json';
import {MessageFrameCom, RequestFrameCom} from './messages.js';
import {parse, stringify} from './helpers.js';
import {version} from '../package.json';

/**
 * Class to create a manager to build an iframe and post message to a worker inside
 * @extends Events
 */
class FrameManager extends Events {
  /**
   * Create a manager
   * @param {Object} opt options SEE settings.json
   * @param {String} opt.url Url of the worker
   * @param {Object} opt.style Style css object
   * @param {Element} opt.container Element that will hold the worker iframe
   */
  constructor(opt) {
    super();
    const fm = this;
    fm._init(opt);
  }

  /**
   * Init manager
   * @private
   */
  _init(opt) {
    const fm = this;

    if (fm._destroyed) {
      fm._message({
        level: 'warning',
        key: 'warn_destroyed'
      });
      return;
    }
    if (fm._init_done) {
      fm._message({
        level: 'warning',
        key: 'warn_already_init'
      });
      return;
    }

    fm.opt = Object.assign({}, settings, fm.opt, opt);

    fm._emitter = 'manager';
    fm._url = null;
    fm._req = [];
    fm._reqId = 0;

    fm._build();
    fm.setUrl();
    fm.setParams();
    fm.render();
    fm._initListener();
    fm._init_done = true;
    fm._destroyed = false;
  }

  /**
   * Destroy manager
   */
  destroy() {
    const fm = this;
    const destroyWorker = new RequestFrameCom({
      idRequest: 'destroy'
    });
    fm._post(destroyWorker);
    fm._removeListener();
    fm._iframe.remove();
    fm._init_done = false;
    fm._destroyed = true;
    fm.fire('destroyed');
  }

  /**
   * Build iframe and set its properties
   * @private
   */
  _build() {
    const fm = this;
    if (fm._init_done) {
      return;
    }
    fm._iframe = document.createElement('iframe');
    fm._iframe.classList.add('framecom');
    for (let s in fm.opt.style) {
      fm._iframe.style[s] = fm.opt.style[s];
    }
    if (!(fm.opt.container instanceof Element)) {
      fm.opt.container = document.querySelector(fm.opt.container);
    }
    fm.opt.container.appendChild(fm._iframe);
  }

  /**
   * Get bounding client rect of the iframe
   */
  get rect() {
    const fm = this;
    return fm._iframe.getBoundingClientRect();
  }
  /**
   * Set iframe width
   * @param {number|string} w Width in px
   */
  set width(w) {
    const fm = this;
    w = isFinite(w) ? w + 'px' : w || fm.rect.width + 'px';
    fm._iframe.style.width = w;
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
    fm._iframe.style.height = h;
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
  * Get version
  */
  get version() {
    return version;
  }

  /**
   * Set message languages
   * @param {String} Two letter string language. e.g. 'en', 'fr'
   */
  setLang(lang) {
    this.opt.lang = lang;
  }
  /**
   * Render the iframe : set the selected url
   * @private
   */
  render() {
    const fm = this;
    fm._iframe.src = fm._url;
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
  _post(request) {
    const fm = this;
    fm._iframe.contentWindow.postMessage(stringify(request), '*');
  }

  /**
   * Fire event of type 'message'
   * @param {Object} opt Options
   * @private
   */
  _message(opt) {
    opt.lang = this.opt.lang || 'en';
    this.fire('message', new MessageFrameCom(opt));
  }
  /**
   * Init message listener
   * @private
   */
  _initListener() {
    const fm = this;
    if (fm._msg_handler) {
      return;
    }
    fm._msg_handler = fm._handleMessageWorker.bind(fm);
    window.addEventListener('message', fm._msg_handler);
  }

  /**
   * Remove message listener
   * @private
   */
  _removeListener() {
    const fm = this;
    window.removeEventListener('message', fm._msg_handler);
  }

  /**
   * Handle worker message, trigger callbacks
   * @param {MessageFrameCom} worker message
   * @private
   */
  _handleMessageWorker(msg) {
    const fm = this;
    try {
      const message = Object.assign({}, parse(msg.data));
      /**
       * Handle event
       */
      if (message.type === 'event') {
        const type = message.value.type;
        const data = message.value.data;
        if (type) {
          fm.fire(type, data);
        }
        fm._message({
          level: 'log',
          key: 'log_event',
          vars: {
            event: type
          },
          emitter: 'worker'
        });
      }

      /**
       * Redirect message to manager
       */
      if (message.type === 'message') {
        Object.assign(message, {emitter: 'worker'});
        return fm._message(message);
      }
      /**
       * Remove request from pool
       */
      if (message.type === 'response' && isFinite(message.idRequest)) {
        const req = fm._getAndRemoveRequestById(message.idRequest);
        if (message.success) {
          req.onResponse(message.value);
        }
      }

      /**
       * Handle state
       */
      if (message.type === 'state') {
        fm.fire(message.state);

        if(message.version !== fm.version){
          fm._message({
            level: 'error',
            key: 'err_version_mismatch',
            vars: {
              versionManager : fm.version,
              versionWorker : message.version
            },
            emitter: 'worker'
          });
        }

        fm._message({
          level: 'log',
          key: 'log_state',
          vars: {
            state: message.state
          },
          emitter: 'worker'
        });
        return;
      }
    } catch (e) {
      fm._message({
        level: 'error',
        key: 'err_handle_message_worker',
        vars: {
          msg: msg.data
        },
        detail: e
      });
    }
  }

  /**
    const id = request.id;
   * Ask / request method to the worker
   * @param {String} Id of the request/resolver
   * @param {String} data Optional data to send to the resolver
   * @return {Promise} Promise that resolve to the resolver result
   */
  ask(idResolver, data) {
    const fm = this;
    const nR = fm._req.length;
    const mR = fm.opt.maxSimultaneousRequest;

    return new Promise((resolve, reject) => {
      const req = new RequestFrameCom({
        idRequest: fm._reqId++,
        idResolver: idResolver,
        value: data
      });

      /**
       * Reject if to many request
       */
      if (nR > mR) {
        fm._message({
          level: 'warning',
          key: 'warn_to_much_request',
          vars: {
            nR: nR,
            mR: mR
          }
        });
        reject(`too_many_request ${nR}. Max= ${mR}`);
      }

      req.onResponse = (res) => {
        resolve(res);
      };

      fm._post(req);
      fm._req.push(req);
    }).finally(() => {
      fm._message({
        level: 'log',
        key: 'log_req_queue_counter',
        vars: {counter: fm._req.length}
      });
    });
  }
  /**
   * Retrieve request by id and remove it
   * @param {Number} id Id of the request
   * @return {RequestFrameCom}
   */
  _getAndRemoveRequestById(id) {
    const fm = this;
    let n = fm._req.length;
    while (n) {
      const pos = n - 1;
      const r = fm._req[pos];
      if (r && r.idRequest === id) {
        fm._req.splice(pos, 1);
        n = 0;
        return r;
      }
      n--;
    }
    return {};
  }
}

export {FrameManager};
