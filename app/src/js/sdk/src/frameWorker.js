import {Events} from './events.js';
import {parse, stringify} from './helpers.js';
import {isObject} from '@fxi/mx_valid';
import {version} from '../package.json';
import {EventSimple} from '../../event_simple/index.js';

import {
  MessageFrameCom,
  ResponseFrameCom,
  StateFrameCom,
  EventFrameCom
} from './messages.js';

const settingsWorker = {
  resolvers: {},
  events: null
};

/**
 * Class to create a worker / listener inside an application
 * @extends Events
 */
class FrameWorker extends Events {
  /**
   * create a worke
   * @param {Object} opt options
   * @param {Resolver} opt.resolvers Resolver
   * @param {EventSimple} opt.events EventSimple
   */
  constructor(opt) {
    super();
    const fw = this;
    fw.opt = Object.assign({}, settingsWorker, opt);
    if (!fw.isNested()) {
      return;
    }
    if (!opt.sdkToken) {
      opt.sdkToken = Math.random().toString(32);
      console.warn(
        'Missing sdkToken : multiple SDK instances on the same page not supported.'
      );
    }
    fw.handleMessageManager = fw.handleMessageManager.bind(fw);
    fw.init();
  }

  /**
   * init worker
   * @private
   */
  init() {
    const fw = this;
    fw._emitter = 'worker';
    fw._sdkToken = fw.opt.sdkToken;

    if (fw._init) {
      fw.postMessage({
        level: 'warning',
        key: 'warn_worker_already_init'
      });
      return;
    }
    fw._init = true;
    fw.initListener();

    fw.opt.resolvers._bind(fw);
    fw.postState({
      state: 'ready',
      version: fw.version
    });

    fw.postMessage({
      level: 'log',
      key: 'log_worker_ready'
    });

    if (fw.opt.events instanceof EventSimple) {
      fw._events = fw.opt.events;
      fw._events.addPassthrough({
        cb: (d) => {
          fw.postEvent({value: d});
        }
      });
    }
  }

  /**
   * Get version
   */
  get version() {
    return version;
  }

  /**
   * Check if the worker has a parent (is nested)
   * @return {Boolean} true if the worker has a parent (is inside an iframe)
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
  _post(data) {
    const fw = this;
    data.sdkToken = fw._sdkToken;
    window.parent.postMessage(stringify(data), '*');
  }

  postMessage(opt) {
    const msg = new MessageFrameCom(opt);
    this._post(msg);
  }
  postEvent(opt) {
    const evt = new EventFrameCom(opt);
    this._post(evt);
  }
  postResponse(opt) {
    const state = new ResponseFrameCom(opt);
    this._post(state);
  }
  postState(opt) {
    const state = new StateFrameCom(opt);
    this._post(state);
  }

  /**
   * Init message listener
   * @param {data}
   * @private
   */
  initListener() {
    const fw = this;
    window.addEventListener('message', fw.handleMessageManager, false);
  }
  /**
   * Remove message listener
   */
  removeListener() {
    const fw = this;
    window.removeEventListener('message', fw.handleMessageManager);
    if (fw._events) {
      fw._events.destroy();
    }
  }
  /**
   * Handle message : activate resolvers
   * @param {msg} Message object with data attribute.
   * @private
   */
  async handleMessageManager(msg) {
    const fw = this;
    const request = Object.assign({}, parse(msg.data));
    const idRequest = request.idRequest;
    const idResolver = request.idResolver;
    const resolver = fw.opt.resolvers[idResolver];

    try {
      /**
       * Execute the resolver and get result
       */
      const res = await new Promise((resolve, reject) => {
        if (idRequest === 'destroy') {
          fw.destroy();
          resolve(null);
        } else if (!resolver) {
          reject(
            new MessageFrameCom({
              level: 'error',
              key: 'err_resolver_not_found',
              vars: {
                idRequest: idRequest,
                idResolver: idResolver
              }
            })
          );
        }
        if (resolver instanceof Function) {
          const result = resolver.bind(fw.opt.resolvers)(request.value);
          resolve(result);
        } else {
          resolve(null);
        }
      });

      /**
       * Post result back to manager
       */

      fw.postResponse({
        idRequest: idRequest,
        value: res,
        success: true
      });
    } catch (e) {
      /**
       * In case of error, return success false
       */
      fw.postResponse({
        idRequest: idRequest,
        success: false
      });

      /**
       * If the error was handled, it's probably a
       * object from MessageFrameCom
       */
      if (e instanceof MessageFrameCom) {
        fw._post(e);
      } else {
        /**
         * If it's not handled, we build one here
         */
        const m = isObject(e) ? e.message : e;
        fw.postMessage({
          level: 'error',
          key: 'err_resolver_failed',
          vars: {
            idRequest: idRequest,
            idResolver: idResolver,
            msg: m
          },
          data: e
        });
      }
    }
  }
}

export {FrameWorker};
