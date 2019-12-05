const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const validateTokenHandler = require('./authentication.js').validateTokenHandler;

const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    required: ['idUser', 'idProject','token'],
    expected: [
      'idProjectExclude',
      'selectKeys',
      'types',
      'language'
    ]
  }
);

exports.get = [
  validateParamsHandler,
  validateTokenHandler, 
  getViewsPublicHandler
];

exports.getViewsPublic = getViewsPublic;

function getViewsPublicHandler(req, res) {
  var start = new Date();

  getViewsPublic(req.query || {})
    .then((data) => {
      data = {
        views: data,
        timing: new Date() - start
      };
      utils.sendJSON(res, data, {end:true});
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
  return new Promise((resolve) => {
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
    opt.sqlTypesFilter = opt.types.map((c) => "'" + c + "'").join(',');

    /**
     * Parse sql template
     */
    const sql = utils.parseTemplate(template.getViewsPublic, opt);

    /**
    * Query DB
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
