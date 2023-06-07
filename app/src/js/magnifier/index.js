import { el } from "./../el/src/index.js";
import { EventSimple } from "./../event_simple";
import mapboxgl from "mapbox-gl";
import Draggabilly from "draggabilly";
import { bindAll } from "../bind_class_methods/index.js";
import "./style.less";
import { isEqualNoType } from "../is_test/index.js";
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
    if (m.isInit) {
      return;
    }
    m._init = true;
    m._map = map;
    m._state = {};
    m.build();
    m.initMap();
    m.initSync();
  }

  get isInit() {
    return this._init;
  }
  get locked() {
    return this._locked;
  }
  get built() {
    return this._built;
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
    m._built = true;
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
    if (!m.built) return;
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

      const zoom = mapSrc.getZoom();
      const pitch = mapSrc.getPitch();
      const bearing = mapSrc.getBearing();
      const center = destCenterLatLong;

      if (!isEqualNoType(zoom, m._state.zoom)) {
        mapDest.setZoom(zoom);
        m._state.zoom = zoom;
      }
      if (!isEqualNoType(pitch, m._state.pitch)) {
        mapDest.setPitch(pitch);
        m._state.pitch = pitch;
      }
      if (!isEqualNoType(bearing, m._state.bearing)) {
        mapDest.setBearing(bearing);
        m._state.bearing = bearing;
      }
      if (!isEqualNoType(center, m._state.center)) {
        mapDest.setCenter(center);
        m._state.center = center;
      }
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
  show() {
    const m = this;
    m.unlock();
    if (m._el_main) {
      m._el_main.style.display = "block";
    }
  }
  hide() {
    const m = this;
    m.lock();
    if (m._el_main) {
      m._el_main.style.display = "none";
    }
  }
}
