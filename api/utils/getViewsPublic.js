const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const auth = require('./authentication.js');
const validate = require('./getViews_validation.js').validate;

exports.get = [auth.validateTokenHandler, getViewsPublicHandler];

exports.getViewsPublic = getViewsPublic;

function getViewsPublicHandler(req, res) {
  var start = new Date();

  getViewsPublic(req.query || {})
    .then((data) => {
      data = {
        views: data,
        timing: new Date() - start
      };
      utils.sendJSON(res, data, true);
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}
/**
 * Helper to get views list
 * @param {Object} opt options
 * @param {String} opt.idUser Id of the user
 * @param {String} opt.idProjectExclude Id of a project to exclude
 * @return {Array} List of views
 */
function getViewsPublic(opt) {
  opt = opt || {};
  var sql;
  return new Promise((resolve) => {
    /**
     * Validation
     */
    opt.idUser = validate('idUser', opt.idUser || opt.user);
    opt.language = validate('language', opt.language);
    opt.idTypes = validate('idTypes', opt.idTypes || opt.types);
    opt.selectKeys = validate('selectKeys', opt.selectKeys || opt.selectString);
    opt.idProjectExclude = validate(
      'idProjectOption',
      opt.idProjectExclude || opt.projectExclude
    );
    opt.hasProjectExclude = opt.idProjectExclude.length > 0;
    opt.hasFilterTypes = opt.idTypes.length > 0;
    opt.sqlTypesFilter = opt.idTypes.map((c) => "'" + c + "'").join(',');

    /**
     * SQL
     */
    sql = utils.parseTemplate(template.getViewsPublic, opt);

    resolve(clientPgRead.query(sql));
  }).then(function(result) {
    return result.rows;
  });
}
