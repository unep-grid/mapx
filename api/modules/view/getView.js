/**
 * Get view
 */
import { pgRead } from "#mapx/db";
import { sendJSON, sendError } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isEmpty, isViewId, isSourceId } from "@fxi/mx_valid";

/**
 * Get full view data
 */
export async function mwGet(req, res) {
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

export async function getViewsIdBySource(idSource) {
  if (!isSourceId(idSource)) {
    throw Error("No valid");
  }
  const sql = templates.getViewsIdBySource;
  const { rows } = await pgRead.query(sql, [idSource]);
  return rows.map((r) => r.id);
}

export async function getViewsBySource(idSource) {
  if (!isSourceId(idSource)) {
    throw Error("No valid");
  }
  const sql = templates.getViewsBySource;
  const { rows } = await pgRead.query(sql, [idSource]);
  return rows;
}

export async function getViewsTableBySource(idSource) {
  if (!isSourceId(idSource)) {
    throw Error("No valid");
  }

  const sql = templates.getViewsTableBySource;

  const { rows } = await pgRead.query(sql, [idSource]);

  return rows;
}

export async function getView(idView) {
  if (!isViewId(idView)) {
    throw Error("Invalid view");
  }

  const sql = templates.getViewFull;

  if (!sql) {
    throw Error("Invalid query");
  }

  const result = await pgRead.query(sql, [idView]);

  if (result && result.rowCount === 0) {
    return null;
  } else {
    const [out] = result.rows;
    return out;
  }
}



