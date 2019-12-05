const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const auth = require('./authentication.js');

const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    required: ['idUser', 'idProject','token'],
    expected: [
      'idProjectOption',
      'idViews',
      'collections',
      'collectionsSelectOperator',
      'selectKeys',
      'selectKeysPublic',
      'types',
      'roleMax',
      'language',
      'publicOnly',
      'email' 
    ]
  }
);

exports.get = [
  validateParamsHandler,
  auth.validateTokenHandler,
  getViewsHandler
];
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
  return new Promise((resolve) => {
    /**
     * Set variable to alter the template :
     * Instead of concatenating conditionally bits of
     * sql, use a conditional block in sql template and
     * set boolean beforehand, here.
     */
    opt.hasFilterTypes = opt.types.length > 0;
    opt.hasFilterViews = opt.idViews.length > 0;
    opt.hasFilterCollections = opt.collections.length > 0;
    /**
     * Convert array to sql code for the template
     */
    opt.sqlTypesFilter = opt.types.map((c) => "'" + c + "'").join(',');
    opt.sqlViewsFilter = opt.idViews.map((c) => "'" + c + "'").join(',');
    opt.sqlCollectionsFilter = opt.collections
      .map((c) => "'" + c + "'")
      .join(',');
    opt.sqlCollectionsSelectOperator = opt.collectionsSelectOperator;

    /**
     * Parse sql template
     */
    const sql = utils.parseTemplate(template.getViewsByProject, opt);

    /**
     * Query
     */
    const result = clientPgRead.query(sql);

    /**
     * Resolve result
     */
    resolve(result);
  }).then(function(result) {

    /**
     * Finally return only rows
     */
    return result.rows;
  });
}
