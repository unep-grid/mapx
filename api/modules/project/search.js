const {pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const {getProjectsPublicSearch} = require('@mapx/template');
const {parseTemplate, sendJSON, sendError, arrayToPgArray} = require('@mapx/helpers');

const validateParamsHandler = getParamsValidator({
  required: ['titleRegex', 'language'],
  expected : ['idProjects','pageNumber','maxByPage']
});

const mwProjectSearchText = [validateParamsHandler, handlerSearchText];

module.exports = {
   mwProjectSearchText
};

async function handlerSearchText(req, res) {
  try {
    const q = parseTemplate(getProjectsPublicSearch, {
      language: req.query.language,
      titleRegex: req.query.titleRegex,
      idProjects : arrayToPgArray(req.query.idProjects),
      limit : req.query.maxByPage,
      offset : (req.query.pageNumber-1) * req.query.maxByPage 
    });
    const now = Date.now();
    const result = await pgRead.query(q);
    const out = result.rows[0]?.res || {};
    out.timing_ms = (Date.now() - now);
    sendJSON(res,out);
  } catch (err) {
    sendError(res, err);
  }
}


