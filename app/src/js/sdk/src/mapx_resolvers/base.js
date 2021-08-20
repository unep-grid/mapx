/**
 * App and Static resolver base
 * @ignore
 */
class ResolversBase {
  constructor(opt) {
    const rslv = this;
    rslv.opt = Object.assign({}, opt);
    if (!rslv.opt.helpers) {
      throw new Error('MapX helpers not found');
    }
    rslv._h = rslv.opt.helpers;
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
    opt = Object.assign({}, {idView: null, value: null}, opt);
    const rslv = this;
    const view = rslv._h.getView(opt.idView);
    await rslv._h.viewFilterToolsInit(view);
    const valid =
      rslv._h.isView(view) &&
      rslv._h.isObject(view._filters_tools) &&
      rslv._h.isObject(view._filters_tools[type]) &&
      rslv._h.isFunction(view._filters_tools[type][method]);

    if (valid) {
      return view._filters_tools[type][method](opt.value);
    } else {
      return rslv._err('err_view_invalid');
    }
  }

  /**
   * Helper to work with selectize
   * @ignore
   */
  async _apply_filter_layer_select(type, method, opt) {
    type = type || 'searchBox'; // selectize;
    opt = Object.assign({}, {idView: null, value: null}, opt);
    const rslv = this;
    const view = rslv._h.getView(opt.idView);
    await rslv._h.viewFilterToolsInit(view);
    const valid =
      rslv._h.isView(view) &&
      rslv._h.isObject(view._filters_tools) &&
      rslv._h.isObject(view._filters_tools[type]) &&
      rslv._h.isFunction(view._filters_tools[type][method]);

    if (valid) {
      return view._filters_tools[type][method](opt.value);
    } else {
      return rslv._err('err_view_invalid');
    }
  }
  /**
   * Error handling
   * @ignore
   */
  _err(key, vars) {
    const rslv = this;
    rslv._fw.postMessage({
      level: 'error',
      key: key,
      vars: vars
    });
  }

  /**
   * Promisify mapbox method
   * @param {String} type of event to listen to resolve the promise
   * @param {Function} cb Function to wrap
   * @return {EventData}
   * @ignore
   */
  _map_resolve_when(type, cb) {
    const map = rslv._h.getMap();
    return new Promise((resolve) => {
      map.stop();
      map.once(type, (data) => {
        resolve(data);
      });
      cb();
    });
  }

  /**
   * Get random view
   * @param {Object} opt Options
   * @param {String} opt.type of view
   * @param {Function} opt.filter Filter view by using further validation
   * @return view
   * @ignore
   */
  async _get_random_view(opt) {
    opt = Object.assign({}, {type: ['vt', 'rt']}, opt);
    const rslv = this;
    let views = rslv._h.getViews();
    if (opt.type) {
      views = views.reduce((a, v) => {
        const found = rslv._h.isViewType(v, opt.type, opt.filter);
        if (found) {
          a.push(v);
        }
        return a;
      }, []);
    }
    const pos = Math.floor(Math.random() * (views.length - 1));
    return rslv._h.getViewJson(views[pos], {asString: false});
  }

  /**
   * Generic panel helper (dashbaord, notif, left panel ...
   * @return {Boolean} done. Event has been fired.
   * @ignore
   */
  _handle_panel_visibility(panel, opt) {
    opt = Object.assign({show: null, toggle: null, open: null}, opt);
    return new Promise((resolve, reject) => {
      if (opt.show === null && opt.toggle === null && opt.open === null) {
        reject('At least one option needed show,toggle or open');
      }
      if (opt.show !== null) {
        if (opt.show === true) {
          panel.on('show', ok);
          panel.show();
        } else {
          panel.on('hide', ok);
          panel.hide();
        }
      }
      if (opt.open !== null) {
        if (opt.open === true) {
          panel.on('open', ok);
          panel.open();
        } else {
          panel.on('close', ok);
          panel.close();
        }
      }
      if (opt.toggle !== null) {
        if (opt.toggle === true) {
          panel.on('toggle', ok);
          panel.toggle();
        }
      }
      function ok() {
        resolve(true);
      }
    });
  }
}

export {ResolversBase};
