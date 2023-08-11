import { el } from "../../el/src/index.js";
export class MapNorthArrow {
  constructor() {}

  onAdd(map) {
    let elArrow;
    const na = this;
    const imgSvg = require("../svg/arrow-north.svg");

    const elNorthCtrl = el(
      "div",
      {
        class: "mapboxgl-ctrl",
      },
      (elArrow = el("img", {
        src: imgSvg,
        class: "mc-map-arrow",
        style: {
          width: "20px",
          height: "20px",
          transformOrigin: "50% 50% 0",
        },
      }))
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
