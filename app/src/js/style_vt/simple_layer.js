import { settings } from "./../settings/index.js";
import { updateIfEmpty } from "./../mx_helper_misc.js";
import { isArray, isEmpty, isNotEmpty } from "./../is_test/index.js";
import { getSpriteImage } from "./../map_helpers/index.js";
import chroma from "chroma-js";

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
 * @param {string} opt.hexColor Hex color. If not provided, random color will be generated
 * @param {array} opt.filter
 * @param {Number} opt.size
 * @param {string} opt.sprite
 * @return {Object} Layer
 */
export function makeSimpleLayer(opt) {
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
    hexColor: null,
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
  };

  updateIfEmpty(opt, def);

  const validId = opt.id || (opt.useLabelAsId && opt.label);

  if (!validId) {
    console.warn("makeSimpleLayer: layer with no ID");
    return;
  }

  /**
   * Size / Zoom factor
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

  if (!opt.hexColor) {
    opt.hexColor = chroma.random().hex();
  }
  const colA = chroma(opt.hexColor).alpha(opt.opacity).css();
  const colB = chroma(opt.hexColor).alpha(opt.opacity).darken(1).css();

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
          "icon-size": size(),
          "icon-allow-overlap": true,
          "icon-ignore-placement": false,
          "icon-optional": true,
          "icon-anchor": "bottom",
          "text-field": opt.showSymbolLabel ? opt.label + "" || "" : "",
          "text-variable-anchor": opt.showSymbolLabel
            ? ["bottom-left", "bottom-right"]
            : [],
          "text-font": ["Arial"],
          "text-size": opt.simplifyExpression
            ? 10
            : ["interpolate", ["linear"], ["zoom"], 1, 10, 18, 20],
          "text-radial-offset": 1.2,
          "text-justify": "auto",
        },
        paint: {
          "icon-opacity": opt.opacity || 1,
          "icon-halo-width": 0,
          "icon-halo-color": colB,
          "icon-color": colA,
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
          "circle-color": colA,
          "circle-radius": size(0.5),
        },
      });
      break;
    case "polygon":
      Object.assign(layer, {
        type: "fill",
        paint: {
          "fill-color": colA,
          "fill-outline-color": "rgba(0,0,0,0)",
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
          "line-color": colA,
          "line-width": size(),
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

  function size(baseFactor) {
    const b = baseFactor || 1;
    const size = opt.size;
    const hasZoomFactor =
      opt.sizeFactorZoomMax !== 0 || opt.sizeFactorZoomMin !== 0;
    if (!hasZoomFactor || opt.simplifyExpression) {
      return size * b;
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
}
