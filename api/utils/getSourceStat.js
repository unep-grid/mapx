const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const db = require('./db.js');
const crypto = require('crypto');
const { redisGet,  redisSet } = require.main.require('./db');


exports.get = [getSourceStatHandler];
exports.getSourceStat = getSourceStat;

async function getSourceStatHandler(req, res) {
  getSourceStat({
    idSource: req.params.idSource,
    idAttr: req.params.idAttr,
    format: 'mapx-json'
  })
    .then((data) => {
      utils.sendJSON(res, data, {end: true});
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}

/**
 * Helper to get source stats from db
 * @param {Object} opt options
 * @param {String} opt.idSource Id of the source
 * @param {String} opt.idAttr Id of the attribute (optional)
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
async function getSourceStat(opt) {
  if (!opt.idSource) {
    throw new Error('Missing id');
  }
  if (!opt.idAttr || opt.idAttr === 'undefined') {
    opt.idAttr = 'null';
  }
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

  const dat = await redisGet(hash);
  console.log(hash, timestamp); 
  
  if(dat){
    return JSON.parse(dat);
  }

  opt.hasT0 = columns.indexOf('mx_t0') > -1;
  opt.hasT1 = columns.indexOf('mx_t1') > -1;
  opt.hasGeom = columns.indexOf('geom') > -1;
  opt.hasAttr = columns.indexOf(opt.idAttr) > -1;
  opt.idAttrT0 = opt.hasT0 ? 'mx_t0': 0;
  opt.idAttrT1 = opt.hasT1 ? 'mx_t1': 0;
  opt.attrIsStr = attrType === 'string';
  const sql = utils.parseTemplate(template.getSourceStat, opt);
  const data = await clientPgRead.query(sql);
  const out = {
    stat: data.rows[0].stat,
    attributes: columns
  };
  redisSet(hash, JSON.stringify(out));
  return out;
}
