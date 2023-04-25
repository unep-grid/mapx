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
  isString,
  isObject,
  isArray,
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
 * @return {Object} source summary
 */
export async function getViewSourceSummary(view, opt) {
  view = getView(view);
  opt = Object.assign(
    {},
    {
      idView: view.id,
      timestamp: view._src_timestamp,
      idAttr: path(view, "data.attribute.name"),
      idSource: path(view, "data.source.layerInfo.name"),
      useCache: settings.useCache,
    },
    opt
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
      "getSourceVtSummary : at least id source or id view are required"
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
      elSpanTranslate("null_count", { data: { nullCount: aStat.nullCount } })
    );
    elContainer.appendChild(elNull);
  }

  elContainer.appendChild(elTable);

  modal({
    title: title,
    content: elContainer,
  });
}

/**
 * Get raster (wms) source summary
 */
export async function getSourceRtSummary(view) {
  const out = {};
  const url = path(view, "data.source.tiles", []);
  const useMirror = path(view, "data.source.useMirror", false);
  if (url.length === 0) {
    return out;
  }
  const urlQuery = url[0];
  if (!isUrlValidWms(urlQuery)) {
    return out;
  }
  const q = getQueryParametersAsObject(urlQuery);

  if (!isArray(q.layers) && !isArray(q.LAYERS)) {
    return out;
  }

  if (q.LAYERS) {
    q.layers = q.LAYERS;
  }

  const layerName = q.layers[0];
  const endpoint = urlQuery.split("?")[0];
  const timeStamp = path(view, "date_modified", null);

  const layers = await wmsGetLayers(endpoint, {
    optGetCapabilities: {
      useMirror: useMirror,
      searchParams: {
        /**
         * timestamp : Used to invalidate getCapabilities cache
         */
        timestamp: timeStamp,
      },
    },
  });

  const layer = layers.find((l) => {
    const nameMatch = isString(l.Name) && l.Name === layerName;
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
    const nameComposite = l.Name.split(":");
    if (nameComposite[1]) {
      return nameComposite[1] === layerName;
    }
  });

  const validBbox =
    isObject(layer) &&
    isArray(layer.BoundingBox) &&
    layer.BoundingBox.length > 0;

  if (!validBbox) {
    console.warn("No valid BoundingBox found");
  } else {
    try {
      let bbx;
      /**
       * lower left and upper right corners in a specified CRS
       * minx miny maxx maxy
       *
       *  /°°°°°°°°(2,3)
       *  |           |
       *  |           |
       *  (0,1)......./
       */

      bbx = layer.BoundingBox.find((b) => b.crs === "EPSG:4326");

      if (isObject(bbx) && isArray(bbx.extent)) {
        /**
         *  SAMPLE FROM GEOSERVER
         *"[
         *  -180,
         *  -90,
         *  180,
         *  90
         * ]"
         */
        out.extent_sp = {
          lng1: bbx.extent[0],
          lat2: bbx.extent[1],
          lng2: bbx.extent[2],
          lat1: bbx.extent[3],
        };
      } else {
        /**
         * try reprojection
         */
        bbx = layer.BoundingBox[0];
        const epsg = isString(bbx.crs) ? bbx.crs.split(":")[1] : null;

        if (epsg) {
          const proj4 = await moduleLoad("proj4");
          const resEpsg = await epsgQuery(epsg);
          const proj4from = resEpsg.find((r) => r.proj4).proj4;

          const proj4to = "+proj=longlat +datum=WGS84 +no_defs";
          const sw_o = { x: bbx.extent[0], y: bbx.extent[1] };
          const ne_o = { x: bbx.extent[2], y: bbx.extent[3] };
          const sw = proj4(proj4from, proj4to, sw_o);
          const ne = proj4(proj4from, proj4to, ne_o);

          out.extent_sp = {
            lng1: sw.x,
            lat2: sw.y,
            lng2: ne.x,
            lat1: ne.y,
          };
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  return out;
}

export async function getSourceGjSummary(view) {
  const out = {};
  if (isViewGj(view)) {
    out.extent_sp = path(view, "data.geometry.extent", {});
  }
  return out;
}
