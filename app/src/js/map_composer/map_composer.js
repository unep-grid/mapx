import * as def from "./default.js";
import { Workspace } from "./components/index.js";
import { Toolbar } from "./components/index.js";
import { EditorToolbar } from "./components/text_editor.js";
import { el } from "../el/src/index.js";
import { unitConvert } from "./components/helpers";
import "./style/map_composer.less";
import { bindAll } from "../bind_class_methods/index.js";
import { waitTimeoutAsync } from "../animation_frame/index.js";

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
      case "scale_content":
        mc.setScaleContent(value);
        mc.setScaleContentMap(value);
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
    const item = mc.state.presets.find((p) => p.name === value);
    if (!item) {
      console.warn(`Preset ${value} not found`);
      return;
    }

    mc.state.predefined_dim = value;
    mc.state.predefined_item = item;

    mc.toolbar.elSelectPreset.value = value;

    if (value === "mc_preset_manual") {
      // Enable unit control and return, don't update
      mc.toolbar.enableControl("unit");
      return;
    }

    mc.toolbar.disableControl("unit");
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

    const isInches = unit === "in";
    const dpi = mc.state.dpi;
    const sizeStepRaw = unitConvert({
      value: mc.state.grid_snap_size * window.devicePixelRatio,
      unitFrom: "px",
      unitTo: unit,
      dpi: dpi,
    });
    const widthRaw = unitConvert({
      value: mc.state.page_width,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi,
    });
    const heightRaw = unitConvert({
      value: mc.state.page_height,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi,
    });

    const sizeStep = isInches
      ? Math.ceil(sizeStepRaw * 10) / 10
      : Math.ceil(sizeStepRaw);

    const width = isInches
      ? Math.ceil(widthRaw * 10) / 10
      : Math.ceil(widthRaw);

    const height = isInches
      ? Math.ceil(heightRaw * 10) / 10
      : Math.ceil(heightRaw);

    // set state unit (used in setWidth/Height)
    mc.state.unit = unit || mc.state.unit;
    mc.toolbar.elInputUnit.value = unit;

    mc.state.page_width = width;
    mc.state.page_height = height;

    mc.toolbar.elInputPageWidth.setAttribute("step", sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute("min", sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute("max", sizeStep * 1000);
    mc.toolbar.elInputPageHeight.setAttribute("step", sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute("min", sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute("max", sizeStep * 1000);
  }

  update() {
    const mc = this;
    mc.updatePageSizes();
  }

  setScaleContent(scale = 1) {
    const mc = this;
    scale = Number(scale);
    mc.state.scale_content = scale;
    mc.page.el.style.setProperty(`--mc-item-scale-content`, scale);
  }

  setScaleContentMap(scale = 1) {
    const mc = this;
    scale = Number(scale);
    mc.state.scale_map = scale;
    for (const item of mc.page.items) {
      if (item.type === "map") {
        item.scaler.update(scale, ["text", "icon"]);
      }
    }
  }

  async setScaleMap(scale = 1) {
    const mc = this;
    scale = Number(scale);
    Object.defineProperty(window, "devicePixelRatio", {
      get: function () {
        return scale;
      },
    });
    await waitTimeoutAsync(1);
    for (const item of mc.page.items) {
      if (item.type === "map") {
        if (item.map._frame) {
          item.map._frame.cancel();
          item.map._frame = null;
        }
        item.map._render();
      }
    }
    await waitTimeoutAsync(1);
    Object.defineProperty(window, "devicePixelRatio", {
      get: function () {
        return mc.state.dpr;
      },
    });
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
