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
  isElement,
  isEmpty,
  isFunction,
  isNotEmpty,
  isNumeric,
  isUndefined,
} from "./../is_test/index.js";
import { settings } from "../settings/index.js";
import { EventSimple } from "../event_simple/index.js";
import { Dashboard } from "./index.js";
import { modalSimple } from "../mx_helper_modal.js";
import { moduleLoad } from "../modules_loader_async/index.js";
import { theme } from "../init_theme.js";
import { elButtonFa } from "../el_mapx/index.js";
import { onNextFrame } from "../animation_frame/index.js";
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
    attribution: "",
    hanlders: null,
    script: `function handler() {
      return {
      onAdd: console.log,
        onRemove: console.log,
        onData: console.log
        }
    }`,
  },
  // internal conf
  language: "en",
  map: null,
  view: null,
  dashboard: null,
  attributions: [],
  animDurationMs: 350,
};

/**
 * Widget class for the MapX app
 */
class Widget extends EventSimple {
  /**
   * Constructor for the Widget class
   * @param {Object} opt - Configuration options for the widget.
   * @public
   */
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
      ...opt.confWidget,
      ...opt.confDashboard,
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

  /**
   * Gets the merged configuration.
   * @returns {Object} - The widget configuration.
   * @public
   */
  get config() {
    return this._config;
  }

  /**
   * Legacy method to access the configuration.
   * @returns {Object} - The widget configuration.
   * @public
   */
  get opt() {
    return this.config;
  }

  /**
   * Access to dashboard lazy-loaded modules.
   * @returns {Object} - Dashboard modules.
   * @public
   */
  get modules() {
    return this.dashboard.modules;
  }

  /**
   * Initializes the widget.
   * @returns {Promise<void>}
   * @internal
   */
  async init() {
    const widget = this;
    try {
      if (
        widget.ready ||
        widget.initializing ||
        widget.disabled ||
        widget.destroyed
      ) {
        return;
      }
      const { dashboard } = widget;
      /**
       * Set init state now :
       * -> async action later
       * -> need in destroy()
       */
      widget._init = true;
      widget._ls = new ListenerStore();

      widget.on(["destroyed", "ready"], () => {
        if (dashboard.isOpen()) {
          dashboard.updatePanelLayout();
        } else {
          dashboard.once("show", () => {
            dashboard.updatePanelLayout();
          });
        }
      });

      /**
       *  Set handlers
       */
      widget.updateHandlers();

      /**
       * Build and set size
       */
      widget.build();

      dashboard.elDashboard.appendChild(widget.el);
      dashboard.widgets.push(widget);

      widget.updateSize(false);

      await widget.onAdd(widget); //script cb
      await widget.setUpdateDataMethod();
      widget._ready = true;
      widget.fire("ready");
    } catch (e) {
      widget.warn("code evaluation issue. Removing widget.", e);
      await widget.destroy();
    }
  }

  /**
   * Updates event handlers.
   * @internal
   */
  updateHandlers() {
    const widget = this;
    /**
     * Attach handlers
     * - from config onAdd, onData, onRemove
     * - from script
     */
    const handlers = widget.hasHandlers
      ? widget.config.handlers
      : widget.strToObj(widget.config.script);
    const handlersKeys = ["onAdd", "onRemove", "onData"];
    for (const key of handlersKeys) {
      const handler = handlers[key];
      if (isFunction(handler)) {
        widget[key] = handlers[key];
      }
    }
  }

  /**
   * Checks if the widget has handlers.
   * @returns {boolean}
   * @internal
   */
  get hasHandlers() {
    return isNotEmpty(this.config.handlers);
  }

  /**
   * Placeholder for onData/onAdd/inRemove handlers.
   * @returns {Promise<void>}
   * @internal
   */
  async onData() {}
  async onAdd() {}
  async onRemove() {}

  /**
   * Checks if the widget is disabled.
   * @returns {boolean}
   * @public
   */
  get disabled() {
    const widget = this;
    return path(widget, "config.disabled", false);
  }

  /**
   * Gets the latest stored data.
   * @returns {Object}
   * @public
   */
  get data() {
    // some widget expects 'null' if nodata.
    return this._data;
  }

  /**
   * Sets the latest stored data.
   * @param {Object} value - Data to set.
   * @internal
   */
  set data(value) {
    this._data = value;
  }

  /**
   * Updates widget data from attributes.
   * @returns {Promise<void>}
   * @internal
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
   * Updates widget data from mouse click position.
   * @param {Event} e - Event object.
   * @returns {Promise<void>}
   * @internal
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
   * Updates widget data on layer render.
   * @returns {Promise<void>}
   * @internal
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
   * Gets data from linked view layers.
   * @param {Event} [e] - Event object.
   * @returns {Promise<Object[]>}
   * @internal
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
   * Sets the method for updating data.
   * @returns {Promise<void>}
   * @internal
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

  /**
   * Updates the widget size.
   * @internal
   */
  updateSize() {
    const widget = this;
    const r = widget.setSize(widget.config.height, widget.config.width);
    return r;
  }

  /**
   * Sets the widget size.
   * @param {string|number} height - Height of the widget.
   * @param {string|number} width - Width of the widget.
   * @internal
   */
  setSize(height, width) {
    const w = this;
    w.width = width;
    w.height = height;
    w.fire("resize");
  }

  /**
   * Sets the widget width.
   * @param {string|number} width - Width of the widget.
   * @internal
   */
  set width(width) {
    const w = this;
    w.el.style.width = w.toCSS(width, "width");
  }

  /**
   * Sets the widget height.
   * @param {string|number} height - Height of the widget.
   * @internal
   */
  set height(height) {
    const w = this;
    w.el.style.height = w.toCSS(height, "height");
  }

  /**
   * Gets the widget width.
   * @returns {number} - Width of the widget.
   * @internal
   */
  get width() {
    return this.rect.width;
  }

  /**
   * Gets the widget height.
   * @returns {number} - Height of the widget.
   * @internal
   */
  get height() {
    return this.rect.height;
  }

  /**
   * Gets the widget's bounding rectangle.
   * @returns {DOMRect} - Bounding rectangle of the widget.
   * @internal
   */
  get rect() {
    return this.el.getBoundingClientRect();
  }

  /**
   * Builds the widget's DOM structure.
   * @internal
   */
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

    widget.elButtonEdit = el("button", {
      class: ["btn-circle", "btn-widget", "fa", "fa-pencil-square-o"],
      on: [
        "click",
        async () => {
          await widget.editCode();
        },
      ],
    });

    const buttons = [widget.elButtonClose];

    if (!widget.hasHandlers) {
      buttons.push(widget.elButtonEdit);
    }

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
        buttons,
      ),
      [widget.elContent],
    );
  }

  /**
   * Gets the listener store.
   * @returns {ListenerStore}
   * @internal
   */
  get ls() {
    return this._ls;
  }

  /**
   * Gets the dashboard.
   * @returns {Object}
   * @public
   */
  get dashboard() {
    return path(this.config, "dashboard", {});
  }

  /**
   * Checks if the dashboard exists.
   * @returns {boolean}
   * @internal
   */
  get hasDashboard() {
    return this.dashboard instanceof Dashboard;
  }

  /**
   * Gets the map.
   * @returns {Object}
   * @public
   */
  get map() {
    return path(this.config, "map", {});
  }

  /**
   * Gets the linked view.
   * @returns {Object}
   * @public
   */
  get view() {
    return path(this.config, "view", {});
  }

  /**
   * Checks if the widget is destroyed.
   * @returns {boolean}
   * @public
   */
  get destroyed() {
    return this._destroyed;
  }

  /**
   * Checks if the widget is ready.
   * @returns {boolean}
   * @public
   */
  get ready() {
    return this._ready;
  }
  /**
   * Legacy method to check if the widget is ready.
   * @returns {boolean}
   * @internal
   */
  get initialized() {
    return this.ready;
  }

  /**
   * Checks if the widget is initializing.
   * @returns {boolean}
   * @internal
   */
  get initializing() {
    return this._init;
  }

  /**
   * Shows the code editor for the widget.
   * @returns {Promise<void>}
   * @internal
   */
  async editCode() {
    const w = this;
    if (w._code_modal) {
      console.warn("Only one isntance per widget");
      return;
    }
    w._el_code = el("div", {
      style: {
        width: "100%",
        height: "100%",
      },
    });
    const elBtnPreview = elButtonFa("preview", {
      icon: "refresh",
      action: async () => {
        await w.onRemove(w);
        const script = w._code_editor.getValue();
        w.config.script = script;
        w.updateHandlers();
        await w.onAdd(w);
      },
    });
    w._code_modal = modalSimple({
      addBackground: false,
      title: "Widget Code Preview",
      content: w._el_code,
      onClose: () => {
        w._code_editor.dispose();
        delete w._code_modal;
      },
      buttons: [elBtnPreview],
      style: {
        height: "500px",
      },
      onResize: () => {
        w._code_editor.layout();
      },
    });
    // load late to show the modal first, then the editor
    const monaco = await moduleLoad("monaco-editor");
    w._code_editor = monaco.editor.create(w._el_code, {
      value: w.config.script,
      language: "javascript",
      theme: theme.isDarkMode() ? "vs-dark" : "vs-light",
    });
  }

  /**
   * Destroys the widget.
   * @param {boolean} [skipOnRemove] - Whether to skip the onRemove handler.
   * @returns {Promise<void>}
   * @internal
   */
  async destroy(skipOnRemove) {
    const widget = this;
    try {
      if (widget.destroyed) {
        return;
      }
      widget._destroyed = true;
      if (!widget.initializing) {
        return;
      }
      const { dashboard } = widget;

      if (widget._code_modal) {
        widget._code_modal.close();
      }

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
      widget.fire("destroyed");

      /**
       * Destroy parent
       */
      super.destroy();
    } catch (e) {
      widget.warn("Issue when destroying widget", e);
    }
  }

  /**
   * Sets the click handler.
   * @param {boolean} enable - Whether to enable the click handler.
   * @internal
   */
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

  /**
   * Sets the widget content.
   * @param {string|Element} c - Content to set.
   * @public
   */
  setContent(c) {
    const widget = this;
    widget.clearContent();
    if (isElement(c)) {
      widget.elContent.appendChild(c);
    } else {
      widget.elContent.innerHTML = c;
    }
  }

  /**
   * Clear content
   * @internal
   */
  clearContent() {
    const widget = this;
    while (widget.elContent.firstElementChild) {
      widget.elContent.removeChild(widget.elContent.firstElementChild);
    }
  }

  /**
   * Sets the data for the widget.
   * @param {Object} d - Data to set.
   * @returns {Promise<void>}
   * @public
   */
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

  /**
   * Parses a script string into an object.
   * @param {string} str - Script string to parse.
   * @returns {Object}
   * @internal
   */
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

  /**
   * Wrapper to catch errors in functions.
   * @param {Function} fun - Function to wrap.
   * @param {boolean} [skipDestroy] - Whether to skip destroying on error.
   * @returns {Function}
   * @internal
   */
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

  /**
   * Logs a warning message.
   * @param {string} message - Warning message.
   * @param {Error} e - Error object.
   * @internal
   */
  warn(message, e) {
    const widget = this;
    console.warn("WIDGET ISSUE: ", message, e, widget);
  }

  /**
   * Converts a dimension to a CSS value.
   * @param {string|number} dimension - The dimension value.
   * @param {string} type - The type of dimension (width/height).
   * @returns {string} - CSS dimension value.
   * @internal
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
      return `${w.dashboard.snapGrid(dimension)}px`;
    }

    if (oldClasses[dimension]) {
      return `${w.dashboard.snapGrid(oldClasses[dimension])}px`;
    }

    let output = 0;
    switch (dimension) {
      case "fit_content":
        const dim_f = w.dashboard.snapGrid(getContentSize(w.el, false)[type]);
        output = `${dim_f}px`;
        break;
      case "fit_dashboard":
        const margin = w.dashboard.gutterSize * 2;
        output = `calc(100% - ${margin}px)`;
        break;
      default:
        output = "auto";
    }
    return output;
  }
}

export { Widget };
