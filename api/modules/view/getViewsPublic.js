import {pgRead} from '#mapx/db';
import {parseTemplate, sendJSON, sendError} from '#mapx/helpers';
import {templates} from '#mapx/template';
import {validateTokenHandler} from '#mapx/authentication';
import {getParamsValidator} from '#mapx/route_validation';

const validateParamsHandler = getParamsValidator({
  required: ['idUser', 'idProject', 'token'],
  expected: ['idProjectExclude', 'selectKeys', 'types', 'language']
});

const mwGetListPublic = [
  validateParamsHandler,
  validateTokenHandler,
  getViewsPublicHandler
];

export  {
  mwGetListPublic,
  getViewsPublic
};

async function getViewsPublicHandler(req, res) {
  try {
    const start = new Date();
    const data = await getViewsPublic(req.query);
    const out = {
      views: data,
      timing: new Date() - start
    };
    sendJSON(res, out, {end: true});
  } catch (err) {
    sendError(res, err);
  }
}
/**
 * Helper to get views list
 * @param {Object} opt options
 * @param {String} opt.idUser Id of the user
 * @param {String} opt.idProjectExclude Id of a project to exclude
 * @param {Array<string>} opt.types Views types
 * @return {Promise<Array>} List of views
 */
async function getViewsPublic(opt) {
  opt = opt || {};
  /**
   * Set variable to alter the template :
   * Instead of concatenating conditionally bits of
   * sql, use a conditional block in sql template and
   * set boolean beforehand, here.
   */
  opt.hasFilterTypes = opt.types.length > 0;
  opt.hasProjectExclude = opt.idProjectExclude.length > 0;

  /**
   * Convert array to sql code for the template
   */
  opt.sqlTypesFilter = opt.types.map((c) => `'` + c + `'`).join(',');

  /**
   * Parse sql template
   */
  const sql = parseTemplate(templates.getViewsPublic, opt);

  /**
   * Query DB
   */
  const result = await pgRead.query(sql);

  return result.rows;
}
