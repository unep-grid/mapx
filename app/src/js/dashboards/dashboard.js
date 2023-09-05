import { Widget } from "./widget.js";
import { ButtonPanel } from "./../button_panel";
import { modulesLoad } from "./../modules_loader_async";
import { all } from "./../mx_helper_misc.js";
import { el, elAuto, elSpanTranslate } from "./../el_mapx";
import Muuri from "muuri";
import "./style.less";
import { waitFrameAsync } from "../animation_frame/index.js";
import { EventSimple } from "../event_simple";
import { isNotEmpty } from "../is_test";
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
      horizontal: true,
      fillGaps: true,
      alignRight: true,
      alignBottom: true,
      rounding: true,
    },
  },
  panel: {
    id : "dashboard_panel",
    panelFull: true,
    elContainer: document.body,
    title_text: "",
    title_lang_key: "",
    button_text: "",
    button_lang_key: "button_dashboard_panel",
    button_classes: ["fa", "fa-pie-chart"],
    tooltip_position: "top-left",
    container_classes: ["button-panel--container-no-full-height"],
    on_open_close_others : ["controls_panel"],
    position: "bottom-right",
    add_footer: true,
  },
};


class Dashboard extends EventSimple {
  constructor(opt) {
    super();
    const d = this;
    d.opt = {};
    for (const k in defaults) {
      d.opt[k] = Object.assign({}, defaults[k], opt[k]);
    }
    d.init();
  }

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
      d.panel.height = "50vh";
    }
    d.panel.elPanelContent.appendChild(d.elDashboard);
    d.panel.on("resize", () => {
      d.updateGridLayout();
    });
    d.panel.on("open", () => {
      d.show();
    });
    d.panel.on("close", () => {
      d.hide();
    });

    /**
     * If the dashboard panel is automatically resizing,
     * fit to widgets
     */
    d.panel.on("resize-auto", (type) => {
      if (type === "half-width") {
        d.fitPanelToWidgetsWidth();
      }
      if (type === "half-height") {
        d.fitPanelToWidgetsHeight();
      }
    });

    /*
     * Grid
     */
    d.grid = new Muuri(d.elDashboard, d.opt.grid);

    /**
     * Init event
     */

    d.fire("init");
  }

  /**
   * Process widgets configuration
   * @param {Object} conf Configuration
   * @param {Array} conf.widgets Widgets data
   * @param {Array} conf.modules Modules name , e.g. ["d3"]
   * @param {Object} conf.vie  View object
   * @param {Object} conf.map mapbox gl map instance
   * @param {Object} conf.view view instance
   * @return {Array} array of widgets
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
     * Layout update
     */
    await waitFrameAsync();
    d.updateAttributions();
    d.updatePanelLayout();
    d.updateGridLayout();

    /**
     * Return only added widgets
     */
    return widgets;
  }

  isVisible() {
    const d = this;
    return d.panel.isVisible();
  }

  isActive() {
    const d = this;
    return d.panel.isActive();
  }

  show() {
    const d = this;
    if (d._open === false) {
      d._open = true;
      d.panel.open();
      d.grid.show(d.grid.getItems());
      d.updateGridLayout();
      d.fire("show");
    }
  }

  hide() {
    const d = this;
    if (d._open === true) {
      d._open = false;
      d.panel.close();
      d.grid.hide(d.grid.getItems());
      d.fire("hide");
    }
  }

  toggle() {
    const d = this;
    d.panel.toggle();
    d.fire("toggle");
  }

  updatePanelLayout() {
    const d = this;
    const layout = d.opt.dashboard.layout;
    switch (layout) {
      case "fit":
        d.fitPanelToWidgets();
        break;
      case "vertical":
        d.panel.resizeAuto("half-width");
        break;
      case "horizontal":
        d.panel.resizeAuto("half-height");
        break;
      case "full":
        d.panel.resizeAuto("full");
        break;
      default:
        d.fitPanelToWidgets();
    }
  }

  updateGridLayout() {
    const d = this;
    d.grid.refreshItems().layout();
  }

  fitPanelToWidgets() {
    const d = this;
    d.fitPanelToWidgetsWidth();
    d.fitPanelToWidgetsHeight();
  }

  fitPanelToWidgetsWidth() {
    const d = this;
    if (d.panel.isSmallWidth()) {
      return;
    }
    const m = d.opt.dashboard.marginFitWidth;
    const wmax = d.widgets.reduce((a, w) => {
      const ww = w.width;
      return ww > a ? ww : a;
    }, 0);
    if (wmax > 0 && wmax !== d.panel.width + m) {
      d.panel.width = wmax + m;
    }
  }

  fitPanelToWidgetsHeight() {
    const d = this;
    if (d.panel.isSmallHeight()) {
      return;
    }
    const m = d.opt.dashboard.marginFitHeight;
    const hmax = d.widgets.reduce((a, w) => {
      const hw = w.height;
      return hw > a ? hw : a;
    }, 0);
    if (hmax > 0 && hmax !== d.panel.height + m) {
      d.panel.height = hmax + m;
    }
  }
  isDestroyed() {
    return this._destroyed;
  }

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

  async removeWidgets() {
    const d = this;
    while (d.widgets.length) {
      const id = d.widgets.length - 1;
      await d.widgets[id].destroy();
      d.widgets.pop();
    }
    d.updateGridLayout();
  }

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

  allWidgetsDisabled() {
    const d = this;
    const disabled = [];
    for (const w of d.widgets) {
      disabled.push(w.disabled);
    }
    return all(disabled);
  }

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

  shakeButton(opt) {
    const d = this;
    d.panel.shakeButton(opt);
  }
}

export { Dashboard };
