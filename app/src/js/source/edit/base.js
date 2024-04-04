import { bindAll } from "../../bind_class_methods";
import { EventSimple } from "../../event_simple";
import { makeId } from "../../mx_helper_misc";

const defaults = {
  test_mode: false,
  log_perf: false,
  debug: false,
  destroy_cb: () => {},
};

/**
 * Base class that should work with ws_tools_instances
 */
export class EditTableBase extends EventSimple {
  constructor(socket, config) {
    super();
    const wsb = this;
    wsb._socket = socket;
    wsb._config = Object.assign({}, defaults, config);
    wsb._id = makeId();
    wsb._socket = socket;
    //wsb._on_cb = new Set();
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
    wsb.once("destroy", cb);
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
}
