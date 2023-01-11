import { pgRead } from "#mapx/db";
import { templates } from "#mapx/template";

/**
 * Get a list of views for geoserver layers
 *
 * @return {Promise<Array>}
 */
export async function getViewsGeoserver() {
  const sql = templates.getViewsGeoserver;
  const res = await pgRead.query(sql);
  return res.rows;
}
