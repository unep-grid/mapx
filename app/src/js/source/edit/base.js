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
 * Base class
 */
export class EditTableBase extends EventSimple {
  constructor(ws, config) {
    super();
    const base = this;
    base._ws = ws; 
    base._socket = ws.socket;
    base._config = Object.assign({}, defaults, config);
    base._id = makeId();
    base._initialized = false;
    base._perf = {};
    bindAll(base);
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
    const base = this;
    base.once("destroy", cb);
  }

  /**
   * Perf util: start. more tolerant than console.time
   * @note -> transfer to its own module / use dedicated tool
   * @param {String} label Label of the performance
   */
  perf(label) {
    const base = this;
    if (!base._config.log_perf) {
      return;
    }
    delete base._perf[label];
    base._perf[label] = performance.now();
  }

  /**
   * Perf util: end .
   * @param {String} label Label of the performance
   */
  perfEnd(label) {
    const base = this;
    if (!base._config.log_perf) {
      return;
    }
    const diff = performance.now() - base._perf[label];
    console.log(`Perf ${label}: ${diff} [ms]`);
  }
}
