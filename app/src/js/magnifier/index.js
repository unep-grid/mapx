import { el } from "./../el/src/index.js";
import { EventSimple } from "./../event_simple";
import mapboxgl from "mapbox-gl";
import Draggabilly from "draggabilly";
import { bindAll } from "../bind_class_methods/index.js";
import "./style.less";
const def = {
  radius: 200,
};

export class Magnifier extends EventSimple {
  constructor(options) {
    super();
    const m = this;
    m._opt = Object.assign({}, def, options);
    bindAll(m);
  }

  init(map) {
    const m = this;
    if (m._init) {
      return;
    }
    m._init = true;
    m._map = map;
    m.build();
    m.initMap();
    m.initSync();
  }

  get locked() {
    return this._locked;
  }
  lock() {
    return (this._locked = true);
  }
  unlock() {
    return (this._locked = false);
  }

  initMap() {
    const m = this;
    const config = {
      container: m._el_map,
      style: m._map.getStyle(),
      attributionControl: false,
      crossSourceCollisions: false,
      zoom: m._map.getZoom(),
      bearing: m._map.getBearing(),
      pitch: m._map.getPitch(),
      center: m._map.getCenter(),
    };
    m._map_magnifier = new mapboxgl.Map(config);
  }
  initSync() {
    const m = this;
    m.syncMapMagnifier();
    m._map.on("move", m.syncMapMagnifier);
    m._map_magnifier.on("move", m.syncMapMain);
    m._draggie.on("dragMove", m.syncMapMagnifier);
  }
  build() {
    const m = this;
    m._el_container = m._map.getContainer();
    m._el_map = el("div", {
      class: "mg__map",
    });

    m._el_handle = el("div", {
      class: "mg__handle",
    });

    m._el_main = el(
      "div",
      {
        class: "mg__main",
        style: {
          height: `${m._opt.radius}px`,
          width: `${m._opt.radius}px`,
        },
      },
      m._el_handle,
      m._el_map
    );

    m._draggie = new Draggabilly(m._el_main, {
      handle: ".mg__handle",
    });
    m._el_container.appendChild(m._el_main);
  }

  syncMapMain() {
    const m = this;
    m.syncMap(m._map_magnifier, m._map);
  }

  syncMapMagnifier() {
    const m = this;
    m.syncMap(m._map, m._map_magnifier);
  }

  syncMap(mapSrc, mapDest) {
    const m = this;
    if (m.locked) return;
    try {
      m.lock();

      const srcRect = mapSrc._container.getBoundingClientRect();
      const destRect = mapDest._container.getBoundingClientRect();

      const destCenter = {
        y: destRect.top - srcRect.top + destRect.height / 2,
        x: destRect.left - srcRect.left + destRect.width / 2,
      };

      // unproject to the linked map. Like a mouseover or something.
      const destCenterLatLong = mapSrc.unproject([destCenter.x, destCenter.y]);

      const pos = {
        center: destCenterLatLong,
        zoom: mapSrc.getZoom(),
        pitch: mapSrc.getPitch(),
        bearing: mapSrc.getBearing(),
      };

      mapDest.setCenter(pos.center);
      mapDest.setZoom(pos.zoom);
      mapDest.setPitch(pos.pitch);
      mapDest.setBearing(pos.bearing);
    } catch (e) {
      console.error(e);
    } finally {
      m.unlock();
    }
  }
  update(e) {
    console.log("update", e);
  }
  setRadius() {}
  setLeft() {}
  setTop() {}
  show() {}
  hide() {}
  addView() {}
  removeView() {}
  listViews() {}
}
