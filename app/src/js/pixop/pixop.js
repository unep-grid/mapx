import { getLayerNamesByPrefix } from "./../mx_helpers.js";
import { el } from "./../el/src/index.js";
import PixopWorker from "./pixop.mxworker.js";

export class PixOp {
  constructor(config) {
    if (this instanceof PixOp) {
      const px = this;
      window.px = this;
      px.config = config || {};
      px.timing = {};
      px.data = px.getDefault("data");
      px.canvas = null;
      px.sources = px.getDefault("sources");
      px.opt = px.getDefault("render_options");
      px.result = {};
      px.bounds = [];
      px.init();
      px._cache = {
        map_zoom: 0,
        circles: {},
        canvas: {},
      };
      px._rendering = false;
      px._destroyed = false;
    } else {
      return new PixOp(config);
    }
  }

  init() {
    const px = this;
    px.initConfig();
    px.initCanvas();
    px.initWorker();
  }

  destroy() {
    const px = this;
    if (px.isDestroyed()) {
      return;
    }
    px.clear();
    px.elCanvas.remove();
    px._worker.terminate();
    px._destroyed = true;
  }

  isDestroyed() {
    return this._destroyed;
  }

  setOpacity(opacity) {
    this.elCanvas.style.opacity =
      typeof opacity === "undefined" ? 0.5 : opacity;
  }

  render(opt) {
    const px = this;
    opt = opt || {};

    if (px.isDestroyed()) {
      throw new Error("PixOp is destroyed");
    }

    if (px._rendering) {
      console.log("already rendering");
      px.config.onProgress(0);
      px.resetWorker();
    }

    render();

    function render() {
      px._timing("render", "start", true);
      px._rendering = true;
      px.config.onRender(px);

      px.reset()
        .updateRenderOptions(opt)
        .updateMapParams()
        .updateFeatures()
        .layersToPixelsStore()
        .renderWorker();

      px._timing("render", "stop");
    }
  }

  getDefault(type) {
    const def = {
      /**
       * Store mapbox gl sources
       */
      sources: {
        canvas: {},
      },
      /**
       * PixOp rendering option
       */
      render_options: {
        overlap: {
          nLayersOverlap: 2,
          calcArea: false,
          threshold: 127, // antialiasing produce varying alpha band. Which impact overlap analysis.
        },
        type: "overlap",
        debug: false,
        canvas: {
          dpr: 1,
          useScale: false,
          add: false,
          lineWidth: 0,
          lineCap: "round",
          lineJoin: "round",
          fillColor: "#F00",
          strokeColor: "#F00",
          circleRadius: 100, //meter
          spotlightBuffer: 50,
        },
      },
      /**
       * Store features and pixel arrays
       */
      data: {
        features: [],
        pixels: [],
      },
    };

    const d = def[type];

    if (!d) {
      throw new Error(type + " not defined as default");
    }

    return JSON.parse(JSON.stringify(d));
  }

  initConfig() {
    const px = this;

    px._timing("init_config", "start");

    const configDefault = {
      map: null,
      id: "MX_GC_" + Math.random().toString(36),
      layer_prefix: "MX-",
      layer_group_separator: "@",
    };

    configDefault.id_layer = configDefault.id + "_canvas";

    px.config = Object.assign({}, configDefault, px.config);
    /**
     * shortcut
     */
    px.map = px.config.map;
    px.id = px.config.id;

    px._timing("init_config", "stop");
  }

  initCanvas() {
    const px = this;
    px._timing("init_canvas", "start");
    if (px.elCanvas) {
      px.elCanvas.remove();
    }
    const idMapCanvas = px.config.id_layer;
    const elCanvas = px.makeCanvas({
      id: idMapCanvas,
      width: 10,
      height: 10,
      style: {
        transition: "opacity 0.2s ease-in-out",
        position: "absolute",
        top: 0,
        opacity: 0.5,
        pointerEvents: "none",
      },
    });

    document.body.appendChild(elCanvas);

    if (elCanvas.transferControlToOffscreen) {
      px.canvas = elCanvas.transferControlToOffscreen();
    } else {
      px.canvas = elCanvas;
    }

    px.elCanvas = elCanvas;

    px._timing("init_canvas", "stop");
  }

  resetWorker() {
    if (px._worker instanceof Worker) {
      px._worker.terminate();
      delete px._worker;
    }
    px.initCanvas();
    px.initWorker();
  }

  initWorker() {
    const px = this;
    let worker = px._worker;

    if (!worker) {
      px._worker = new PixopWorker();

      console.log("init canvas worker");
      px._worker.postMessage(
        {
          type: "init",
          canvas: px.canvas,
        },
        [px.canvas]
      );

      px._worker.addEventListener("message", (e) => {
        const data = e.data;

        if (data.type === "progress") {
          px.config.onProgress(data.progress);
        }

        if (data.type === "result") {

          if (data.calcArea) {
            const area = data.points.reduce(
              (a, coord) => a + px.getPixelAreaAtPoint(coord),
              0
            );
            px.result.area = area;
            px.config.onCalcArea(area);
          }
          px.result.nPixelTotal = data.nPixelTotal;
          px.result.nPixelFound = data.nPixelFound;
          px.config.onRendered(px);
          px._rendering = false;
          px.config.onProgress(0);
        }
      });
    }
  }

  start() {
    const px = this;
    return px;
  }

  updateMapParams() {
    const px = this;
    //const opt = px.opt;
    const map = px.map;
    const canvas = px.canvas;
    const rect = map.getCanvas().getBoundingClientRect();
    px._timing("update_bounds", "start");
    px.opt.canvas.dpr = px.opt.canvas.useScale ? window.devicePixelRatio : 1;

    px._worker.postMessage({
      type: "set_size",
      width: rect.width,
      height: rect.height,
      dpr: px.opt.canvas.dpr,
    });
    /*
     * It does not seems to be updated in worker...
     */
    canvas.width = rect.width * px.opt.canvas.dpr;
    canvas.height = rect.height * px.opt.canvas.dpr;
    px.elCanvas.style.width = rect.width;
    px.elCanvas.style.height = rect.height;

    px._cache.map_bounds = map.getBounds();
    px._cache.map_zoom = map.getZoom();
    px._timing("update_bounds", "stop");
    return px;
  }

  updateFeatures() {
    const px = this;
    px.data.features = px.getFeatures();
    return px;
  }

  layersToPixelsStore() {
    const px = this;

    const layers = px.data.features;
    const store = (px.data.pixels = []);
    const nLayer = layers.length;
    const width = px.canvas.width;
    const height = px.canvas.height;

    px._timing("layers_to_pixels", "start");

    for (var i = 0; i < nLayer; i++) {
      const pixels = px
        .layerToCanvas(layers[i])
        .getContext("2d")
        .getImageData(0, 0, width, height).data;

      store.push(pixels);
    }

    px._timing("layers_to_pixels", "stop");
    return px;
  }

   async renderWorker() {
    const px = this;
    const opt = px.opt;

    const radius = opt.canvas.spotlightRadius || 10;
    const buffer = px.getCircle(radius);

    const nLayers = px.data.pixels.length;
    const nLayersOverlap = opt.overlap.nLayersOverlap * 1 || nLayers; // 0 means all
    const calcArea = opt.overlap.calcArea === true;
    const threshold = opt.overlap.threshold;

    const imgCircleBuffer = await buffer.convertToBlob();

    px._worker.postMessage({
      type: "render",
      mode: opt.mode,
      buffer: imgCircleBuffer,
      radius: radius,
      store: px.data.pixels,
      calcArea: calcArea,
      nLayersOverlap: nLayersOverlap,
      threshold: threshold,
    });

    return px;
  };

  reset() {
    const px = this;
    px.data = px.getDefault("data");
    px.opt = px.getDefault("render_options");
    px.clear();
    return px;
  }

  clearCanvas() {
    const px = this;
    px._worker.postMessage({
      type: "clear",
    });
    return px;
  }

  clear() {
    const px = this;
    px.clearCanvas();
    return px;
  }

  getResolution() {
    const px = this;
    const ext = px.getMapBounds();
    const width = px.canvas.width;
    const height = px.canvas.height;
    const distLat = px.getLatLngDistance(
      {
        lng: ext.minLng,
        lat: ext.minLat,
      },
      {
        lng: ext.minLng,
        lat: ext.maxLat,
      }
    );
    const distLng = px.getLatLngDistance(
      {
        lng: ext.minLng,
        lat: ext.maxLat,
      },
      {
        lng: ext.maxLng,
        lat: ext.maxLat,
      }
    );

    return {
      lng: distLng / width,
      lat: distLat / height,
    };
  }

  getCircle(radius) {
    const px = this;
    const circles = px._cache.circles;
    var ctxCircle;
    radius = Math.ceil(radius);
    var circle = circles[radius];

    if (!circle) {
      circle = px.makeCanvas({
        id: "circle",
        width: radius * 2,
        height: radius * 2,
        offscreen: true,
      });
      ctxCircle = circle.getContext("2d");
      ctxCircle.beginPath();
      ctxCircle.arc(radius, radius, radius, 0, 2 * Math.PI);
      ctxCircle.closePath();
      ctxCircle.fill();
      circles[radius] = circle;
    }
    return circle;
  }

  updateRenderOptions(opt) {
    const px = this;
    const def = px.getDefault("render_options");
    opt = Object.assign({}, def, opt);

    var isObjectParam = false;

    Object.keys(def).forEach((type) => {
      isObjectParam = typeof def[type] === "object";

      if (!opt[type]) {
        opt[type] = isObjectParam ? {} : def[type];
      }
      if (isObjectParam) {
        Object.keys(def[type]).forEach((id) => {
          if (typeof opt[type][id] === "undefined") {
            opt[type][id] = def[type][id];
          }
        });
      }
    });
    px.opt = opt;
    return px;
  }

  /*
   * Get mapbox gl bounds
   */
  getMapBounds() {
    const px = this;
    const bounds = px.map.getBounds();
    return {
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
    };
  }

  getFeatures() {
    const px = this;
    px._timing("update_feature_get", "start");
    const config = px.config;
    const map = config.map;
    const featuresGroup = [];
    var featuresQuery;
    var layersNames;
    /**
     * Get base name for group layer eg. MX-ABC@01 > MX-ABC
     */
    const layerBaseNames = getLayerNamesByPrefix({
      map: map,
      prefix: config.layer_prefix,
      base: true,
    });

    layerBaseNames.forEach(function (l) {
      /**
       * Get feature by group MX-ABC@01, MX-ABC@02, etc..
       */
      layersNames = getLayerNamesByPrefix({
        map: map,
        prefix: l,
      });

      featuresQuery = map.queryRenderedFeatures({
        layers: layersNames,
      });

      /**
       * Replace properties by layer id
       */
      featuresQuery = featuresQuery.map(function (feature) {
        return {
          type: feature.type,
          geometry: feature.geometry,
          properties: { id: l },
        };
      });

      /**
       * Store result
       */
      featuresGroup.push(featuresQuery);
    });

    px._timing("update_feature_get", "stop");
    return featuresGroup;
  }

  layerToCanvas(layer) {
    const px = this;
    const opt = px.opt;
    var radius;
    var point;
    var circle;
    const canvas = px.makeCanvas({
      id: "layers",
      width: px.canvas.width,
      height: px.canvas.height,
      offscreen: true,
    });

    const ctx = canvas.getContext("2d");

    /**
     * Set default style
     */
    ctx.lineWidth = opt.canvas.lineWidth;
    ctx.lineCap = opt.canvas.lineCap;
    ctx.lineJoin = opt.canvas.lineJoin;
    ctx.fillStyle = opt.canvas.fillColor;
    ctx.strokeStyle = opt.canvas.strokeColor;

    var isPoly = false;
    var isLine = false;
    var isPoint = false;

    /**
     * Render the coordinates of each layer geometry
     * to the canvas
     */
    px.onEachFeatureCoords(layer, {
      onFeatureStart: function (feature, type) {
        isPoly = type === "Polygon" || type === "MultiPolygon";
        isPoint = type === "Point" || type === "MultiPoint";
        isLine = type === "LineString" || type === "MultiLineString";
      },
      onCoord: function (coord, type, first, last) {
        point = px.coordToPoint(coord[0], coord[1]);
        if (point) {
          if (isPoint) {
            radius =
              opt.canvas.circleRadius / px.getPixelSizeMeterAtLat(coord[1]);
            circle = px.getCircle(radius);
            ctx.drawImage(circle, point.x - radius, point.y - radius);
          } else {
            if (first) {
              ctx.beginPath();
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
              if (last) {
                if (isLine) {
                  ctx.stroke();
                }
                if (isPoly) {
                  ctx.closePath();
                  ctx.fill();
                }
              }
            }
          }
        }
      },
      onFeatureEnd: function () {},
    });

    return canvas;
  }

  coordToPoint(lng, lat) {
    const px = this;
    const opt = px.opt;
    const map = px.map;
    const valid = isFinite(lng) && isFinite(lat);
    var point;
    if (valid) {
      point = map.project([lng, lat]);
      if (opt.canvas.dpr !== 1) {
        point.x = point.x * opt.canvas.dpr;
        point.y = point.y * opt.canvas.dpr;
      }
    }
    return point;
  }

  pointToCoord(x, y) {
    const px = this;
    const map = px.map;
    return map.unproject([x, y]);
  }

  degreesToMeters(lon, lat) {
    var x = (lon * 20037508.34) / 180;
    var y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
    y = (y * 20037508.34) / 180;
    return {
      x: x,
      y: y,
    };
  }

  metersToDegrees(x, y) {
    const lng = (x * 180) / 20037508.34;
    const lat =
      (Math.atan(Math.exp((y * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
    return {
      lat: lat,
      lng: lng,
    };
  }

  getPixelSizeMeterAtLat(lat) {
    const px = this;
    return (
      (40075016.686 * Math.abs(Math.cos((lat / 180) * Math.PI))) /
      Math.pow(2, px._cache.map_zoom + 8)
    );
  }

  getPixelAreaAtPoint(p) {
    /**
     *      dx
     *    *––––––*
     *    |
     * dy |
     *    |
     *    *
     */
    const x = p[0];
    const y = p[1];
    const px = this;
    const map = px.map;
    const sc = px.opt.canvas.dpr;
    const topLeft = map.unproject([(x - 0.5) / sc, (y - 0.5) / sc]);
    const topRight = map.unproject([(x + 0.5) / sc, (y - 0.5) / sc]);
    const bottomLeft = map.unproject([(x - 0.5) / sc, (y + 0.5) / sc]);
    const dx = px.getLatLngDistance(topLeft, topRight);
    const dy = px.getLatLngDistance(topLeft, bottomLeft);
    return dx * dy;
  }

  getLatLngDistance(latlng1, latlng2) {
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

  makeCanvas(opt) {
    let canvas = el("canvas", opt);
    if (canvas.transferControlToOffscreen && opt.offscreen === true) {
      canvas = canvas.transferControlToOffscreen();
    }
    /*const ctx = canvas.getContext('2d');*/
    /*ctx.imageSmoothingEnabled = false;*/
    return canvas;
  }

  onEachFeatureCoords(geojson, options) {
    const px = this;
    const o = options;
    const opt = px.opt;
    var feature;
    var features;
    var g, gL, i, iL, gj, skip;
    var coords, type;

    geojson = geojson instanceof Array ? geojson : [geojson];
    const filterPolygons = opt.overlap.calcArea === true;

    if (o.onStart) {
      o.onStart(geojson);
    }

    /**
     *  For each member of the group
     */
    for (g = 0, gL = geojson.length; g < gL; g++) {
      gj = geojson[g];
      /**
       * For each features in the featureCollection or assume gj is a single feature
       */
      features = gj.features || [gj];

      for (i = 0, iL = features.length; i < iL; i++) {
        feature = features[i];
        type = feature.geometry.type;
        coords = feature.geometry.coordinates;
        skip = filterPolygons && type.indexOf("Poly") === -1;

        if (!skip) {
          /**
           * On feature end
           */
          if (o.onFeatureStart) {
            o.onFeatureStart(feature, type);
          }

          /**
           * For each coord
           */
          px.onEachCoord(coords, type, o.onCoord);

          /**
           * On feature end
           */
          if (o.onFeatureEnd) {
            o.onFeatureEnd(feature, type);
          }
        }
      }
    }
    if (o.onEnd) {
      o.onEnd();
    }

    /**
     * Helper
     */
  }

  onEachCoord(coords, type, cb) {
    var last = false;
    var first = false;
    var length = 0;

    getCoord(coords, 0);

    function getCoord(a, index) {
      if (a[0] instanceof Array) {
        length = a.length;
        a.forEach((b, i) => {
          getCoord(b, i);
        });
      } else {
        first = index === 0;
        last = index === length - 1;
        cb(a, type, first, last);
      }
    }
  }

  _timing(id, start, reset) {
    const px = this;
    const opt = px.opt;
    if (opt.debug) {
      id = id || "generic";
      start = start === "start";

      if (reset) {
        px.timing = {};
      }

      if (start) {
        px.timing[id] = {
          start: performance.now(),
          diff: 0,
        };
      } else {
        px.timing[id].diff = performance.now() - px.timing[id].start;
        console.log({
          id: id,
          duration: px.timing[id].diff,
        });
      }
    }
  }

  createWorker(fun) {
    /**
     * As string
     */
    fun = fun.toString();
    fun = fun.substring(fun.indexOf("{") + 1, fun.lastIndexOf("}"));
    /**
     * As blob
     */
    var blob = new Blob([fun], {
      type: "application/javascript",
    });
    /**
     * As URL
     */
    var blobUrl = URL.createObjectURL(blob);

    return new Worker(blobUrl);
  }
}
