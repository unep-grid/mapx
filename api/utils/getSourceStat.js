const {redisGet, redisSet, pgRead} = require.main.require('./db');
const utils = require('./utils.js');
const template = require('../templates');
const db = require('./db.js');
const crypto = require('crypto');

const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    expected: ['idView', 'idSource', 'idAttr', 'noCache']
  }
);

exports.get = [validateParamsHandler, getSourceStatHandler];
exports.getSourceStat = getSourceStat;

async function getSourceStatHandler(req, res) {
  try {
    const data = await getSourceStat({
      idSource: req.query.idSource,
      idView: req.query.idView,
      idAttr: req.query.idAttr,
      noCache: req.query.noCache
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
async function getSourceStat(opt) {
  if (!opt.idSource && !opt.idView) {
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

  const start = Date.now();
  const columns = await db.getColumnsNames(opt.idSource);
  const timestamp = await db.getSourceLastTimestamp(opt.idSource);
  const attrType =
    columns.indexOf(opt.idAttr) > -1
      ? await db.getColumnTypeSimple(opt.idSource, opt.idAttr)
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
  opt.hasGeom = columns.indexOf('geom') > -1;
  opt.hasAttr = columns.indexOf(opt.idAttr) > -1;
  opt.idAttrT0 = opt.hasT0 ? 'mx_t0' : 0;
  opt.idAttrT1 = opt.hasT1 ? 'mx_t1' : 0;
  opt.attrIsStr = attrType === 'string';

  const sql = utils.parseTemplate(template.getSourceStat, opt);
  const data = await pgRead.query(sql);
  const stat = data.rows[0].stat;

  const out = {
    id : opt.idSource,
    attribute : opt.idAttr,
    attributes: columns,
    timing: Date.now() - start
  };

  Object.assign(out,stat);

  redisSet(hash, JSON.stringify(out));
  return out;
}
