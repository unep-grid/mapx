/**
 * Get source summary of a vector tile view source
 * @param {Object} view View to get source summary
 * @return {Object} source summary
 */
export async function getViewSourceSummary(view) {
  if (view._source_summary) {
    return view._source_summary;
  }
  if (view.type === 'vt') {
    view._source_summary = await getSourceVtSummary({idView: view.id});
  }
  if (view.type === 'rt') {
    view._source_summary = await getSourceRtSummary(view);
  }
  return view._source_summary;
}

/**
 * Get vector source summary
 */
export async function getSourceVtSummary(opt) {
  const h = mx.helpers;
  opt = Object.assign(
    {},
    {idView: null, idSource: null, idAttr: null, noCache: false},
    opt
  );

  if (!h.isSourceId(opt.idSource) && !h.isViewId(opt.idView)) {
    throw new Error('Missing id of a view or a source');
  }

  const urlSourceSummary = h.getApiUrl('getSourceSummary');
  const query = h.objToParams(opt);
  const url = `${urlSourceSummary}?${query}`;

  const resp = await fetch(url);
  const summary = await resp.json();

  if (h.isObject(summary) && summary.type === 'error') {
    throw new Error(summary.msg);
  }

  return summary;
}

/**
 * Get raster (wms) source summary
 */
export async function getSourceRtSummary(view) {
  const h = mx.helpers;
  const out = {};

  if (!h.isViewWms(view)) {
    return out;
  }

  const url = h.path(view, 'data.source.tiles', []);
  const urlQuery = url[0].toLowerCase();
  const q = h.getQueryParametersAsObject(urlQuery);
  const layerName = q.layers[0];
  const endpoint = urlQuery.split('?')[0];

  const layers = await h.wmsGetLayers(endpoint);

  const layer = layers.find(
    (l) =>
      l.Name === layerName ||
      ( l.Name.split(':')[1] ? l.Name.split(':')[1].toLowerCase() === layerName.toLowerCase() : false )||
      l.Title === layerName
  );

  if (layer && layer.BoundingBox) {
    const bbx = layer.BoundingBox.find((b) => b.crs === 'EPSG:4326');
    if (bbx && bbx.extent) {
      out.extent_sp = {
        lat1: bbx.extent[2],
        lng1: bbx.extent[1],
        lat2: bbx.extent[0],
        lng2: bbx.extent[3]
      };
    }
  }

  return out;
}
