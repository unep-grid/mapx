const def = {
  map: null,
  use_animation: false,
  transition_duration: 100,
  transition_delay: 0,
  animation_duration: 2000, // 0 unlimited
  animation_on: 'line-width', // only option now
  highlight_offset: 2, // greater that 2 is too much for lines
  highlight_blur: 0.2,
  highlight_width: 4,
  highlight_color: '#333',
  supported_types: ['circle', 'symbol', 'fill', 'line'],
  //highlight_line_dasharray: [2, 2, 10, 2], // dasharray produce bad results in many cases.
  regex_layer_id: /^MX/,
  highlight_opacity: 0.9,
  event_type: 'click' // click, mouseover
};

class Highlighter {
  constructor(map, opt) {
    const hl = this;
    /**
     * local store
     */
    hl._features = [];
    /**
     * Set options
     */
    hl.opt = Object.assign({}, def, opt);
    hl.map = map || hl.opt.map;
    if (!hl.map) {
      throw new Error('mapbox-gl map is required');
    }

    /**
     * Start
     */
    hl.init();
  }

  setOptions(opt) {
    const hl = this;
    hl.clean();
    Object.assign(hl.opt, opt);
  }

  /**
   * Init listener
   */
  init() {
    const hl = this;
    hl._listener = hl.handler.bind(hl);
    hl.map.on(hl.opt.event_type, hl._listener);
  }

  /**
   * Clean and destroy
   */
  destroy() {
    const hl = this;
    if (hl._listener) {
      hl.map.off(hl.opt.event_type, hl._listener);
    }
    hl.clean();
  }

  clean() {
    const hl = this;
    while (hl._features.length) {
      const f = hl._features.pop();
      if (!f.id) {
        return;
      }
      hl.cleanFeatureHighlight(f);
      hl.map.setFeatureState(f, {
        highlight: false
      });
      if (f._animate instanceof Animate) {
        f._animate.stop();
      }
    }
  }

  /**
   * Cleaning
   */
  cleanFeatureHighlight(f) {
    const hl = this;
    if (f._layer_hl) {
      const l = hl.map.getLayer(f._layer_hl.id);
      if (l) {
        hl.map.removeLayer(l.id);
      }
    }
    if (f._animate instanceof Animate) {
      f._animate.stop();
    }
  }

  /**
   * Event handler
   */
  handler(e) {
    const hl = this;
    /* Remove old stuff */
    hl.clean();

    /* Update internal feature storage  */
    const rF = hl.map
      .queryRenderedFeatures(e.point)
      .filter(hl.isSupportedFeature.bind(hl));
    hl._features.push(...rF);

    /* Builld and add layers  */
    hl._features.forEach((f) => {
      /**
       * Modify displayed data
       */

      /* Update original layer style */
      hl.updateLayerStyle(f);

      /* set feature state as highlighted */
      hl.map.setFeatureState(f, {
        highlight: true
      });

      /**
       * Add an associated highlight layer
       */

      /* Build a new layer based on feature properties */
      f._layer_hl = hl.buildHighlightLayer(f);

      /* remove any remainings */
      hl.cleanFeatureHighlight(f);

      /* Add layer on top */
      hl.map.addLayer(f._layer_hl);

      /* Set layer animation */
      if (hl.opt.use_animation) {
        f._animation = new Animate(hl, f._layer_hl);
        f._animation.start();
      }
    });
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
      typeof idLayer === 'string' && !!idLayer.match(hl.opt.regex_layer_id)
    );
  }
  isSupportedFeature(f) {
    const hl = this;
    return f && hl.isValidLayer(f.layer) && hl.isSupportedType(f);
  }
  isSupportedType(f) {
    const hl = this;
    return hl.opt.supported_types.indexOf(f.layer.type) > -1;
  }

  toFeatureStateOpacity(opt) {
    opt = Object.assign({}, {on: 1, off: 0.5}, opt);
    if (opt.on instanceof Array || opt.off instanceof Array) {
      //console.warn('Expression for opacity not yet supported...');
      return null;
    }
    return [
      'case',
      ['boolean', ['feature-state', 'highlight'], false],
      opt.on,
      opt.off
    ];
  }

  /**
   * If needed, update layer style with required feature-stat opacity
   */
  updateLayerStyle(f) {
    const hl = this;
    const type = f.layer.type;
    const idLayer = f.layer.id;
    const propertyOpacity = {
      fill: 'fill-opacity',
      line: 'line-opacity',
      symbol: 'icon-opacity',
      circle: 'circle-opacity'
    }[type];
    const propertySortKey = {
      fill: 'fill-sort-key',
      line: 'line-sort-key',
      symbol: 'symbol-sort-key',
      circle: 'circle-sort-key'
    }[type];
    const opacity = hl.toFeatureStateOpacity({
      on: 1,
      off: path(f.layer, `paint.${propertyOpacity}`)
    });
    if (opacity !== null) {
      hl.map.setPaintProperty(idLayer, `${propertyOpacity}`, opacity);
    }
    const sortKey = path(f.layer, `layout.${propertySortKey}`);
    if (!sortKey) {
      hl.map.setLayoutProperty(idLayer, `${propertySortKey}`, 100);
    }
  }

  /**
   * Build highlight layer
   */
  buildHighlightLayer(f) {
    const hl = this;
    const idSource = f.layer.source;
    const idSourceLayer = f.layer['source-layer'];
    const idLayer = `@hl-${f.layer.id}`;
    const type = f.layer.type;
    let layer = null;
    let opacity = hl.toFeatureStateOpacity({
      on: hl.opt.highlight_opacity,
      off: 0
    });

    const filter = f.id ? ['==', ['id'], f.id] : [];

    switch (type) {
      case 'fill':
        layer = {
          id: idLayer,
          type: 'line',
          source: idSource,
          filter: filter,
          'source-layer': idSourceLayer,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-offset': 0, // -hl.opt.highlight_offset, result not good on complex polygon
            'line-width': hl.opt.highlight_width,
            'line-color': hl.opt.highlight_color,
            'line-blur': hl.opt.highlight_blur,
            'line-opacity': opacity
          }
        };
        break;
      case 'line':
        layer = {
          id: idLayer,
          type: 'line',
          source: idSource,
          filter: filter,
          'source-layer': idSourceLayer,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-gap-width': hl.opt.highlight_offset,
            'line-width': hl.opt.highlight_width,
            'line-color': hl.opt.highlight_color,
            'line-blur': hl.opt.highlight_blur,
            'line-opacity': opacity
          }
        };
        break;
      default:
        let radius =
          (f.layer.paint['circle-radius'] || 1) + hl.opt.highlight_offset / 2;
        if (radius < 17) {
          radius = 17;
        }
        layer = {
          filter: filter,
          id: idLayer,
          type: 'circle',
          source: idSource,
          'source-layer': idSourceLayer,
          paint: {
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': hl.opt.highlight_color,
            'circle-stroke-opacity': hl.opt.highlight_opacity,
            'circle-stroke-width': hl.opt.highlight_width,
            'circle-blur': hl.opt.highlight_blur / radius,
            'circle-radius': radius,
            'circle-opacity': opacity
          }
        };
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
      delay: anim._opt.transition_delay
    };

    /* set animation values */
    anim._s = {
      fill: {
        param: 'line-width',
        min: layer.paint['line-width'],
        max: layer.paint['line-width'] * 1.7
      },
      line: {
        param: 'line-width',
        min: layer.paint['line-width'],
        max: layer.paint['line-width'] * 1.7
      },
      circle: {
        param: 'circle-stroke-width',
        min: layer.paint['circle-stroke-width'],
        max: layer.paint['circle-stroke-width'] * 2
      }
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
    try {
      if (Date.now() >= anim._time_limit) {
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
    anim._stopped = true;
    window.clearInterval(anim._idInterval);
    anim._idInterval = null;
  }
}

export {Highlighter};

/**
 * Helpers
 */

/* access to object properties by path */
function path(object, path, def) {
  return path.split('.').reduce((a, k) => (a ? a[k] : def), object);
}
