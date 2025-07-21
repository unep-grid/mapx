import { bindAll } from "../bind_class_methods";
import { clone, patchObject, updateIfEmpty } from "../mx_helper_misc";
import { isEmpty, isMap, isNotEmpty } from "./../is_test/index";
const def = {
  map: null, // Mapbox gl instance
  transition_duration: 180,
  transition_delay: 0,
  highlight_shadow_blur: 2,
  highlight_width: 3,
  highlight_color: "rgb(255,0,255)",
  highlight_opacity: 0.8,
  highlight_radius: 3,
  supported_types: ["circle", "symbol", "fill", "line"],
  regex_layer_id: /^MX-/,
  max_layers_render: 20,
};

const defState = {
  filters: [],
};

class Highlighter {
  constructor(opt = {}) {
    const hl = this;
    /**
     * Bind
     */
    bindAll(hl);

    /**
     * local store
     */
    hl._layers = {};
    hl._state = hl._def_state();
    hl._destroyed = false;
    hl.opt = hl._def_opt();

    /**
     * Set options
     */
    hl.setOptions(opt);
  }

  /**
   * Update options
   */
  setOptions(opt = {}) {
    const hl = this;
    if (hl.destroyed) {
      return;
    }
    for (const k of Object.keys(def)) {
      const updated = opt[k];
      if (isNotEmpty(updated)) {
        hl.opt[k] = updated;
      }
    }
    return hl.update();
  }

  /**
   * Get current options
   */
  getOptions() {
    return Object.assign({}, this.opt);
  }

  /**
   * Init listener
   */
  init(map) {
    const hl = this;
    if (hl.destroyed) {
      return;
    }

    if (!isMap(map)) {
      throw new Error("mapbox-gl map is required");
    }
    hl._map = map;
  }

  /**
   * Set highlighting state
   *
   * @param {Object} state - State options for what to highlight.
   * @param {Array.<Object>} state.filters - Array of filter objects to be applied.
   * @param {String} state.filters[].id - Identifier of the view to which the filter applies.
   * @param {Array} state.filters[].filter - MapboxGL expression
   * @returns {number} Number of matched feature
   * @example
   * hl.setState({
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: ["<", ["get", "year"], 2000] },
   *   ],
   * });
   *
   * hl.setState({
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: [">=", ["get", "fatalities"], 7000] },
   *   ],
   * });
   *
   * hl.setState({
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
  setState(state) {
    const hl = this;
    const def = hl._def_state();
    if (hl.destroyed) {
      return;
    }

    if (isEmpty(state) || isEmpty(state.filters)) {
      return;
    }
    hl._state = patchObject(def, hl._state || {});

    for (const item of state.filters) {
      const { id, filter } = item;
      const previous = hl._state.filters.find((f) => f.id === id);
      if (previous) {
        previous.filter = filter;
      } else {
        hl._state.filters.push(item);
      }
    }

    return hl.update();
  }

  /**
   * Set highlighting state (legacy method for backward compatibility)
   * @deprecated Use setState() instead
   */
  set(config) {
    return this.setState(config);
  }

  getState() {
    return clone(this._state);
  }

  /**
   * Get highlighting state (legacy method for backward compatibility)
   * @deprecated Use getState() instead
   */
  get() {
    return this.getState();
  }

  get destroyed() {
    return !!this._destroyed;
  }

  /**
   * Destroy : remove listener and clean
   */
  destroy() {
    const hl = this;
    if (hl.destroyed) {
      return;
    }
    hl._destroyed = true;
    hl._clear();
  }
  /**
   * Reset state and clear
   */
  reset() {
    const hl = this;
    if (hl.destroyed || hl.has_no_filters) {
      return;
    }
    hl._clear();
    return hl._feature_count;
  }

  /**
   * Update
   * @returns {Integer} feature count
   */
  update() {
    const hl = this;
    if (hl.destroyed) {
      return 0;
    }
    hl._update_layers();
    hl._render();
    return hl._feature_count;
  }

  _clear_layers_map() {
    const hl = this;
    for (const layer of hl.layers) {
      const mapLayer = hl._map.getLayer(layer.id);
      if (mapLayer) {
        hl._map.removeLayer(layer.id);
      }
    }
  }

  /**
   * Clear
   */
  _clear() {
    const hl = this;
    hl._clear_layers_map();
    hl._layers = {};
    hl._state = hl._def_state();
    return hl.update(true);
  }

  /**
   * Render : for each feature :
   * - Enable state
   * - Add highlight layer
   */
  _render() {
    const hl = this;
    const max = hl.opt.max_layers_render;
    let i = 0;
    for (const layer of hl.layers) {
      if (i++ >= max) {
        return;
      }
      hl._add_or_update_highlight_layer(layer);
    }
  }

  /**
   * Add layer
   */
  _add_or_update_highlight_layer(layer) {
    const hl = this;
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

  _get_layers_by_prefix(prefix) {
    return this._map
      .getStyle()
      .layers.filter((layer) => layer.id.startsWith(prefix));
  }

  _def_state() {
    return clone(defState);
  }
  _def_opt() {
    return clone(def);
  }

  /**
   * Recreate items configuration
   * return {integer} feature  count
   */
  _update_layers() {
    const hl = this;
    const def = hl._def_state();
    const state = patchObject(def, hl._state);
    hl._feature_count = 0;
    const hl_layers = {};
    for (const item of state.filters) {
      const { id, filter } = item;

      const layers = hl._get_layers_by_prefix(id);
      const gids = [];

      const filter_gids = ["in", ["get", "gid"], ["literal", gids]];

      for (const layer of layers) {
        const features = hl._map.queryRenderedFeatures(null, {
          layers: [layer.id],
          filter: filter,
        });
        hl._feature_count += features.length;
        /**
         * Add gids for each visited layer
         * but only create one highlight layer per source
         */
        gids.push(...features.map((f) => f.properties?.gid));

        if (!layers[layer.source]) {
          hl_layers[layer.source] = hl._create_layers(layer, filter_gids);
        }
      }
    }

    hl._layers = hl_layers;
  }

  get layers() {
    const hl = this;
    const out = Object.values(hl._layers || {}) || [];
    return out.flat();
  }

  get has_no_filters() {
    const hl = this;
    const state = hl._state;
    return isEmpty(state.filters);
  }

  _create_layers(layer, filter) {
    const hl = this;
    const idLayer = `@hl-${layer.source}`;
    const layers = [];
    const sourceLayer = layer["source-layer"];

    const baseLayer = {
      id: idLayer,
      source: layer.source,
      filter: filter,
    };

    if (isNotEmpty(sourceLayer)) {
      baseLayer["source-layer"] = sourceLayer;
    }

    const { type } = layer;

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

        layers.push(...[shadowLayerLine, lineLayerLine]);
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
        layers.push(...[shadowCircleLayer, circleLayer]);
        break;

      default:
        console.warn(`Layer type ${type}`);
        layers.push(baseLayer);
    }
    return layers;
  }
}
export { Highlighter };
