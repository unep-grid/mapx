const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');

exports.get = [getViewMetadataHandler];

exports.getViewMetadata = getViewMetadata;

function getViewMetadataHandler(req, res) {
  getViewMetadata({
    id: req.params.id
  })
    .then((data) => {
      utils.sendJSON(res, data, {end: true});
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}

/**
 * Helper to get view metadata items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @return {Object} view metadata
 */
function getViewMetadata(opt) {
  var id = opt.id.toUpperCase();
  var sql = '';

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject({message: 'no id'});
    }

    sql = utils.parseTemplate(template.getViewMetadata, {
      idView: id.toUpperCase()
    });

    resolve(sql);
  })
    .then((sql) => {
      return clientPgRead.query(sql);
    })
    .then(function(result) {
      if (result && result.rows) {
        out = result.rows[0];
        return out;
      } else {
        return def;
      }
    });
}
