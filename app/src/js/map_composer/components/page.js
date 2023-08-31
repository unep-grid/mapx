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
    page.displayDim();
    const w = Math.round(page.toLengthUnit(page.width));
    const h = Math.round(page.toLengthUnit(page.height));
    page.mc.toolbar.elInputPageWidth.value = w;
    page.mc.toolbar.elInputPageHeight.value = h;
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
    const curDpi = mc.state.dpi;
    const curScale = mc.page.scale;
    try {
      page.setScale(1);
      mc.setMode("print");
      mc.update();
      const canvas = await html2canvas(elPrint, {
        logging: false,
      });
      await downloadCanvas(canvas, "map-composer-export.png", "image/png");
    } catch (e) {
      page.message.flash({
        level: "error",
        text: "Rendering error. More info in console",
      });
      console.error(e);
    } finally {
      mc.setMode(curMode);
      mc.setDpi(curDpi);
      mc.update();
      page.setScale(curScale);
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
