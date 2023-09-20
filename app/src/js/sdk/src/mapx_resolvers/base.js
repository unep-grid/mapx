import { bindAll } from "../../../bind_class_methods";
import { isFunction, isObject, isView } from "../../../is_test";
import {
  getMap,
  getView,
  getViewRandom,
  getViewJson,
} from "../../../map_helpers/index.js";
import { viewFilterToolsInit } from "../../../map_helpers/view_filters.js";

/**
 * App and Static resolver base
 * @ignore
 */
class ResolversBase {
  constructor(opt) {
    const rslv = this;
    rslv.opt = Object.assign({}, opt);
    rslv._views = new Set();
    bindAll(rslv);
  }
  /**
   * Bind worker
   * @ignore
   * @param {FrameWorker} fw FrameWorker
   */
  _bind(fw) {
    this._fw = fw;
  }

  /**
   * Helper to work with sliders
   * @ignore
   */
  async _apply_filter_layer_slider(type, method, opt) {
    opt = Object.assign({}, { idView: null, value: null }, opt);
    const rslv = this;
    const view = getView(opt.idView);

    if (!isView(view)) {
      return rslv._err("err_view_invalid", { idView: opt.idView });
    }

    /*
     * Proxy update, via existing tool
     */
    await viewFilterToolsInit(view);
    const valid =
      isView(view) &&
      isObject(view._filters_tools) &&
      isObject(view._filters_tools[type]) &&
      isFunction(view._filters_tools[type][method]);

    if (!valid) {
      return rslv._err("err_config_invalid");
    }

    return view._filters_tools[type][method](opt.value);
  }

  /**
   * Helper to work with selectize
   * @ignore
   */
  async _apply_filter_layer_select(type, method, opt) {
    const rslv = this;
    type = type || "searchBox"; // tom select;
    opt = Object.assign({}, { idView: null, value: null }, opt);

    const view = getView(opt.idView);

    if (!isView(view)) {
      return rslv._err("err_view_invalid", { idView: opt.idView });
    }

    await viewFilterToolsInit(view);
    const valid =
      isObject(view._filters_tools) &&
      isObject(view._filters_tools[type]) &&
      isFunction(view._filters_tools[type][method]);

    if (!valid) {
      return rslv._err("err_view_invalid", { idView: opt.idView });
    }

    return view._filters_tools[type][method](opt.value);
  }
  /**
   * Error handling
   * @ignore
   */
  _err(key, vars) {
    const rslv = this;
    rslv._fw.postMessage({
      level: "error",
      key: key,
      vars: vars,
    });
  }

  /**
   * Promisify mapbox method
   * @param {String} type of event to listen to resolve the promise
   * @param {Function} cb Function to wrap
   * @param {Object} opt Object, e.g. for references
   * @return {Promise<Object>} opt object
   * @ignore
   */
  _map_resolve_when(type, cb, opt) {
    const map = getMap();
    return new Promise((resolve, reject) => {
      map.stop();
      map.once(type, () => {
        resolve(opt);
      });
      /* reject if too slow */
      setTimeout(() => {
        reject("timeout");
      }, 10000);
      /* should trigger an event on map */
      cb();
    });
  }

  /**
   * Get random view using type + configuration
   * @note : see getViewRandom doc
   * @param {Object} opt Options
   * @param {String|Array} opt.type of view
   * @return view
   * @ignore
   */
  _get_random_view(opt) {
    opt = Object.assign({}, { type: ["vt", "rt"] }, opt);
    const view = getViewRandom(opt);
    if (!isView(view)) {
      throw new Error(`_get_random_view : no view found`);
    }
    const vJson = getViewJson(view, { asString: false });
    return vJson;
  }

  /**
   * Generic panel helper (dashbaord, notif, left panel ...
   * @return {Boolean} done. Event has been fired.
   * @ignore
   */
  _handle_panel_visibility(panel, opt) {
    opt = Object.assign({ show: null, toggle: null, open: null }, opt);
    return new Promise((resolve, reject) => {
      if (opt.show === null && opt.toggle === null && opt.open === null) {
        reject("At least one option needed show,toggle or open");
      }
      if (opt.show !== null) {
        if (opt.show === true) {
          panel.on("show", ok);
          panel.show();
        } else {
          panel.on("hide", ok);
          panel.hide();
        }
      }
      if (opt.open !== null) {
        if (opt.open === true) {
          panel.on("open", ok);
          panel.open();
        } else {
          panel.on("close", ok);
          panel.close();
        }
      }
      if (opt.toggle !== null) {
        if (opt.toggle === true) {
          panel.on("toggle", ok);
          panel.toggle();
        }
      }
      function ok() {
        resolve(true);
      }
    });
  }
}

export { ResolversBase };
