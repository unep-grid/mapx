import { miniCacheSet, miniCacheGet, miniCacheRemove } from "./minicache";
import { getApiUrl } from "./api_routes";
import { getView, getViewTitle } from "./map_helpers/index.js";
import { path } from "./mx_helper_misc.js";
import { objToParams, getQueryParametersAsObject } from "./url_utils";
import { el, elAuto, elSpanTranslate } from "./el_mapx";
import { modal } from "./mx_helper_modal.js";
import { wmsGetLayers } from "./wms";
import { moduleLoad } from "./modules_loader_async";
import { epsgQuery } from "./epsgio";
import { settings } from "./settings";
import {
  isViewGj,
  isUrlValidWms,
  isSourceId,
  isViewId,
  isObject,
  isArray,
  isBoolean,
  isNotEmpty,
} from "./is_test";

const def = {
  idView: null,
  idSource: null,
  idAttr: null,
  useCache: false,
  binsMethod: "jenks",
  binsNumber: 5,
  stats: ["base", "attributes", "temporal", "spatial"],
  timestamp: null,
  nullValue: null,
};

/**
 * Get source summary of a view source
 * @param {Object} view View to get source summary
 * @param {Object} opt Additional option to pass to getSourceVtSummary
 * @param {Boolean} opt.useCache Use local cache
 * @return {Object} source summary
 */
export async function getViewSourceSummary(view, opt = { useCache: false }) {
  view = getView(view);

  opt = Object.assign(
    {},
    {
      idView: view.id,
      timestamp: view._src_timestamp,
      idAttr: path(view, "data.attribute.name"),
      idSource: path(view, "data.source.layerInfo.name"),
      useCache: isBoolean(opt.useCache) ? opt.useCache : settings.useCache,
    },
    opt,
  );

  let out = {};

  if (view.type === "vt") {
    out = await getSourceVtSummary(opt);
  }
  if (view.type === "rt") {
    out = await getSourceRtSummary(view);
  }
  if (view.type === "gj") {
    out = await getSourceGjSummary(view);
  }

  /**
   * ⚠️  Ensure compatibility with previous source summary method,
   * generated when the view was saved and not on the fly
   */
  if (isObject(out.attribute_stat)) {
    view.data.attribute = Object.assign({}, view.data.attribute, {
      name: out.attribute_stat.attribute,
      type: out.attribute_stat.type === "continuous" ? "number" : "string",
      max: out.attribute_stat.max,
      min: out.attribute_stat.min,
      table: out.attribute_stat.table,
    });
  }

  if (isObject(out.extent_time)) {
    view.data.period = Object.assign({}, view.data.period, {
      extent: out.extent_time,
    });
  }

  if (isObject(out.extent_sp)) {
    view.data.geometry = Object.assign({}, view.data.geometry, {
      extent: out.extent_sp,
    });
  }
  view._src_timestamp = out.timestamp;
  return out;
}

/**
 * Get vector source summary
 */
export async function getSourceVtSummary(opt) {
  const start = performance.now();
  let origin = "cache";
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

  if (!isViewId(opt.idView) && !isSourceId(opt.idSource)) {
    console.warn(
      "getSourceVtSummary : at least id source or id view are required",
    );
    return {};
  }

  /*
   * Fetch summary or use cache
   */
  opt.useCache = opt.useCache === true;
  const urlSourceSummary = getApiUrl("getSourceSummary");
  const query = objToParams(opt);
  const url = `${urlSourceSummary}?${query}`;
  let summary;

  if (opt.useCache) {
    summary = await miniCacheGet(url);
    if (summary) {
      origin = "cache";
    }
  }

  if (!summary) {
    origin = "fetch";
    const resp = await fetch(url);
    summary = await resp.json();
    miniCacheSet(url, summary, {
      ttl: settings.maxTimeCache,
    });
  }

  /*
   * handle errors
   */
  if (isObject(summary) && summary.type === "error") {
    console.warn(summary);
    miniCacheRemove(url);
    return {};
  }

  /**
   * debug
   */
  if (0) {
    console.table([
      {
        op: "getSourceSummary",
        origin: origin,
        timing: Math.round(performance.now() - start),
        timestamp: summary.timestamp,
      },
    ]);
  }
  summary._origin = origin;

  return summary;
}

export async function getSourceVtSummaryUI(opt) {
  const summary = await getSourceVtSummary(opt);
  const aStat = summary.attribute_stat;
  const elContainer = el("div");
  let title = opt.idSource || opt.idView;
  let titleTable = "Table";
  if (isViewId(opt.idView)) {
    title = getViewTitle(opt.idView);
  }

  if (aStat.type === "continuous") {
    for (const row of aStat.table) {
      for (const col in row) {
        row[col] = Math.round(row[col] * 1000) / 1000;
      }
    }
    titleTable = `${titleTable} ( Method : ${aStat.binsMethod}, number of bins : ${aStat.binsNumber} )`;
  }
  const elTable = elAuto("array_table", aStat.table, {
    tableTitle: titleTable,
  });

  if (isNotEmpty(aStat.nullCount)) {
    const elNull = el(
      "div",
      {
        class: "well",
      },
      elSpanTranslate("null_count", { data: { nullCount: aStat.nullCount } }),
    );
    elContainer.appendChild(elNull);
  }

  elContainer.appendChild(elTable);

  modal({
    title: title,
    content: elContainer,
    addBackground: true,
  });
}

/**
 * Get raster (WMS) source metadata including spatial extent
 * @param {Object} view - View configuration object
 * @param {Object} view.data.source - Source configuration
 * @param {Array} view.data.source.tiles - WMS tile URLs
 * @param {boolean} view.data.source.useMirror - Whether to use mirror server
 * @returns {Object} Metadata including spatial extent in EPSG:4326
 */
export async function getSourceRtSummary(view) {
  const metadata = {};

  // Validate inputs
  const tileUrls = path(view, "data.source.tiles", []);
  if (tileUrls.length === 0) {
    return metadata;
  }

  const wmsUrl = tileUrls[0];
  if (!isUrlValidWms(wmsUrl)) {
    return metadata;
  }

  // Parse WMS parameters
  const queryParams = getQueryParametersAsObject(wmsUrl);
  const layers = queryParams.LAYERS || queryParams.layers;
  if (!isArray(layers)) {
    return metadata;
  }

  const layerName = layers[0];
  const endpoint = wmsUrl.split("?")[0];
  const timeStamp = path(view, "date_modified", null);
  const useMirror = path(view, "data.source.useMirror", false);

  // Fetch WMS capabilities
  const layersList = await wmsGetLayers(endpoint, {
    optGetCapabilities: {
      useMirror,
      searchParams: { timestamp: timeStamp },
    },
  });

  const layer = findMatchingLayer(layersList, layerName);

  if (!layer) {
    return metadata;
  }

  try {
    metadata.extent_sp = await extractSpatialExtent(layer);
  } catch (error) {
    console.warn("Failed to extract spatial extent:", error);
  }

  return metadata;
}

function findMatchingLayer(layers, targetName) {
  return layers.find((layer) => {
    // using == in case of type mismatch like '1' = 1
    if (layer.Name == targetName) return true;
    if (layer.Title == targetName) return true;
    const [, compositeName] = layer.Name.split(":");
    return compositeName == targetName;
  });
}

async function extractSpatialExtent(layer) {
  if (!isObject(layer?.BoundingBox?.[0])) {
    throw new Error("No valid BoundingBox found");
  }

  const wgs84Bbox = layer.BoundingBox.find((bbox) => bbox.crs === "EPSG:4326");

  if (wgs84Bbox?.extent) {
    const bbox = {
      lng1: Math.round(wgs84Bbox.extent[0]),
      lat2: Math.round(wgs84Bbox.extent[1]),
      lng2: Math.round(wgs84Bbox.extent[2]),
      lat1: Math.round(wgs84Bbox.extent[3]),
    };

    return {
      lng1: Math.min(bbox.lng1, bbox.lng2),
      lng2: Math.max(bbox.lng1, bbox.lng2),
      lat1: Math.min(bbox.lat1, bbox.lat2),
      lat2: Math.max(bbox.lat1, bbox.lat2),
    };
  }

  // Fallback to projection conversion
  return await reprojectBoundingBox(layer.BoundingBox[0]);
}

async function reprojectBoundingBox(bbox) {
  const epsg = bbox.crs.split(":")[1];
  const proj4 = await moduleLoad("proj4");
  const [proj4Data] = await epsgQuery(epsg);

  if (!proj4Data?.exports?.proj4) {
    throw new Error(`Proj4 not found for ${epsg}`);
  }

  const fromProj = proj4Data.exports.proj4;
  const toProj = "+proj=longlat +datum=WGS84 +no_defs";

  const [minX, minY, maxX, maxY] = bbox.extent;
  const sw = proj4(fromProj, toProj, { x: minX, y: minY });
  const ne = proj4(fromProj, toProj, { x: maxX, y: maxY });

  return {
    lng1: sw.x,
    lat2: sw.y,
    lng2: ne.x,
    lat1: ne.y,
  };
}

export async function getSourceGjSummary(view) {
  const out = {};
  if (isViewGj(view)) {
    out.extent_sp = path(view, "data.geometry.extent", {});
  }
  return out;
}

export function bboxToBboxMeta(bbox) {
  return {
    lat_min: Math.min(bbox.lat1, bbox.lat2),
    lat_max: Math.max(bbox.lat1, bbox.lat2),
    lng_min: Math.min(bbox.lng1, bbox.lng2),
    lng_max: Math.max(bbox.lng1, bbox.lng2),
  };
}
