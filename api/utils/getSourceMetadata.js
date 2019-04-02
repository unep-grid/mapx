const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');

exports.get = [getSourceMetadataHandler];

exports.getSourceMetadata = getSourceMetadata;

function getSourceMetadataHandler(req, res) {
  getSourceMetadata({
    id: req.params.id,
    format: 'mapx-json'
  })
    .then((data) => {
      utils.sendJSON(res, data, true);
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}

/**
 * Helper to get source metadata from db
 * @param {Object} opt options
 * @param {String} opt.id Id of the source
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
function getSourceMetadata(opt) {
  var meta,
    out,
    def = {};
  var id = opt.id;
  var sql = '';

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject('no id');
    }

    sql = utils.parseTemplate(template.getSourceMetadata, {
      idSource: id
    });
    resolve(sql);
  })
    .then((sql) => {
      return clientPgRead.query(sql);
    })
    .then((result) => {
      if (result && result.rows) {
        out = result.rows[0];
        meta = out.metadata;
        meta._emailEditor = out.email_editor;
        meta._dateModified = out.date_modified;
        meta._idSource = id;
        return meta;
      } else {
        return def;
      }
    });
}
