const clientPgRead = require.main.require('./db').pgRead;
const utils = require('./utils.js');
const template = require('../templates');
const auth = require('./authentication.js');

exports.get = [auth.validateTokenHandler, getViewsHandler];

exports.getViews = getViews;

function getViewsHandler(req, res) {
  getViews({
    idUser: req.query.idUser * 1,
    idProject: req.query.idProject,
    selectString: req.query.selectString,
    idViews: req.query.idViews
  })
    .then((data) => {
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
 * @param {String} opt.idProject Id of the project
 * @return {Array} List of views
 */
function getViews(opt) {
  opt = opt || {};
  var sql;
  var viewsFilter = [];
  var sqlViewsFilter = '';
  var hasViews = false;
  return new Promise((resolve, reject) => {
    if (!opt.idProject || !opt.idUser) {
      return reject({message: 'Invalid id'});
    }

    if(opt.idViews){
      viewsFilter = opt.idViews instanceof Array ? opt.idViews : opt.idViews.split(',');
    }
   
    hasViews = viewsFilter.length > 0;
    sqlViewsFilter = utils.arrayToPgArray(viewsFilter);

    sql = utils.parseTemplate(template.getViews, {
      idUser: opt.idUser * 1,
      idProject: opt.idProject,
      selectString: opt.selectString || '*',
      language: opt.language || 'en',
      filterByViews : hasViews,
      idViews: sqlViewsFilter
    });

    resolve(clientPgRead.query(sql));
  }).then(function(result) {
    return result.rows;
  });
}
