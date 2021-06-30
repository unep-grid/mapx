const {pgRead} = require('@mapx/db');
const {parseTemplate, sendJSON, sendError} = require('@mapx/helpers');
const template = require('@mapx/template');
const {validateTokenHandler} = require('@mapx/authentication');
const {getParamsValidator} = require('@mapx/route_validation');

const validateParamsHandler = getParamsValidator({
  required: ['idUser', 'idProject', 'token'],
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
});

const mwGetListByProject = [
  validateParamsHandler,
  validateTokenHandler,
  getViewsHandler
];

module.exports = {
  getViews,
  getProjectViewsStates,
  mwGetListByProject
};

async function getViewsHandler(req, res) {
  try {
    const states = await getProjectViewsStates(req.query || {});
    const views = await getViews(req.query || {});
    const data = {
      states: states,
      views: views
    };
    sendJSON(res, data, {end: true});
  } catch (e) {
    console.error(e);
    sendError(res, e);
  }
}

/**
 * Helper to get project states
 * @param {Object} opt options
 * @param {String} opt.idProject Id of the project
 * @return {Promise<array>} project views state
 */
async function getProjectViewsStates(opt) {
  opt = opt || {};
  let states = [];
  const sql = parseTemplate(template.getProjectViewsStates, opt);
  const res = await pgRead.query(sql);
  if (res.rowCount > 0) {
    states = res.rows[0].states_views;
  }
  return states;
}

/**
 * Helper to get views list
 * @param {Object} opt options
 * @param {String} opt.idUser Id of the user
 * @param {String} opt.idProject Id of the project
 * @return {Promise<array>} List of views
 */
async function getViews(opt) {
  opt = opt || {};
  const views = [];
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
  opt.sqlTypesFilter = opt.types.map((type) => `'${type}'`).join(',');
  opt.sqlViewsFilter = opt.idViews.map((id) => `'${id}'`).join(',');
  opt.sqlCollectionsFilter = opt.collections.map((col) => `'${col}'`).join(',');
  opt.sqlCollectionsSelectOperator = opt.collectionsSelectOperator;

  /**
   * Parse sql template
   */
  const sql = parseTemplate(template.getViewsByProject, opt);

  /**
   * Query
   */
  const result = await pgRead.query(sql);

  /**
   * Patch... in case of filters and no views :
   * --> Return default list.
   */
  const retry =
    result.rowCount === 0 &&
    (opt.hasFilterViews || opt.hasFilterTypes || opt.hasFilterCollections);

  if (retry) {
    opt.hasFilterCollections = false;
    opt.hasFilterViews = false;
    opt.hasFilterType = false;
    const sqlRetry = parseTemplate(template.getViewsByProject, opt);
    const resultRetry = await pgRead.query(sqlRetry);
    /**
     * Return default views list with not filters
     */
    views.push(...resultRetry.rows);
  } else {
    views.push(...result.rows);
  }
  
  return views;

}
