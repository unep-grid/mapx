import { cancelFrame, onNextFrame } from "../animation_frame";
import { bindAll } from "../bind_class_methods";
import { isArrayOfObject, isNotEmpty } from "./../is_test/index";
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
  regex_layer_id: /^MX/,
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
    hl.render();
  }

  /**
   * Destroy : remove listener and clean
   */
  destroy() {
    const hl = this;
    if (hl._listener) {
      hl.map.off(hl.opt.event_type, hl._listener);
    }
    hl.clean();
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
   * Event handler
   */
  update(config) {
    const hl = this;
    hl.updateItems(config);
    hl.render();
  }

  /**
   * Clean : for each feature :
   * - Remove from list
   * - Disable state
   * - Clean highlight layer
   */
  clean() {
    const hl = this;
    for (const layer of hl._layers.values()) {
      hl.removeHighlightLayer(layer);
    }
    hl._layers.clear();
  }

  /**
   * Render : for each feature :
   * - Enable state
   * - Add highlight layer
   */
  render() {
    const hl = this;
    const max = hl.opt.max_layers_render;
    const animate = hl.opt.use_animation;
    cancelFrame(hl._id_render);
    hl._id_render = onNextFrame(() => {
      hl.updateLayers();
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
   * @param {Object} config Optional configuration to filter items
   * @param {Array} config.filters Array highlight filters based on source layer id and gid attributes. i.e  [{id:'<sourceLayer>',values:[...<value>],attribute:'<attribute>'},...]
   * return {void}
   */
  updateItems(config) {
    const hl = this;
    hl.clean();
    config = Object.assign(
      {},
      {
        filters: [],
      },
      config
    );

    const items = hl.map
      .queryRenderedFeatures(config?.point)
      .filter((f) => hl._match_feature(f, config))
      .map((f) => hl._features_to_item(f))
      .reduce((a, i) => hl._features_aggregate(a, i), new Map());

    hl._items.clear();

    for (const [id, item] of items) {
      hl._items.set(id, item);
    }
  }

  updateLayers() {
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
    const hl = this;
    config = config || {};
    let select = true;

    if (isNotEmpty(config.filters)) {
      if (!isArrayOfObject(config.filters)) {
        throw new Error(
          "Array of object {id:<id>,values:[...],attribute:'<attr>'} expected"
        );
      }
      select = false;
      for (const filter of config.filters) {
        const values = filter.values || [];
        const value =
          feature.properties[filter.attribute] || feature.properties?.gid;
        if (
          !select &&
          filter.id === feature.sourceLayer &&
          values.includes(value)
        ) {
          select = true;
        }
      }
    }
    const ok = hl.isSupportedFeature(feature);
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
    return (
      typeof idLayer === "string" && !!idLayer.match(hl.opt.regex_layer_id)
    );
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
