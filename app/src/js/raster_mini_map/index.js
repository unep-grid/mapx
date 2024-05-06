import mapboxgl from "mapbox-gl";
import style from '!postcss-loader!less-loader?{"mimetype":"text/css"}!./style.less';
import { settings } from "./../settings";
import { isFunction } from "../is_test";

const def = {
  elContainer: document.body,
  width: 40,
  height: 40,
  center: [0, 0],
  zoom: 3,
  tileSize: 256,
  tiles: [],
  mapSync: null,
  onAdded: null,
  onLoad: null,
};

class RasterMiniMap {
  constructor(opt) {
    const mm = this;
    mm.opt = Object.assign({}, def, opt);
    mm.init();
  }

  destroy() {
    const mm = this;
    mm.syncEnd();
    if (!mm.map._removed) {
      mm.map.remove();
    }
    mm.el.remove();
  }

  hasSyncMap() {
    const mm = this;
    return mm.opt.mapSync instanceof mapboxgl.Map;
  }

  isSync() {
    const mm = this;
    return mm._sync_enabled === true;
  }

  _setSync(enable) {
    const mm = this;
    return (mm._sync_enabled = enable === true);
  }

  syncNow() {
    const mm = this;
    if (mm.hasSyncMap()) {
      mm.map.setCenter(mm.opt.mapSync.getCenter());
      mm.map.setZoom(mm.opt.mapSync.getZoom());
    }
  }

  syncStart() {
    const mm = this;
    if (mm.hasSyncMap() && !mm.isSync()) {
      mm.syncNow();
      mm._sync_fun = mm.syncNow.bind(mm);
      mm.opt.mapSync.on("move", mm._sync_fun);
      mm._setSync(true);
    }
  }

  syncEnd() {
    const mm = this;
    if (mm.hasSyncMap() && mm.isSync()) {
      mm.opt.mapSync.off("move", mm._sync_fun);
      mm._sync_fun = null;
      mm._setSync(false);
    }
  }

  getImage() {
    const mm = this;
    return mm.map.getCanvas().toDataURL("png");
  }

  init() {
    const mm = this;
    try {
      mm._hasSyncMap = mm.opt.mapSync instanceof mapboxgl.Map;

      /**
       * Set style
       */
      mm.elStyle = document.createElement("style");
      mm.elStyle.setAttribute("type", "text/css");
      mm.elStyle.appendChild(document.createTextNode(style));
      /**
       * Main element
       */
      mm.el = document.createElement("div");
      mm.el.style.width = mm.opt.width + "px";
      mm.el.style.height = mm.opt.height + "px";
      mm.el.classList.add("rmm");

      /**
       * Root element
       */
      mm.elRoot = mm.opt.elContainer.attachShadow
        ? mm.opt.elContainer.attachShadow({ mode: "open" })
        : document.createElement("div");
      mm.elRoot.appendChild(mm.elStyle);
      /**
       * Add to container
       */
      mm.elRoot.appendChild(mm.el);
      /**
       * Build map
       */
      mm.elMap = document.createElement("div");
      mm.el.appendChild(mm.elMap);

      mapboxgl.accessToken = settings.map.token;

      mm.map = new mapboxgl.Map({
        preserveDrawingBuffer: true,
        fadeDuration: 0,
        container: mm.elMap,
        center: mm.opt.center,
        zoom: mm.opt.zoom,
        style: {
          version: 8,
          sources: {
            "rmm-src": {
              type: "raster",
              tiles: mm.opt.tiles,
              tileSize: mm.opt.tileSize,
            },
          },
          layers: [
            {
              id: "rmm",
              type: "raster",
              source: "rmm-src",
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
      });
      mm.map.on("error", (e) => {
        mm.onError(e);
      });
      /**
       * Add sync
       */
      mm.syncStart();

      /**
       * onAdded Callback
       */
      if (isFunction(mm.opt.onAdded)) {
        mm.opt.onAdded(mm);
      }

      if (isFunction(mm.opt.onLoad)) {
        mm.map.once("style.load", () => {
          mm.opt.onLoad(mm);
        });
      }
    } catch (e) {
      mm.onError(e);
    }
  }
  onError(e) {
    console.warn(e);
  }
}

export { RasterMiniMap };
