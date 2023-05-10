import { pgRead } from "#mapx/db";
import { parseTemplate, sendJSON, sendError } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { validateTokenHandler } from "#mapx/authentication";
import { getParamsValidator } from "#mapx/route_validation";
import { isEmpty } from "@fxi/mx_valid";

const validateParamsHandler = getParamsValidator({
  required: ["idUser", "idProject", "token"],
  expected: [
    "idProjectOption",
    "idViews",
    "collections",
    "collectionsSelectOperator",
    "selectKeys",
    "selectKeysPublic",
    "types",
    "roleMax",
    "language",
    "publicOnly",
    "email",
    "allViews",
  ],
});

const mwGetListByProject = [
  validateParamsHandler,
  validateTokenHandler,
  getViewsHandler,
];

export { getViews, getProjectViewsStates, mwGetListByProject };

/**
 * Get views list by project + state
 * @param {Object} req Request object
 * @param {Object} res Response object
 * @return null
 */
async function getViewsHandler(req, res) {
  try {
    const states = await getProjectViewsStates(req.query || {});
    const views = await getViews(req.query || {});
    const data = {
      states: states,
      views: views,
    };
    sendJSON(res, data, { end: true });
  } catch (e) {
    console.error(e);
    sendError(res, e);
  }
}

/**
 * Get views list by project
 * @param {Object} opt options
 * @param {String} opt.idUser Id of the user
 * @param {String} opt.idProject Id of the project
 * @return {Promise<array>} List of views
 */
async function getViews(opt) {
  const def = {
    idProject: null,
    idUser: null,
    types: [],
    idViews: [],
    collections: [],
    collectionsSelectOperator: "?|",
    language: "en",
    roleMax: "admin",
    allViews: false,
    selectKeys: ["*"],
  };

  const config = Object.assign({}, def, opt);
  const views = [];
  /**
   * Set variable to alter the template :
   * Instead of concatenating conditionally bits of
   * sql, use a conditional block in sql template and
   * set boolean beforehand, here.
   */
  config.hasFilterTypes = config.types.length > 0;
  config.hasFilterViews = config.idViews.length > 0 && !config.allViews;
  config.hasFilterCollections = config.collections.length > 0;
  /**
   * Convert array to sql code for the template
   */
  config.sqlTypesFilter = config.types.map((type) => `'${type}'`).join(",");
  config.sqlViewsFilter = config.idViews.map((id) => `'${id}'`).join(",");
  config.sqlCollectionsFilter = config.collections
    .map((col) => `'${col}'`)
    .join(",");
  config.sqlCollectionsSelectOperator = config.collectionsSelectOperator;

  /**
   * Parse sql template
   */
  const sql = parseTemplate(templates.getViewsByProject, config);
  /**
   * Query
   */
  const result = await pgRead.query(sql);

  views.push(...result.rows);

  return views;
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
  const sql = parseTemplate(templates.getProjectViewsStates, opt);
  const res = await pgRead.query(sql);
  if (res.rowCount > 0) {
    states = res.rows[0].states_views;
  }
  return states;
}
