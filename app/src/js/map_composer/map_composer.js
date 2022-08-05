import * as def from "./default.js";
import { Workspace } from "./components/index.js";
import { Toolbar } from "./components/index.js";
import { EditorToolbar } from "./components/text_editor.js";
import { waitTimeoutAsync } from "../animation_frame/index.js";
import { el } from "../el/src/index.js";
import { unitConvert } from "./components/helpers";
import "./style/map_composer.less";
const getDevicePixelRatio = Object.getOwnPropertyDescriptor(
  window,
  "devicePixelRatio"
).get;

export class MapComposer {
  constructor(elContainer, state, options) {
    const mc = this;
    window._mc = mc; // for easy access in console. To remove in prod.
    mc.options = Object.assign({}, def.options, options);
    mc.state = Object.assign({}, def.state, state);

    mc.setMode = mc.setMode.bind(mc);
    mc.setDpi = mc.setDpi.bind(mc);
    mc.setUnit = mc.setUnit.bind(mc);
    mc.setPageWidth = mc.setPageWidth.bind(mc);
    mc.setPageHeight = mc.setPageHeight.bind(mc);
    mc.setScale = mc.setScale.bind(mc);
    mc.setLegendColumnCount = mc.setLegendColumnCount.bind(mc);

    mc.initRoot(elContainer);
    mc.init().catch(console.error);
  }

  async init() {
    const mc = this;
    mc.toolbar = new Toolbar(mc);
    mc.workspace = new Workspace(mc);
    mc.editor = new EditorToolbar(mc, {
      boxTarget: mc.workspace.page,
    });
    mc.page = mc.workspace.page;
    mc.errors = [];
    await mc.setDpi(mc.state.dpi);
    await mc.setUnit(mc.state.unit);
    await mc.setMode(mc.state.mode);
    mc.ready = true;
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
    mc.setDpi().catch(console.error);
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
    mc.options.onDestroy();
  }

  async setState(id, value) {
    const mc = this;
    switch (id) {
      case "mode":
        await mc.setMode(value);
        break;
      case "dpi":
        await mc.setDpi(value);
        break;
      case "unit":
        await mc.setUnit(value);
        break;
      case "page_width":
        mc.setPageWidth(value);
        break;
      case "page_height":
        mc.setPageHeight(value);
        break;
      case "content_scale":
        mc.setScale(value);
        break;
      case "legends_n_columns":
        mc.setLegendColumnCount(value);
        break;
      default:
        console.warn(`setState not handled for ${id}`);
    }
  }

  async setMode(mode) {
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
    await mc.resizeEachMap();
  }

  updatePageSizes() {
    const mc = this;
    mc.setPageHeight();
    mc.setPageWidth();
  }

  setPageWidth(w) {
    const mc = this;
    if (!mc.ready || mc.state.page_width === w) {
      return;
    }
    w = mc.state.page_width = w || mc.state.page_width;
    mc.page.setWidth(w);
  }

  setPageHeight(h) {
    const mc = this;
    if (!mc.ready || mc.state.page_height === h) {
      return;
    }
    h = mc.state.page_height = h || mc.state.page_height;
    mc.page.setHeight(h);
  }

  async setUnit(unit) {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    if (unit === "px") {
      await mc.setDpi();
    } else {
      await mc.setDpi(mc.state.dpi);
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
    if (unit === "px") {
      mc.toolbar.elFormDpi.style.display = "none";
    } else {
      mc.toolbar.elFormDpi.style.display = "block";
    }
    mc.updatePageSizes();
    //mc.updatePageContentScale();
  }
  async setDpi(dpi) {
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
      mc.updatePageSizes();
      await mc.resizeEachMap();
    }
    //mc.updatePageContentScale();
  }
  setScale(scale) {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    mc.state.scale = scale || mc.state.scale;
    mc.updatePageContentScale();
  }

  updatePageContentScale() {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    mc.page.items.forEach((i) => {
      i.setContentScale(mc.state.scale);
    });
  }

  displayWarning(txt) {
    alert(JSON.stringify(txt));
  }

  setContentScale(scale) {
    const mc = this;
    mc._page_scale = scale;
    mc.page.setScale(scale);
  }

  setLegendColumnCount(n) {
    const mc = this;
    n = n || 1;
    mc.page.items.forEach((i) => {
      if (i.type === "legend") {
        const elLegendBox = i.el.querySelector(".mx-legend-box");
        if (elLegendBox) {
          elLegendBox.style.columnCount = n;
        }
      }
    });
  }

  async resizeEachMap() {
    const mc = this;
    for (const item of mc.page.items) {
      if (item.map) {
        const wOrig = item.width;
        item.setWidth(wOrig + 5, true);
        await waitTimeoutAsync(100); // Wait for UI to settle
        item.setWidth(wOrig, true);
        await waitTimeoutAsync(100); // Wait for UI to settle
        /*item */
        /*const elMapCanvas = item.map.getCanvas();*/
        /*
         * After a dpi change, the map
         * dimensions did not change.
         * resize method is not called:
         * see https://github.com/mapbox/mapbox-gl-js/blob/9f780181794d2a41b0ae65abf60eb741677819e0/src/ui/map.js#L736
         * Soo.
         * little hack here
         */
      }
    }
  }
}
