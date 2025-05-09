import { onNextFrame } from "../animation_frame";
import { bindAll } from "../bind_class_methods";
import { patchObject } from "../mx_helper_misc";
import { isEmpty, isNotEmpty, isString } from "./../is_test/index";
const def = {
  map: null, // Mapbox gl instance
  use_animation: false, // Enable animation
  register_listener: false, // If true highligther will be triggered by event "event_type". "false" set as default as highligther is triggered during popup handling
  event_type: "mousemove", // click, mousemove. Does not work yet with mousemove
  transition_duration: 180,
  transition_delay: 0,
  animation_duration: 200, // 0 unlimited
  animation_on: "line-width", // only option now
  highlight_shadow_blur: 2,
  highlight_width: 3,
  highlight_color: "#000",
  highlight_opacity: 0.8,
  highlight_radius: 3,
  supported_types: ["circle", "symbol", "fill", "line"],
  regex_layer_id: /^MX-/,
  max_layers_render: 20,
};

const defConfig = {
  coord: null,
  filters: [],
  features: [],
  all: false,
};

class Highlighter {
  constructor(opt) {
    const hl = this;
    /**
     * Bind
     */
    bindAll(hl);

    /**
     * local store
     */
    hl._layers = new Map();
    hl._items = new Map();
    hl._config = {};

    /**
     * Set options
     */
    hl.opt = Object.assign({}, def, opt);
  }

  /**
   * Update options
   */
  setOptions(opt) {
    const hl = this;
    Object.assign(hl.opt, opt);
    hl.update({ animate: true });
  }

  /**
   * Destroy : remove listener and clean
   */
  destroy() {
    const hl = this;
    if (hl._listener) {
      hl._map.off(hl.opt.event_type, hl._listener);
    }
    hl._clear();
  }

  /**
   * Init listener
   */
  init(map) {
    const hl = this;
    if (!map) {
      throw new Error("mapbox-gl map is required");
    }

    hl._map = map;
    if (hl.opt.register_listener === true) {
      hl._listener = hl.update;
      hl._map.on(hl.opt.event_type, hl._listener);
    }
  }

  /**
   * Set hl config
   *
   * @param {Object} config - Configuration options for the highlighter.
   * @param {Object} config.coord Location to query
   * @param {Array.<Object>} config.filters - Array of filter objects to be applied.
   * @param {String} config.filters[].id - Identifier of the view to which the filter applies.
   * @param {Array} config.filters[].filter - MapboxGL expression
   * @returns {number} Number of matched feature
   * @example
   * hl.set({
   *   all: true,
   * });
   *
   * hl.set({
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: ["<", ["get", "year"], 2000] },
   *   ],
   * });
   *
   * hl.set({
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: [">=", ["get", "fatalities"], 7000] },
   *   ],
   * });
   *
   * hl.set({
   *   filters: [
   *     {
   *       id: "MX-TC0O1-34A9Y-RYDJG",
   *       filter: [
   *         "in",
   *         ["get", "country"],
   *         ["literal", ["Nigeria", "Gabon", "Angola"]],
   *       ],
   *     },
   *   ],
   * });
   */
  set(config) {
    const hl = this;
    console.log('hl set', config);
    if (isEmpty(config)) {
      hl.reset();
      return;
    }
    hl._config = patchObject(defConfig, config);
    return hl.update({ animate: true });
  }

  get() {
    return this._config;
  }

  /**
   * Reset config and clear
   */
  reset() {
    const hl = this;
    hl._config = defConfig;
    hl._clear();
    return hl.count();
  }
  clean() {
    const hl = this;
    return hl.reset();
  }

  /**
   * Update
   * @returns {number} Number of matched features
   */
  update() {
    const hl = this;
    hl._update_items();
    hl._update_layers();
    hl._render();
    const c = hl.count();
    return c;
  }

  _clear_layers_map() {
    const hl = this;
    for (const layers of hl._layers.values()) {
      for (const layer of layers) {
        hl.removeHighlightLayer(layer);
      }
    }
  }

  /**
   * Clear
   */
  _clear() {
    const hl = this;
    hl._clear_layers_map();
    hl._layers.clear();
    hl._items.clear();
  }

  /**
   * Render : for each feature :
   * - Enable state
   * - Add highlight layer
   */
  _render() {
    const hl = this;
    const max = hl.opt.max_layers_render;
    const animate = hl.opt.use_animation;
    let i = 0;
    for (const layers of hl._layers.values()) {
      if (i++ >= max) {
        return;
      }
      for (const layer of layers) {
        hl._add_or_update_highlight_layer(layer);
      }
    }
    if (animate) {
      onNextFrame(() => {
        hl.animate();
      });
    }
  }

  /**
   * Add layer
   */
  _add_or_update_highlight_layer(layer) {
    const hl = this;
    if (layer?._animation instanceof Animate) {
      layer._animation.stop();
    }
    const mapLayer = hl._map.getLayer(layer.id);

    if (isEmpty(mapLayer)) {
      hl._map.addLayer(layer);
    } else {
      hl._map.setFilter(mapLayer.id, layer.filter);
      for (const key in layer.paint) {
        const value = layer.paint[key];
        hl._map.setPaintProperty(mapLayer.id, key, value);
      }
    }
  }

  /**
   * Animate
   */
  animate() {
    const hl = this;

    for (const layers of hl._layers.values()) {
      for (const layer of layers) {
        if (layer._no_anim) {
          continue;
        }
        if (!layer._animation) {
          layer._animation = new Animate(hl, layer);
        }
        layer._animation.start();
      }
    }
  }

  /**
   * Remove highlight layer
   * - Remove layer
   * - start animation
   */
  removeHighlightLayer(layer) {
    const hl = this;
    if (layer._animation instanceof Animate) {
      layer._animation.stop();
    }
    const mapLayer = hl._map.getLayer(layer.id);
    if (isEmpty(mapLayer)) {
      console.warn("tried to remove non-existing layers", layer.id);
      return;
    }
    hl._map.removeLayer(layer.id);
  }

  /**
   * Recreate items configuration
   * return {void}
   */
  _update_items() {
    const hl = this;
    const config = patchObject(defConfig, hl._config);

    if (hl.isNotSet()) {
      return;
    }

    const layers = hl._map
      .getStyle()
      .layers.map((l) => l.id)
      .filter((id) => id.match(hl.opt.regex_layer_id));

    const features = [];

    if (config.all) {
      /**
       * All features in selected layers
       */
      const allFeatures = hl._map.queryRenderedFeatures(null, {
        layers: layers,
      });

      features.push(...allFeatures);
    } else if (isNotEmpty(config.filters)) {
      /**
       * All feature filtered by config
       */
      for (const filter of config.filters) {
        const layersSelect = hl._filter_layer_by_prefix(filter.id, layers);
        const featuresSelect = hl._map.queryRenderedFeatures(null, {
          layers: layersSelect,
          filter: filter.filter,
        });

        features.push(...featuresSelect);
      }
    } else {
      features.push(...config.features);
    }

    const items = features
      .map((f) => hl._features_to_item(f))
      .reduce((a, i) => hl._features_aggregate(a, i), new Map());

    for (const [id, item] of items) {
      hl._items.set(id, item);
    }
  }

  /**
   * Filter layer by view id as prefix
   */
  _filter_layer_by_prefix(id, layers) {
    const reg = new RegExp(`^${id}`);
    return layers.filter((id) => id.match(reg));
  }

  /**
   * Count matched feeatures
   */
  count() {
    const hl = this;
    let count = 0;
    for (const [_, item] of hl._items) {
      count += item.gids.size;
    }
    return count;
  }

  isNotSet() {
    const hl = this;
    const config = hl._config;
    return (
      isEmpty(config.features) &&
      isEmpty(config.coord) &&
      isEmpty(config.filters) &&
      !config.all
    );
  }

  /**
   * Create layers using items, matching gids
   */
  _update_layers() {
    const hl = this;
    const items = hl._items;
    for (const [id, item] of items) {
      item.filter = [
        "match",
        ["get", "gid"],
        [...Array.from(item.gids)],
        true,
        false,
      ];
      hl._layers.set(id, hl._item_to_layers(item));
    }
  }

  /**
   * Feature to item, keeps track of gid
   */
  _features_to_item(feature) {
    return {
      sourceLayer: feature.sourceLayer,
      source: feature.source,
      type: feature.layer.type,
      gid: feature?.properties?.gid,
    };
  }

  _features_aggregate(acc, item) {
    if (isEmpty(item.gid)) {
      console.warn(
        "Missing gid / feature.properties.gid, skip item to highlight",
        item,
      );
      return acc;
    }
    if (!acc.has(item.source)) {
      acc.set(item.source, {
        type: item.type,
        gids: new Set([item.gid]),
        source: item.source,
        sourceLayer: item.sourceLayer,
      });
    } else {
      acc.get(item.source).gids.add(item.gid);
    }
    return acc;
  }

  /**
   * Build highlight layer:
   */
  _item_to_layers(item) {
    const hl = this;
    const idSource = item.source;
    const idSourceLayer = item.sourceLayer;
    const idLayer = `@hl-${idSource}`;
    const type = item.type;
    const filter = item.filter;

    const baseLayer = {
      id: idLayer,
      source: idSource,
      filter: filter,
    };

    if (idSourceLayer) {
      baseLayer["source-layer"] = idSourceLayer;
    }

    let layers = [];

    switch (type) {
      case "fill":
      case "fill-extrusion":
      case "line":
        const lineLayerLine = {
          ...baseLayer,
          type: "line",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-width": hl.opt.highlight_width,
            "line-color": hl.opt.highlight_color,
            "line-opacity": hl.opt.highlight_opacity,
          },
        };

        const shadowLayerLine = {
          ...baseLayer,
          id: `${idLayer}-shadow`,
          type: "line",
          layout: {
            "line-cap": "butt",
            "line-join": "round",
          },
          paint: {
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              hl.opt.highlight_width * 1,
              11,
              hl.opt.highlight_width * 4, // 2 * offset
            ],
            "line-color": hl.opt.highlight_color,
            "line-opacity": hl.opt.highlight_opacity / 10,
            "line-blur": hl.opt.highlight_shadow_blur,
            "line-offset": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              -hl.opt.highlight_width +
                (type === "line" ? hl.opt.highlight_width * 2 : 0),
              11,
              -hl.opt.highlight_width * 2 +
                (type === "line" ? hl.opt.highlight_width * 2 : 0),
            ],
          },
        };

        shadowLayerLine._no_anim = true;
        layers = [shadowLayerLine, lineLayerLine];
        break;

      case "symbol":
      case "circle":
        let r1 = hl.opt.highlight_radius;
        let r2 = r1 + hl.opt.highlight_width;
        let s1 = hl.opt.highlight_width;
        let s2 = s1 * 2;

        const circleLayer = {
          ...baseLayer,
          type: "circle",
          paint: {
            "circle-color": "rgb(0,0,0)",
            "circle-stroke-color": hl.opt.highlight_color,
            "circle-stroke-opacity": hl.opt.highlight_opacity,
            "circle-stroke-width": s1,
            "circle-radius": r1,
            "circle-opacity": 0,
          },
        };

        const shadowCircleLayer = {
          ...baseLayer,
          id: `${idLayer}-shadow`,
          type: "circle",
          paint: {
            "circle-opacity": 0,
            "circle-color": "rgb(0,0,0)",
            "circle-stroke-color": hl.opt.highlight_color,
            "circle-stroke-opacity": hl.opt.highlight_opacity / 10,
            "circle-stroke-width": s2,
            "circle-radius": r2,
          },
        };
        shadowCircleLayer._no_anim = true;
        layers = [shadowCircleLayer, circleLayer];
        break;

      default:
        console.warn(`Layer type ${type}`);
        layers = [baseLayer];
    }

    return layers;
  }

  /**
   * Validators
   */
  isValidLayer(layer) {
    const hl = this;
    return layer && hl.isValidIdLayer(layer.id);
  }
  isValidIdLayer(idLayer) {
    const hl = this;
    const valid = isString(idLayer) && !!idLayer.match(hl.opt.regex_layer_id);
    return valid;
  }
  isSupportedFeature(f) {
    const hl = this;
    return f && hl.isValidLayer(f.layer) && hl.isSupportedType(f);
  }

  isSupportedType(f) {
    const hl = this;
    const paint = f.layer.paint;
    const types = hl.opt.supported_types;
    const supported = types.includes(f.layer.type) && paint instanceof Object;
    //paint[`${f.layer.type}-color`];
    return supported;
  }

  toFeatureStateConditional(opt) {
    opt = Object.assign({}, { on: 1, off: 0.5 }, opt);
    return [
      "case",
      ["boolean", ["feature-state", "highlight"], false],
      opt.on,
      opt.off,
    ];
  }
}

class Animate {
  constructor(hl, layer) {
    const anim = this;
    anim._opt = hl.opt;
    anim._map = hl._map;
    anim._dim = false;
    anim._stopped = false;
    anim._time_limit = anim._opt.animation_duration
      ? Date.now() + anim._opt.animation_duration
      : 0;

    anim._idLayer = layer.id;

    anim._t = {
      duration: anim._opt.transition_duration,
      delay: anim._opt.transition_delay,
    };

    /* set animation values */
    anim._s = {
      fill: {
        param: "line-translate",
        min: [0, 0],
        max: [-3, -3],
      },
      line: {
        param: "line-translate",
        min: [0, 0],
        max: [-3, -3],
      },
      circle: {
        param: "circle-translate",
        min: [0, 0],
        max: [-3, -3],
      },
    }[layer.type];
  }

  /**
   * Start animation
   */
  start() {
    const anim = this;
    if (anim._idInterval) {
      return;
    }
    anim._idInterval = setInterval(
      () => anim.animate(),
      anim._opt.transition_duration,
    );
  }

  /**
   * Animation
   */
  animate() {
    const anim = this;
    const map = anim._map;
    const now = Date.now();
    try {
      if (now >= anim._time_limit) {
        anim.stop();
        return;
      }
      if (!anim._stopped) {
        if (!anim._transition_set) {
          /* set transition parameters*/
          const hasLayer = !!map.getLayer(anim._idLayer);
          if (hasLayer) {
            map.setPaintProperty(
              anim._idLayer,
              `${anim._s.param}-transition`,
              anim._t,
            );
          }
          anim._transition_set = true;
        }
        if (anim._dim) {
          anim._toMin();
        } else {
          anim._toMax();
        }

        /* Inverse direction*/
        anim._dim = !anim._dim;
      }
    } catch (e) {
      anim.stop();
      console.warn(e);
    }
  }

  _toMax() {
    const anim = this;
    const map = anim._map;
    const hasLayer = !!map.getLayer(anim._idLayer);
    if (hasLayer) {
      map.setPaintProperty(anim._idLayer, anim._s.param, anim._s.max);
    }
  }
  _toMin() {
    const anim = this;
    const map = anim._map;
    const hasLayer = !!map.getLayer(anim._idLayer);
    if (hasLayer) {
      map.setPaintProperty(anim._idLayer, anim._s.param, anim._s.min);
    }
  }

  /**
   * Stop animation and clean
   */
  stop() {
    const anim = this;
    window.clearInterval(anim._idInterval);
    anim._idInterval = null;
    anim._map.stop();
    anim._stopped = true;
  }
}

export { Highlighter };
