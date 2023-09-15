import Muuri from "muuri";
import { Widget } from "./widget.js";
import { ButtonPanel } from "./../button_panel";
import { modulesLoad } from "./../modules_loader_async";
import { all } from "./../mx_helper_misc.js";
import { el, elAuto, elSpanTranslate } from "./../el_mapx";
import "./style.less";
import { EventSimple } from "../event_simple";
import { isEmpty, isNotEmpty } from "../is_test";
import { bindAll } from "../bind_class_methods/index.js";

/**
 * Default options for the Dashboard.
 * @type {Object}
 */
const defaults = {
  dashboard: {
    widgets: [],
    modules: [],
    language: "en",
    marginFitWidth: 20,
    marginFitHeight: 50,
    layout: "fit",
  },
  grid: {
    dragEnabled: true,
    dragHandle: ".handle",
    dragSortPredicate: {
      action: "move",
      threshold: 10,
    },
    layout: {
      horizontal: false,
      fillGaps: true,
      alignRight: true,
      alignBottom: true,
      rounding: true,
    },
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
    on_open_close_others: ["controls_panel"],
    position: "bottom-right",
    add_footer: true,
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
    d.opt = {};
    for (const k in defaults) {
      d.opt[k] = Object.assign({}, defaults[k], opt[k]);
    }
    bindAll(d);
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
    d._open = false;
    d.modules = {};
    d.widgets = [];
    d.elDashboard = el("div", { class: "dashboard" });

    /*
     * Panel
     */
    d.panel = new ButtonPanel(d.opt.panel);
    if (d.panel.isSmallHeight()) {
      d.panel.setHeight("50vh", true);
    }
    d.panel.elPanelContent.appendChild(d.elDashboard);

    d.panel.on("open", () => {
      d.show("panel open");
    });
    d.panel.on("close", () => {
      d.hide();
    });

    /**
     * If the panel is resized
     *  -> updateGridLayout
     */
    d.panel.on(["resize", "resize-auto", "resize-end"], () => {
      d.updateGridLayout();
    });

    /*
     * Grid
     */
    d.grid = new Muuri(d.elDashboard, d.opt.grid);
    d.grid.on("layoutEnd", () => {
      d.fitPanelToWidgetsBbox(true, false);
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
   * @param {Object} conf - Configuration for the widgets.
   * @param {Array} conf.widgets - Widgets data.
   * @param {Array} conf.modules - Names of the modules e.g. ["d3"].
   * @param {Object} conf.map - Mapbox gl map instance.
   * @param {Object} conf.view - View instance.
   * @returns {Promise<Array>} Returns a promise that resolves to an array of widgets.
   */
  async addWidgetsAsync(conf) {
    const d = this;
    const widgets = [];
    /**
     * Store modules
     */
    let idM = 0;

    conf = Object.assign({}, { modules: [] }, conf);

    const modulesNames = new Set(conf.modules);

    /**
     * TODO: remove this hack after v 1.10.0 is in prod
     * Fix missing modules
     * NOTE: some dashboards have been coded using `modules.highcharts`, without
     * using the checkbox select to list modules to load, due to a glitch were
     * some modules where automatically loaded. e.g. highcharts;
     */
    const reg = /(?<=modules\.)\w+/g;
    for (const cw of conf.widgets) {
      const script = cw.script;
      if (isNotEmpty(script)) {
        const modulesFound = script.match(reg) || [];
        for (const module of modulesFound) {
          if (!conf.modules.includes(module)) {
            console.warn(
              `Module ${module} apparently used, but not registered`
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
    const attributions = [];

    for (const name of modulesNames) {
      const module = modules[idM++];
      d.modules[name] = module;
      /**
       * Add credits / attributions
       */
      if (module._attrib_info) {
        attributions.push(module._attrib_info);
      }
    }

    /**
     * Build widgets
     */
    const promWidgets = [];
    for (const cw of conf.widgets) {
      if (!cw.disabled) {
        const widget = new Widget({
          conf: cw,
          grid: d.grid,
          dashboard: d,
          modules: d.modules,
          view: conf.view,
          map: conf.map,
          attributions: attributions,
        });
        d.widgets.push(widget);
        widget._id = conf.view.id;
        widgets.push(widget);
        promWidgets.push(widget.init());
      }
    }
    await Promise.all(promWidgets);

    /**
     * Return only added widgets
     */
    return widgets;
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
   * Checks if the dashboard is active.
   * @returns {boolean} - True if active, false otherwise.
   */
  isActive() {
    const d = this;
    return d.panel.isActive();
  }

  /**
   * Shows the dashboard.
   * @async
   */
  async show() {
    const d = this;
    if (d._open === true) {
      return;
    }
    d._open = true;
    d.panel.open();
    d.grid.show(d.grid.getItems());
    d.fire("show");
  }

  /**
   * Hides the dashboard.
   */
  hide() {
    const d = this;
    if (d._open === false) {
      return;
    }
    d._open = false;
    d.panel.close();
    d.grid.hide(d.grid.getItems());
    d.fire("hide");
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
   * Updates the layout of the panel.
   * @param {boolean} animate - If true, animates the layout change.
   */
  updatePanelLayout(animate = false) {
    const d = this;
    const layout = d.opt.dashboard.layout;
    switch (layout) {
      case "fit":
        d.fitPanelToWidgets(animate);
        break;
      case "vertical":
        d.panel.resizeAuto("full-height", animate);
        break;
      case "horizontal":
        d.panel.resizeAuto("full-width", animate);
        break;
      case "full":
        d.panel.resizeAuto("full", true, true);
        break;
      case "auto":
      default:
        d.fitPanelToWidgetsAuto(animate);
        break;
    }

    d.fire("panel_layout");
  }

  /**
   * Updates the layout of the grid.
   * @param {boolean} animate - If true, animates the layout change.
   */
  updateGridLayout(animate = true) {
    const d = this;
    d.grid.layout();
    d.grid.refreshItems().layout(!animate);
  }

  /**
   * Updates the panel: size to the largest widget
   * @param {boolean} animate
   * @param {boolean} silent - Don't fire event
   */
  fitPanelToWidgets(animate = true, silent = false) {
    const d = this;
    d.fitPanelToWidgetsHeight(animate, silent);
    d.fitPanelToWidgetsWidth(animate, silent);
  }

  /**
   * Updates the panel: size to the widgets bounding box
   * @param {boolean} animate
   * @param {boolean} silent - Don't fire event
   */
  fitPanelToWidgetsBbox(animate = false, silent = false) {
    const d = this;
    const layout = d.opt.dashboard.layout;

    if (layout === "fit" || layout === "full") {
      // don't resize panel when  'fit' or 'full'
      return;
    }

    d.panel.setAnimate(animate);
    const marginW = d.opt.dashboard.marginFitWidth;
    const marginH = d.opt.dashboard.marginFitHeight;
    const bbox = { top: null, left: null, right: null, bottom: null };

    for (const widget of d.widgets) {
      const r = widget.rect;
      if (isEmpty(bbox.top)) {
        for (const p of Object.keys(bbox)) {
          bbox[p] = r[p];
        }
      } else {
        bbox.top = r.top < bbox.top ? r.top : bbox.top;
        bbox.left = r.left < bbox.left ? r.left : bbox.left;
        bbox.bottom = r.bottom > bbox.bottom ? r.bottom : bbox.bottom;
        bbox.right = r.right > bbox.right ? r.right : bbox.right;
      }
    }
    const wBbox = bbox.right - bbox.left + marginW;
    const hBbox = bbox.bottom - bbox.top + marginH;

    if (wBbox > 0 && wBbox !== d.panel.width) {
      d.panel.setWidth(wBbox, silent);
    }
    if (hBbox > 0 && hBbox !== d.panel.height) {
      d.panel.setHeight(hBbox, silent);
    }
  }

  /**
   * Updates the panel: size to the widest widget
   * @param {boolean} animate
   */
  fitPanelToWidgetsWidth(animate) {
    const d = this;
    if (d.panel.isSmallWidth()) {
      return;
    }
    d.panel.setAnimate(animate);
    const m = d.opt.dashboard.marginFitWidth;
    const wmax = d.widgets.reduce((a, w) => {
      const ww = w.width;
      return ww > a ? ww : a;
    }, 0);
    if (wmax > 0 && wmax !== d.panel.width + m) {
      d.panel.width = wmax + m;
    }
  }

  /**
   * Updates the panel: size to the highest widget
   * @param {boolean} animate
   */
  fitPanelToWidgetsHeight(animate) {
    const d = this;
    if (d.panel.isSmallHeight()) {
      return;
    }
    d.panel.setAnimate(animate);
    const m = d.opt.dashboard.marginFitHeight;
    const hmax = d.widgets.reduce((a, w) => {
      const hw = w.height;
      return hw > a ? hw : a;
    }, 0);
    if (hmax > 0 && hmax !== d.panel.height + m) {
      d.panel.height = hmax + m;
    }
  }

  /**
   * Updates the panel: half sum height / width.
   * @param {boolean} animate
   */
  fitPanelToWidgetsAuto(animate) {
    const d = this;
    if (d.panel.isSmallHeight() || d.panel.isSmallWidth()) {
      return;
    }
    d.panel.setAnimate(animate);
    const m = d.opt.dashboard.marginFitHeight;
    const htot = d.widgets.reduce((a, w) => {
      return (a += w.height);
    }, 0);

    const wtot = d.widgets.reduce((a, w) => {
      return (a += w.width);
    }, 0);

    d.panel.height = wtot / 2 + m;
    d.panel.width = htot / 2 + m;
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
    d.grid.destroy();
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
    d.updateGridLayout();
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
    d.updateGridLayout();
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
          "view_dashboard_attribution_made_with"
        );
        d.panel.elFooter.appendChild(elAttributionLabel);
      }
      const elAttribution = el(
        "span",
        { class: "button-panel--item-footer-attribution" },
        elAuto("url", a.homepage, {
          urlDefaultLabel: a.name,
          urlDefaultTitle: a.description,
        })
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
        html
      );
      d.panel.elFooter.appendChild(elAttribution);
    }
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
