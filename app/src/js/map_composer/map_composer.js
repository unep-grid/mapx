import * as def from "./default.js";
import { Workspace } from "./components/index.js";
import { Toolbar } from "./components/index.js";
import { EditorToolbar } from "./components/text_editor.js";
import { el } from "../el/src/index.js";
import { unitConvert } from "./components/helpers";
import preset from "./data/paper-sizes.json";
import "./style/map_composer.less";
import { bindAll } from "../bind_class_methods/index.js";
const getDevicePixelRatio = Object.getOwnPropertyDescriptor(
  window,
  "devicePixelRatio"
).get;

const presetFlat = Object.keys(preset).reduce((a, c) => {
  a.push(...preset[c]);
  return a;
}, []);

export class MapComposer {
  constructor(elContainer, state, options) {
    const mc = this;
    bindAll(mc);
    window._mc = mc; // for easy access in console. To remove in prod.
    mc.options = Object.assign({}, def.options, options);
    mc.state = Object.assign({}, def.state, state);
    mc.initRoot(elContainer);
    mc.init();
  }

  init() {
    const mc = this;
    // values
    mc._preset_flat = presetFlat;

    // components
    mc.toolbar = new Toolbar(mc);
    mc.workspace = new Workspace(mc);
    mc.editor = new EditorToolbar(mc, {
      boxTarget: mc.workspace.page,
    });
    mc.page = mc.workspace.page;

    // set readiness
    mc.ready = true;

    // default
    mc.setPredefinedDim(mc.state.predefined_dim);
    mc.page.addItems();
    mc.page.placeItems();

    mc.update();
    mc.setMode(mc.state.mode);
    mc.fitMapToPage();
  }

  initRoot(elContainer) {
    const mc = this;
    if (0 && elContainer.attachShadow instanceof Function) {
      /**
       * NOTE; Render map composer in shadow dom : sounds good, doesnt work
       * HTMLtoCanvas does not work well and
       * we need to import style for building legends, fontawesome for
       * buttons, bootstrap and mapbox gl css.
       */
      elContainer.attachShadow({ mode: "open" });
      const elRoot = elContainer.shadowRoot;
      mc.el = el("div", { class: ["mc"] });
      elRoot.appendChild(mc.el);
    } else {
      mc.el = elContainer;
      mc.el.classList.add("mc");
    }

    mc.elContent = el("div", { class: ["mc-content"] });
    mc.el.appendChild(mc.elContent);
  }

  setBoxLastFocus(box) {
    const mc = this;
    const boxLast = mc._box_last_focus;
    if (boxLast) {
      boxLast.removeFocus();
    }
    box.addFocus();
    mc._box_last_focus = box;
  }
  get boxLastFocus() {
    return this._box_last_focus;
  }
  destroy() {
    const mc = this;
    mc.setDpi();
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
    mc.options.onDestroy();
  }

  /**
   * Switch state id, set state within handlers
   */
  setState(id, value) {
    const mc = this;

    switch (id) {
      case "mode":
        mc.setMode(value);
        mc.update();
        break;
      case "dpi":
        mc.setDpi(value);
        mc.update();
        break;
      case "unit":
        mc.setUnit(value);
        mc.update();
        break;
      case "page_width":
        mc.setPageWidth(value);
        break;
      case "page_height":
        mc.setPageHeight(value);
        break;
      case "content_scale":
        mc.setContentScale(value);
        break;
      case "legends_n_columns":
        mc.setLegendColumnCount(value);
        break;
      case "predefined_dim":
        mc.setPredefinedDim(value);
        break;
      default:
        console.warn(`setState not handled for ${id}`);
    }
  }

  setPredefinedDim(value) {
    const mc = this;

    const item = mc._preset_flat.find((p) => p.name === value);
    if (!item) {
      console.warn(`Preset ${value} not found`);
      return;
    }

    mc.state.predefined_dim = value;

    mc.toolbar.elSelectPreset.value = value;

    if (value === "mc_preset_manual") {
      mc.toolbar.enableControl("unit");
      mc.toolbar.enableControl("dpi");
      return;
    } else {
      mc.toolbar.disableControl("unit");
      mc.toolbar.disableControl("dpi");
    }

    mc.setDpi(item.dpi);
    mc.setUnit(item.unit);
    mc.setPageSize(item.width, item.height, false);
  }

  setMode(mode) {
    const mc = this;
    let modes = mc.state.modes_internal;
    mc.state.mode = mode;
    for (const m of modes) {
      if (mode !== m) {
        mc.el.classList.remove("mc-mode-" + m);
      } else {
        mc.el.classList.add("mc-mode-" + m);
      }
    }
    if (mode === "layout") {
      mc.editor.enable();
    } else {
      mc.editor.disable();
    }
    return mode;
  }

  updatePageSizes() {
    const mc = this;
    mc.setPageSize();
  }

  fitMapToPage() {
    const mc = this;
    const h = mc.state.page_height;
    const w = mc.state.page_width;
    for (const item of mc.page.items) {
      if (item.type === "map") {
        item.setWidth(w);
        item.setHeight(h);
        item.setTopLeftOrigin();
        setTimeout(() => {
          item.map.resize();
        }, 10);
      }
    }
  }

  inversePageHeightWidth() {
    const mc = this;
    const h = mc.state.page_height;
    const w = mc.state.page_width;
    mc.setPageSize(h, w, false);
  }

  setPageWidth(w) {
    const mc = this;
    if (mc.state.page_width === w) {
      return;
    }
    w = mc.state.page_width = w || mc.state.page_width;
    mc.page.setWidth(w, false);
  }

  setPageHeight(h) {
    const mc = this;
    if (mc.state.page_height === h) {
      return;
    }
    h = mc.state.page_height = h || mc.state.page_height;
    mc.page.setHeight(h, false);
  }

  setPageSize(w, h, inPx = false) {
    const mc = this;
    if (mc.state.page_height === h || mc.state.page_width === w) {
      return;
    }
    h = mc.state.page_height = h || mc.state.page_height;
    w = mc.state.page_height = w || mc.state.page_width;
    mc.page.setSize(w, h, inPx);
  }

  setUnit(unit) {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    if (unit === "px") {
      mc.setDpi();
    } else {
      mc.setDpi(mc.state.dpi);
    }
    const dpi = mc.state.dpi;
    const sizeStep = Math.ceil(
      unitConvert({
        value: mc.state.grid_snap_size * window.devicePixelRatio,
        unitFrom: "px",
        unitTo: unit,
        dpi: dpi,
      })
    );
    mc.state.page_width = Math.round(
      unitConvert({
        value: mc.state.page_width,
        unitFrom: mc.state.unit,
        unitTo: unit,
        dpi: dpi,
      })
    );
    mc.state.page_height = Math.round(
      unitConvert({
        value: mc.state.page_height,
        unitFrom: mc.state.unit,
        unitTo: unit,
        dpi: dpi,
      })
    );
    mc.toolbar.elInputPageWidth.setAttribute("step", sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute("min", sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute("max", sizeStep * 1000);
    mc.toolbar.elInputPageHeight.setAttribute("step", sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute("min", sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute("max", sizeStep * 1000);
    mc.state.unit = unit || mc.state.unit;
    mc.toolbar.elInputUnit.value = unit;
  }
  setDpi(dpi) {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    if (dpi && dpi >= 72 && dpi <= 300) {
      Object.defineProperty(window, "devicePixelRatio", {
        get: function () {
          return dpi / 96;
        },
      });
    } else {
      Object.defineProperty(window, "devicePixelRatio", {
        get: getDevicePixelRatio,
      });
    }
    const nDpi = dpi || 96 * window.devicePixelRatio;
    const changed = mc.state.dpi !== nDpi;
    if (changed) {
      mc.state.dpi = nDpi;
      mc.toolbar.elInputDpi.value = mc.state.dpi;
    }
  }

  update() {
    const mc = this;
    mc.updatePageSizes();
  }

  setContentScale(scale = 1) {
    const mc = this;
    scale = Number(scale);
    mc._content_scale = scale;
    mc.page.el.style.setProperty(`--mc-item-scale-content`, mc.scale);
    for (const item of mc.page.items) {
      if (item.type === "map") {
        item.scaler.text(scale);
      }
    }
  }

  get scale() {
    return this._content_scale;
  }

  setLegendColumnCount(n) {
    const mc = this;
    n = n || 1;
    for (const item of mc.page.items) {
      if (item.type === "legend") {
        const elLegendBox = item.el.querySelector(".mx-legend-box");
        if (elLegendBox) {
          elLegendBox.style.columnCount = n;
        }
      }
    }
  }
}
