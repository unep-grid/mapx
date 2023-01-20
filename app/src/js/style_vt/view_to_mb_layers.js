import { makeSimpleLayer } from "./simple_layer.js";
import { settings } from "./../settings/index.js";
import {
  makeId,
  path as p,
  clone,
  updateIfEmpty,
} from "./../mx_helper_misc.js";
import { isNotEmpty, isEmpty, isObject } from "./../is_test/index.js";
import { colorToRgba } from "./../color_utils";
import { getLabelFromObjectPath, getDictItem } from "../language";
import { getViewSourceSummary } from "./../mx_helper_source_summary.js";
import { getView, sortLayers } from "../map_helpers/index.js";

const def = {
  zoomConfig: {
    zoomMax: 22,
    zoomMin: 0,
    sizeFactorZoomMax: 0,
    sizeFactorZoomMin: 0,
    sizeFactorZoomExponent: 1,
  },
  polygonBorderConfig: {
    enable: false,
    opacity: 0.5,
    color: "#000",
    enableAutoColor: false,
  },
};

/**
 * Create mapbox layers from mapx's style
 * @param {Object|String} v View or view's id
 * @param {Object} opt Options
 * @param {Boolean} opt.useLabelAsId Set id based on rule's label (e.g. for sld)
 * @param {Boolean} opt.simplifyExpression Simplify expressions (e.g. for SLD)
 * @param {Boolean} opt.mapxOrder Order to add layers sequentially - instead of appending all at once
 * @return {Promise<Array>} Array of mapbox layers
 */
export async function getViewMapboxLayers(v, opt) {
  const {
    useLabelAsId = false,
    simplifyExpression = false,
    mapxOrder = true,
  } = opt || {};

  const view = getView(v);
  const idView = view.id;
  const idSource = `${view.id}-SRC`;
  const viewData = p(view, "data");
  const attr = p(viewData, "attribute.name", null);
  const style = p(viewData, "style", {});
  const showSymbolLabel = p(style, "showSymbolLabel", false);
  const includeUpper = p(style, "includeUpperBoundInInterval", false);
  const hideNulls = p(style, "hideNulls", false);
  const ruleNulls = p(style, "nulls", [])[0] || {};
  const geomType = p(viewData, "geometry.type", "point");
  const source = p(viewData, "source", {});
  const idSourceLayer = p(source, "layerInfo.name");
  const zoomConfig = p(style, "zoomConfig", {});
  const polygonBorderConfig = p(style, "polygonBorderConfig", {});

  const reverseLayerOrder = mapxOrder
    ? style.reverseLayer
    : !style.reverseLayer;

  const out = {
    layers: [],
    rules: [],
    config: {},
  };

  /**
   * set defaults
   */
  updateIfEmpty(zoomConfig, def.zoomConfig);
  updateIfEmpty(polygonBorderConfig, def.polygonBorderConfig);

  /**
   * No PostGIS layer id -> nothing to do
   */
  if (!idSourceLayer) {
    return out;
  }

  /**
   * Init null value
   */
  let nullValue = "";
  if (isNotEmpty(ruleNulls.value)) {
    nullValue = ruleNulls.value;
  }

  /**
   * Fetch source stat.
   * NOTE:
   * - summary must be up-to-date : source may have changed, not the view
   * - idAttr + nullValue could be deduced from stored view server side,
   *   but in case of a a style preview, could be different.
   */
  const sourceSummary = await getViewSourceSummary(view, {
    nullValue: nullValue,
    idAttr: attr,
    stats: ["attributes"],
  });
  const statType = p(sourceSummary, "attribute_stat.type", "categorical");
  const isNumeric = statType === "continuous";
  const sepLayer = p(settings, "separators.sublayer", "@");

  /**
   * Rules
   */
  const rules = clone(p(style, "rules", []));
  const nRules = rules.length;
  const layers = [];
  const styleCustom = JSON.parse(p(style, "custom.json"));

  /**
   * Set default numeric min / max
   */
  const rulesValues = {};

  if (isNumeric) {
    rulesValues.min = p(sourceSummary, "attribute_stat.min", -Infinity);
    rulesValues.max = p(sourceSummary, "attribute_stat.max", Infinity);
  }

  /**
   * Updte filterNull ( after type is determined )
   */
  const filterIncludeNull = [];
  const filterExcludeNull = [];

  for (const op of ["==", "!="]) {
    const f = op === "==" ? filterIncludeNull : filterExcludeNull;
    if (isNumeric) {
      if (isEmpty(nullValue)) {
        f.push(["any", [op, ["get", attr], ""], [op, ["get", attr], null]]);
      } else {
        f.push([op, ["get", attr], nullValue * 1]);
      }
    } else {
      if (isNotEmpty(nullValue) || nullValue === false) {
        f.push([op, ["get", attr], nullValue]);
      } else {
        f.push(["any", [op, ["get", attr], ""], [op, ["get", attr], null]]);
      }
    }
  }

  /**
   * Clean rules
   */
  if (isNumeric && nullValue !== "" && isFinite(nullValue)) {
    // NOTE: ''*1 -> 0...
    nullValue = nullValue * 1;
  }

  let rInc = nRules;
  while (rInc-- > 0) {
    const rule = rules[rInc];

    /**
     * Check if it's a valid rule : it should be an object with
     * at least a non-empty rule.value
     */
    let isValid = isObject(rule) && !isEmpty(rule.value);

    if (!isValid) {
      rules.splice(rInc, 1);
    }
  }

  /**
   * Convert colors
   */
  for (const rule of rules) {
    rule.rgba = colorToRgba(rule.color, rule.opacity);
    rule.rgb = colorToRgba(rule.color);
  }

  /**
   * Check rules
   */
  const ruleAll = rules.find((r) => r.value === "all");
  const hasRuleAll = !!ruleAll;
  const hasStyleRules = nRules > 0; // && rules[0].value !== undefined;

  /**
   * Set style type
   */
  const useStyleCustom = isObject(styleCustom) && styleCustom.enable === true;
  const useStyleDefault = !useStyleCustom && !hasStyleRules;
  const useStyleNull = !useStyleDefault && !hideNulls;
  const useStyleAll = !useStyleCustom && !useStyleDefault && hasRuleAll;
  const useStyleFull = !useStyleCustom && !useStyleAll && hasStyleRules;

  if (
    !useStyleCustom &&
    !useStyleDefault &&
    !useStyleAll &&
    !useStyleFull &&
    !useStyleNull
  ) {
    return out;
  }

  /**
   * Make custom layer
   */
  if (useStyleCustom) {
    const defaultStyle = {
      id: `${idView}${sepLayer}${0}__custom`,
      source: idSource,
      "source-layer": idView,
      type: "circle",
      paint: {},
      filter: [">=", ["get", "gid"], 0],
      layout: {},
      minzoom: zoomConfig.zoomMin,
      maxzoom: zoomConfig.zoomMax,
      metadata: {
        position: 0,
        priority: 0,
        idView: idView,
        filter: [],
        custom: true,
      },
    };
    const layerCustom = {
      type: styleCustom.type,
      paint: styleCustom.paint,
      filter: styleCustom.filter,
      layout: styleCustom.layout,
      minzoom: styleCustom.minzoom,
      maxzoom: styleCustom.maxzoom,
    };
    updateIfEmpty(layerCustom, defaultStyle);
    layers.push(layerCustom);
  }

  /*
   * Apply default style is no style is defined
   */
  if (useStyleDefault) {
    const label = "Default";
    const layerDefault = _build_layer({
      geomType: geomType,
      label: label,
    });
    const ruleDefault = {
      label_en: label,
      value: "all",
      color: layerDefault?.metadata?.hexColor,
      size: layerDefault?.metadata?.size,
    };
    rules.push(ruleDefault);
    layers.push(layerDefault);
  }

  /**
   * Create layer for single rule covering all values
   */
  if (useStyleAll) {
    const hasSprite = ruleAll.sprite && ruleAll.sprite !== "none";
    const hasSymbol = hasSprite && geomType === "point";
    const hasPattern = hasSprite && geomType === "polygon";

    const filter = ["all"];

    if (isNumeric) {
      /*
       * If null value, eg. 0 is included : [=>-10,==0 ,<10]
       */
      filter.push(...filterExcludeNull);
    }

    if (hasSymbol) {
      /**
       * Symbol only
       */
      const layerSprite = _build_layer({
        priority: 0,
        geomType: "symbol",
        hexColor: ruleAll.color,
        sprite: ruleAll.sprite,
        opacity: ruleAll.opacity,
        size: ruleAll.size,
        filter: filter,
        rule: ruleAll,
      });

      layers.push(layerSprite);
    } else {
      /**
       * Base layer and pattern
       */
      const layerAll = _build_layer({
        geomType: geomType,
        type: isNumeric ? "number" : "string",
        priority: 1,
        hexColor: ruleAll.color,
        sprite: ruleAll.sprite,
        opacity: ruleAll.opacity,
        size: ruleAll.size,
        filter: filter,
        rule: ruleAll,
      });

      layers.push(layerAll);

      if (hasPattern) {
        const layerPattern = _build_layer({
          priority: 0,
          geomType: "pattern",
          hexColor: ruleAll.color,
          sprite: ruleAll.sprite,
          opacity: ruleAll.opacity,
          size: ruleAll.size,
          filter: filter,
          rule: ruleAll,
        });
        layers.push(layerPattern);
      }
    }
  }

  /*
   * Apply style if avaialble
   */
  if (useStyleFull) {
    /**
     * evaluate rules
     */
    rules.forEach((rule, i) => {
      const filter = ["all"];

      if (isNumeric) {
        /*
         * If null value, eg. 0 is included : [>=-10,==0,<10]
         */
        filter.push(...filterExcludeNull);
      }
      /*
       * Set logic for rules
       */
      const nRules = rules.length - 1;
      const position = reverseLayerOrder ? nRules - i : i;
      const isLast = i === nRules;
      const isFirst = i === 0;

      const nextRule = rules[i + 1];
      /**
       * If no value_to, use next value, or use max, or null (non numeric)
       */
      const nextValue = p(nextRule, "value", rulesValues.max);
      rule.value_to = p(rule, "value_to", nextValue);

      const fromValue = rule.value;
      const toValue = isNumeric ? rule.value_to : null;
      const sameFromTo = isNumeric && toValue === fromValue;
      /**
       *  Symbols and pattern check
       */
      const hasSprite = rule.sprite && rule.sprite !== "none";
      const hasSymbol = hasSprite && geomType === "point";
      const hasPattern = hasSprite && geomType === "polygon";

      if (isNumeric && !sameFromTo) {
        /**
         * Case where attr to filter is numeric
         */
        const fromOp = isFirst ? ">=" : includeUpper ? ">" : ">=";
        const toOp = isLast ? "<=" : includeUpper ? "<=" : "<";
        filter.push([fromOp, ["get", attr], fromValue]);
        filter.push([toOp, ["get", attr], toValue]);
      } else {
        /**
         * String and boolean
         */
        filter.push(["==", ["get", attr], fromValue]);
      }

      rule.filter = filter;

      if (!hasSymbol) {
        /**
         * Normal layer and pattern
         */
        const layerMain = _build_layer({
          position: position,
          priority: 1,
          geomType: geomType,
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sprite: rule.sprite,
          filter: filter,
          rule: rule,
        });
        layers.push(layerMain);

        if (hasPattern) {
          const layerPattern = _build_layer({
            position: position,
            priority: 0,
            geomType: "pattern",
            hexColor: rule.color,
            opacity: rule.opacity,
            sprite: rule.sprite,
            filter: filter,
            rule: rule,
          });
          layers.push(layerPattern);
        }
      } else {
        /**
         * Layer for symbols
         */
        const layerSprite = _build_layer({
          position: position,
          geomType: "symbol",
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sprite: rule.sprite,
          filter: filter,
          rule: rule,
        });

        layers.push(layerSprite);
      }
    });
  }

  /**
   * Handle layer for null values
   */
  if (useStyleNull) {
    const filter = ["all", ...filterIncludeNull];

    updateIfEmpty(ruleNulls, {
      color: "#A9A9A9",
      size: 2,
      label_en: await getDictItem("schema_style_nulls"),
    });

    const hasSprite = ruleNulls.sprite && ruleNulls.sprite !== "none";
    const layerNull = _build_layer({
      priority: 1,
      //position: reverseLayerOrder ? nRules : -1,
      position: -1,
      geomType: geomType === "point" && hasSprite ? "symbol" : geomType,
      hexColor: ruleNulls.color,
      opacity: ruleNulls.opacity,
      size: ruleNulls.size,
      sprite: hasSprite ? ruleNulls.sprite : null,
      filter: filter,
      rule: ruleNulls,
    });
    ruleNulls.filter = filter;
    // Hack to reference null in makeNumericSlider
    view._null_filter = filter;
    layers.push(layerNull);
    rules.push(ruleNulls);
  }

  sortLayers(layers);

  return {
    layers,
    rules,
    config: {
      useStyleCustom,
      useStyleDefault,
      useStyleAll,
      useStyleFull,
      useStyleNull,
      styleCustom,
      style,
    },
  };

  /**
   * Local helpers
   */
  function _build_layer(opt) {
    const config = Object.assign(
      {},
      {
        id: null,
        rule: {},
        idSource: idSource,
        idSourceLayer: idView,
        idView: idView,
        type: isNumeric ? "number" : "string",
        idSuffix: "",
        position: 0,
        priority: 0,
        showSymbolLabel: showSymbolLabel,
        sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
        sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
        sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
        zoomMax: zoomConfig.zoomMax,
        zoomMin: zoomConfig.zoomMin,
        useLabelAsId: useLabelAsId,
        simplifyExpression: simplifyExpression,
        useOutline: polygonBorderConfig.enable,
        outlineColor: polygonBorderConfig.color,
        useOutlineAuto: polygonBorderConfig.enableAutoColor,
        outlineOpacity: polygonBorderConfig.opacity,
      },
      opt
    );

    if (!config.label && config.rule) {
      config.label = getLabelFromObjectPath({
        obj: config.rule,
        sep: "_",
        path: "label",
        defaultValue: config.rule.value,
      });
    }

    if (!config.id) {
      config.id = idView;
      config.idSuffix = makeId();
    }

    return makeSimpleLayer(config);
  }
}
