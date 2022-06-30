import chroma from "chroma-js";

const def = {
  map: null,
  use_animation: false,
  register_listener: false, // If trhe highligther will be triggered by event "event_type"
  event_type: "click", // click, mousemove. Does not work yet with mousemove
  transition_duration: 200,
  transition_delay: 0,
  animation_duration: 700, // 0 unlimited
  animation_on: "line-width", // only option now
  highlight_offset: 2, // greater that 2 is too much for lines
  highlight_blur: 0.2,
  highlight_width: 5,
  highlight_color: "#F0F",
  highlight_opacity: 0.9,
  highlight_feature_opacity: 0.5,
  supported_types: ["circle", "symbol", "fill", "line"],
  regex_layer_id: /^MX/,
};

class Highlighter {
  constructor(opt) {
    const hl = this;
    /**
     * local store
     */
    hl._features = [];
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
      hl._listener = hl.update.bind(hl);
      hl.map.on(hl.opt.event_type, hl._listener);
    }
  }

  /**
   * Event handler
   */
  update(e) {
    const hl = this;
    hl.updateFeatures(e);
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
    while (hl._features.length) {
      const f = hl._features.pop();
      if (!f.id) {
        return;
      }
      hl.disableState(f);
      hl.removeHighlightLayer(f);
    }
  }

  /**
   * Render : for each feature :
   * - Enable state
   * - Add highlight layer
   */
  render() {
    const hl = this;
    hl._features.forEach((f) => {
      if (!f.id) {
        return;
      }
      hl.addHighlightLayer(f);
      hl.enableState(f);
    });
  }

  /**
   * Remove highlight :
   * - Remove layer if exists
   * - reset feature state
   * - Stop animation
   */
  disableState(f) {
    const hl = this;
    hl.map.setFeatureState(f, {
      highlight: false,
    });
  }

  /**
   * Add highlight
   * - Clean previous highlight
   * - Update layer to use feature state conditional expression
   * - Set feature state
   */
  enableState(f) {
    const hl = this;
    //hl.updateLayerStyle(f);
    hl.map.setFeatureState(f, {
      highlight: true,
    });
  }

  /**
   * Add highlight layer
   * - Remove previous layer
   * - Add layer
   * - start animation
   */
  addHighlightLayer(f) {
    const hl = this;
    f._layer_hl = hl.buildHighlightLayer(f);
    hl.removeHighlightLayer(f);
    /**
     * Even if we remove the layer in removeHighlightLayer, just before,
     * it could still be there, somehow. TODO: check why.
     */
    hl.map.addLayer(f._layer_hl);
    if (hl.opt.use_animation) {
      f._animation = new Animate(hl, f._layer_hl);
      f._animation.start();
    }
  }

  /**
   * Remove highlight layer
   * - Remove layer
   * - start animation
   */
  removeHighlightLayer(f) {
    const hl = this;
    if (!f._layer_hl) {
      return;
    }
    const l = hl.map.getLayer(f._layer_hl.id);
    if (l) {
      hl.map.removeLayer(l.id);
    }
    if (f._animate instanceof Animate) {
      f._animate.stop();
    }
  }

  /**
   * Add feature from click event location
   */
  updateFeatures(e) {
    const hl = this;
    hl.clean();
    const rF = hl.map
      .queryRenderedFeatures(e.point)
      .filter(hl.isSupportedFeature.bind(hl));
    hl._features.push(...rF);
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
    const supported =
      types.indexOf(f.layer.type) > -1 &&
      paint instanceof Object &&
      paint[`${f.layer.type}-color`];
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

  /**
   * If needed, update layer style with required feature-stat opacity
   */
  updateLayerStyle(f) {
    const hl = this;
    const type = f.layer.type;
    const idLayer = f.layer.id;
    const idFeature = f.id;

    /**
     * Update conditional style if it's a feature with an id, set an opacity effect
     * when the feature is highlighted.
     *
     * Caveat :
     *     - feature must have and id
     *     - feature color can't be an expression : string color only
     */
    if (idFeature) {
      /**
       * {type}-opacity can't be used : it's reserved for opacity slider
       *
       *  -- fill
       *  fill-color <-
       *  fill-outline-color
       *
       *  -- line
       *  line-color <-
       *
       *  -- symbol
       *  icon-color <-
       *  icon-halo-color
       *
       *  text-color
       *
       *
       *  -- circle
       *
       *  circle-color <-
       *  circle-stroke-color
       */

      const propertyColor = {
        fill: "fill-color",
        line: "line-color",
        symbol: "icon-color",
        circle: "circle-color",
      }[type];

      const colorRaw = hl.map.getPaintProperty(idLayer, `${propertyColor}`);
      const colorOrig = getChromaColor(colorRaw);

      if (colorOrig) {
        const colorExpr = hl.toFeatureStateConditional({
          on: colorOrig.alpha(hl.opt.highlight_feature_opacity).css(),
          off: colorOrig.css(),
        });
        hl.map.setPaintProperty(idLayer, `${propertyColor}`, colorExpr);
      }
    }
  }

  /**
   * Build highlight layer:
   * !!TODO: As some style property can't be set, e.g. fill-outline-width, we need to
   * add a new line layer only for this. For now, adding one layer per feature, but
   * we could group by feature with the same source and geometry.
   */
  buildHighlightLayer(f) {
    const hl = this;
    const idSource = f.layer.source;
    const idSourceLayer = f.layer["source-layer"];
    const idLayer = `@hl-@${f.id}-${f.layer.id}`;
    const type = f.layer.type;
    let layer = null;
    const opacityExpr = hl.toFeatureStateConditional({
      on: hl.opt.highlight_opacity,
      off: 0,
    });

    /**
     * This highlight layer display all features : we have to filter only the current feature.
     * Should have worked with ['id'] as https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#id
     * workaround -> using properties -> gid. Works with vector/geojson point, line, polygons
     */
    const gid = f?.properties?.gid;
    const filter =
      gid !== null
        ? ["==", ["get", "gid"], f.id]
        : f.id !== null
        ? ["==", ["id"], f.id]
        : [];

    switch (type) {
      case "fill":
        layer = {
          id: idLayer,
          type: "line",
          source: idSource,
          filter: filter,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-offset": 0, // -hl.opt.highlight_offset, result not good on complex polygon
            "line-width": hl.opt.highlight_width,
            "line-color": hl.opt.highlight_color,
            "line-blur": hl.opt.highlight_blur,
            "line-opacity": opacityExpr,
          },
        };
        break;
      case "line":
        layer = {
          id: idLayer,
          type: "line",
          source: idSource,
          filter: filter,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-gap-width": hl.opt.highlight_offset,
            "line-width": hl.opt.highlight_width,
            "line-color": hl.opt.highlight_color,
            "line-blur": hl.opt.highlight_blur,
            "line-opacity": opacityExpr,
          },
        };
        break;
      default:
        let radius =
          (f.layer.paint["circle-radius"] || 1) + hl.opt.highlight_offset / 2;
        if (radius < 17) {
          radius = 17;
        }
        layer = {
          filter: filter,
          id: idLayer,
          type: "circle",
          source: idSource,
          paint: {
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": hl.opt.highlight_color,
            "circle-stroke-opacity": hl.opt.highlight_opacity,
            "circle-stroke-width": hl.opt.highlight_width,
            "circle-blur": hl.opt.highlight_blur / radius,
            "circle-radius": radius,
            "circle-opacity": opacityExpr,
          },
        };
    }
    if (idSourceLayer) {
      layer["source-layer"] = idSourceLayer;
    }

    return layer;
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
    anim._idInterval = window.setInterval(
      anim.animate.bind(anim),
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

/**
 * Helpers
 */

/* test if it's a valid color */
function getChromaColor(color) {
  if (color instanceof Array) {
    return;
  }
  const isValid = chroma.valid(color);
  if (isValid) {
    return chroma(color);
  }
}
