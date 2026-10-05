function normalizePrefix(prefix) {
  if (prefix instanceof RegExp) {
    return prefix;
  }
  if (typeof prefix === "string") {
    return new RegExp("^" + prefix);
  }
  throw new Error(
    'getRuntimeLayersByPrefix requires "prefix" set as a string or regex',
  );
}

/**
 * Get layers in runtime order, including non-serializable custom layers.
 *
 * map.getStyle().layers only contains style-spec layers. MapLibre custom
 * layers can be rendered and moveable without being serialized there, so
 * layer ordering must use the runtime layer order when available.
 */
export function getRuntimeLayersByPrefix(options) {
  const opt = Object.assign({ prefix: /^MX-/ }, options);
  const map = opt.map;
  if (!map) {
    return [];
  }

  const prefix = normalizePrefix(opt.prefix);
  const styleLayers = map.getStyle()?.layers ?? [];
  const styleLayerById = new Map(styleLayers.map((layer) => [layer.id, layer]));
  const layerIds =
    map.getLayersOrder instanceof Function
      ? map.getLayersOrder()
      : styleLayers.map((layer) => layer.id);

  return layerIds
    .filter((id) => id.match(prefix))
    .map((id) => styleLayerById.get(id) || map.getLayer(id))
    .filter(Boolean);
}

/**
 * Get map sources used by a view's layers, keyed by source id.
 *
 * Views may render several layers from several sources (e.g. custom-code
 * views); only the layer id is bound to the view id, not the source id.
 */
export function getViewSourcesFromLayers(options) {
  const { map, idView } = options || {};
  const style = map?.getStyle();
  const sources = style?.sources ?? {};
  const out = {};

  if (!idView) {
    return out;
  }

  for (const layer of style?.layers ?? []) {
    if (!layer.id.startsWith(idView) || !sources[layer.source]) {
      continue;
    }
    out[layer.source] = sources[layer.source];
  }
  return out;
}
