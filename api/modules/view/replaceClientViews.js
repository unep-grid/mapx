import { isArray, isViewId, isArrayOfViewsId } from "@fxi/mx_valid";
import { getViewsIdBySource } from "./getView.js";
import { getViews } from "./getViewsByProject.js";

/**
 * Helper to replace views client side
 * @async
 * @param {Object} option
 * @param {String} options.idView View id ;
 * @return {Promise<object>} message {ok:true}
 */
export async function ioUpdateClientViews(socket, options) {
  const { idView } = options || {};

  if (!isViewId(idView) && !isArrayOfViewsId(idView)) {
    return { ok: false };
  }

  const idUser = socket.session.user_id;
  const idProject = socket.session.project_id;
  const idViews = isArray(idView) ? idView : [idView];
  const views = await getViews({ idViews, idProject, idUser });

  return await socket.mx_emit_ws_response("/server/views/replace", {
    views,
  });
}

/**
 * Helper to request client side style generation by Source
 * @async
 * @param {Object} layer
 * @param {String} options.idSource source id ;
 * @return {Boolean} done
 */
export async function ioUpdateClientViewsBySource(socket, options) {
  const { idSource } = options || {};

  const idViews = await getViewsIdBySource(idSource);

  const result = await ioUpdateClientViews(socket, { idView: idViews });

  if (!result.ok) {
    throw new Error(`View replacement failed for views ${idViews.join(",")}`);
  }

  return { ok: true };
}
