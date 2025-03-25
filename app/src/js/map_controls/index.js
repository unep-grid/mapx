import { el } from "./../el/src/index.js";
import { formatZeros, path } from "./../mx_helpers.js";
import mapxlogo from "./../../svg/map-x-logo-full.svg";
import { isElement } from "../is_test/index.js";
import { modalIframe } from "../modal_iframe/index.js";
import { bindAll } from "../bind_class_methods/index.js";
/**
 * Control for live coordinate
 */
class MapControlLiveCoord {
  constructor() {}
  onAdd(map) {
    const mlc = this;
    const coord = el("div");
    map.on("mousemove", (e) => {
      const pos = e.lngLat;
      const lat = formatZeros(pos.lat, 3);
      const lng = formatZeros(pos.lng, 3);
      coord.innerText = ` Lat: ${lat} - Lng: ${lng}`;
    });
    mlc.map = map;
    mlc.elContainer = el(
      "div",
      {
        class: ["mapboxgl-ctrl", "mapboxgl-ctrl-attrib"],
      },
      coord,
    );
    return mlc.elContainer;
  }
  onRemove() {
    const mlc = this;
    mlc.map = undefined;
    if (isElement(mlc.elContainer)) {
      mlc.elContainer.remove();
    }
  }
}

/**
 * Attribution
 */

class MapControlAttribution {
  constructor() {}
  onAdd(map) {
    const mla = this;
    mla.map = map;
    mla.elContainer = el(
      "div",
      {
        class: ["mapboxgl-ctrl", "mapboxgl-ctrl-attrib"],
      },
      [
        el(
          "a",
          {
            target: "_blank",
            href: "https://www.openstreetmap.org/copyright",
          },
          " © OpenStreetMap",
        ),
        el(
          "a",
          {
            target: "_blank",
            href: "https://mapbox.com/",
          },
          " © Mapbox",
        ),
        el(
          "a",
          {
            href: "#",
            on: [
              "click",
              async () => {
                return modalIframe({
                  doc_id: "doc_legal_notice",
                });
              },
            ],
          },
          " © MapX",
        ),
      ],
    );
    return mla.elContainer;
  }
  onRemove() {
    const mlc = this;
    mlc.map = undefined;
    if (isElement(mlc.elContainer)) {
      mlc.elContainer.remove();
    }
  }
}
/**
 * Control for MapX logo
 */
class MapxLogo {
  constructor() {}
  onAdd() {
    const ml = this;
    const elLogo = el(
      "a",
      {
        href: path(mx, "settings.links.mainProjectPage"),
        class: "mx-logo",
        target: "_blank",
        rel: "noreferrer",
        style: {
          backgroundImage: `url(${mapxlogo})`,
          fontSize: "0em",
        },
      },
      "Main project page",
    );
    ml.elContainer = el(
      "div",
      {
        class: "mapboxgl-ctrl",
        style: {
          display: "inline-block",
          float: "none",
        },
      },
      elLogo,
    );
    return ml.elContainer;
  }
  onRemove() {
    const ml = this;
    if (isElement(ml.elContainer)) {
      ml.elContainer.remove();
    }
  }
}

/**
 * Create a nested scale indicator : text,box and container. Not possible by the original method.
 * modes : center, mouse, bottom, top
 */
class MapControlScale {
  constructor(config) {
    this._config = Object.assign({}, { mode: "mouse" }, config);
    bindAll(this);
  }

  onAdd(map) {
    const mcs = this;
    mcs.map = map;

    mcs.elText = el("div", {
      style: { transformOrigin: "bottom center" },
      class: ["mx-scale-text", "mc-item-scalable-font"],
    });

    mcs.elScale = el("div", { class: ["mx-scale-box"] }, mcs.elText);

    mcs.elContainer = el(
      "div",
      {
        class: ["mapboxgl-ctrl", "mapboxgl-ctrl-attrib"],
      },
      mcs.elScale,
    );

    if (mcs._config.mode === "mouse") {
      map.on("mousemove", mcs.renderPoint);
    } else {
      map.on("moveend", mcs.renderCenter);
    }
    map.on("resize", mcs.updateY);

    mcs.updateY();
    mcs.renderCenter();
    return mcs.elContainer;
  }

  updateY() {
    const mcs = this;
    mcs._y = mcs.map.getContainer().getBoundingClientRect().height / 2;
  }

  renderCenter() {
    const mcs = this;
    const y = mcs.map.getContainer().getBoundingClientRect().height / 2;
    mcs.render(y);
  }

  renderPoint(e) {
    const mcs = this;
    const y = e.point.y;
    mcs.render(y);
  }

  render(y) {
    const mcs = this;
    let unit = "m";
    let maxWidth = 100;
    let maxMeters = getDistance(
      mcs.map.unproject([0, y]),
      mcs.map.unproject([maxWidth, y]),
    );
    let distance = getRoundNum(maxMeters);
    let ratio = distance / maxMeters;
    if (distance >= 1000) {
      distance = distance / 1000;
      unit = "km";
    }
    mcs.elScale.style.width = maxWidth * ratio + "px";
    mcs.elText.innerText = distance + unit;
  }

  onRemove() {
    const mcs = this;
    if (isElement(mcs.elContainer)) {
      mcs.elContainer.remove();
    }
    mcs.map.off("mousemove", mcs.renderPoint);
    mcs.map.off("moveend", mcs.renderCenter);
    mcs.map.off("resize", mcs.updateY);
    mcs.map = undefined;
  }
}

export {
  MapControlScale,
  MapxLogo,
  MapControlLiveCoord,
  MapControlAttribution,
};

function getDistance(latlng1, latlng2) {
  // Uses spherical law of cosines approximation.
  const R = 6371000;

  const rad = Math.PI / 180,
    lat1 = latlng1.lat * rad,
    lat2 = latlng2.lat * rad,
    a =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.cos((latlng2.lng - latlng1.lng) * rad);

  const maxMeters = R * Math.acos(Math.min(a, 1));
  return maxMeters;
}

function getRoundNum(num) {
  const pow10 = Math.pow(10, `${Math.floor(num)}`.length - 1);
  let d = num / pow10;
  d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
  return pow10 * d;
}
