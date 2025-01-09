import { pgRead, pgWrite } from "#mapx/db";
import { getView } from "#mapx/view";
import { templates } from "#mapx/template";
import {
  isView,
  isViewId,
  isEmpty,
  isArray,
  isSourceId,
  isBboxMeta,
  isBbox,
} from "@fxi/mx_valid";
import { getSourceMetadata } from "#mapx/source";

export async function ioSetViewSourceMetaBbox(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session) {
      throw new Error("Missing session");
    }
    const { idView, type, extent, overwrite = false } = config;

    if (overwrite && !session.user_roles.publisher) {
      throw new Error("Not allowed");
    }

    const res = await setViewSourceMetaBbox(idView, type, extent, overwrite);
    cb(res);
  } catch (e) {
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
  cb(false);
}

export async function ioViewSourceMetaGet(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session) {
      throw new Error("Missing session");
    }

    const { idView } = config;

    const metaAll = await getViewSourceMetadata(idView);

    return cb(metaAll);
  } catch (e) {
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
  cb(false);
}

export async function ioViewMetaGet(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session) {
      throw new Error("Missing session");
    }

    const { idView, stat_n_days } = config;

    const metaView = await getViewMetadata({ id: idView, stat_n_days });

    return cb(metaView);
  } catch (e) {
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
  cb(false);
}

export async function ioViewStatsGet(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session) {
      throw new Error("Missing session");
    }

    const { idView, stat_n_days } = config;

    const statsView = await getViewStats({ id: idView, stat_n_days });

    return cb(statsView);
  } catch (e) {
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
  cb(false);
}

/**
 * Helper to get view metadata items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @return {Promise<Object>} view metadata
 */
export async function getViewMetadata(opt) {
  const id = opt.id.toUpperCase();
  if (!isViewId(id)) {
    throw Error("No valid id");
  }
  const sql = templates.getViewMetadata;
  const result = await pgRead.query(sql, [id]);

  if (result && result.rowCount > 0) {
    return result.rows[0].meta;
  } else {
    return {};
  }
}

/**
 * Helper to get view stat items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @param {Number} opt.stat_n_days  Number of days to computed stat frow now
 * @return {Promise<Object>} view metadata
 */
export async function getViewStats(opt) {
  const id = opt.id.toUpperCase();
  if (!isViewId(id)) {
    throw Error("No valid id");
  }
  const nDays = Math.ceil(opt.stat_n_days || 30);
  const sql = templates.getViewStats;
  const result = await pgRead.query(sql, [id, nDays]);
  if (result && result.rowCount > 0) {
    return result.rows[0].stats;
  } else {
    return {};
  }
}

async function getViewSourceMetadata(idView) {
  try {
    const view = await getView(idView);
    const type = view.type;

    const out = [];

    switch (type) {
      case "sm":
      case "gj":
        out.push({});
        break;
      case "rt":
      case "cc":
        {
          const metaCc = await getViewSourceMetadataRtCc(idView);
          out.push(metaCc);
        }
        break;
      case "vt":
        {
          const metaVt = await getViewSourceMetadataVt(view);
          out.push(...metaVt);
        }
        break;
      default:
        throw new Error("Unknown view type");
    }

    return out;
  } catch (err) {
    console.error("Error getting view source metadata: ", err.message);
    throw err;
  }
}

async function getViewSourceMetadataRtCc(idView) {
  const resCc = await pgRead.query(templates.getViewSourceMetadataRtCc, [
    idView,
  ]);
  if (resCc.rowCount === 0) {
    throw new Error("Rt Cc metadata: view not found");
  }
  return resCc.rows[0].meta;
}

async function getViewSourceMetadataVt(view) {
  if (isViewId(view)) {
    view = await getView(view);
  }

  if (!isView(view)) {
    throw new Error("View required");
  }
  const idSource = view?.data?.source?.layerInfo.name;
  if (!isSourceId(idSource)) {
    throw new Error("Missing valid source");
  }
  const allMeta = await getSourceMetadata({ id: idSource });
  return allMeta;
}

export async function getViewSourceMetadataExtent(idView) {
  try {
    const meta = await getViewSourceMetadata(idView);
    // Check if meta exists and is an array with at least one element
    if (isEmpty(meta) || !isArray(meta)) {
      return false;
    }

    const bbox = meta[0]?.spatial?.bbox ?? null;

    if (isBboxMeta(bbox)) {
      return bbox;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error getting metadata extent:", error);
    return null;
  }
}

/**
 * Client requested a bbox update : missing or wrong stored bbox
 * - This is just there to 'fix' a wrong / missing bbox automatically.
 * - BBbox should be defined at upload / creation or trigger.
 * - It will do nothing if an existing, valid meta bbox is found
 */
export async function setViewSourceMetaBbox(
  idView,
  type,
  bbox,
  overwrite = false,
  client = pgWrite
) {
  if (!isViewId(idView)) {
    throw new Error("Invalid view");
  }
  /**
   * If overwrite not allowed and meta bbox exists stop
   */
  if (!overwrite) {
    const bboxCurrent = await getViewSourceMetadataExtent(idView);
    if (isBboxMeta(bboxCurrent)) {
      throw new Error("Can't update meta bbox if one already set and valid");
    }
  }

  /**
   *  Proceed with fix / update
   */
  const isBboxMetaOk = isBboxMeta(bbox);
  const isBboxOk = isBbox(bbox);

  if (!isBboxMetaOk && !isBboxOk) {
    throw new Error("Invalid bbox format");
  }

  if (isBboxOk) {
    bbox = {
      lat_min: Math.min(bbox.lat1, bbox.lat2),
      lat_max: Math.max(bbox.lat1, bbox.lat2),
      lng_min: Math.min(bbox.lng1, bbox.lng2),
      lng_max: Math.max(bbox.lng1, bbox.lng2),
    };
  }

  const bboxJson = JSON.stringify(bbox);
  let query;
  let params;

  if (type === "vt") {
    // Update source metadata for vt views
    query = `
      UPDATE mx_sources
      SET data = jsonb_set(
        data,
        '{meta,spatial,bbox}',
        $1::jsonb,
        true
      )
      WHERE id = $2
      RETURNING id;
    `;

    const view = await getView(idView);

    const sourceId = view?.data?.source?.layerInfo?.name;
    params = [bboxJson, sourceId];
  } else if (type === "cc" || type === "rt") {
    // Update view metadata directly for cc/rt views
    query = `
      WITH latest_view AS (
        SELECT id, pid
        FROM mx_views
        WHERE id = $2
        ORDER BY date_modified DESC
        LIMIT 1
      )
      UPDATE mx_views v
      SET data = jsonb_set(
        data,
        '{source,meta,spatial,bbox}',
        $1::jsonb,
        true
      )
      FROM latest_view lv
      WHERE v.id = lv.id AND v.pid = lv.pid
      RETURNING v.id, v.pid;
    `;
    params = [bboxJson, idView];
  } else {
    throw new Error(`Unsupported view type: ${type}`);
  }

  try {
    await client.query("BEGIN");

    const result = await client.query(query, params);

    if (result.rowCount !== 1) {
      await client.query("ROLLBACK");
      throw new Error(
        `Expected to update exactly 1 row, but updated ${result.rowCount} rows instead`
      );
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
