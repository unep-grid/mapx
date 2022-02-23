import {pgRead} from '#mapx/db';
import {getParamsValidator} from '#mapx/route_validation';
import {
  parseTemplate,
  sendJSON,
  sendError,
  arrayToPgArray
} from '#mapx/helpers';
import {templates} from '#mapx/template';

const validateParamsHandlerText = getParamsValidator({
  required: ['searchText', 'language'],
  expected: ['pageNumber', 'maxByPage']
});

const validateParamsHandlerConcept = getParamsValidator({
  required: ['idConcepts', 'language']
});

const mwGemetSearchText = [validateParamsHandlerText, handlerSearchText];
const mwGemetSearchConcept = [
  validateParamsHandlerConcept,
  handlerSearchConcept
];

export  {
  mwGemetSearchText,
  mwGemetSearchConcept
};

async function handlerSearchText(req, res) {
  try {
    const q = parseTemplate(templates.getGemetSearch, {
      language: req.query.language,
      text: req.query.searchText,
      limit: req.query.maxByPage,
      offset: (req.query.pageNumber - 1) * req.query.maxByPage
    });
    const now = Date.now();
    const result = await pgRead.query(q);
    const out = result.rows[0]?.res || {};
    out.timing_ms = Date.now() - now;
    sendJSON(res, out);
  } catch (err) {
    sendError(res, err);
  }
}

async function handlerSearchConcept(req, res) {
  try {
    const idConcept = req.query.idConcepts;
    const q = parseTemplate(templates.getGemetConcept, {
      language: req.query.language,
      concept: arrayToPgArray(idConcept)
    });
    const result = await pgRead.query(q);
    const list = result.rows.map((r) => r.hits);
    sendJSON(res, list);
  } catch (err) {
    sendError(res, err);
  }
}
