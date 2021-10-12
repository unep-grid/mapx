const {pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const {getGemetSearch, getGemetConcept} = require('@mapx/template');
const {parseTemplate, sendJSON, sendError,arrayToPgArray} = require('@mapx/helpers');

const validateParamsHandlerText = getParamsValidator({
  required: ['searchText', 'language'],
  expected : ['pageNumber','maxByPage']
});

const validateParamsHandlerConcept = getParamsValidator({
  required: ['idConcepts', 'language']
});

const mwGemetSearchText = [validateParamsHandlerText, handlerSearchText];
const mwGemetSearchConcept = [validateParamsHandlerConcept, handlerSearchConcept];

module.exports = {
  mwGemetSearchText,
  mwGemetSearchConcept
};

async function handlerSearchText(req, res) {
  try {
    const q = parseTemplate(getGemetSearch, {
      language: req.query.language,
      text: req.query.searchText,
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

async function handlerSearchConcept(req, res) {
  try {
    const idConcept = req.query.idConcepts;
    const q = parseTemplate(getGemetConcept, {
      language: req.query.language,
      concept: arrayToPgArray(idConcept)
    });
    const result = await pgRead.query(q);
    const list = result.rows.map(r=>r.hits);
    sendJSON(res,list);
  } catch (err) {
    sendError(res, err);
  }
}
