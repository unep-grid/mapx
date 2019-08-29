const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const auth = require('./authentication.js');
const validate = require('./getViews_validation.js').validate;

exports.get = [auth.validateTokenHandler, getViewsHandler];

exports.getViews = getViews;
exports.getProjectViewsStates = getProjectViewsStates;

function getViewsHandler(req, res) {
  var projectStates = {};

  getProjectViewsStates(req.query || {})
    .then((states) => {
      projectStates = states || [];
      return getViews(req.query || {});
    })
    .then((views) => {
      data = {
        states: projectStates,
        views: views
      };
      utils.sendJSON(res, data, {end: true });
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}
/**
 * Helper to get project states
 * @param {Object} opt options
 * @param {String} opt.idProject Id of the project
 * @return {Array} project views state
 */
function getProjectViewsStates(opt) {
  var sql;
  opt = opt || {};
  let states = [];
  return new Promise((resolve) => {
    /**
     * Validate options
     */
    opt.idProject = validate('idProject', opt.idProject);
    /**
     * SQL
     */
    sql = utils.parseTemplate(template.getProjectViewsStates, opt);

    resolve(clientPgRead.query(sql));
  }).then(function(result) {
    if (result.rowCount > 0) {
      states = result.rows[0].states_views;
    }
    return states;
  });
}

/**
 * Helper to get views list
 * @param {Object} opt options
 * @param {String} opt.idUser Id of the user
 * @param {String} opt.idProject Id of the project
 * @return {Array} List of views
 */
function getViews(opt) {
  opt = opt || {};
  var sql;
  return new Promise((resolve) => {
    /**
     * Validate options
     */
    opt.idUser = validate('idUser', opt.idUser || opt.user);
    opt.idProject = validate('idProject', opt.idProject || opt.project);
    opt.language = validate('language', opt.language);
    opt.idTypes = validate('idTypes', opt.idTypes || opt.types);
    opt.hasFilterTypes = opt.idTypes.length > 0;
    opt.sqlTypesFilter = opt.idTypes.map((c) => "'" + c + "'").join(',');
    opt.selectKeys = validate('selectKeys', opt.selectKeys || opt.selectString);
    opt.idCollections = validate(
      'idCollections',
      opt.idCollections || opt.collections
    );
    opt.collectionsFilterOperator = validate(
      'collectionsFilterOperator',
      opt.collectionsFilterOperator
    );
    opt.roleMax = validate('roleMax', opt.roleMax || opt.filterViewsByRoleMax);
    opt.idViews = validate('idViews', opt.idViews || opt.views);
    opt.hasFilterViews = opt.idViews.length > 0;
    opt.sqlViewsFilter = opt.idViews.map((c) => "'" + c + "'").join(',');
    opt.hasFilterCollections = opt.idCollections.length > 0;
    opt.sqlCollectionsFilter = opt.idCollections
      .map((c) => "'" + c + "'")
      .join(',');
    opt.sqlCollectionsFilterOperator = opt.collectionsFilterOperator;

    /**
     * SQL
     */
    sql = utils.parseTemplate(template.getViewsByProject, opt);

    resolve(clientPgRead.query(sql));
  }).then(function(result) {
    return result.rows;
  });
}
