import {Events} from './events.js';
import {parse, stringify} from 'flatted/esm';

import {
  MessageFrameCom,
  ResponseFrameCom,
  StateFrameCom,
  EventFrameCom
} from './messages.js';

const settingsWorker = {
  resolvers: {},
  eventStore: null
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
   * @param {EventStore} opt.eventStore EventStore
   */
  constructor(opt) {
    super();
    const fw = this;
    fw.opt = Object.assign({}, settingsWorker, opt);
    fw.init();
  }

  /**
   * init worker
   * @private
   */
  init() {
    const fw = this;
    fw._emitter = 'worker';
    if (fw._init) {
      fw.post(
        new MessageFrameCom({
          level: 'warning',
          key: 'warn_worker_already_init'
        })
      );
      return;
    }
    fw._init = true;
    if (fw.isNested()) {
      fw.initListener();
      fw.post(
        new StateFrameCom({
          state: 'ready'
        })
      );
      fw.post(
        new MessageFrameCom({
          level: 'log',
          key: 'log_worker_ready'
        })
      );
    }

    if (
      fw.opt.eventStore instanceof Object &&
      fw.opt.eventStore.className === 'EventStore'
    ) {
      fw._eventStore = fw.opt.eventStore;
      fw._eventStore.addPassthrough({
        cb: (d) => {
          fw.post(new EventFrameCom({value:d}));
        }
      });
    }
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
  post(data) {
    window.parent.postMessage(stringify(data), '*');
  }
  /**
   * Init message listener
   * @param {data}
   * @private
   */
  initListener() {
    const fw = this;
    fw._msg_handler = fw.handleMessageManager.bind(fw);
    window.addEventListener('message', fw._msg_handler, false);
  }
  /**
   * Remove message listener
   */
  removeListener() {
    const fw = this;
    window.removeEventListener('message', fw._msg_handler);
    if (fw._eventsStore) {
      fw._eventStore.destroy();
    }
  }
  /**
   * Handle message : activate resolvers
   * @param {msg} Message object with data attribute.
   * @private
   */
  handleMessageManager(msg) {
    const fw = this;
    const request = Object.assign({}, parse(msg.data));
    const idRequest = request.idRequest;
    const idResolver = request.idResolver;
    const resolver = fw.opt.resolvers[idResolver];

    return new Promise((resolve, reject) => {
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
    })
      .then((res) => {
        fw.post(
          new ResponseFrameCom({
            idRequest: idRequest,
            value: res
          })
        );
      })
      .catch((e) => {
        fw.post(
          new ResponseFrameCom({
            idRequest: idRequest,
            success: false
          })
        );

        if (e instanceof Message) {
          fw.post(e);
        } else {
          fw.post(
            new MessageFrameCom({
              level: 'error',
              key: 'err_resolver_failed',
              vars: {
                idRequest: idRequest,
                idResolver: idResolver
              },
              data: e
            })
          );
        }
      });
  }
}

export {FrameWorker};
