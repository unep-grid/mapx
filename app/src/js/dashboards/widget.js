import { el } from "./../el/src/index.js";
import { ListenerStore } from "./../listener_store/index.js";
import {
  path,
  any,
  setClickHandler,
  getContentSize,
  makeId,
} from "./../mx_helper_misc.js";
import { getLayersPropertiesAtPoint } from "./../map_helpers/index.js";
import {
  isEmpty,
  isFunction,
  isNotEmpty,
  isNumeric,
  isUndefined,
} from "./../is_test/index.js";
import { settings } from "../settings/index.js";
import { EventSimple } from "../event_simple/index.js";
const { valuesMap } = settings;

/**
 * Widget method
 */

const defaults = {
  // user conf ( will be merged)
  conf: {
    disabled: false,
    source: "none",
    alwaysOnTop: false,
    width: "x50",
    height: "y50",
    style: null,
    addColorBackground: false,
    colorBackground: "#000000",
    sourceIgnoreEmpty: true,
    atribution: "",
    hanlders: null,
    script:
      "return { async onAdd:console.log, async onRemove:console.log, async onData:console.log}",
  },
  // internal conf
  language: "en",
  map: null,
  view: null,
  dashboard: null,
  attributions: [],
  animDurationMs: 350,
  gutterSize: 5,
};

/**
 * A widget class that provides a customizable UI element for displaying and manipulating data.
 * @class
 * @property {Object} opt - Widget options.
 * @property {Object} opt.conf - Widget user configuration.
 * @property {Object} opt.priority - Priority. Higher priority move the widget on top
 * @property {boolean} opt.conf.disabled - Flag indicating whether the widget is disabled.
 * @property {string} opt.conf.source - The source of data for the widget.
 * @property {string} opt.conf.width - The width of the widget.
 * @property {string} opt.conf.height - The height of the widget.
 * @property {boolean} opt.conf.addColorBackground - Flag indicating whether to add a color background to the widget.
 * @property {string} opt.conf.colorBackground - The color of the background to add to the widget.
 * @property {boolean} opt.conf.sourceIgnoreEmpty - Flag indicating whether to ignore empty data from the data source.
 * @property {string} opt.conf.atribution - The attribution string for the widget.
 * @property {string} opt.conf.script - The script of handlers for the widget.
 * @property {string} opt.conf.handlers - The handlers for the widget.
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
class Widget extends EventSimple {
  constructor(opt) {
    super();
    const widget = this;
    widget.id = makeId(5);

    /**
     * Merge config
     * - default user config
     * - user config
     */
    opt.conf = {
      ...defaults.conf,
      ...opt.conf,
    };

    /**
     * All config
     */
    widget._config = {
      ...defaults,
      ...opt,
      ...opt.conf,
    };
  }

  get config() {
    return this._config;
  }
  get opt() {
    return this.config;
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

    /**
     * Build and set size
     */
    widget.build();
    widget.setGutterSize();

    /**
     * Adjust dashboard grid layout after resize
     * - avoid updating the layout, to avoid layout shift 
     * - updating the grid to make sure widgets don't overlap
     */
    widget.on("set_size", () => {
      const d = widget.dashboard;
      if (!d) {
        return;
      }
      d.updateGridLayout(true, false, "widget::set_size");
    });

    /**
     * Eval the script, dump error in console
     */
    try {
      const handlers =
        widget.config.handlers || widget.strToObj(widget.config.script);
      /**
       * Set/replace handler as widget method
       * - onAdd,onRemove,onData
       */
      const handlersKeys = ["onAdd", "onRemove", "onData"];
      for (const key of handlersKeys) {
        const handler = handlers[key];
        if (isFunction(handler)) {
          widget[key] = handlers[key];
        }
      }
      widget.modules = path(widget.config, "dashboard.modules", {});

      await widget.add();

      widget._ready = true;
    } catch (e) {
      widget.warn("code evaluation issue. Removing widget.", e);
      await widget.destroy();
    }
  }

  /**
   * Will be replaced by handlers, set in option or script
   */
  async onData() {}
  async onAdd() {}
  async onRemove() {}

  /**
   * Update anim duration
   */
  setAnimateDuration(ms) {
    const w = this;
    ms = isEmpty(ms) ? w.config.animDurationMs : ms;
    w.el.style.setProperty("--animate-transition-ms", `${ms}ms`);
  }

  /**
   * Update anim duration
   */
  setGutterSize(size) {
    const w = this;
    w._gutter_size = isEmpty(size) ? w.gutterSize : size;
    w.el.style.setProperty("--gutter-size", `${w.gutterSize}px`);
  }

  get gutterSize() {
    const w = this;
    return this._gutter_size || w.config.gutterSize;
  }

  /**
   * Check if the widgetr is disabled
   */
  get disabled() {
    const widget = this;
    return path(widget, "config.disabled", false);
  }

  /**
   * Get/Set the latest stored data
   * - some widgets requires this to be 'null'
   * - don't attempt to set a default, like []
   */
  get data() {
    return this._data;
  }

  set data(value) {
    this._data = value;
  }

  /**
   * Update widget data using attributes
   */
  async updateDataFromAttribute() {
    const widget = this;
    try {
      const d = path(widget.config, "view.data.attribute.table", []);
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
      const data = await widget.getWidgetDataFromLinkedView();
      await widget.setData(data);
    } catch (e) {
      widget.warn("error with data on layer render", e);
    }
  }

  /**
   * Data from layers
   */
  async getWidgetDataFromLinkedView(e) {
    const widget = this;
    const idView = path(widget.config, "view.id", widget.id);
    const viewType = path(widget.config, "view.type", null);

    if (!viewType || !idView) {
      return [];
    }
    const items = getLayersPropertiesAtPoint({
      map: widget.config.map,
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
    const map = widget.config.map;
    switch (widget.config.source) {
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
        widget.handleClick(true);
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

  updateSize(animate = true) {
    const widget = this;
    widget.setSize(widget.config.height, widget.config.width, animate);
  }

  setSize(height, width, animate = true) {
    const w = this;
    if (animate) {
      w.setAnimateDuration();
    }
    w.width = width;
    w.height = height;
    w.fire("set_size");
  }

  set width(width) {
    const w = this;
    w.el.style.width = w.toCSS(width, "width");
    w.fire("set_size_width");
  }

  set height(height) {
    const w = this;
    w.el.style.height = w.toCSS(height, "height");
    w.fire("set_size_height");
  }

  get width() {
    return this.rect.width;
  }

  get height() {
    return this.rect.height;
  }

  get rect() {
    return this.el.getBoundingClientRect();
  }

  build() {
    const widget = this;
    const title = path(widget, "config.view._title", "");

    widget.elButtonClose = el("button", {
      class: ["btn-circle", "btn-widget", "fa", "fa-times"],
      on: [
        "click",
        () => {
          this.destroy();
        },
      ],
    });

    widget.elContent = el("div", {
      class: ["widget--content", "shadow"],
      style: {
        backgroundColor: widget.config.addColorBackground
          ? widget.config.colorBackground
          : null,
      },
    });

    widget.elButtonHandle = el("button", {
      class: ["btn-circle", "btn-widget", "fa", "fa-arrows", "handle"],
    });

    widget.el = el(
      "div",
      {
        class: ["noselect", "widget"],
        style: widget.config.style,
      },
      el(
        "div",
        {
          class: ["btn-widget-group"],
          title: title,
        },
        [widget.elButtonClose, widget.elButtonHandle],
      ),
      [widget.elContent],
    );
  }

  async addToGrid() {
    const widget = this;
    return new Promise((resolve) => {
      widget.grid.on("add", resolve);
      widget.grid.add(widget.el);
      if (isNotEmpty(widget.config.priority)) {
        widget.grid.move(widget.el, widget.config.priority);
      }
    });
  }
  /**
   * Add the widget
   * Do not wait, use promise + catch,
   * as wait would block all other widgets to render
   */
  async add() {
    const widget = this;
    try {
      await widget.addToGrid();
      // size can be requested by widget cb 'onAdd'
      widget.updateSize();
      await widget.onAdd(widget); //script cb
      await widget.setUpdateDataMethod();
      widget.fire("added");
    } catch (e) {
      widget.warn("adding widget failed. Will be removed", e);
      widget.destroy();
    }
  }

  get grid() {
    return path(this.config, "grid", {});
  }
  get ls() {
    return this._ls;
  }
  get dashboard() {
    return path(this.config, "dashboard", {});
  }
  get map() {
    return path(this.config, "map", {});
  }
  get view() {
    return path(this.config, "view", {});
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
      if (widget.destroyed) {
        return;
      }
      widget._destroyed = true;
      if (!widget.initialized) {
        return;
      }
      const dashboard = widget.dashboard;
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

      /**
       * Fire destroyed event
       * ( before destroying parent, as 'fire' depend on it)
       */
      this.fire("destroyed");

      /**
       * Destroy parent
       */
      super.destroy();
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
    const ignoreEmptyData = widget.config.sourceIgnoreEmpty;
    const triggerOnData = hasData || (!hasData && !ignoreEmptyData);
    if (!triggerOnData) {
      return;
    }
    widget.data = hasData ? d : [];

    /**
     * Convert/map values
     * - e.g. convert $NULL to real null, to use in code
     */
    for (const row of widget.data) {
      for (const [key, value] of Object.entries(row)) {
        const mapedValue = valuesMap[value];
        if (!isUndefined(mapedValue)) {
          row[key] = mapedValue;
        }
      }
    }
    await widget.onData(widget, widget.data);
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
    const widget = this;
    console.warn("WIDGET ISSUE: ", message, e, widget);
  }

  /**
   * Convert dimension to CSS value
   *
   * @param {String|Number} dimension - The dimension value to set.
   * @param {String} type - The type of dimension (width/height).
   * @returns {String} CSS dimension value with units.
   */
  toCSS(dimension, type) {
    const w = this;
    const oldClasses = {
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

    if (isNumeric(dimension)) {
      return `${w.snapGrid(dimension)}px`;
    }

    if (oldClasses[dimension]) {
      return `${w.snapGrid(oldClasses[dimension])}px`;
    }

    let output = 0;
    switch (dimension) {
      case "fit_content":
        const dim_f = w.snapGrid(getContentSize(w.el, false)[type]);
        output = `${dim_f}px`;
        break;
      case "fit_dashboard":
        const margin = w.gutterSize * 2;
        output = `calc(100% - ${margin}px)`;
        break;
      default:
        output = "auto";
    }
    return output;
  }

  /*
   * Set dim + adding gutter size
   * @param {Number} size size
   * @param {Number} sizeGrid width/height of grid
   */
  snapGrid(size, sizeGrid = 50) {
    const s = this.snap(size * 1 || 100);
    const gu = this.gutterSize;
    const gr = sizeGrid;
    return s + (s / gr) * gu - gu;
  }

  /**
   * Snap the number to the nearest multiple of the given value
   * @param {Number} num - The number to snap.
   * @param {Number} [multiple=50] - The multiple to snap to.
   * @returns {Number} Snapped number.
   */
  snap(num, multiple = 10) {
    return Math.ceil(parseInt(num, 10) / multiple) * multiple;
  }
}

export { Widget };
