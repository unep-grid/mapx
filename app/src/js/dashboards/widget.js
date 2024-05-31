import { el } from "./../el/src/index.js";
import { ListenerStore } from "./../listener_store/index.js";
import { path, any, setClickHandler } from "./../mx_helper_misc.js";
import { getLayersPropertiesAtPoint } from "./../map_helpers/index.js";
import { isEmpty, isFunction, isUndefined } from "./../is_test/index.js";
import { settings } from "../settings/index.js";
const { valuesMap } = settings;

/**
 * Widget method
 */

const defaults = {
  conf: {
    disabled: false,
    source: "none",
    alwaysOnTop: false,
    width: "x50",
    height: "y50",
    addColorBackground: false,
    colorBackground: "#000000",
    sourceIgnoreEmpty: true,
    atribution: "",
    script:
      "return { async onAdd:console.log, async onRemove:console.log, async onData:console.log}",
  },
  language: "en",
  map: null,
  view: null,
  dashboard: null,
  attributions: [],
};

/**
 * A widget class that provides a customizable UI element for displaying and manipulating data.
 * @class
 * @property {Object} opt - Widget options.
 * @property {Object} opt.conf - Widget configuration.
 * @property {boolean} opt.conf.disabled - Flag indicating whether the widget is disabled.
 * @property {string} opt.conf.source - The source of data for the widget.
 * @property {string} opt.conf.width - The width of the widget.
 * @property {string} opt.conf.height - The height of the widget.
 * @property {boolean} opt.conf.addColorBackground - Flag indicating whether to add a color background to the widget.
 * @property {string} opt.conf.colorBackground - The color of the background to add to the widget.
 * @property {boolean} opt.conf.sourceIgnoreEmpty - Flag indicating whether to ignore empty data from the data source.
 * @property {string} opt.conf.atribution - The attribution string for the widget.
 * @property {string} opt.conf.script - The script for the widget.
 * @property {string} opt.language - The language used for the widget.
 * @property {Object} opt.map - The map object associated with the widget.
 * @property {Object} opt.view - The view object associated with the widget.
 * @property {Object} opt.dashboard - The dashboard object associated with the widget.
 * @property {Array} opt.attributions - An array of attributions for the widget.
 * @property {string} id - The ID of the widget.
 * @property {ListenerStore} ls - A listener store for the widget.
 * @property {HTMLElement} el - The HTML element for the widget.
 * @property {HTMLElement} elButtonClose - The close button element for the widget.
 * @property {HTMLElement} elContent - The content element for the widget.
 * @property {Object} config - The configuration object for the widget (retro compatibility).
 * @property {Object} modules - The modules object for the widget.
 * @property {Array} data - The current data array for the widget
 * @property {boolean} destroyed - Flag indicating whether the widget is destroyed.
 * @property {boolean} initialized - Flag indicating whether the widget is initialized.
 */
class Widget {
  constructor(opt) {
    const widget = this;
    widget.opt = Object.assign({}, defaults, opt);
    widget.opt.conf = Object.assign({}, defaults.conf, opt.conf);
  }

  async init() {
    const widget = this;
    if (widget.initialized) {
      return;
    }
    if (widget.disabled) {
      return;
    }
    /**
     * Set init state now :
     * -> async action later
     * -> need in destroy()
     */

    widget._init = true;

    widget._ls = new ListenerStore();
    widget.id = Math.random().toString(32);
    /**
     * Build and set size
     */
    widget.build();
    widget.setSize(widget.opt.conf.height, widget.opt.conf.width);

    /**
     * Retro-compatibility
     */
    widget.config = Object.assign({}, widget, widget.opt.conf, widget.opt);

    /**
     * Eval the script, dump error in console
     */
    try {
      const register = widget.strToObj(widget.opt.conf.script);
      /**
       * Copy cb as widget method
       */
      for (const r in register) {
        widget[r] = register[r];
      }
      widget.modules = path(widget.opt, "dashboard.modules", {});
      widget.add();
    } catch (e) {
      widget.warn("code evaluation issue. Removing widget.", e);
      await widget.destroy();
    }
  }

  get disabled() {
    const widget = this;
    return path(widget, "opt.conf.disabled", false);
  }

  /**
   * Update widget data using attributes
   */
  async updateDataFromAttribute() {
    const widget = this;
    try {
      const d = path(widget.opt, "view.data.attribute.table", []);
      await widget.setData(d);
    } catch (e) {
      widget.warn("error with data from attribute", e);
    }
  }

  /**
   * Update widget data after a click
   */
  async updateDataFromLayerAtMousePosition(e) {
    const widget = this;
    try {
      const data = await widget.getWidgetDataFromLinkedView(e);
      await widget.setData(data);
    } catch (e) {
      widget.warn("error with data at mouse position", e);
    }
  }

  /**
   * Update widget data after any map rendering
   */
  async updateDataFromLayerOnRender() {
    const widget = this;
    try {
      const data = widget.getWidgetDataFromLinkedView();
      await widget.setData(data);
    } catch (e) {
      widget.warn("error with data on layer render", e);
    }
  }

  /**
   * Data from layers
   */
  getWidgetDataFromLinkedView(e) {
    const widget = this;
    const idView = path(widget.opt, "view.id", widget.id);
    const viewType = path(widget.opt, "view.type", null);

    if (!viewType || !idView) {
      return [];
    }
    const items = getLayersPropertiesAtPoint({
      map: widget.opt.map,
      type: viewType,
      point: e ? e.point : null,
      idView: idView,
    });
    return items[idView] || [];
  }
  /**
   * Instantiate widget method for setting data
   * NOTE: updateData* function are async. Make sure it's try/catched.
   */
  async setUpdateDataMethod() {
    const widget = this;
    const map = widget.opt.map;
    switch (widget.opt.conf.source) {
      case "none":
        break;
      case "viewFreqTable":
        await widget.updateDataFromAttribute();
        break;
      case "layerChange":
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: "base",
          type: "render",
          debounce: true,
          debounceTime: 300,
          callback: widget.updateDataFromLayerOnRender,
        });
        break;
      case "layerClick":
        widget.handleClick(true);
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: "base",
          type: "click",
          debounce: false,
          callback: widget.updateDataFromLayerAtMousePosition,
        });
        break;
      case "layerOver":
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: "base",
          type: "mousemove",
          debounce: true,
          callback: widget.updateDataFromLayerAtMousePosition,
        });
    }
  }

  setSize(height, width) {
    const w = this;
    w.width = width;
    w.height = height;
  }

  set width(width) {
    const w = this;
    w._width = sizeWithGutter(toDim(width));
    w.el.style.width = w.width + "px";
  }

  set height(height) {
    const w = this;
    w._height = sizeWithGutter(toDim(height));
    this.el.style.height = w.height + "px";
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get rect() {
    return this.el.getBoundingClientRect();
  }

  build() {
    const widget = this;
    const conf = widget.opt.conf;
    const title = path(widget, "opt.view._title", "");

    widget.el = el(
      "div",
      {
        class: ["noselect", "widget"],
      },
      el(
        "div",
        {
          class: ["btn-widget-group"],
          title: title,
        },
        (widget.elButtonClose = el("button", {
          class: ["btn-circle", "btn-widget", "fa", "fa-times"],
        })),
        el("button", {
          class: ["btn-circle", "btn-widget", "fa", "fa-arrows", "handle"],
        }),
      ),
      (widget.elContent = el("div", {
        class: ["widget--content", "shadow"],
        style: {
          backgroundColor: conf.addColorBackground
            ? conf.colorBackground
            : null,
        },
      })),
    );
  }

  async addToGrid() {
    const widget = this;
    return new Promise((resolve) => {
      widget.grid.on("add", resolve);
      widget.grid.add(widget.el);
    });
  }

  async add() {
    const widget = this;
    try {
      await widget.addToGrid();
      widget.ls.addListener({
        target: widget.elButtonClose,
        bind: widget,
        callback: widget.destroy,
        group: "base",
        type: "click",
      });

      /**
       * Do not wait, use promise + catch,
       * as wait would block all other widgets to render
       */
      await widget.onAdd(widget);
      await widget.setUpdateDataMethod();
    } catch (e) {
      widget.warn("adding widget failed. Will be removed", e);
      widget.destroy();
    }
  }

  get grid() {
    return path(this.opt, "grid", {});
  }
  get ls() {
    return this._ls;
  }
  get dashboard() {
    return path(this.opt, "dashboard", {});
  }
  get map() {
    return path(this.opt, "map", {});
  }
  get view() {
    return path(this.opt, "view", {});
  }

  get destroyed() {
    return this._destroyed;
  }

  get initialized() {
    return this._init;
  }

  async destroy(skipOnRemove) {
    const widget = this;
    try {
      const dashboard = widget.dashboard;
      if (widget.destroyed) {
        return;
      }
      widget._destroyed = true;
      if (!widget.initialized) {
        return;
      }
      /**
       * Remove from grid
       */
      widget.grid.remove(widget.el);

      /**
       * Remove all listeners
       */
      widget.ls.destroy();

      /**
       * Remove elements
       */
      while (widget.el.firstElementChild) {
        widget.el.firstElementChild.remove();
      }
      widget.el.remove();

      /**
       * Remove timers if any
       */
      if (widget.timer) {
        window.clearInterval(widget.timer);
        window.clearTimeout(widget.timer);
      }
      /**
       * Don't intercept click
       */
      widget.handleClick(false);

      /*
       * Exec widget on remove
       */
      if (!skipOnRemove && isFunction(widget.onRemove)) {
        /*
         * Case normal remove
         */
        await widget.onRemove(widget);
      }

      /**
       * Remove from dashboard config
       */
      await dashboard.removeWidget(widget);
    } catch (e) {
      widget.warn("Issue when destroying widget", e);
    }
  }

  handleClick(enable) {
    const widget = this;
    const widgets = widget.dashboard.widgets;
    widget._handleClick = enable === true;
    const dashboardHandleClick = any(
      widgets.map((w) => w._handleClick === true),
    );
    /**
     * Update global click handling
     */
    setClickHandler({
      type: "dashboard",
      enable: dashboardHandleClick,
    });
  }

  setContent(c) {
    const widget = this;
    c = c || `<p> content for widget ${widget.id} </p> `;
    widget.elContent.innerHTML = c;
  }

  async setData(d) {
    const widget = this;
    if (widget._destroyed) {
      return;
    }
    const hasData = !isEmpty(d);
    const ignoreEmptyData = widget.opt.conf.sourceIgnoreEmpty;
    const triggerOnData = hasData || (!hasData && !ignoreEmptyData);
    if (triggerOnData) {
      widget.data = hasData ? await d : [];
      for (const row of widget.data) {
        for (const [key, value] of Object.entries(row)) {
          // e.g. convert $NULL to real null, to use in code
          if (!isUndefined(valuesMap[value])) {
            row[key] = valuesMap[value];
          }
        }
      }
      await widget.onData(widget, widget.data);
    }
  }

  strToObj(str) {
    const w = this;
    try {
      /**
       * Remove comments
       */
      let strToEval = str.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
      /**
       * Test if script start with function
       */
      const hasFunction = /function handler/.test(strToEval);

      if (hasFunction) {
        strToEval = strToEval.substring(
          strToEval.indexOf("{") + 1,
          strToEval.lastIndexOf("}"),
        );
      }

      const r = new Function(strToEval)();
      for (const f in r) {
        const rBind = r[f].bind(w);
        const skipIfOnRemove = f === "onRemove";
        r[f] = w.tryCatched(rBind, skipIfOnRemove);
      }
      return r;
    } catch (e) {
      w.warn(`strToObj failed. Script = ${str}. Throwing error further down`);
      // pass error further.
      throw new Error(e.message);
    }
  }

  tryCatched(fun, skipDestroy) {
    const widget = this;
    return async function (...args) {
      try {
        return fun(...args);
      } catch (e) {
        widget.warn("code error. Widget will be removed.", e);
        widget.destroy(skipDestroy);
      }
    };
  }

  warn(message, e) {
    console.warn("WIDGET ISSUE: ", message, e);
  }
}

export { Widget };

/*
 * Set dim + adding gutter size
 * @param {Number} size size
 * @param {Number} sizeGrid width/height of grid
 * @param {Number} sizeGutter gutter width
 */
function sizeWithGutter(size, sizeGrid, sizeGutter) {
  var s = size * 1 || 100;
  var gu = sizeGutter / 2 || 5;
  var gr = sizeGrid * 1 || 50;
  return s + (s / gr) * gu - gu;
}

/**
 * Backward compability for classes
 */
function toDim(dim) {
  var oldClasses = {
    x50: 50,
    x1: 150,
    x2: 300,
    x3: 450,
    x4: 600,
    y50: 50,
    y1: 150,
    y2: 300,
    y3: 450,
    y4: 600,
  };
  return dim * 1 ? dim : oldClasses[dim] || 100;
}
