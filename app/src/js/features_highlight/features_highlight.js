import { bindAll } from "../bind_class_methods";
import { clone, patchObject } from "../mx_helper_misc";
import { isEmpty, isMap } from "./../is_test/index";
const def = {
  map: null, // Mapbox gl instance
  transition_duration: 180,
  transition_delay: 0,
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
  filters: [],
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
    hl._layers = {};
    hl._config = clone(defConfig);
    hl._destroyed = false;

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
    if (hl.destroyed) {
      return;
    }
    Object.assign(hl.opt, opt);
    hl.update();
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
    if (hl.destroyed) {
      return;
    }

    if (isEmpty(config) || isEmpty(config.filters)) {
      return;
    }
    hl._config = patchObject(defConfig, hl._config || {});

    for (const item of config.filters) {
      const { id, filter } = item;
      const previous = hl._config.filters.find((f) => f.id === id);
      if (previous) {
        previous.filter = filter;
      } else {
        hl._config.filters.push(item);
      }
    }

    return hl.update();
  }

  get() {
    return clone(this._config);
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
   * Reset config and clear
   */
  reset() {
    const hl = this;
    if (hl.destroyed || hl.has_no_filters) {
      return;
    }
    hl._config = clone(defConfig);
    hl._clear();
  }

  /**
   * Update
   */
  update() {
    const hl = this;
    if (hl.destroyed || hl.has_no_filters) {
      return;
    }
    hl._update_layers();
    hl._render();
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
    hl._config;
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

  /**
   * Recreate items configuration
   * return {void}
   */
  _update_layers() {
    const hl = this;
    const config = patchObject(defConfig, hl._config);

    const hl_layers = {};
    for (const item of config.filters) {
      const { id, filter } = item;

      const layers = hl._get_layers_by_prefix(id);
      const gids = [];

      const filter_gids = ["in", ["get", "gid"], ["literal", gids]];

      for (const layer of layers) {
        const features = hl._map.queryRenderedFeatures(null, {
          layers: [layer.id],
          filter: filter,
        });

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
    const config = hl._config;
    return isEmpty(config.filters);
  }

  _create_layers(layer, filter) {
    const hl = this;
    const idLayer = `@hl-${layer.source}`;
    const layers = [];
    const baseLayer = {
      id: idLayer,
      source: layer.source,
      "source-layer": layer["source-layer"],
      filter: filter,
    };
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
