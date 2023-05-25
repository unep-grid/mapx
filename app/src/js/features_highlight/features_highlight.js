import { cancelFrame, onNextFrame } from "../animation_frame";
import { bindAll } from "../bind_class_methods";
import {
  isArrayOfObject,
  isEmpty,
  isNotEmpty,
  isString,
} from "./../is_test/index";
const def = {
  map: null, // Mapbox gl instance
  use_animation: false, // Enable animation
  register_listener: false, // If true highligther will be triggered by event "event_type". "false" set as default as highligther is triggered during popup handling
  event_type: "mousemove", // click, mousemove. Does not work yet with mousemove
  transition_duration: 200,
  transition_delay: 0,
  animation_duration: 1400, // 0 unlimited
  animation_on: "line-width", // only option now
  highlight_offset: 2, // greater that 2 is too much for lines
  highlight_blur: 0.2,
  highlight_width: 5,
  highlight_color: "#F0F",
  highlight_opacity: 0.9,
  highlight_feature_opacity: 0.5,
  highlight_radius: 20,
  supported_types: ["circle", "symbol", "fill", "line"],
  regex_layer_id: /^MX-/,
  max_layers_render: 10,
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
    hl._render();
  }

  /**
   * Destroy : remove listener and clean
   */
  destroy() {
    const hl = this;
    if (hl._listener) {
      hl.map.off(hl.opt.event_type, hl._listener);
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

    hl.map = map;
    if (hl.opt.register_listener === true) {
      hl._listener = hl.update;
      hl.map.on(hl.opt.event_type, hl._listener);
    }
  }

  /**
   * Set hl config
   *
   * @param {Object} config - Configuration options for the highlighter.
   * @param {(PointLike | Array<PointLike>)?} config.point Location to query
   * @param {Array.<Object>} config.filters - Array of filter objects to be applied.
   * @param {String} config.filters[].id - Identifier of the view to which the filter applies.
   * @param {Array} config.filters[].values - Array of values that will determine the filtering behaviour.
   * @param {String} config.filters[].attribute - Attribute on which the filter values will be applied.
   * @returns {number} Number of matched feature
   * @example
   * hl.set({all:true})
   * hl.set({filters:[{id:'MX-123', values:["a","b","c"], attribute:"name"}]})
   * hl.set({filters:[{id:'MX-123', values:["a","b","c"], attribute:"name"}]})
   * hl.set({filters:[{id:'MX-456', values:[10], attribute:"count", operator:">"}]})
   * hl.set({
   *   mode : "any" 
   *   filters:[
   *   { 
   *     id:'MX-456',
   *     values:[10],
   *     attribute:"count",
   *     operator:">"
   *   },
   *   { 
   *     id:'MX-456',
   *     values:["a","b","c"],
   *     attribute:"group"
   *   }
   * ]})
   */
  set(config) {
    const hl = this;
    if (isEmpty(config)) {
      console.error("Missing config. Use 'update' to re-use previous config");
      return;
    }
    hl.reset("set");
    Object.assign(hl._config, config);
    return hl.update({ animate: true });
  }

  /**
   * Reset config and clear
   */
  reset() {
    const hl = this;
    hl._config = {};
    hl._clear();
    return hl.count();
  }

  /**
   * Update
   * @returns {number} Number of matched features
   */
  update(renderOptions) {
    const hl = this;
    hl._update_items();
    hl._update_layers();
    hl._render(renderOptions);
    return hl.count();
  }

  /**
   * Clear
   */
  _clear() {
    const hl = this;
    for (const layer of hl._layers.values()) {
      hl.removeHighlightLayer(layer);
    }
    hl._layers.clear();
    hl._items.clear();
  }
  clean() {
    console.warn("Deprecated, use clear() instead");
    const hl = this;
    return hl._clear();
  }

  /**
   * Render : for each feature :
   * - Enable state
   * - Add highlight layer
   */
  _render(renderOptions) {
    const hl = this;
    const opt = Object.assign({}, { animate: false }, renderOptions);
    const max = hl.opt.max_layers_render;
    const animate = opt.animate && hl.opt.use_animation;
    cancelFrame(hl._id_render);
    hl._id_render = onNextFrame(() => {
      let i = 0;
      for (const layer of hl._layers.values()) {
        if (i++ >= max) {
          return;
        }
        hl.addHighlightLayer(layer);
      }
      if (animate) {
        hl.animate();
      }
    });
  }

  /**
   * Add layer
   */
  addHighlightLayer(layer) {
    const hl = this;
    hl.removeHighlightLayer(layer);
    hl.map.addLayer(layer);
  }

  /**
   * Animate
   */
  animate() {
    const hl = this;
    for (const layer of hl._layers.values()) {
      if (!layer._animation) {
        layer._animation = new Animate(hl, layer);
      }
      layer._animation.start();
    }
  }

  /**
   * Remove highlight layer
   * - Remove layer
   * - start animation
   */
  removeHighlightLayer(layer) {
    const hl = this;
    if (!hl.map.getLayer(layer.id)) {
      return;
    }
    if (layer._animation instanceof Animate) {
      layer._animation.stop();
    }
    hl.map.removeLayer(layer.id);
  }

  /**
   * Recreate items configuration
   * return {void}
   */
  _update_items() {
    const hl = this;
    const config = Object.assign(
      {},
      {
        point: null,
        filters: [],
        all: false,
      },
      hl._config
    );

    hl._items.clear();

    if (isEmpty(config.point) && isEmpty(config.filters) && !config.all) {
      return;
    }

    const items = hl.map
      .queryRenderedFeatures(config?.point)
      .filter((f) => hl._match_feature(f, config))
      .map((f) => hl._features_to_item(f))
      .reduce((a, i) => hl._features_aggregate(a, i), new Map());

    for (const [id, item] of items) {
      hl._items.set(id, item);
    }
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

  _update_layers() {
    const hl = this;
    const items = hl._items;
    hl._layers.clear();
    for (const [id, item] of items) {
      item.filter = [
        "match",
        ["get", "gid"],
        [...Array.from(item.gids)],
        true,
        false,
      ];
      hl._layers.set(id, hl._item_to_layer(item));
    }
  }

  _match_feature(feature, config) {
    config = config || {};
    const hl = this;
    const modeAny = config.mode === "any"; //"all";
    const ok = hl.isSupportedFeature(feature);
   
    if (!ok) {
      return false;
    }

    if (isEmpty(config.filters)) {
      return ok;
    }

    if (!isArrayOfObject(config.filters)) {
      throw new Error(
        "Array of object {id:<id>,values:[...],attribute:'<attr>'} expected"
      );
    }

    const selects = [];
    for (const filter of config.filters) {
      const values = filter.values || [];
      const operator = filter.operator || "==";
      const value = isNotEmpty(feature.properties[filter.attribute])
        ? feature.properties[filter.attribute]
        : feature.properties?.gid;

      if (filter.id !== feature?.layer?.id) {
        continue;
      }

      const select = values.reduce((acc, currentValue) => {
        switch (operator) {
          case ">":
            return acc || value > currentValue;
          case "<":
            return acc || value < currentValue;
          case ">=":
            return acc || value >= currentValue;
          case "<=":
            return acc || value <= currentValue;
          case "==":
            return acc || value == currentValue;
          default:
            throw new Error(`Invalid operator ${operator}`);
        }
      }, false);

      selects.push(select);
    }

    const select =
      selects.length > 0 && modeAny
        ? selects.includes(true)
        : !selects.includes(false);
    return ok && select;
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
  _item_to_layer(item) {
    const hl = this;
    const idSource = item.source;
    const idSourceLayer = item.sourceLayer;
    const idLayer = `@hl-@${idSource}`;
    const type = item.type;
    const filter = item.filter;

    const layer = {
      id: idLayer,
      source: idSource,
      filter: filter,
    };

    if (idSourceLayer) {
      layer["source-layer"] = idSourceLayer;
    }

    switch (type) {
      case "fill":
        Object.assign(layer, {
          type: "line",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-offset": 0, // -hl.opt.highlight_offset, result not good on complex polygon
            "line-width": hl.opt.highlight_width,
            "line-color": hl.opt.highlight_color,
            "line-blur": hl.opt.highlight_blur,
            "line-opacity": hl.opt.highlight_opacity,
          },
        });
        break;
      case "line":
        Object.assign(layer, {
          type: "line",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-gap-width": hl.opt.highlight_offset,
            "line-width": hl.opt.highlight_width,
            "line-color": hl.opt.highlight_color,
            "line-blur": hl.opt.highlight_blur,
            "line-opacity": hl.opt.highlight_opacity,
          },
        });
        break;
      default:
        let radius = hl.opt.highlight_radius + hl.opt.highlight_offset / 2;
        Object.assign(layer, {
          type: "circle",
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": hl.opt.highlight_color,
            "circle-stroke-opacity": hl.opt.highlight_opacity,
            "circle-stroke-width": hl.opt.highlight_width,
            "circle-blur": hl.opt.highlight_blur / radius,
            "circle-radius": radius,
            "circle-opacity": hl.opt.highlight_opacity,
          },
        });
    }
    return layer;
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
    anim._map = hl.map;
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
        param: "line-width",
        min: layer.paint["line-width"],
        max: layer.paint["line-width"] * 1.5,
      },
      line: {
        param: "line-width",
        min: layer.paint["line-width"],
        max: layer.paint["line-width"] * 1.5,
      },
      circle: {
        param: "circle-stroke-width",
        min: layer.paint["circle-stroke-width"],
        max: layer.paint["circle-stroke-width"] * 1.5,
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
      anim._opt.transition_duration
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
              anim._t
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
    anim._toMin();
    anim._map.stop();
    anim._stopped = true;
    window.clearInterval(anim._idInterval);
    anim._idInterval = null;
  }
}

export { Highlighter };
