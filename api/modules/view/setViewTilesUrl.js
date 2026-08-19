import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

/**
 * Update view.data.source.tiles[0] with a new tile URL template, scoped to
 * idProject so it can only touch views the caller already has access to.
 * @param {String} idView
 * @param {String} tilesUrl
 * @param {String} idProject
 * @param {pg.Client} [client]
 * @return {Promise<Boolean>} Done
 */
export async function setViewTilesUrl(idView, tilesUrl, idProject, client) {
  const pgClient = client || pgWrite;
  await pgClient.query(templates.setViewTilesUrl, [idView, tilesUrl, idProject]);
  return true;
}
