import {miniCacheSet, miniCacheGet, miniCacheRemove} from './minicache';

/**
 * Get source summary of a vector tile view source
 * @param {Object} view View to get source summary
 * @param {Object} opt Additional option to pass to getSourceVtSummary
 * @return {Object} source summary
 */
export async function getViewSourceSummary(view, opt) {
  const h = mx.helpers;

  opt = Object.assign(
    {},
    {idView: view.id, timestamp: view._src_timestamp},
    opt
  );

  let out = {};

  if (view.type === 'vt') {
    out = await getSourceVtSummary(opt);
  }
  if (view.type === 'rt') {
    out = await getSourceRtSummary(view);
  }
  if (view.type === 'gj') {
    out = await getSourceGjSummary(view);
  }

  /**
   * ⚠️  Ensure compatibility with previous source summary method,
   * generated when the view was saved and not on the fly
   */
  if (h.isObject(out.attribute_stat)) {
    view.data.attribute = Object.assign({}, view.data.attribute, {
      name: out.attribute_stat.attribute,
      type: out.attribute_stat.type === 'continuous' ? 'number' : 'string',
      max: out.attribute_stat.max,
      min: out.attribute_stat.min,
      table: out.attribute_stat.table
    });
  }

  if (h.isObject(out.extent_time)) {
    view.data.period = Object.assign({}, view.data.period, {
      extent: out.extent_time
    });
  }

  if (h.isObject(out.extent_sp)) {
    view.data.geometry = Object.assign({}, view.data.geometry, {
      extent: out.extent_sp
    });
  }
  view._src_timestamp = out.timestamp;
  return out;
}

const def = {
  idView: null,
  idSource: null,
  idAttr: null,
  noCache: false,
  binsMethod: 'jenks',
  binsNumber: 5,
  stats: ['base', 'attributes', 'temporal', 'spatial'],
  timestamp: null
};

/**
 * Get vector source summary
 */
export async function getSourceVtSummary(opt) {
  const h = mx.helpers;
  const start = performance.now();
  let origin = 'cache';
  /*
   * Set defaults
   */
  opt = Object.assign({}, def, opt);
  /*
   * Clean unwanted keys
   */
  const keys = Object.keys(def);
  Object.keys(opt).forEach((k) => {
    if (keys.indexOf(k) === -1) {
      delete opt[k];
    }
  });

  if (!h.isSourceId(opt.idSource) && !h.isViewId(opt.idView)) {
    return {};
  }

  /*
   * Fetch summary or use cache
   */
  const useCache = mx.settings.cacheIgnore === false && opt.noCache === false;
  const urlSourceSummary = h.getApiUrl('getSourceSummary');
  const query = h.objToParams(opt);
  const url = `${urlSourceSummary}?${query}`;
  let summary;

  if (useCache) {
    summary = await miniCacheGet(url);
    if (summary) {
      origin = 'cache';
    }
  }
  if (!summary) {
    origin = 'fetch';
    const resp = await fetch(url);
    summary = await resp.json();
    miniCacheSet(url, summary, {
      ttl: mx.settings.maxTimeCache
    });
  }

  /*
   * handle errors
   */
  if (h.isObject(summary) && summary.type === 'error') {
    console.warn(summary);
    miniCacheRemove(url);
    return {};
  }

  /**
   * debug
   */
  if (false) {
    console.table([
      {
        op: 'getSourceSummary',
        origin: origin,
        timing: Math.round(performance.now() - start),
        timestamp: summary.timestamp
      }
    ]);
  }

  return summary;
}

export async function getSourceVtSummaryUI(opt) {
  const h = mx.helpers;
  const summary = await h.getSourceVtSummary(opt);
  const aStat = summary.attribute_stat;
  const elContainer = h.el('div');
  let title = opt.idSource || opt.idView;
  let titleTable = 'Table';
  if (h.isViewId(opt.idView)) {
    title = h.getViewTitle(opt.idView);
  }

  if (aStat.type === 'continuous') {
    aStat.table.forEach((r) => {
      Object.keys(r).forEach((k) => (r[k] = Math.round(r[k] * 1000) / 1000));
    });
    titleTable = `${titleTable} ( Method : ${
      aStat.binsMethod
    }, number of bins : ${aStat.binsNumber} )`;
  }
  const elTable = h.elAuto('array_table', aStat.table, {
    tableTitle: titleTable
  });

  elContainer.appendChild(elTable);

  h.modal({
    title: title,
    content: elContainer
  });
}

/**
 * Get raster (wms) source summary
 */
export async function getSourceRtSummary(view) {
  const h = mx.helpers;
  const out = {};
  const url = h.path(view, 'data.source.tiles', []);
  if (url.length === 0) {
    return out;
  }
  const urlQuery = url[0];
  if (!h.isUrlValidWms(urlQuery)) {
    return out;
  }
  const q = h.getQueryParametersAsObject(urlQuery);
  
  if(!h.isArray(q.layers) && !h.isArray(q.LAYERS)){
    return out;
  }

  if(q.LAYERS){
     q.layers = q.LAYERS;
  }

  const layerName = q.layers[0];
  const endpoint = urlQuery.split('?')[0];

  const layers = await h.wmsGetLayers(endpoint);

  const layer = layers.find((l) => {
    const nameMatch = h.isString(l.Name) && l.Name === layerName;
    if (nameMatch) {
      return true;
    }
    /**
     * Match layer name to.. title ?
     */
    const titleMatch = l.Title === layerName;
    if (titleMatch) {
      return true;
    }
    /**
     * Match layer name to.. composite name ?
     */
    const nameComposite = l.Name.split(':');
    if (nameComposite[1]) {
      return nameComposite[1] === layerName;
    }
  });

  if (layer && layer.BoundingBox) {
    const bbx = layer.BoundingBox.find(
      (b) => b.crs === 'EPSG:4326' || b.crs === 'CRS:84'
    );
    if (bbx && bbx.extent && bbx.crs === 'EPSG:4326') {
      out.extent_sp = {
        lat1: bbx.extent[2],
        lng1: bbx.extent[1],
        lat2: bbx.extent[0],
        lng2: bbx.extent[3]
      };
    }

    if (bbx && bbx.extent && bbx.crs === 'CRS:84') {
      out.extent_sp = {
        lat1: bbx.extent[1],
        lng1: bbx.extent[2],
        lat2: bbx.extent[3],
        lng2: bbx.extent[0]
      };
    }
  } else {
    console.warn('Layer do not have valid bounding box', layer);
  }

  return out;
}

export async function getSourceGjSummary(view) {
  const h = mx.helpers;
  const out = {};
  if (h.isViewGj(view)) {
    out.extent_sp = h.path(view, 'data.geometry.extent', {});
  }
  return out;
}
