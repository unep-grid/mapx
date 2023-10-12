import { el } from "../../el/src/index.js";
import { Box } from "./box.js";
import { Item } from "./item.js";
import { downloadCanvas } from "./../../download";
import html2canvas from "html2canvas";

class Page extends Box {
  constructor(boxParent) {
    super(boxParent);
    const page = this;
    const state = page.state;
    page.items = [];
    page.title = "page";
    page.init({
      class: ["mc-page"],
      content: page.buildEl(),
      boxContainer: boxParent,
      boxBound: boxParent,
      boundEdges: { top: true, left: true, bottom: false, right: false },
      draggable: false,
      resizable: true,
      onRemove: page.onRemove.bind(page),
      onResize: page.onResize.bind(page),
      width: state.page_width,
      height: state.page_height,
    });
  }

  onResize() {
    const page = this;
    const mc = page.mc;
    if (!mc.ready) {
      return;
    }
    page.displayDim();
    const isInches = mc.state.unit === "in";
    const wUnit = page.toLengthUnit(page.width);
    const hUnit = page.toLengthUnit(page.height);

    const w = isInches ? Math.round(wUnit * 10) / 10 : Math.round(wUnit);
    const h = isInches ? Math.round(hUnit * 10) / 10 : Math.round(hUnit);

    page.mc.toolbar.elInputPageWidth.value = w;
    page.mc.toolbar.elInputPageHeight.value = h;

    /**
     * Make sure that a manual change set the preset to manual
     */
    if (mc.state.predefined_dim !== "mc_preset_manual") {
      const preset = mc.state.predefined_item;
      const wPreset = page.snapToGrid(page.toLengthPixel(preset.width));
      const hPreset = page.snapToGrid(page.toLengthPixel(preset.height));
      const wPage = page.snapToGrid(page.width);
      const hPage = page.snapToGrid(page.height);

      if (
        (wPreset !== wPage || hPreset !== hPage) &&
        // landscape mode
        (wPreset !== hPage || hPreset !== wPage)
      ) {
        mc.setPredefinedDim("mc_preset_manual");
      }
    }

    /*
     * Save state
     */
    mc.state.page_width = w;
    mc.state.page_height = h;
  }

  onRemove() {
    const page = this;
    for (const item of page.items) {
      item.destroy();
    }
  }

  async exportPng() {
    const page = this;
    const mc = page.mc;
    const elPrint = page.el;
    const curMode = mc.state.mode;
    const dpi = mc.state.dpi;
    const dpr = mc.state.dpr;

    const scale = mc.state.unit === "px" ? dpr : (300 * dpr) / dpi;

    try {
      mc.setMode("print");
      await mc.setScaleMap(scale);
      const canvas = await html2canvas(elPrint, {
        logging: false,
        scale: scale,
      });
      await downloadCanvas(
        canvas,
        "map-composer-export.png",
        "image/png",
        false // not in a new tab
      );
    } catch (e) {
      page.message.flash({
        level: "error",
        text: "Rendering error. More info in console",
      });
      console.error(e);
    } finally {
      mc.setScaleMap(1);
      mc.setMode(curMode);
    }
  }

  buildEl() {
    return el("div", {
      class: "mc-page-content",
    });
  }

  addItems() {
    const page = this;
    for (const config of page.state.items) {
      const item = new Item(page, config);
      page.items.push(item);
    }
  }

  placeItems() {
    const page = this;
    const g = page.state.grid_snap_size * 10;
    let y = 0;
    let x = 0;
    page.items.forEach((i) => {
      i.setTopLeft({
        top: y,
        left: x,
        inPx: true,
      });
      x += g;
      y += g;
    });
  }
}

export { Page };
