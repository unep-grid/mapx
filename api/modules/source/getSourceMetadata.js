const {pgRead} = require('@mapx/db');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const valid = require('@fxi/mx_valid');

module.exports.mwGetMetadata = [getSourceMetadataHandler];

module.exports.getSourceMetadata = getSourceMetadata;

async function getSourceMetadataHandler(req, res) {
  try {
    const data = await getSourceMetadata({
      id: req.params.id,
      format: 'mapx-json'
    });
    helpers.sendJSON(res, data, {end: true});
  } catch (e) {
    helpers.sendError(res, e);
  }
}

/**
 * Helper to get source metadata from db
 * @param {Object} opt options
 * @param {String} opt.id Id of the source
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
async function getSourceMetadata(opt) {
  var meta,
    out,
    def = {};
  var id = opt.id;

  if (!valid.isSourceId(id)) {
    throw new Error('So valid source id');
  }

  const sql = helpers.parseTemplate(template.getSourceMetadata, {
    idSource: id
  });
  const res = await pgRead.query(sql);

  if (res.rowCount === 0) {
    return def;
  }

  out = res.rows[0];
  meta = out.metadata;
  meta._email_editor = out.email_editor;
  meta._date_modified = out.date_modified;
  meta._services = out.services;
  meta._id_source = id;
  return meta;
}
