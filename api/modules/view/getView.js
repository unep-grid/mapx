/**
 * Get view
 */
import { pgRead } from "#mapx/db";
import { parseTemplate, sendJSON, sendError } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isEmpty, isViewId } from "@fxi/mx_valid";
export { mwGet, mwGetMetadata, getViewMetadata };
/**
 * Get full view data
 */
async function mwGet(req, res) {
  try {
    const { id } = req.params;

    if (!isViewId(id)) {
      throw Error("No valid id");
    }

    const views = await getView(id);

    if (isEmpty(views)) {
      return res.sendStatus(204);
    } else {
      return sendJSON(res, views || {});
    }
  } catch (e) {
    return sendError(res, e);
  }
}

export async function getView(idView) {
  const sql = parseTemplate(templates.getViewFull, {
    idView: idView,
  });

  if (!sql) {
    throw Error("Invalid query");
  }

  const result = await pgRead.query(sql);
  if (result && result.rowCount === 0) {
    return null;
  } else {
    const [out] = result.rows;
    return out;
  }
}

async function mwGetMetadata(req, res) {
  try {
    const start = new Date();
    const data = await getViewMetadata({ id: req.params.id });
    data._timing = new Date() - start;
    sendJSON(res, data, { end: true });
  } catch (e) {
    sendError(res, e);
  }
}

/**
 * Helper to get view metadata items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @return {Object} view metadata
 */
async function getViewMetadata(opt) {
  const id = opt.id.toUpperCase();
  if (!isViewId(id)) {
    throw Error("No valid id");
  }
  const sql = parseTemplate(templates.getViewMetadata, {
    idView: id.toUpperCase(),
  });
  const result = await pgRead.query(sql);
  if (result && result.rowCount > 0) {
    return result.rows[0];
  } else {
    return {};
  }
}
