import { getView } from "./index.js";
import { getViewRtLegendUrl } from "./legend_rt.js";
import { dedupeLegendRules } from "./../legend_vt/rules.js";
import { getViewMapboxLayers } from "./../style_vt/view_to_mb_layers.js";
import { checkLanguage, getLabelFromObjectPath } from "./../language/index.js";
import {
  isArray,
  isEmpty,
  isNotEmpty,
  isObject,
  isView,
  isViewRt,
  isViewVt,
} from "./../is_test/index.js";

/**
 * @typedef {Object} ViewLegendJson
 * @property {string} idView View id
 * @property {string} type View type, e.g. "vt", "rt"
 * @property {"mapx"|"geoserver"|null} provider Format of `data`
 * @property {boolean} supported A structured legend is available
 * @property {Object|null} data Legend, structure defined by `provider`
 * @property {string} [reason] Why the legend is not supported
 */

/**
 * Get a structured legend of a view.
 * - vt views: provider "mapx", the legend rules computed by MapX;
 * - rt views with a WMS GetLegendGraphic URL: provider "geoserver", the
 *   GeoServer JSON legend as returned by the server.
 * Unsupported cases resolve with `supported: false` and a `reason`.
 * @param {Object} opt Options
 * @param {string|Object} opt.view View or view id
 * @return {Promise<ViewLegendJson>}
 */
export async function getViewLegendJson(opt) {
  const view = getView(opt?.view);
  if (!isView(view)) {
    throw new Error("View not found");
  }
  if (isViewVt(view)) {
    return getVtLegendJson(view);
  }
  if (isViewRt(view)) {
    return getRtLegendJson(view);
  }
  return unsupported(view, "unsupported_view_type");
}

async function getVtLegendJson(view) {
  const { rules, config } = await getViewMapboxLayers(view);
  if (config?.useStyleCustom) {
    return unsupported(view, "custom_style");
  }
  dedupeLegendRules(rules);
  if (isEmpty(rules)) {
    return unsupported(view, "no_legend");
  }
  return {
    idView: view.id,
    type: view.type,
    provider: "mapx",
    supported: true,
    data: {
      title: getLabelFromObjectPath({
        obj: view,
        path: "data.style.titleLegend",
        defaultValue: null,
      }),
      geometry: view?.data?.geometry?.type || null,
      attribute: {
        name: view?.data?.attribute?.name || null,
        type: view?.data?.attribute?.type || null,
      },
      rules: rules.map(ruleToJson),
    },
  };
}

async function getRtLegendJson(view) {
  if (!view?.data?.source?.legend) {
    return unsupported(view, "no_legend");
  }
  const url = getViewRtLegendUrl(view, { json: true });
  if (!url) {
    return unsupported(view, "unsupported_provider");
  }
  let data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return unsupported(view, "fetch_failed");
    }
    data = await response.json();
  } catch (e) {
    const isParse = e instanceof SyntaxError;
    return unsupported(view, isParse ? "invalid_response" : "fetch_failed");
  }
  if (!isObject(data) || !isArray(data.Legend)) {
    return unsupported(view, "invalid_response");
  }
  return {
    idView: view.id,
    type: view.type,
    provider: "geoserver",
    supported: true,
    data,
  };
}

function ruleToJson(rule) {
  const labels = {};
  for (const [key, value] of Object.entries(rule)) {
    if (key.startsWith("label_") && isNotEmpty(value)) {
      labels[key.slice("label_".length)] = value;
    }
  }
  const lang = checkLanguage({ obj: rule, path: "", prefix: "label_" });
  const value = isEmpty(rule.value) ? null : rule.value;
  return {
    value,
    value_to: isEmpty(rule.value_to) ? null : rule.value_to,
    // As displayed in the MapX legend: translation, then value
    label: labels[lang] ?? value,
    labels,
    color: rule.color ?? null,
    opacity: rule.opacity ?? 1,
    size: rule.size ?? null,
    sprite: rule.sprite || null,
    color_border: rule.add_border ? (rule.color_border ?? null) : null,
  };
}

function unsupported(view, reason) {
  return {
    idView: view.id,
    type: view.type,
    provider: null,
    supported: false,
    data: null,
    reason,
  };
}
