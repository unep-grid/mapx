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
    page.addItems();
    page.placeItems();
  }

  onResize() {
    const page = this;
    const mc = page.mc;
    page.displayDim();
    const w = Math.round(page.toLengthUnit(page.width));
    const h = Math.round(page.toLengthUnit(page.height));
    page.mc.toolbar.elInputPageWidth.value = w;
    page.mc.toolbar.elInputPageHeight.value = h;
    mc.setState("page_width", w);
    mc.setState("page_height", h);
  }

  onRemove() {
    const page = this;
    page.items.forEach((i) => {
      i.destroy();
    });
  }

  async exportPng() {
    const page = this;
    const mc = page.mc;
    const curMode = mc.state.mode;
    const curDpi = mc.state.dpi;
    try {
      const page = this;
      const elPrint = page.el;
      const currentScale = mc.page.scale;
      page.setScale(1);
      await mc.setMode("print");
      const canvas = await html2canvas(elPrint, {
        logging: false,
      });
      await downloadCanvas(canvas, "map-composer-export.png", "image/png");
      await mc.setMode(curMode);
      await mc.setDpi(curDpi);
      page.setScale(currentScale);
    } catch (e) {
      mc.displayWarning(
        "Oups, something went wrong during the rendering, please read the console log."
      );
      console.error(e);
      await mc.setMode(curMode);
      await mc.setDpi(curDpi);
    }
  }

  buildEl() {
    return el("div", {
      class: "mc-page-content",
    });
  }

  addItems() {
    const page = this;
    page.items = page.state.items.map((config) => {
      return new Item(page, config);
    });
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
