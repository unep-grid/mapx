import { miniCacheSet, miniCacheGet } from "./../minicache";
import { mirrorUrlCreate } from "./../mirror_util";
import { wmsBuildQueryUi } from "./ui.js";
import { settings } from "./../settings";
import { objToParams } from "../url_utils";
import {
  isArray,
  isString,
  isUrlValidWms,
  isUrlHttps,
  isObject,
  isStringRange,
} from "../is_test";
import { moduleLoad } from "../modules_loader_async";
import { fetchProgress_xhr } from "../mx_helper_fetch_progress";
import { path } from "../mx_helper_misc";
import { pointBboxToWms } from "../map_helpers/utils";
import { isTrue } from "../is_test";

export {
  wmsBuildQueryUi,
  wmsGetCapabilities,
  wmsGetLayers,
  urlTile,
  urlLegend,
};

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
  opt = Object.assign(
    {},
    {
      useCache: settings.useCache,
      searchParams: null,
      useMirror: false,
    },
    opt,
  );
  const queryString = objToParams(
    Object.assign(
      {},
      {
        service: "WMS",
        request: "GetCapabilities",
        version: "1.1.1",
      },
      opt.searchParams,
    ),
  );
  const ignoreCache = opt.useCache === false;
  const useMirror = opt.useMirror === true;
  const url = `${baseUrl}?${queryString}`;

  if (!isUrlValidWms(url)) {
    throw new Error(`wmsGetCapabilities requires valid wms URL`);
  }

  if (!useMirror && !isUrlHttps(url)) {
    throw new Error(
      `wmsGetCapabilities requires ssl/tls enabled ('https:'). Tips: 
       - Use 'https:' protocol,
       - Request provider to use a ssl/tls certificate,
       - Use a mirror.`,
    );
  }

  const WMSCapabilities = await moduleLoad("wms-capabilities");

  const dataCache = await miniCacheGet(url);

  if (!ignoreCache && dataCache) {
    console.log("WMS GetCapabilities from cache");
    return path(dataCache, "Capability", {});
  }

  console.log("WMS GetCapabilities from server");
  const urlFetch = useMirror ? mirrorUrlCreate(url) : url;
  const xmlString = await fetchProgress_xhr(urlFetch, {
    maxSize: settings.maxByteFetch,
    timeout: 2e4,
  });

  const dataFetch = new WMSCapabilities(xmlString).toJSON();
  miniCacheSet(url, dataFetch, { ttl: settings.maxTimeCache });
  return path(dataFetch, "Capability", {});
}

async function wmsGetLayers(baseUrl, opt) {
  opt = opt || {};
  const optGetCapabilities = Object.assign({}, opt.optGetCapabilities);
  opt = Object.assign({}, { optGetCapabilities }, opt);

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
  return (
    isObject(layer) &&
    isStringRange(layer.Name, 1) &&
    isStringRange(layer.Title, 1) &&
    isArray(layer.BoundingBox) &&
    layer.BoundingBox.length > 0
  );
}

/**
 * Query wms layer using mapbox point, layer list and service URL
 * @param {Object} opt Options
 * @param {Object} opt.map Mapbox gl map. Empty, use default
 * @param {Boolean} opt.asObject Return an object of array `{a:[2,1]}` instead of an array of object `[{a:2},{a:1}]`.
 * @param {Object} opt.bbox point bbox
 * @param {Array} opt.layers layer list
 * @param {Array} opt.styles style list
 * @param {String} opt.url Service url
 */
export async function wmsQuery(opt) {
  opt = Object.assign({}, opt);
  const { asObject, bbox: pixelBbox, url: urlBase, optGetCapabilities } = opt;
  const modeObject = isTrue(asObject);
  const useMirror = isTrue(optGetCapabilities?.useMirror);
  const ignoreBbox = true;
  /**
   * Return fetch promise
   */
  const cap = await wmsGetCapabilities(urlBase, optGetCapabilities);

  /**
   * Build bbox
   */
  const wmsBbox = await pointBboxToWms(pixelBbox);

  /*
   * Build query string
   */
  const layers = opt.layers;
  const styles = opt.styles;
  const props = modeObject ? {} : [];
  const query = {
    version: "1.1.1",
    service: "WMS",
    request: "GetFeatureInfo",
    query_layers: layers,
    layers: layers,
    styles: styles,
    info_format: "application/json",
    exception: "application/vnd.ogc.se_xml",
    feature_count: 10,
    x: 5,
    y: 5,
    width: 9,
    height: 9,
    srs: "EPSG:4326",
    bbox: wmsBbox,
  };
  /**
   * Update formats using capabilities
   */
  const allowedFormatsInfo = ["application/json", "application/geojson"];
  const formatsInfo = path(cap, "Request.GetFeatureInfo.Format", []);
  const layersAll = path(cap, "Layer.Layer", []);

  query.info_format = allowedFormatsInfo.reduce((a, f) => {
    return !a ? (formatsInfo.indexOf(f) > -1 ? f : a) : a;
  }, null);

  query.exception = path(cap, "Exception", [])[1];

  /**
   * Test if layer is queryable
   */
  const layersQueryable = layersAll.reduce((a, l) => {
    let isQueryable = layers.indexOf(l.Name) > -1 && l.queryable === true;

    if (!isQueryable && isArray(l.Layer)) {
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
  const validInfo = isString(query.info_format);
  const validException = isString(query.exception);

  /**
   * Fetch or stop here
   */
  const queryString = objToParams(query);
  const url = `${urlBase}?${queryString}`;

  if (!validException || !validLayer || !validInfo) {
    console.warn({
      "Request not fetched": url,
      "Valid exception format": validException,
      "Valid (queryable) layer": validLayer,
      "Valid info format": validInfo,
    });
    throw new Error(
      `Operation not permited by the requested server or layer, check console for details`,
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
        if (ignoreBbox && p !== "bbox") {
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
  let query = objToParams({
    bbox: "bbx_mapbox",
    service: "WMS",
    version: "1.1.1",
    styles: "",
    request: "GetMap",
    ZINDEX: 10,
    EXCEPTIONS: "application/vnd.ogc.se_blank",
    srs: "EPSG:3857",
    layers: opt.layer,
    format: "image/png",
    transparent: true,
    height: opt.height || 512,
    width: opt.width || 512,
  });

  // objToParam replace { and }. workaround here
  query = query.replace("bbx_mapbox", "{bbox-epsg-3857}");

  return opt.url + "?" + query;
}

function urlLegend(opt) {
  const query = objToParams({
    service: "WMS",
    version: "1.1.1",
    style: "",
    request: "GetLegendGraphic",
    layer: opt.layer,
    format: "image/png",
    tranparent: true,
  });

  return opt.url + "?" + query;
}
