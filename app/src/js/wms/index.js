import {miniCacheSet, miniCacheGet} from './../minicache';
import {mirrorUrlCreate} from './../mirror_util';
import {wmsBuildQueryUi} from './ui.js';
export {wmsBuildQueryUi, wmsGetCapabilities, wmsGetLayers, urlTile, urlLegend};

/**
 * Build the WMS helper component
 *
 * @param {Object} opt Options
 * @param {Sting} opt.selectorParent Id of the parent where to insert the component
 * @param {Array} opt.services Array of default services
 * @param {Sting} opt.selectorTileInput Id of the tile input
 * @param {Sting} opt.selectorLegendInput Id of the legend input
 *
 *
 *TODO: event delegation, destroy method
 */

async function wmsGetCapabilities(baseUrl, opt) {
  const h = mx.helpers;
  opt = Object.assign(
    {},
    {
      useCache: mx.settings.useCache,
      searchParams: null,
      useMirror: false
    },
    opt
  );
  const queryString = h.objToParams(
    Object.assign(
      {},
      {
        service: 'WMS',
        request: 'GetCapabilities',
        version: '1.1.1'
      },
      opt.searchParams
    )
  );
  const ignoreCache = opt.useCache === false;
  const useMirror = opt.useMirror === true;
  const url = `${baseUrl}?${queryString}`;

  if (!h.isUrlValidWms(url)) {
    throw new Error(
      `wmsGetCapabilities requires valid wms URL`
    );
  }

  if (!useMirror && !h.isUrlHttps(url)) {
    throw new Error(
      `wmsGetCapabilities requires ssl/tls enabled ('https:'). Tips: 
       - Use 'https:' protocol,
       - Request provider to use a ssl/tls certificate,
       - Use a mirror.`
    );
  }

  const WMSCapabilities = await h.moduleLoad('wms-capabilities');

  const dataCache = await miniCacheGet(url);

  if (!ignoreCache && dataCache) {
    console.log('WMS GetCapabilities from cache');
    return h.path(dataCache, 'Capability', {});
  }

  console.log('WMS GetCapabilities from server');
  const urlFetch = useMirror ? mirrorUrlCreate(url) : url;
  const xmlString = await h.fetchProgress_xhr(urlFetch, {
    maxSize: mx.settings.maxByteFetch,
    timeout: 2e4
  });

  const dataFetch = new WMSCapabilities(xmlString).toJSON();
  miniCacheSet(url, dataFetch, {ttl: mx.settings.maxTimeCache});
  return h.path(dataFetch, 'Capability', {});
}

async function wmsGetLayers(baseUrl, opt) {
  opt = opt || {};
  const optGetCapabilities = Object.assign({},opt.optGetCapabilities);
  opt = Object.assign({}, {optGetCapabilities}, opt);

  const layers = [];
  const capability = await wmsGetCapabilities(baseUrl, opt.optGetCapabilities);

  if (!capability || !capability.Layer || !capability.Layer.Layer) {
    return layers;
  }

  layerFinder(capability.Layer, layers);
  return layers;
}

function layerFinder(layer, arr) {
  if (isWmsLayer(layer)) {
    arr.push(layer);
  }
  if (isArray(layer.Layer)) {
    layer.Layer.forEach((layer) => layerFinder(layer, arr));
  }
}

function isWmsLayer(layer) {
  const h = mx.helpers;
  return (
    h.isObject(layer) &&
    h.isStringRange(layer.Name, 1) &&
    h.isStringRange(layer.Title, 1) &&
    h.isArray(layer.BoundingBox) &&
    layer.BoundingBox.length > 0
  );
}

function isArray(layer) {
  return mx.helpers.isArray(layer);
}

/**
 * Query wms layer using mapbox point, layer list and service URL
 * @param {Object} opt Options
 * @param {Object} opt.map Mapbox gl map. Empty, use default
 * @param {Boolean} opt.asObject Return an object of array `{a:[2,1]}` instead of an array of object `[{a:2},{a:1}]`.
 * @param {Object} opt.point Mapbox gl point object
 * @param {Array} opt.layers layer list
 * @param {Array} opt.styles style list
 * @param {String} opt.url Service url
 */
export async function wmsQuery(opt) {
  opt = Object.assign({}, opt);
  const h = mx.helpers;
  const map = opt.map || h.getMap();
  const point = opt.point;
  const urlBase = opt.url;
  const modeObject = opt.asObject === true || false;
  const ignoreBbox = true;
  const useMirror = h.path(opt, 'optGetCapabilities.useMirror', false);
  /**
   * Return fetch promise
   */
  const cap = await wmsGetCapabilities(urlBase, opt.optGetCapabilities);

  /*
   * Build a bounding box
   */
  const xMax = point.x + 5;
  const xMin = point.x - 5;
  const yMax = point.y + 5;
  const yMin = point.y - 5;
  const sw = map.unproject([xMax, yMin]);
  const ne = map.unproject([xMin, yMax]);
  const minLat = Math.min(sw.lat, ne.lat);
  const minLng = Math.min(sw.lng, ne.lng);
  const maxLat = Math.max(sw.lat, ne.lat);
  const maxLng = Math.max(sw.lng, ne.lng);
  /*
   * Build query string
   */
  const layers = opt.layers;
  const styles = opt.styles;
  const props = modeObject ? {} : [];
  const query = {
    version: '1.1.1',
    service: 'WMS',
    request: 'GetFeatureInfo',
    query_layers: layers,
    layers: layers,
    styles: styles,
    info_format: 'application/json',
    exceptions: 'application/vnd.ogc.se_xml',
    feature_count: 10,
    x: 5,
    y: 5,
    width: 9,
    height: 9,
    srs: 'EPSG:4326',
    bbox: minLng + ',' + minLat + ',' + maxLng + ',' + maxLat
  };
  /**
   * Update formats using capabilities
   */
  const allowedFormatsInfo = ['application/json', 'application/geojson'];
  const formatsInfo = h.path(cap, 'Request.GetFeatureInfo.Format', []);
  const layersAll = h.path(cap, 'Layer.Layer', []);

  query.info_format = allowedFormatsInfo.reduce((a, f) => {
    return !a ? (formatsInfo.indexOf(f) > -1 ? f : a) : a;
  }, null);

  query.exception = h.path(cap, 'Exception', [])[1];

  /**
   * Test if layer is queryable
   */
  const layersQueryable = layersAll.reduce((a, l) => {
    let isQueryable = layers.indexOf(l.Name) > -1 && l.queryable === true;

    if (!isQueryable && h.isArray(l.Layer)) {
      isQueryable = l.Layer.reduce((a, ll) => (a ? a : ll.queryable), false);
    }

    if (isQueryable) {
      a.push(l);
    }
    return a;
  }, []);

  /**
   * Validate
   */
  const validLayer = layersQueryable.length > 0;
  const validInfo = h.isString(query.info_format);
  const validException = h.isString(query.exception);

  /**
   * Fetch or stop here
   */
  const queryString = h.objToParams(query);
  const url = `${urlBase}?${queryString}`;

  if (!validException || !validLayer || !validInfo) {
    console.warn({
      'Request not fetched': url,
      'Valid exception format': validException,
      'Valid (queryable) layer': validLayer,
      'Valid info format': validInfo
    });
    throw new Error(
      `Operation not permited by the requested server or layer, check console for details`
    );
  }

  /**
   * Apply GetFeatureInfo
   */
  const urlFetch = useMirror ? mirrorUrlCreate(url) : url;
  const response = await fetch(urlFetch);

  if (response.exceptions) {
    console.warn(res.exceptions);
    return props;
  }

  const data = await response.json();

  data.features.forEach((f) => {
    if (modeObject) {
      for (let p in f.properties) {
        /*
         * Aggregate by attribute
         */
        if (ignoreBbox && p !== 'bbox') {
          let value = f.properties[p];
          let values = props[p] || [];
          values = values.concat(value);
          props[p] = values;
        }
      }
    } else {
      /*
       * Raw result
       */
      props.push(f.properties);
    }
  });
  return props;
}

function urlTile(opt) {

  let query = mx.helpers.objToParams({
    bbox: 'bbx_mapbox',
    service: 'WMS',
    version: '1.1.1',
    styles: '',
    request: 'getMap',
    ZINDEX: 10,
    EXCEPTIONS: 'application/vnd.ogc.se_blank',
    srs: 'EPSG:3857',
    layers: opt.layer,
    format: 'image/png',
    transparent: true,
    height: opt.height || 512,
    width: opt.width || 512
  });

  // objToParam replace { and }. workaround here
  query = query.replace('bbx_mapbox', '{bbox-epsg-3857}');

  return opt.url + '?' + query;
}

function urlLegend(opt) {
  const query = mx.helpers.objToParams({
    service: 'WMS',
    version: '1.1.1',
    style: '',
    request: 'getLegendGraphic',
    layer: opt.layer,
    format: 'image/png',
    tranparent: true
  });

  return opt.url + '?' + query;
}

