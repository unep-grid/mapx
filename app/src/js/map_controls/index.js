import { el } from "./../el/src/index.js";
import { formatZeros, path } from "./../mx_helpers.js";
import mapxlogo from "./../../svg/map-x-logo-full.svg";
import { isElement } from "../is_test/index.js";
import { AttributionManager } from "../attribution_manager";
import { bindAll } from "../bind_class_methods/index.js";

const BASE_ATTRIBUTION_SOURCE_IDS = new Set([
  "mapx",
  "protomaps_basemap",
  "mapx_borders",
  "mapx_bathymetry",
  "terrain",
  "terrain_hillshade",
  "contours",
  "mapx_wmo_borders",
  "satellite",
]);

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
        class: ["maplibregl-ctrl", "maplibregl-ctrl-attrib"],
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
  constructor() {
    this.render = this.render.bind(this);
    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.expanded = false;
  }
  onAdd(map) {
    const mla = this;
    mla.map = map;
    mla.attributionManager = new AttributionManager(map);
    mla.elContainer = el(
      "div",
      {
        class: [
          "maplibregl-ctrl",
          "maplibregl-ctrl-attrib",
          "mx-attribution-live",
        ],
      },
      [],
    );
    mla.render();
    map.on?.("styledata", mla.render);
    map.on?.("idle", mla.render);
    return mla.elContainer;
  }
  render() {
    const mla = this;
    const rows = mla.attributionManager?.rows() || [];
    const baseRows = rows.filter(isBaseAttributionRow);
    const additionalRows = rows.filter((row) => !isBaseAttributionRow(row));
    const hasAdditionalRows = additionalRows.length > 0;
    if (!hasAdditionalRows) {
      mla.expanded = false;
    }
    const key = [
      mla.expanded ? "expanded" : "collapsed",
      ...rows.map((row) =>
        [
          row.kind,
          row.id,
          row.source,
          row.attribution_text,
          row.attribution_html,
        ].join("\u001f"),
      ),
    ].join("\u001e");
    if (key === mla.attributionKey) {
      return;
    }

    mla.attributionKey = key;
    mla.elContainer.innerHTML = "";
    mla.elContainer.appendChild(
      renderAttributionLine({
        rows: baseRows,
        hasToggle: hasAdditionalRows,
        expanded: mla.expanded,
        onToggle: mla.toggleExpanded,
      }),
    );
    if (mla.expanded && hasAdditionalRows) {
      mla.elContainer.appendChild(renderAttributionPanel(rows));
    }
  }
  toggleExpanded(e) {
    e?.preventDefault?.();
    this.expanded = !this.expanded;
    this.render();
  }
  onRemove() {
    const mlc = this;
    mlc.map?.off?.("styledata", mlc.render);
    mlc.map?.off?.("idle", mlc.render);
    mlc.map = undefined;
    mlc.attributionManager = undefined;
    if (isElement(mlc.elContainer)) {
      mlc.elContainer.remove();
    }
  }
}

function isBaseAttributionRow(row) {
  return (
    BASE_ATTRIBUTION_SOURCE_IDS.has(row.id) ||
    BASE_ATTRIBUTION_SOURCE_IDS.has(row.source)
  );
}

function renderAttributionLine(opt) {
  const line = el("div", { class: ["mx-attribution-line"] }, []);
  appendAttributionRows(line, opt.rows);
  if (opt.hasToggle) {
    line.appendChild(
      el(
        "button",
        {
          type: "button",
          class: [
            "mx-attribution-toggle",
            "fa",
            opt.expanded ? "fa-minus" : "fa-plus",
          ],
          title: opt.expanded ? "Collapse attributions" : "Expand attributions",
          "aria-expanded": opt.expanded ? "true" : "false",
          on: ["click", opt.onToggle],
        },
        "",
      ),
    );
  }
  return line;
}

function renderAttributionPanel(rows) {
  return el(
    "div",
    { class: ["mx-attribution-panel"] },
    rows.map((row) =>
      el("div", { class: ["mx-attribution-panel-row"] }, renderAttributionRow(row)),
    ),
  );
}

function appendAttributionRows(root, rows) {
  for (const [index, row] of rows.entries()) {
    if (index > 0) {
      root.appendChild(
        el("span", { class: ["mx-attribution-separator"] }, " | "),
      );
    }
    root.appendChild(renderAttributionRow(row));
  }
}

function renderAttributionRow(row) {
  const text = row.attribution_text || row.attribution_html || row.id;
  if (row.id === "mapx") {
    return el(
      "a",
      {
        class: ["mx-attribution-item"],
        href: path(
          globalThis.mx,
          "settings.links.mainProjectPage",
          "https://mapx.org",
        ),
        target: "_blank",
        rel: "noreferrer",
      },
      text,
    );
  }

  const item = el(
    "span",
    { class: ["mx-attribution-item"] },
    row.attribution_html || text,
  );
  setExternalLinkAttributes(item);
  return item;
}

function setExternalLinkAttributes(root) {
  for (const link of root.querySelectorAll?.("a") || []) {
    if (!link.getAttribute("href")) {
      continue;
    }
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noreferrer");
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
        class: "maplibregl-ctrl",
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
        class: ["maplibregl-ctrl", "maplibregl-ctrl-attrib"],
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
