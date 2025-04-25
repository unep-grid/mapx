import { templates } from "#mapx/template";
import { pgRead } from "#mapx/db";

export async function getViewTileSourceData(idView) {
  const sqlViewInfo = templates.getViewSourceAndAttributes;
  const resultView = await pgRead.query(sqlViewInfo, [idView]);

  if (resultView.rowCount !== 1) {
    throw Error("Error fetching view source and attribute");
  }
  const [viewSrcConfig] = resultView.rows;

  /**
   * Structure
   * {
   *     "attributes": [],
   *     "attribute": "id",
   *     "attribute_type": "character varying",
   *     "layer": "<idSource>",
   *     "mask": "<idSourceMask>",
   *     "use_postgis_tiles": false
   * }
   */

  return viewSrcConfig;
}
