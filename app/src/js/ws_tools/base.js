import { bindAll } from "./../bind_class_methods";
import { makeId } from "./../mx_helper_misc.js";

const defaults = {
  test_mode: false,
  log_perf: false,
  debug: false,
  destroy_cb: () => {},
};

/**
 * Base class that should work with ws_tools_instances
 */
export class WsToolsBase {
  constructor(socket, config) {
    const wsb = this;
    wsb._socket = socket;
    wsb._config = Object.assign({}, defaults, config);
    wsb._id = makeId();
    wsb._socket = socket;
    wsb._on_cb = new Set();
    wsb._initialized = false;
    wsb._perf = {};
    bindAll(wsb);
  }
  /**
   * Instance id
   * @return {string} Instance id
   */
  get id() {
    return this._id;
  }

  /**
   * Add callback that will be used once after destroy event
   * @param {Function} Callback
   */
  addDestroyCb(cb) {
    const wsb = this;
    wsb._on_cb.add({ once: true, cb: cb, type: "destroy", resolve: null });
  }

  /**
   * Perf util: start. more tolerant than console.time
   * @note -> transfer to its own module / use dedicated tool
   * @param {String} label Label of the performance
   */
  perf(label) {
    const wsb = this;
    if (!wsb._config.log_perf) {
      return;
    }
    delete wsb._perf[label];
    wsb._perf[label] = performance.now();
  }

  /**
   * Perf util: end .
   * @param {String} label Label of the performance
   */
  perfEnd(label) {
    const wsb = this;
    if (!wsb._config.log_perf) {
      return;
    }
    const diff = performance.now() - wsb._perf[label];
    console.log(`Perf ${label}: ${diff} [ms]`);
  }

  /*
   * Events : once handler
   * - if a timeout is set
   * @param {String} type event type
   * @param {Function} cb Callback
   * @param {Number} timeout Timeout ( optional) Reject the promise at a delay.
   * @return {Promise}
   */
  once(type, cb, timeout) {
    const wsb = this;
    return new Promise((resolve, reject) => {
      // - reject -> reject only if timeout is set and triggered
      // - resolve -> store the resolve in the callback object. Used in 'fire'.
      const item = { once: true, cb: cb, type: type, resolve: resolve };
      if (timeout) {
        setTimeout(() => {
          wsb._on_cb.delete(item);
          reject(`Timeout for ${type}`);
        }, timeout);
      }
      wsb._on_cb.add(item);
    });
  }
  /*
   * Events : fire handler
   *
   * @param {String} name Eventype
   * @param {Object} data Object to pass to the callback
   * @return {Promise<array>} array of returned values
   */
  async fire(type, data) {
    const wsb = this;
    const res = [];
    for (const item of wsb._on_cb) {
      /**
       * Find callback
       */
      if (item.type === type) {
        if (item.cb) {
          /**
           * Await and collect returned values
           */
          res.push(await item.cb(data));
        }
        if (item.resolve) {
          /**
           * If it's a resolve, resolve
           * -> if the timeout wins, it will be rejected
           *    in "once" method.
           */
          item.resolve(data);
        }
        if (item.once) {
          /**
           * Unregister after the first call
           */
          wsb._on_cb.delete(item);
        }
      }
    }
    return res;
  }
}
