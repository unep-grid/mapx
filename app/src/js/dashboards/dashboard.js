import { Widget } from "./widget.js";
import { ButtonPanel } from "./../button_panel";
import { modulesLoad } from "./../modules_loader_async";
import {
  all,
  getContentSize,
  patchObject,
  throttleNowAndLast,
} from "./../mx_helper_misc.js";
import { el, elAuto, elSpanTranslate } from "./../el_mapx";
import "./style.less";
import { EventSimple } from "../event_simple";
import { bindAll } from "../bind_class_methods/index.js";
import { isEmpty, isNotEmpty } from "../is_test/index.js";

/**
 * Default options for the Dashboard.
 * @type {Object}
 */
const defaults = {
  dashboard: {
    widgets: [],
    modules: [],
    view: null,
    map: null,
    language: "en",
    gutterSize: 5,
    marginWidth: 20,
    marginHeight: 50,
    layout: "fit",
  },
  panel: {
    id: "dashboard_panel",
    panelFull: true,
    elContainer: document.body,
    title_text: "",
    title_lang_key: "",
    button_text: "",
    button_lang_key: "button_dashboard_panel",
    button_classes: ["fa", "fa-pie-chart"],
    tooltip_position: "top-left",
    container_classes: ["button-panel--container-no-full-height"],
    //handles: ["free"],
    /*
     * Close those panels when this one is open
     * on_open_close_others: ["controls_panel"],
     */
    on_open_close_others: [],
    position: "bottom-right",
    add_footer: true,
    save_size_on_resize: false,
  },
};

/**
 * A class representing a dashboard. Extends from EventSimple.
 */
class Dashboard extends EventSimple {
  /**
   * Creates a new Dashboard.
   * @param {Object} opt - Options to initialize the dashboard.
   */
  constructor(opt) {
    super();
    const d = this;
    d.opt = patchObject(defaults, opt);
    bindAll(d);
    d.updatePanelLayout = throttleNowAndLast(d.updatePanelLayout, 200);
    d.init();
  }

  /**
   * Initializes the dashboard.
   */
  init() {
    const d = this;
    if (d._init) {
      return;
    }
    d._init = true;
    d._open = false;
    d.modules = {};
    d.widgets = [];
    d._attributions = [];
    d.elDashboard = el("div", { class: "dashboard" });

    /*
     * Panel
     * - Add custom handlers. Will overwrite default panel resizes handlers,
     *   - Current panel button resizer does'nt work well with widgets
     *   - We need to handle margin and custom behavior
     * - Set default sizes
     */
    d.opt.panel.resize_handlers = {
      reset: () => {
        d.updatePanelLayout();
      },
      "half-height": () => {
        d.setPanelLayout("horizontal");
      },
      "half-width": () => {
        d.setPanelLayout("vertical");
      },
      content: () => {
        d.setPanelLayout("auto");
      },
    };

    d.panel = new ButtonPanel(d.opt.panel);

    if (d.panel.isMediaSmallHeight()) {
      d.setHeight("50vh");
    }
    d.panel.elPanelContent.appendChild(d.elDashboard);

    /**
     *  Update gutter size
     */
    d.setGutterSize();

    /**
     * Handle events
     */
    d.panel.on("open", () => {
      d.show();
    });
    d.panel.on("close", () => {
      d.hide();
    });

    /**
     * Init event
     */
    d.fire("init");

    /**
     * Debug
     */
    window._d = d;
  }

  /**
   * Adds widgets to the dashboard.
   * @async
   * @param {Object} conf - Dashboard configuration for the widgets.
   * @param {Array} conf.widgets - Widgets data.
   * @param {Array} conf.modules - Names of the modules e.g. ["d3"].
   * @param {Object} conf.map - Mapbox gl map instance.
   * @param {Object} conf.view - View instance.
   * @returns {Promise<Array>} Returns a promise that resolves to an array of widgets.
   */
  async addWidgets(conf) {
    const d = this;
    /**
     * Store modules
     */
    let idM = 0;

    conf = patchObject(d.opt.dashboard, conf);

    const modulesNames = new Set(conf.modules);

    /**
     * TODO: remove this hack after v 1.10.0 is in prod
     * Fix missing modules
     * NOTE: some dashboards have been coded using `modules.highcharts`, without
     * using the checkbox select to list modules to load, due to a glitch were
     * some modules where automatically loaded. e.g. highcharts;
     * NOTE: in v.1.13, still an issue with some old dashboards. Keep that patch.
     */
    const reg = /(?<=modules\.)\w+/g;
    for (const cw of conf.widgets) {
      const script = cw.script;
      if (isNotEmpty(script)) {
        const modulesFound = script.match(reg) || [];
        for (const module of modulesFound) {
          if (!conf.modules.includes(module)) {
            console.warn(
              `Module ${module} apparently used, but not registered`,
            );
          }
          modulesNames.add(module);
        }
      }
    }

    /**
     * Register and load modules
     */
    d.opt.dashboard.modules = Array.from(modulesNames);
    const modules = await modulesLoad(d.opt.dashboard.modules);

    for (const name of modulesNames) {
      const module = modules[idM++];
      d.modules[name] = module;
      /**
       * Add credits / attributions
       */
      if (module._attrib_info) {
        d._attributions.push(module._attrib_info);
      }
    }

    /**
     * Build widgets
     */
    const promWidgets = [];
    for (const confWidget of conf.widgets) {
      if (confWidget.disabled) {
        continue;
      }
      promWidgets.push(d.addWidget(confWidget, conf));
    }
    const widgetsAdded = await Promise.all(promWidgets);

    d.fire("widgets_added");

    /**
     * Return only added widgets
     */
    return widgetsAdded;
  }

  async addWidget(confWidget, confDashboard) {
    const dashboard = this;
    const widget = new Widget({
      confWidget,
      confDashboard,
      dashboard,
    });
    await widget.init();
    return widget;
  }

  /**
   * Update anim duration
   */
  setGutterSize(size) {
    const d = this;
    d._gutter_size = isEmpty(size) ? d.gutterSize : size;
    d.elDashboard.style.setProperty("--gutter-size", `${d.gutterSize}px`);
  }

  get gutterSize() {
    const d = this;
    return this._gutter_size || d.opt.dashboard.gutterSize;
  }

  /**
   * Checks if the dashboard is visible.
   * @returns {boolean} - True if visible, false otherwise.
   */
  isVisible() {
    const d = this;
    return d.panel.isVisible();
  }

  /**
   * Checks if the dashboard is open.
   * @returns {boolean} - True if open, false otherwise.
   */
  isOpen() {
    const d = this;
    return d.panel.isOpen();
  }

  /**
   * Same as isOpen.
   * @returns {boolean} - True if open, false otherwise.
   */
  isActive() {
    const d = this;
    return d.panel.isActive();
  }

  /**
   * Shows the dashboard.
   * -note, panel will fire 'open' after a timeout on the ainimation duration
   * @async
   */
  async show() {
    const d = this;
    if (d.isOpen()) {
      return true;
    }
    return new Promise((resolve) => {
      d.panel.once("open", () => {
        resolve(true);
      });
      d.panel.open();
      d.fire("show");
    });
  }

  /**
   * Hides the dashboard.
   * @async
   */
  async hide() {
    const d = this;
    if (!d.isOpen()) {
      return true;
    }
    return new Promise((resolve) => {
      d.panel.once("close", () => {
        resolve(true);
      });
      d.panel.close();
      d.fire("hide");
    });
  }

  /**
   * Toggles the visibility of the dashboard.
   */
  toggle() {
    const d = this;
    d.panel.toggle();
    d.fire("toggle");
  }

  /**
   * Update layout type
   */
  setLayout(type = "auto") {
    const d = this;
    d.opt.dashboard.layout = type;
  }

  /**
   * Updates the layout of the panel.
   * @returns void
   */
  updatePanelLayout() {
    const d = this;
    const layout = d.opt.dashboard.layout;
    return d.setPanelLayout(layout);
  }

  setPanelLayout(type) {
    const d = this;
    switch (type) {
      case "fit":
        d.fitPanelToWidgets();
        break;
      case "vertical":
        d.panel.resizeAuto("full-height");
        d.fitPanelToWidgetsWidth();
        break;
      case "horizontal":
        d.panel.resizeAuto("full-width");
        d.fitPanelToWidgetsHeight();
        break;
      case "full":
        d.panel.resizeAuto("full");
        break;
      case "auto":
      default:
        d.fitPanelToWidgetsAuto();
        break;
    }
    d.fire("panel_layout");
  }

  /**
   * Updates the panel: size to the largest widget
   * @returns void
   */
  fitPanelToWidgets() {
    const d = this;
    d.fitPanelToWidgetsWidth();
    d.fitPanelToWidgetsHeight();
  }

  setWidth(w) {
    const d = this;
    d.panel.setWidth(w);
  }

  setHeight(h) {
    const d = this;
    d.panel.setHeight(h);
  }

  get width() {
    const d = this;
    if (!d._init) {
      return;
    }
    return d.panel.width;
  }

  get height() {
    const d = this;
    if (!d._init) {
      return;
    }
    return this.panel.height;
  }

  /**
   * Updates the panel: size to the widest widget
   * @returns void
   */
  fitPanelToWidgetsWidth() {
    const d = this;
    if (d.panel.isMediaSmallWidth()) {
      return;
    }
    const m = d.opt.dashboard.marginWidth;
    const wmax = d.widgets.reduce((a, w) => {
      const ww = w.width;
      return ww > a ? ww : a;
    }, 0);
    d.panel.width = wmax + m;
  }

  /**
   * Updates the panel: size to the highest widget
   */
  fitPanelToWidgetsHeight() {
    const d = this;
    if (d.panel.isMediaSmallHeight()) {
      return;
    }
    const m = d.opt.dashboard.marginHeight;
    const hmax = d.widgets.reduce((a, w) => {
      const hw = w.height;
      return hw > a ? hw : a;
    }, 0);
    d.panel.height = hmax + m;
  }

  /**
   * Updates the panel: half sum height / width.
   */
  fitPanelToWidgetsAuto() {
    const d = this;
    if (d.panel.isMediaSmall()) {
      return;
    }
    const mh = d.opt.dashboard.marginHeight;
    const mw = d.opt.dashboard.marginWidth;

    const { height, width } = getContentSize(d.elDashboard, false);

    d.panel.height = height + mh;
    d.panel.width = width + mw;
  }

  /**
   * Checks if the dashboard is destroyed.
   * @returns {boolean} - True if destroyed, false otherwise.
   */
  isDestroyed() {
    return this._destroyed;
  }

  /**
   * Destroys the dashboard.
   * @async
   */
  async destroy() {
    const d = this;
    if (d.isDestroyed()) {
      return;
    }
    d._destroyed = true;
    await d.removeWidgets();
    d.clearCallbacks(); // from EventSimple
    d.panel.destroy();
    d.fire("destroy");
  }

  /**
   * Removes all widgets from the dashboard.
   * @async
   */
  async removeWidgets() {
    const d = this;
    while (d.widgets.length) {
      const id = d.widgets.length - 1;
      await d.widgets[id].destroy();
      d.widgets.pop();
    }
    d.updateAttributions();
    d.autoDestroy();
  }

  /**
   * Removes a specific widget from the dashboard.
   * @async
   * @param {Widget} widget - The widget to remove.
   */
  async removeWidget(widget) {
    const d = this;
    const pos = d.widgets.indexOf(widget);
    if (pos > -1) {
      await d.widgets[pos].destroy();
      d.widgets.splice(pos, 1);
    }
    if (d.elDashboard.contains(widget.el)) {
      d.elDashboard.removeChild(widget.el);
    }
    d.updateAttributions();
    d.autoDestroy();
  }

  /**
   * Check that all widgets are disabled
   * @returns {boolean}
   */
  allWidgetsDisabled() {
    const d = this;
    const disabled = [];
    for (const w of d.widgets) {
      disabled.push(w.disabled);
    }
    return all(disabled);
  }

  /**
   * Destroy dashboard when no widgets
   * @async
   */
  async autoDestroy() {
    const d = this;
    if (d.isDestroyed()) {
      return;
    }
    const allDisabled = d.allWidgetsDisabled();
    const destroy = d.widgets.length === 0 || allDisabled;
    if (destroy) {
      await d.destroy();
    }
  }

  /**
   * Clear atributions
   */
  clearAttributions() {
    const d = this;
    while (d.panel.elFooter.firstElementChild) {
      d.panel.elFooter.firstElementChild.remove();
    }
  }

  /**
   *  Add attributions text in panel footer
   */
  updateAttributions() {
    const d = this;
    d.clearAttributions();

    /**
     * Global attributions from module load / packages
     * -> avoid duplicates
     */
    const attributions = {};

    for (const w of d.widgets) {
      for (const a of w.opt.attributions) {
        attributions[a.name] = a;
      }
    }

    let first = true;
    for (const a of Object.values(attributions)) {
      if (first) {
        first = false;
        const elAttributionLabel = elSpanTranslate(
          "view_dashboard_attribution_made_with",
        );
        d.panel.elFooter.appendChild(elAttributionLabel);
      }
      const elAttribution = el(
        "span",
        { class: "button-panel--item-footer-attribution" },
        elAuto("url", a.homepage, {
          urlDefaultLabel: a.name,
          urlDefaultTitle: a.description,
        }),
      );
      d.panel.elFooter.appendChild(elAttribution);
    }

    /*
     * User set attribution, in widget
     * -> can be html
     */
    const widgetAttributions = [];

    for (const w of d.widgets) {
      if (w.opt.conf.attribution) {
        widgetAttributions.push(w.opt.conf.attribution);
      }
    }

    for (const html of widgetAttributions) {
      const elAttribution = el(
        "span",
        { class: "button-panel--item-footer-attribution" },
        html,
      );
      d.panel.elFooter.appendChild(elAttribution);
    }
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

  /**
   * Shake panel button, e.g. signaling an issue
   */
  shakeButton(opt) {
    const d = this;
    d.panel.shakeButton(opt);
  }
}

export { Dashboard };
