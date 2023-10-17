import mapboxgl from "mapbox-gl";
import { el } from "../../el/src/index.js";
import { MapScaler } from "../../map_scaler/index.js";
import { cloneNodeClean } from "../../mx_helper_misc.js";
import { Box } from "./box.js";
import { MapNorthArrow } from "./../../north_arrow/index.js";
import { MapControlScale } from "../../map_controls/index.js";

class Item extends Box {
  constructor(boxParent, config) {
    super(boxParent);
    const item = this;
    // item ref
    item._config = config;
    item._type = config.type;
    item._editable = config.editable === true;
    // box option
    item.init({
      title: `item-${item._type}`,
      class: `mc-${item._type}`,
      content: item.build(),
      boxContainer: item.boxParent,
      boxBound: item.boxParent.boxParent,
      boundEdges: { top: true, left: true, bottom: false, right: false },
      draggable: true,
      resizable: true,
      removable: config.removable === true,
      width: config.width || item.state.item_width,
      height: config.height || item.state.item_height,
    });
  }

  get type() {
    return this._type;
  }
  get editable() {
    return this._editable;
  }
  get config() {
    return this._config;
  }
  /*
   * Build given item
   * @returns {Element} item's element
   */
  build() {
    const item = this;
    const type = item._type;
    switch (type) {
      case "map":
        return item.buildMap();
      case "title":
      case "text":
        return item.buildText();
      case "legend":
        return item.buildLegend();
      case "element":
        return item.buildElement();
      default:
        console.error(`type ${type} not known`);
        return;
    }
  }

  buildElement() {
    const item = this;
    const content = item._config.element;
    const elOut = el(
      "div",
      {
        dataset: { mc_editable: item.editable },
        class: ["mc-item", "mc-item-element", "mc-item-scalable-font"],
      },
      // must be first level <div mc-item><h1>..</h1><p>...</p>
      [...content.children]
    );
    return elOut;
  }

  buildLegend() {
    const item = this;
    // remove id,for, other unwanted attributes
    const elContent = cloneNodeClean(item._config.element);
    const elsEditables = elContent.querySelectorAll("span");

    for (const elEditable of elsEditables) {
      const elDiv = el(
        "div",
        {
          dataset: { mc_editable: item.editable },
          class: [...elEditable.classList, "mc-item-editable"],
        },
        el("div", elEditable.innerText)
      );
      elEditable.parentElement.appendChild(elDiv);
      elEditable.remove();
    }

    const elOut = el(
      "div",
      {
        class: ["mc-item", "mc-item-element", "mc-item-scalable-font"],
      },
      elContent
    );

    return elOut;
  }

  buildText() {
    const item = this;
    const text = el("span", item?._config?.text || "").innerText;
    const elOut = el(
      "div",
      {
        class: ["mc-item", "mc-item-text", "mc-item", "mc-item-scalable-font"],
        dataset: {
          mc_editable: item.editable,
        },
      },
      el("span", text)
    );

    return elOut;
  }

  buildMap() {
    const item = this;
    const elOut = el("div", {
      dataset: {
        mc_editable: item.editable,
      },
      class: ["mc-item", "mc-item-map"],
    });

    const mapOptions = Object.assign(
      {
        preserveDrawingBuffer: true,
        container: elOut,
        fadeDuration: 0,
        trackResize: false, // handled in mapcomposer
        renderWorldCopies: false,
      },
      item._config.options
    );

    item.map = new mapboxgl.Map(mapOptions);
    item.map.addControl(
      new MapControlScale({ mode: "center" }),
      "bottom-right"
    );
    item.map.addControl(new MapNorthArrow(), "top-right");
    item.scaler = new MapScaler(item.map);

    item.map.once("idle", () => {
      if (mapOptions.terrain) {
        item.map.setTerrain(mapOptions.terrain);
      }
    });

    item.resizers.push(() => {
      item.map.resize();
    });
    item.removers.push(() => {
      item.map.remove();
    });
    return elOut;
  }
}

export { Item };
