const crypto = require('crypto');
const mx_valid = require('@fxi/mx_valid');

const {redisGet, redisSet, pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const db = require('@mapx/db-utils');

const validateParamsHandler = getParamsValidator(
  {
    expected: [
      'idView',
      'timestamp',
      'idSource',
      'idAttr',
      'useCache',
      'binsCompute',
      'binsMethod',
      'binsNumber',
      'maxRowsCount',
      'stats'
    ]
  }
);

module.exports.mwGetSummary = [validateParamsHandler, getSummaryHandler];
module.exports.getSourceSummary = getSourceSummary;

async function getSummaryHandler(req, res) {
  try {
    const data = await getSourceSummary({
      idSource: req.query.idSource,
      idView: req.query.idView,
      idAttr: req.query.idAttr,
      useCache: req.query.useCache,
      binsCompute: req.query.binsCompute,
      binsNumber: req.query.binsNumber,
      binsMethod: req.query.binsMethod, // heads_tails, jenks, equal_interval, quantile
      maxRowsCount: req.query.maxRowsCount, // limit table length
      stats: req.query.stats // which stat to computed ['base','time','attr', 'spatial']
    });

    if (data) {
      helpers.sendJSON(res, data, {end: true});
    }
  } catch (e) {
    helpers.sendError(res, e);
  }
}

/**
 * Helper to get source stats from db
 * @param {Object} opt options
 * @param {String} opt.idSource Id of the source
 * @param {String} opt.idView Id of the view
 * @param {String} opt.idAttr Id of the attribute (optional)
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
async function getSourceSummary(opt) {
  if (!mx_valid.isSourceId(opt.idSource) && !mx_valid.isViewId(opt.idView)) {
    throw new Error('Missing id of the source or the view');
  }
  if (!opt.idAttr || opt.idAttr === 'undefined') {
    opt.idAttr = null;
  }
  opt = await updateSourceFromView(opt);

  if (!mx_valid.isSourceId(opt.idSource)) {
    throw new Error('Id of the source missing');
  }

  const start = Date.now();
  const stats = opt.stats;
  const columns = await db.getColumnsNames(opt.idSource);
  const timestamp = await db.getSourceLastTimestamp(opt.idSource);
  const tableTypes = await db.getColumnsTypesSimple(opt.idSource, columns);
  const attrType = opt.idAttr
    ? tableTypes.filter((r) => r.id === opt.idAttr)[0].value
    : null;

  const hash = crypto
    .createHash('md5')
    .update(timestamp + opt.idAttr + opt.idSource + JSON.stringify(opt.stats))
    .digest('hex');

  const cached = opt.useCache ? await redisGet(hash) : false;

  if (cached) {
    const data = JSON.parse(cached);
    data.timing = Date.now() - start;
    return reduceStatOutput(stats, data);
  }

  opt.hasT0 = columns.indexOf('mx_t0') > -1;
  opt.hasT1 = columns.indexOf('mx_t1') > -1;
  opt.idAttrT0 = opt.hasT0 ? 'mx_t0' : 0;
  opt.idAttrT1 = opt.hasT1 ? 'mx_t1' : 0;
  opt.timestamp = timestamp;
  const hasGeom = columns.indexOf('geom') > -1;
  const hasAttr = columns.indexOf(opt.idAttr) > -1;
  const isCategorical = attrType === 'string';

  const out = {
    id: opt.idSource,
    timestamp: opt.timestamp,
    attributes: columns,
    attributes_types: tableTypes
  };

  if (stats.indexOf('base') > -1) {
    Object.assign(out, await getOrCalc('getSourceSummary_base', opt));
  }

  if (hasGeom && stats.indexOf('spatial') > -1) {
    Object.assign(out, await getOrCalc('getSourceSummary_ext_sp', opt));
  }

  if ((opt.hasT0 || opt.hasT1) && stats.indexOf('temporal') > -1) {
    Object.assign(out, await getOrCalc('getSourceSummary_ext_time', opt));
  }

  if (hasAttr && stats.indexOf('attributes') > -1) {
    if (isCategorical) {
      Object.assign(
        out,
        await getOrCalc('getSourceSummary_attr_categorical', opt)
      );
    } else {
      Object.assign(
        out,
        await getOrCalc('getSourceSummary_attr_continuous', opt)
      );
    }
  }

  out.timing = Date.now() - start;
  return reduceStatOutput(stats, out);
}

async function getOrCalc(idTemplate, opt) {
  const sql = helpers.parseTemplate(template[idTemplate], opt);

  const hash = crypto
    .createHash('md5')
    .update(sql + opt.timestamp)
    .digest('hex');

  const cached = opt.useCache ? await redisGet(hash) : false;

  if (!cached) {
    const data = await pgRead.query(sql);
    const newstat = data.rows[0].res;
    setTimeout(() => {
      // Save after return
      redisSet(hash, JSON.stringify(newstat));
    }, 0);
    return newstat;
  } else {
    return JSON.parse(cached);
  }
}

/**
 * Update idSource and atribute list from view data
 * @param {Object} opt Options
 * @param {Object} opt.idView Id of the view from which to extract source info
 * @return {Object} options
 */
async function updateSourceFromView(opt) {
  if (opt.idView) {
    const sqlSrcAttr = helpers.parseTemplate(
      template.getViewSourceAndAttributes,
      opt
    );
    const respSrcAttr = await pgRead.query(sqlSrcAttr);
    if (respSrcAttr.rowCount > 0) {
      const srcAttr = respSrcAttr.rows[0];
      if (srcAttr.layer) {
        opt.idSource = srcAttr.layer;
      }
      if (!opt.idAttr && srcAttr.attribute) {
        opt.idAttr = srcAttr.attribute;
      }
    }
  }
  return opt;
}

/**
 * Remove item if they are not requested
 * @param {Array} Stats Group of stats to output
 * @param {Object} data Output summary
 * @return {Object} summary
 */
function reduceStatOutput(stats, data) {
  /**
   * Cleaning output to match requested stats
   */
  if (stats.indexOf('attributes') === -1) {
    delete data.attributes;
    delete data.attributes_types;
    delete data.attribute_stat;
  }
  if (stats.indexOf('temporal') === -1) {
    delete data.extent_time;
  }
  if (stats.indexOf('spatial') === -1) {
    delete data.extent_sp;
  }
  if (stats.indexOf('base') === -1) {
    delete data.row_count;
  }
  return data;
}
