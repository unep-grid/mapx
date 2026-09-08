import { pgRead } from "#mapx/db";
import { getView } from "#mapx/view";
import { templates } from "#mapx/template";
import {
  isView,
  isViewId,
  isEmpty,
  isArray,
  isSourceId,
  isBboxMeta,
} from "@fxi/mx_valid";
import { getSourceEditPermission, getSourceMetadata } from "#mapx/source";

async function getSessionViewSource(session, idView, client) {
  if (
    !session?.user_authenticated ||
    !session.project_id ||
    !Number.isInteger(Number(session.user_id)) ||
    !isViewId(idView)
  ) {
    return null;
  }

  const result = await client.query(
    `SELECT v.type, v.project,
            CASE
              WHEN v.type = 'vt' THEN v.data #>> '{source,layerInfo,name}'
              WHEN v.type IN ('rt', 'cc') THEN v.data #>> '{source,metadataId}'
            END AS id_source,
            s.type AS source_type
     FROM mx_views_latest v
     LEFT JOIN mx_sources_latest s ON s.id = CASE
       WHEN v.type = 'vt' THEN v.data #>> '{source,layerInfo,name}'
       WHEN v.type IN ('rt', 'cc') THEN v.data #>> '{source,metadataId}'
     END
     WHERE v.id = $1`,
    [idView],
  );
  const view = result.rows[0];
  const idSource = view?.id_source;
  if (
    !["vt", "rt", "cc"].includes(view?.type) ||
    view.project !== session.project_id ||
    !isSourceId(idSource) ||
    (["rt", "cc"].includes(view.type) && view.source_type !== "external")
  ) {
    return null;
  }
  return { idSource, type: view.type };
}

/**
 * Resolve whether the current session may open the legacy metadata editor for
 * the source or external metadata entry linked by a view in the current project.
 */
export async function getViewSourceMetadataEditAccess(
  socket,
  config,
  client = pgRead,
) {
  const session = socket?.session;
  const idView = config?.idView;
  const reference = await getSessionViewSource(session, idView, client);
  if (!reference) {
    return { allowed: false };
  }
  const { idSource } = reference;

  const permission = await getSourceEditPermission({
    client,
    idSource,
    idUser: session.user_id,
    idProject: session.project_id,
    // Match the legacy editor's editable-source list exactly.
    allowRoot: false,
    roles: session.user_roles,
  });
  return permission.allowed ? { allowed: true, idSource } : { allowed: false };
}

export async function ioViewSourceMetadataEditAccess(socket, config, cb) {
  try {
    cb(await getViewSourceMetadataEditAccess(socket, config));
  } catch (error) {
    console.error("Source metadata edit access check failed", error);
    cb({ allowed: false });
  }
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

    const { idView, stat_n_days, stat_n_months } = config;

    const statsView = await getViewStats({
      id: idView,
      stat_n_days,
      stat_n_months,
    });

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
 * @param {Number} opt.stat_n_months  Number of months to computed monthly stats
 * @return {Promise<Object>} view metadata
 */
export async function getViewStats(opt) {
  const id = opt.id.toUpperCase();
  if (!isViewId(id)) {
    throw Error("No valid id");
  }
  const nDays = Math.ceil(opt.stat_n_days || 365 * 5);
  const nMonths = Math.max(1, Math.ceil(opt.stat_n_months || 60));
  const sql = templates.getViewStats;
  const result = await pgRead.query(sql, [id, nDays, nMonths]);
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
          const idSource = view?.data?.source?.metadataId;
          if (isSourceId(idSource)) {
            const metaExternal = await getSourceMetadata({ id: idSource });
            out.push(...metaExternal);
          } else {
            out.push({});
          }
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
