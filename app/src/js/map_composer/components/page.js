import { el } from "../../el/src/index.js";
import { Box } from "./box.js";
import { Item } from "./item.js";
import { canvasToBlob, downloadZip } from "./../../download";
import html2canvas from "html2canvas";

class Page extends Box {
  constructor(boxParent) {
    super(boxParent);
    const page = this;
    const state = page.state;
    page.nextItemPos = {
      x: 0,
      y: 0,
    };
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
      removers: [page.onPageRemove.bind(page)],
      resizers: [page.onPageResize.bind(page)],
      width: state.page_width,
      height: state.page_height,
    });
  }

  onPageResize() {
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

  onPageRemove() {
    const page = this;
    for (const item of page.items) {
      item.destroy();
    }
  }

  async export() {
    const page = this;
    const mc = page.mc;
    const curMode = mc.state.mode;

    try {
      mc.setMode("print");
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (const file of mc.state.files) {
        zip.file(file.name, file.content);
      }

      const elPrint = page.el;
      const scale = mc.getScaleOut();

      await mc.setScaleMap(scale);

      const canvas = await html2canvas(elPrint, {
        logging: false,
        scale: scale,
      });

      const canvasBlob = await canvasToBlob(canvas, "img/png");
      zip.file("map_composer.png", canvasBlob);

      /**
       * Download
       */
      await downloadZip(zip, "map_compose_export.zip", mc.state.exportTab);

    } catch (e) {
      page.message.flash({
        level: "error",
        text: "Rendering error. More info in console",
      });
      console.error(e);
    } finally {
      await mc.setScaleMapReset();
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

  removeItem(item) {
    const page = this;
    const pos = page.items.indexOf(item);
    if (pos > -1) {
      page.items.splice(pos, 1);
      item.destroy();
    }
  }

  addItemText() {
    const page = this;
    const editor = page.mc.editor;
    const config = {
      type: "text",
      text: "Text...",
      editable: true,
      removable: true,
    };
    const item = new Item(page, config);
    page.items.push(item);
    item.removers.push(() => {
      page.removeItem(item);
    });
    editor.setTargetEditable();
    page.placeItem(item);
  }

  placeItem(item) {
    const page = this;
    const mc = page.mc;
    const g = page.state.grid_snap_size;
    item.setTopLeft({
      top: page.nextItemPos.y,
      left: page.nextItemPos.x,
      inPx: true,
    });
    page.nextItemPos.y += g;
    page.nextItemPos.x += g;
    mc.setBoxLastFocus(item);
  }

  placeItems() {
    const page = this;
    for (const item of page.items) {
      page.placeItem(item);
    }
  }
}

export { Page };
