import { colorToHex } from "./../color_utils";
import { getView, getMap, getViewTitle } from "../map_helpers/index.js";
import { getViewMapboxLayers } from "./view_to_mb_layers";

/**
 * Create mapbox style from view's layers
 * @param {String|object} idView Id of the view or view
 * @param {Object} opt Options
 * @param {Boolean} opt.useLabelAsId Set id based on rule's label (e.g. for sld)
 * @param {Boolean} opt.addMetadata Add metadata (types...)
 * @return {Promise<Object>} Style object
 */
export async function getViewMapboxStyle(idView, opt) {
  const { useLabelAsId = false, addMetadata = false } = opt || {};

  const view = getView(idView);
  const base = await getViewMapboxLayers(view, {
    useLabelAsId,
    addMetadata,
  });
  const map = getMap();
  const style = map.getStyle();
  const title = getViewTitle(view);
  const meta_layer_keep = ["position", "priority", "type"];
  const types = [];

  delete style.metadata;
  style.name = title;

  while (style.layers.length) {
    style.layers.pop();
  }

  for (const layer of base.layers) {
    if (layer.paint) {
      for (const k in layer.paint) {
        /* rgb / rgba not yet supported by sld */
        if (/color$/.test(k)) {
          layer.paint[k] = colorToHex(layer.paint[k]);
        }

        /* outline do not render well in sld, better removing it */
        if (/outline-color$/.test(k)) {
          delete layer.paint[k];
        }
        /* min/max zoom bug in geostyler */
        delete layer.minzoom;
        delete layer.maxzoom;
      }
    }

    for (const k in layer.metadata) {
      if (!meta_layer_keep.includes(k)) {
        delete layer.metadata[k];
      }
      if (layer.metadata.type) {
        types.push(layer.metadata.type);
      }
    }

    style.layers.push(layer);
  }
  /**
   * If used directly in mapbox style,
   * all layers should be reversed. If used in mapx,
   * They will be added sequentially, at a given point, but
   * not directly. reverse option in sortLayers is not usefull
   * here, as it take in account position AND priority.
   */
  style.layers.reverse();

  /**
   * Remove unused sources
   */
  const sources = style.layers.map((l) => l.source);

  for (const s in style.sources) {
    if (!sources.includes(s)) {
      delete style.sources[s];
    }
  }

  if (addMetadata) {
    /**
     * Add metadata
     */
    style.metadata = {
      type_all_numeric: types.reduce((a, t) => a && t === "number", true),
      types: types,
    };
  }

  return style;
}
