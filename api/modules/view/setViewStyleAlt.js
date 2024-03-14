import { isViewId, isNotEmpty } from "@fxi/mx_valid";
import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { getViewsIdBySource } from "#mapx/view";

/**
 * Update view.data.style._mapbox and view.data.style._sld
 * @param {String} idView
 * @param {Object} config
 * @param {String} config.mapbox MBstyle as string
 * @param {String} config.sld SLD as string
 * @param {pg.Client} client pg client
 * @return {Promise<Boolean>} Done
 */
export async function setViewStyleAlt(idView, config, client) {
  try {
    const pgClient = client || pgWrite;
    const sql = templates.setViewStyleAlt;
    const configQuery = Object.assign(
      {},
      {
        sld: "",
        mapbox: "{}",
      },
      config
    );
    await pgClient.query(sql, [idView, configQuery.mapbox, configQuery.sld]);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Helper to request client side style generation
 * @async
 * @param {Object} layer
 * @param {String} options.idView View id ;
 * @param {pg.Client} client pg client
 * @return {Promise<Object>} result {mapbox,sld}
 */
export async function ioUpdateDbViewAltStyle(socket, options, client) {
  const { idView } = options || {};
  const pgClient = client || pgWrite;

  if (!isViewId(idView)) {
    return { valid: false };
  }

  const { result } = await socket.mx_emit_ws_response(
    "/server/view/style/get",
    {
      idView: idView,
    }
  );

  result.valid = isNotEmpty(result?.mapbox) && isNotEmpty(result?.sld);

  if (result.valid) {
    await setViewStyleAlt(idView, result, pgClient);
  }

  return result;
}

/**
 * Helper to request client side style generation by Source
 * @async
 * @param {Object} layer
 * @param {String} options.idSource source id ;
 * @param {pg.Client} client pg client
 * @return {Promise<Boolean>} done
 */
export async function ioUpdateDbViewsAltStyleBySource(socket, options, client) {
  const { idSource } = options || {};

  const idViews = await getViewsIdBySource(idSource);

  for (const id of idViews) {
    const res = await ioUpdateDbViewAltStyle(socket, { idView: id }, client);
    if (!res.valid) {
      await socket.notifyInfoWarning({
        message: `Alt style skipped for view ${id}`,
        group: "alt_style",
      });
    }
  }

  return true;
}
