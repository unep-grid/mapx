const {redisGet, redisSet, pgRead} = require.main.require('./db');
const utils = require('./utils.js');
const template = require('../templates');
const db = require('./db.js');
const crypto = require('crypto');
const mx_valid = require('@fxi/mx_valid');

const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    expected: [
      'idView',
      'date',
      'idSource',
      'idAttr',
      'noCache',
      'binsCompute',
      'binsMethod',
      'binsNumber',
      'maxRowsCount'
    ]
  }
);

exports.get = [validateParamsHandler, getSourceSummaryHandler];
exports.getSourceSummary = getSourceSummary;

async function getSourceSummaryHandler(req, res) {
  try {
    const data = await getSourceSummary({
      idSource: req.query.idSource,
      idView: req.query.idView,
      idAttr: req.query.idAttr,
      noCache: req.query.noCache,
      binsCompute: req.query.binsCompute,
      binsNumber: req.query.binsNumber,
      binsMethod: req.query.binsMethod, // heads_tails, jenks, equal_interval, quantile
      maxRowsCount: req.query.maxRowsCount // limit table length
    });

    if (data) {
      utils.sendJSON(res, data, {end: true});
    } else {
      throw new Error('empty result');
    }
  } catch (e) {
    utils.sendError(res, e);
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
  if (opt.idView) {
    const sqlSrcAttr = utils.parseTemplate(
      template.getViewSourceAndAttributes,
      opt
    );
    const respSrcAttr = await pgRead.query(sqlSrcAttr);
    if (respSrcAttr.rowCount > 0) {
      const srcAttr = respSrcAttr.rows[0];
      if (srcAttr.layer) {
        opt.idSource = srcAttr.layer;
      }
      if (srcAttr.attribute) {
        opt.idAttr = srcAttr.attribute;
      }
    }
  }

  if (!mx_valid.isSourceId(opt.idSource)) {
    throw new Error('Source not valid');
  }

  const start = Date.now();
  const columns = await db.getColumnsNames(opt.idSource);
  const timestamp = await db.getSourceLastTimestamp(opt.idSource);
  const tableTypes = await db.getColumnsTypesSimple(opt.idSource, columns);
  const attrType = opt.idAttr
    ? tableTypes.filter((r) => r.id === opt.idAttr)[0].value
    : null;

  const hash = crypto
    .createHash('md5')
    .update(timestamp + opt.idAttr + opt.idSource)
    .digest('hex');

  const cached = opt.noCache ? false : await redisGet(hash);

  if (cached) {
    const data = JSON.parse(cached);
    data.timing = Date.now() - start;
    return data;
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

  Object.assign(out, await getOrCalc('getSourceSummary_base', opt));

  if (hasGeom) {
    Object.assign(out, await getOrCalc('getSourceSummary_ext_sp', opt));
  }

  if (opt.hasT0 || opt.hasT1) {
    Object.assign(out, await getOrCalc('getSourceSummary_ext_time', opt));
  }

  if (hasAttr) {
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

  return out;
}

async function getOrCalc(idTemplate, opt) {
  const sql = utils.parseTemplate(template[idTemplate], opt);

  const hash = crypto
    .createHash('md5')
    .update(sql + opt.timestamp)
    .digest('hex');

  const cached = opt.noCache ? false : await redisGet(hash);

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
