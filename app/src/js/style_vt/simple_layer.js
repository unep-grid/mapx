import { settings } from "./../settings/index.js";
import { updateIfEmpty } from "./../mx_helper_misc.js";
import { isArray, isEmpty, isNotEmpty } from "./../is_test/index.js";
import { getSpriteImage } from "./../map_helpers/index.js";
import chroma from "chroma-js";

/**
 * Will be stored as layer.meta
 */
const def = {
  id: null,
  label: null,
  idSuffix: "",
  priority: 0,
  idSourceLayer: null,
  idView: null,
  idAfter: null,
  geomType: null,
  type: null,
  label: null,
  color: null,
  colorSecondary: null,
  filter: ["all"],
  size: null,
  sprite: null,
  sizeFactorZoomMax: 0,
  sizeFactorZoomMin: 0,
  sizeFactorZoomExponent: 1,
  zoomMin: 0,
  zoomMax: 22,
  opacity: 0.5,
  showSymbolLabel: null,
  useLabelAsId: null,
  simplifyExpression: null,
  useOutline: null,
  outlineColor: null,
  useOutlineAuto: null,
  outlineOpacity: null,
};

/**
 * Create a simple layer
 * @param {object} opt Options
 * @param {string} opt.id Id of the layer
 * @param {string} opt.idSuffix Suffix of the layer id
 * @param {number} opt.priority Set inner priority in case of layer group. 0 important, > 0 less important
 * @param {string} opt.idSourceLayer Id of the source layer / id of the view
 * @param {string} opt.idView id of the view
 * @param {string} opt.idAfter Id of the layer after
 * @param {string} opt.idSource Id of the source
 * @param {string} opt.geomType Geometry type (point, line, polygon)
 * @param {String} opt.type Data type (string,number)
 * @param {Boolean} opt.showSymbolLabel Show symbol with label
 * @param {Boolean} opt.useLabelAsId Ignore id and use label as layer id
 * @param {Boolean} opt.simplifyExpression Simplify expression
 * @param {String} opt.label Label text or expression
 * @param {string} opt.color Hex color. If not provided, random color will be generated
 * @param {String} opt.colorSecondary Polygon outline
 * @param {array} opt.filter
 * @param {Number} opt.size
 * @param {string} opt.sprite
 * @param {Boolean} opt.useOutline Add outline to polygons
 * @param {Boolean} opt.useOutlineAuto Use automatic color for outline
 * @param {Nmber} opt.outlineOpacity Polygon outline opacity
 * @return {Object} Layer
 */
export function makeSimpleLayer(opt) {
  updateIfEmpty(opt, def);

  const validId = opt.id || (opt.useLabelAsId && opt.label);

  if (!validId) {
    console.warn("makeSimpleLayer: layer with no ID");
    return;
  }

  /**
   * Size / Zoom factor
   * TODO: merge this with setStyle() helper
   * and make sure sprite is correctly sized
   */
  if (isEmpty(opt.size)) {
    switch (opt.geomType) {
      case "point":
        opt.size = 10;
        break;
      case "symbol":
        opt.size = 1;
        break;
      default:
        opt.size = 2;
    }
  }

  /**
   * Set sprite
   */
  if (opt.sprite === "none") {
    opt.sprite = null;
  }
  if (isNotEmpty(opt.sprite)) {
    const spriteImage = getSpriteImage(opt.sprite);
    opt.size = opt.size / spriteImage.width;
  }

  /**
   * Color
   */

  if (!opt.color) {
    opt.color = chroma.random().hex();
  }

  opt.color = chroma(opt.color).alpha(opt.opacity).css();

  if (!opt.colorSecondary) {
    opt.colorSecondary = chroma(opt.color).alpha(opt.opacity).darken(1).css();
  }

  /**
   * Set alternative color
   */
  if (opt.geomType === "polygon") {
    /**
     * Set polygon outline color
     */
    if (!opt.useOutline) {
      opt.colorSecondary = "rgba(0,0,0,0)";
    } else {
      if (!opt.useOutlineAuto) {
        /**
         * Use user defined color
         */
        opt.colorSecondary = chroma(opt.colorSecondary)
          .alpha(opt.outlineOpacity)
          .css();
      } else {
        /**
         * Attempt to find the best suited color
         */
        const colDark = chroma(opt.color)
          .darken(1)
          .alpha(opt.outlineOpacity)
          .css();
        const colClear = chroma(opt.color)
          .brighten(1)
          .alpha(opt.outlineOpacity)
          .css();
        const contrastDark = chroma.contrast(opt.color, colDark);
        const contrastClear = chroma.contrast(opt.color, colClear);
        if (contrastDark > contrastClear) {
          opt.colorSecondary = colDark;
        } else {
          opt.colorSecondary = colClear;
        }
      }
    }
  }

  /**
   * Base layer
   */
  const sepLayer = settings?.separators?.sublayer;
  const idSuffix = opt.idSuffix ? sepLayer + opt.idSuffix : "";
  const id = opt.useLabelAsId && opt.label ? opt.label : `${opt.id}${idSuffix}`;

  const layer = {
    id: id,
    source: opt.idSource,
    minzoom: opt.zoomMin,
    maxzoom: opt.zoomMax,
    filter: opt.filter,
    "source-layer": opt.idSourceLayer,
    metadata: opt,
  };

  /**
   * Legacy filter conversion
   */
  if (opt.simplifyExpression) {
    const f = layer.filter;
    const opExpr = ["get"];
    if (isArray(f[1])) {
      if (opExpr.includes(f[1][0])) {
        f[1] = f[1][1];
      }
    }
  }

  /**
   * Geom specific
   */
  switch (opt.geomType) {
    case "symbol":
      Object.assign(layer, {
        type: "symbol",
        layout: {
          "icon-image": opt.sprite,
          "icon-size": opt.simplifyExpression
            ? size(opt)
            : ["*", size(opt), settings.scale_icon],
          "icon-allow-overlap": true,
          "icon-ignore-placement": false,
          "icon-optional": true,
          "icon-anchor": "bottom",
          "text-field": opt.showSymbolLabel ? opt.label + "" || "" : "",
          "text-variable-anchor": opt.showSymbolLabel
            ? ["bottom-left", "bottom-right"]
            : [],
          "text-font": ["Noto Sans Medium"],
          "text-size": opt.simplifyExpression
            ? 10
            : [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                ["*", 10, settings.scale_text],
                18,
                ["*", 20, settings.scale_text],
              ],
          "text-radial-offset": 1.2,
          "text-justify": "auto",
        },
        paint: {
          "icon-opacity": opt.opacity || 1,
          "icon-halo-width": 0,
          "icon-halo-color": opt.colorSecondary,
          "icon-color": opt.color,
          "text-color": "#000",
          "text-halo-color": "#FFF",
          "text-halo-blur": 0.2,
          "text-halo-width": 1,
          "text-translate": [10, 10],
        },
      });
      break;
    case "point":
      Object.assign(layer, {
        type: "circle",
        paint: {
          "circle-color": opt.color,
          "circle-radius": size(opt, 0.5),
        },
      });
      break;
    case "polygon":
      Object.assign(layer, {
        type: "fill",
        paint: {
          "fill-color": opt.color,
          "fill-outline-color": opt.colorSecondary,
        },
      });
      break;
    case "pattern":
      Object.assign(layer, {
        type: "fill",
        paint: {
          "fill-pattern": opt.sprite,
          "fill-antialias": false,
        },
      });
      break;
    case "line":
      Object.assign(layer, {
        type: "line",
        paint: {
          "line-color": opt.color,
          "line-width": size(opt),
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
      break;
    default:
      throw new Error(`${opt.geomType} not supported`);
  }

  return layer;
}

function size(opt, baseFactor) {
  const b = baseFactor || 1;
  const size = opt.size;
  const hasZoomFactor =
    opt.sizeFactorZoomMax !== 0 || opt.sizeFactorZoomMin !== 0;
  if (!hasZoomFactor || opt.simplifyExpression) {
    /**
     * NOTE: altering opt will alter returned simple_layer output
     */
    opt.size = size * b;
    return opt.size;
  }
  return [
    "interpolate",
    ["exponential", opt.sizeFactorZoomExponent],
    ["zoom"],
    opt.zoomMin,
    opt.sizeFactorZoomMin * opt.size * b,
    opt.zoomMax,
    opt.sizeFactorZoomMax * opt.size * b,
  ];
}
