/**
 * Get source summary of a vector tile view source
 * @param {Object} view View to get source summary
 * @return {Object} source summary
 */
export async function getViewSourceSummary(view) {
  if (view._source_summary) {
    return view._source_summary;
  }
  let out = {};
  if (view.type === 'vt') {
    out = await getSourceVtSummary({idView: view.id});
  }
  if (view.type === 'rt') {
    out = await getSourceRtSummary(view);
  }
  if (view.type === 'gj') {
    out = await getSourceGjSummary(view);
  }

  view._source_summary = out;
  return out;
}

/**
 * Get vector source summary
 */
export async function getSourceVtSummary(opt) {
  const h = mx.helpers;

  /*
   * Set defaults
   */
  const def = {
    idView: null,
    idSource: null,
    idAttr: null,
    noCache: false,
    binsMethod: 'jenks',
    binsNumber: 5
  };
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
    throw new Error('Missing id of a view or a source');
  }

  /*
   * Fetch summary
   */
  const urlSourceSummary = h.getApiUrl('getSourceSummary');
  const query = h.objToParams(opt);
  const url = `${urlSourceSummary}?${query}`;

  const resp = await fetch(url);
  const summary = await resp.json();

  /*
   * handle errors
   */
  if (h.isObject(summary) && summary.type === 'error') {
    console.warn(summary.msg);
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


  const url = h.path(view, 'data.source.tiles', []);
  const urlQuery = url[0];
  const q = h.getQueryParametersAsObject(urlQuery);
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


export async function getSourceGjSummary(view){
  const h = mx.helpers;
  const out = {};
  if (h.isViewGj(view)) {
    out.extent_sp = h.path(view,'data.geometry.extent',{});
  }
  return out;
}
