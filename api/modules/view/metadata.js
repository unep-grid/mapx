import { pgRead } from "#mapx/db";
import { getView } from "#mapx/view";
import { templates } from "#mapx/template";
import { isView, isViewId, isSourceId } from "@fxi/mx_valid";
import { getSourceMetadata } from "#mapx/source";

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

/**
 * Helper to get view metadata items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @param {Number} opt.stat_n_days  Number of days to computed stat frow now
 * @return {Promise<Object>} view metadata
 */
export async function getViewMetadata(opt) {
  const id = opt.id.toUpperCase();
  if (!isViewId(id)) {
    throw Error("No valid id");
  }
  const nDays = Math.ceil(opt.stat_n_days || 0);
  const sql = templates.getViewMetadata;
  const result = await pgRead.query(sql, [id, nDays]);

  if (result && result.rowCount > 0) {
    return result.rows[0].meta;
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
