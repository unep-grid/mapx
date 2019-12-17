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
    this.opt = Object.assign({}, settings, opt);
    this._url = null;
    this._req = [];
    this.init();
    this.reqCounter = 0;
  }

  /**
  * Init manager
  * @private
  */
  init() {
    this.setUrl();
    this.build();
    this.setUrl();
    this.setParams();
    this.render();
    this.initListener();
  }

  /**
  * Destroy manager
  */
  destroy() {
    this.removeListener();
    this.iframe.remove();
  }

  /**
  * Build iframe and set its properties
  * @private
  */
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

  /**
  * Set url
  * @param {string|url} Url to use when rendering
  */
  setUrl(url) {
    this._url = new URL(url || this.opt.url);
  }
  /**
  * get url
  * @return url object
  */
  get url() {
    return this._url;
  }
  /**
  * Render the iframe : set the selected url
  * @private
  */
  render() {
    this.iframe.src = this._url;
  }
  /**
  * Set url search params using an object
  * @param {Object} Object representing the worker url params
  * @private
  */
  setParams(params) {
    var p = (this.opt.params = params || this.opt.params);
    for (let i in p) {
      this.setParam(i, p[i]);
    }
  }
  /**
  * Set single url param by key value
  * @param {String} key Key of the param
  * @param {Any} value to set
  * @private
  */
  setParam(key, value) {
    this.url.searchParams.set(key, value);
  }
  /**
  * Post data to the worker
  * @param {Object} request
  * @private
  */
  post(request) {
    this.iframe.contentWindow.postMessage(JSON.stringify(request), '*');
  }

  /**
  * Init message listener
  * @private
  */
  initListener() {
    this._msg_handler = this.handleWorkerMessage.bind(this);
    window.addEventListener('message', this._msg_handler);
  }

  /**
  * Remove message listener
  * @private
  */
  removeListener() {
    window.removeEventListener('message', this._msg_handler);
  }

  /**
  * Handle worker message, trigger callbacks
  * @param {Message} worker message 
  * @private
  */
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
  
  /**
  * Ask / request method to the worker
  * @param {String} Id of the request/resolver
  * @param {String} data Optional data to send to the resolver
  * @return {Promise} Promise that resolve to the resolver result
  */ 
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

/**
* Class to create a worker / listener inside an application
* @extends Events
*/
class FrameWorker {
  /**
  * Create a worke
  * @param {object} opt options
  */
  constructor(opt) {
    this.opt = Object.assign({}, settingsWorker, opt);
    this.init();
  }

  /**
  * Init worker
  * @private
  */
  init() {
    if (this.isNested()) {
      this.initListener();
      this.post('ready');
      console.log('ready posted');
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
    this.removeListener();
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
    this._msg_handler = this.handleManagerMessage.bind(this);
    window.addEventListener('message', this._msg_handler, false);
  }
  /**
  * Remove message listener
  */
  removeListener() {
    window.removeEventListener('message', this._msg_handler);
  }
  /**
  * Handle message : activate resolvers
  * @param {msg} Message object with data attribute.
  * @private
  */
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
