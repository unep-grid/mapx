import crypto from "crypto";
import { isJson, isNotEmpty, isSourceId, isViewId } from "@fxi/mx_valid";
import { redisGet, redisSet, pgRead, pgReadLong } from "#mapx/db";
import { getParamsValidator } from "#mapx/route_validation";
import { parseTemplate, sendJSON, sendError } from "#mapx/helpers";
import { getSourceType } from "#mapx/db_utils";
import { templates } from "#mapx/template";

import {
  getColumnsTypesSimple,
  getColumnsNames,
  getSourceLastTimestamp,
} from "#mapx/db_utils";

const typesContinuous = [
  "double precision",
  "integer",
  "numeric",
  "real",
  "smallint",
  "int8",
  "bigint",
];

const validateParamsHandler = getParamsValidator({
  expected: [
    "idView",
    "timestamp",
    "idSource",
    "idAttr",
    "useCache",
    "binsMethod",
    "binsNumber",
    "maxRowsCount",
    "stats",
    "nullValue",
  ],
});

export const mwGetSummary = [validateParamsHandler, getSummaryHandler];

async function getSummaryHandler(req, res) {
  try {
    const data = await getSourceSummary({
      idSource: req.query.idSource,
      idView: req.query.idView,
      idAttr: req.query.idAttr,
      useCache: req.query.useCache,
      binsNumber: req.query.binsNumber,
      binsMethod: req.query.binsMethod, // heads_tails, jenks, equal_interval, quantile
      maxRowsCount: req.query.maxRowsCount, // limit table length
      stats: req.query.stats, // which stat to computed ['base','time','attr', 'spatial']
      nullValue: req.query.nullValue,
    });

    if (data) {
      sendJSON(res, data, { end: true });
    }
  } catch (e) {
    console.error(e);
    sendError(res, e.message || e);
  }
}

/**
 * Helper to get source stats from db
 * @param {Object} opt options
 * @param {Array} opt.stats Array of stats to retrieve. e.g. ['geom','base']
 * @param {String} opt.idSource Id of the source
 * @param {String} opt.idView Id of the view
 * @param {String} opt.idAttr Id of the attribute (optional)
 * @param {String} opt.idAttrT0  Id of the to attribute (optional)
 * @param {String} opt.idAttrT1 Id of the attribute (optional)
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @param {String} opt.nullValue Value to express nulls
 * @return {Object} metadata object
 */
export async function getSourceSummary(opt) {
  try {
    const valid = isSourceId(opt.idSource) || isViewId(opt.idView);

    if (!valid) {
      throw Error("Missing id of the source or the view");
    }

    if (!opt.idAttr || opt.idAttr === "undefined") {
      opt.idAttr = null;
    }

    opt = await updateSourceFromView(opt);

    if (!isSourceId(opt.idSource)) {
      return {};
    }

    if (!opt.maxRowsCount) {
      // default set in getParamsValidator but no default for dircect call.
      opt.maxRowsCount = 1e6;
    }

    const start = Date.now();
    const { stats } = opt;

    const columns = await getColumnsNames(opt.idSource);
    const timestamp = await getSourceLastTimestamp(opt.idSource);
    const type = await getSourceType(opt.idSource);
    const tableTypes = await getColumnsTypesSimple(opt.idSource, columns);

    const attrType = opt.idAttr
      ? tableTypes.filter((r) => r.column_name === opt.idAttr)[0]?.column_type
      : null;

    /**
     * Handle cache request
     */
    const hash = crypto
      .createHash("md5")
      .update(timestamp + opt.idAttr + opt.idSource + JSON.stringify(opt.stats))
      .digest("hex");

    if (opt.useCache) {
      const strData = await redisGet(hash);
      if (isJson(strData)) {
        const data = JSON.parse(strData);
        if (isNotEmpty(data)) {
          data._timing = Date.now() - start;
          cleanStatOutput(stats, data);
          return data;
        }
      }
    }

    /**
     * Handle new request
     * TODO: default are handler in validateParamsHandler, but not
     * here. Default should not be set in the params handler...
     */
    opt.timestamp = timestamp;
    opt.hasT0 = columns.includes("mx_t0");
    opt.hasT1 = columns.includes("mx_t1");
    opt.idAttrT0 = opt.hasT0 ? opt.idAttrT0 || "mx_t0" : 0;
    opt.idAttrT1 = opt.hasT1 ? opt.idAttrT1 || "mx_t1" : 0;
    opt.binsNumber = opt.binsNumber || 5;
    opt.binsMethod = opt.binsMethod || "jenks";
    opt.type = type || "vector"; // required in ext_sp;
    const hasGeom = columns.includes("geom");
    const hasAttr = columns.includes(opt.idAttr);
    /**
     * TODO: categorical value can be stored as numeric (number)..
     */
    const isContinous = typesContinuous.includes(attrType);

    const out = {
      id: opt.idSource,
      type: type,
      timestamp: opt.timestamp,
      attributes: columns,
      attributes_types: tableTypes,
    };


    for (const id_stat of stats) {
      switch (id_stat) {
        case "base":
          Object.assign(out, await getOrCalc("getSourceSummary_base", opt));
          break;
        case "roles":
          Object.assign(
            out,
            { roles: await getSourceEditors(opt.idSource) },
            opt
          );
          break;
        case "spatial":
          if (!hasGeom) {
            break;
          }
          Object.assign(out, await getOrCalc("getSourceSummary_ext_sp", opt));
          break;
        case "geom":
          if (!hasGeom) {
            break;
          }
          Object.assign(out, await getOrCalc("getSourceSummary_geom", opt));
          break;
        case "temporal":
          if (!opt.hasT0 && !opt.hasT1) {
            break;
          }
          Object.assign(out, await getOrCalc("getSourceSummary_ext_time", opt));
          break;
        case "attributes":
          if (!hasAttr) {
            break;
          }

          if (isContinous) {
            Object.assign(
              out,
              await getOrCalc("getSourceSummary_attr_continuous", opt)
            );

            break;
          }

          Object.assign(
            out,
            await getOrCalc("getSourceSummary_attr_categorical", opt)
          );
          break;
      }
    }

    out._timing = Date.now() - start;
    cleanStatOutput(stats, out);
    return out;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getOrCalc(idTemplate, opt) {
  const sql = parseTemplate(templates[idTemplate], opt);

  const hash = crypto
    .createHash("md5")
    .update(sql + opt.timestamp)
    .digest("hex");

  if (opt.useCache) {
    const data = await redisGet(hash);
    if (isNotEmpty(data) && isJson(data)) {
      return JSON.parse(data);
    }
  }

  const data = await pgReadLong.query(sql);
  const newstat = data.rows[0].res;

  /*
   * Set in redis, after return
   */
  setTimeout(async () => {
    try {
      await redisSet(hash, JSON.stringify(newstat));
    } catch (e) {
      console.error(e);
    }
  }, 0);
  return newstat;
}

/**
 * Update idSource and atribute list from view data
 * @param {Object} opt Options
 * @param {Object} opt.idView Id of the view from which to extract source info
 * @return {Object} options
 */
async function updateSourceFromView(opt) {
  if (!isViewId(opt.idView)) {
    return opt;
  }
  const sqlSrcAttr = templates.getViewSourceAndAttributes;
  const respSrcAttr = await pgRead.query(sqlSrcAttr, [opt.idView]);
  if (respSrcAttr.rowCount === 0) {
    return opt;
  }
  const [srcAttr] = respSrcAttr.rows;
  if (srcAttr.layer) {
    opt.idSource = srcAttr.layer;
  }
  if (!opt.idAttr && srcAttr.attribute) {
    opt.idAttr = srcAttr.attribute;
  }
  return opt;
}

/**
 * Get full mx_sources record for a source
 */
export async function getSourceEditors(idSource) {
  const res = await pgRead.query(
    "select editor, editors, readers from mx_sources where id=$1",
    [idSource]
  );
  if (res.rowCount === 0) {
    return {};
  }
  return res.rows[0];
}

/**
 * Remove item if they are not requested
 * @param {Array} Stats Group of stats to output
 * @param {Object} data Output summary
 * @return {Object} summary
 */
function cleanStatOutput(stats, data) {
  /**
   * Cleaning output to match requested stats
   */
  if (!stats.includes("attributes")) {
    delete data.attributes;
    delete data.attributes_types;
    delete data.attribute_stat;
  }
  if (!stats.includes("temporal")) {
    delete data.extent_time;
  }
  if (!stats.includes("spatial")) {
    delete data.extent_sp;
  }
  if (!stats.includes("base")) {
    delete data.row_count;
  }

  return data;
}
