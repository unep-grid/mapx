const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const auth = require('./authentication.js');

const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator({
  required: ['idUser', 'idProject'],
  expected: [
    'idProjectOption',
    'idViews',
    'idCollections',
    'collectionsSelectOperator',
    'selectKeys',
    'selectKeysPublic',
    'idTypes',
    'roleMax',
    'language',
    'publicOnly',
    'token',
    'email' // requested / added by validateTokenHandler
  ]
});

exports.get = [validateParamsHandler, auth.validateTokenHandler, getViewsHandler];
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
      utils.sendJSON(res, data, {end: true});
    })
    .catch((err) => {
      console.log(err);
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
    opt.hasFilterTypes = opt.idTypes.length > 0;
    opt.sqlTypesFilter = opt.idTypes.map((c) => "'" + c + "'").join(',');
    opt.hasFilterViews = opt.idViews.length > 0;
    opt.sqlViewsFilter = opt.idViews.map((c) => "'" + c + "'").join(',');
    opt.hasFilterCollections = opt.idCollections.length > 0;
    opt.sqlCollectionsFilter = opt.idCollections
      .map((c) => "'" + c + "'")
      .join(',');
    opt.sqlCollectionsSelectOperator = opt.collectionsSelectOperator;

    /**
     * SQL
     */
    sql = utils.parseTemplate(template.getViewsByProject, opt);

    resolve(clientPgRead.query(sql));
  }).then(function(result) {
    return result.rows;
  });
}
