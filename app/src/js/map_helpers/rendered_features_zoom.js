const MAPX_VIEW_LAYER_PREFIX = "MX-";

/**
 * Query features currently rendered by one view or by all MapX view layers.
 *
 * @param {object} options Options
 * @param {object} options.map MapLibre map instance
 * @param {string} [options.idView] Optional view id
 * @param {string} [options.layerSeparator="@"] Composite layer separator
 * @returns {Array<object>} Rendered features
 */
export function queryRenderedViewFeatures({
  map,
  idView,
  layerSeparator = "@",
}) {
  const layers = map.getStyle()?.layers || [];
  const layerIds = layers
    .map((layer) => layer.id)
    .filter((idLayer) =>
      idView
        ? idLayer === idView || idLayer.startsWith(`${idView}${layerSeparator}`)
        : idLayer.startsWith(MAPX_VIEW_LAYER_PREFIX),
    );

  if (layerIds.length === 0) {
    return [];
  }

  return map.queryRenderedFeatures({ layers: layerIds });
}

/**
 * Return to the world view when no MapX feature is currently rendered.
 * Existing map constraints are intentionally preserved.
 *
 * @param {object} map MapLibre map instance
 * @returns {boolean} Done
 */
export function zoomToWorld(map) {
  map.flyTo({ center: [0, 0], zoom: 0 });
  return true;
}

/**
 * Apply the zoom policy for rendered MapX view features.
 *
 * @param {object} options Options
 * @param {object} options.map MapLibre map instance
 * @param {string} [options.idView] Optional view id
 * @param {string} [options.layerSeparator="@"] Composite layer separator
 * @param {(features: Array<object>) => Promise<object>} options.createBounds Build bounds from features
 * @param {(bounds: object) => boolean} options.fitBounds Fit computed feature bounds
 * @param {() => Promise<boolean|undefined>} options.zoomToViewExtent Zoom to a view's full extent
 * @returns {Promise<boolean>} Done
 */
export async function zoomToRenderedViewFeatures({
  map,
  idView,
  layerSeparator,
  createBounds,
  fitBounds,
  zoomToViewExtent,
}) {
  const features = queryRenderedViewFeatures({ map, idView, layerSeparator });

  if (features.length > 0) {
    const bounds = await createBounds(features);
    return fitBounds(bounds);
  }

  if (idView) {
    const done = await zoomToViewExtent();
    return typeof done === "boolean" ? done : false;
  }

  return zoomToWorld(map);
}
