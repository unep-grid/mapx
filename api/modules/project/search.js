import {pgRead} from '#mapx/db';
import {getParamsValidator} from '#mapx/route_validation';
import {templates} from '#mapx/template';
import {
  parseTemplate,
  sendJSON,
  sendError,
  arrayToPgArray
} from '#mapx/helpers';

const validateParamsHandler = getParamsValidator({
  required: ['titleRegex', 'language'],
  expected: ['idProjects', 'pageNumber', 'maxByPage']
});

const mwProjectSearchText = [validateParamsHandler, handlerSearchText];

export  {
  mwProjectSearchText
};

async function handlerSearchText(req, res) {
  try {
    const q = parseTemplate(templates.getProjectsPublicSearch, {
      language: req.query.language,
      titleRegex: req.query.titleRegex,
      idProjects: arrayToPgArray(req.query.idProjects),
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
