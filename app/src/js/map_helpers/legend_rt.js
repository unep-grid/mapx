import { mirrorUrlCreate } from "./../mirror_util";
import { isUrl } from "./../is_test/index.js";

/**
 * Rewrite a WMS GetLegendGraphic URL to request the JSON legend
 * (GeoServer: https://docs.geoserver.org/latest/en/user/services/wms/get_legend_graphic/).
 * Other parameters (layer, style, ...) are kept.
 * @param {string} url Legend URL
 * @return {string|null} JSON legend URL, null if not a GetLegendGraphic URL
 */
export function rtLegendUrlToJson(url) {
  if (!isUrl(url)) {
    return null;
  }
  const out = new URL(url);
  const params = out.searchParams;
  const keys = [...params.keys()];
  const keyRequest = keys.find((k) => k.toLowerCase() === "request");
  const isLegend =
    !!keyRequest && params.get(keyRequest).toLowerCase() === "getlegendgraphic";
  if (!isLegend) {
    return null;
  }
  for (const key of keys) {
    if (key.toLowerCase() === "format") {
      params.delete(key);
    }
  }
  params.set("format", "application/json");
  return out.href;
}

/**
 * Get the URL to fetch the legend of a raster view, through the mirror when
 * the view requires it.
 * @param {Object} view Raster view
 * @param {Object} [opt] Options
 * @param {boolean} [opt.json=false] Request the JSON legend
 * @return {string|null} URL, null if missing or not convertible to JSON
 */
export function getViewRtLegendUrl(view, opt) {
  const { json = false } = opt || {};
  const legend = view?.data?.source?.legend;
  const url = json ? rtLegendUrlToJson(legend) : legend;
  if (!isUrl(url)) {
    return null;
  }
  return view?.data?.source?.useMirror ? mirrorUrlCreate(url) : url;
}
