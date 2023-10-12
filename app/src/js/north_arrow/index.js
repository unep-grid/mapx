import { el } from "../el_mapx";

export class MapNorthArrow {
  constructor() {}

  onAdd(map) {
    const na = this;
    const imgSvg = require("./arrow-north-n.svg");

    const elArrow = el("img", {
      src: imgSvg,
      style: {
        width: "20px",
        height: "20px",
        margin: "4px",
        transformOrigin: "50% 50% 0",
      },
    });
    const elWrapper = el(
      "div",
      {
        class: ["mc-item-scalable-image"],
        style: { transformOrigin: "top right" },
      },
      elArrow
    );

    const elNorthCtrl = el(
      "div",
      {
        class: "mapboxgl-ctrl",
      },
      elWrapper
    );

    map.on("rotate", function () {
      const b = map.getBearing();
      elArrow.style.transform = "rotate(" + -b + "deg)";
    });

    na._container = elNorthCtrl;

    return na._container;
  }

  onRemove() {
    const na = this;
    na._container.remove();
    na._map = undefined;
  }
}
