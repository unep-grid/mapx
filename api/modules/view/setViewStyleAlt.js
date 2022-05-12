import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

/**
 * Update view.data.style._mapbox and view.data.style._sld
 * @param {String} idView
 * @param {Object} config
 * @param {String} config.mapbox MBstyle as string
 * @param {String} config.sld SLD as string
 * @return {Promise<Boolean>} Done
 */
export async function setViewStyleAlt(idView, config) {
  try {
    const sql = templates.setViewStyleAlt;
    const configQuery = Object.assign(
      {},
      {
        sld: "",
        mapbox: "{}",
      },
      config
    );
    await pgWrite.query(sql, [idView, configQuery.mapbox, configQuery.sld]);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
