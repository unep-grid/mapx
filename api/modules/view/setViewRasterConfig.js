import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

/**
 * Update the complete raster source configuration for an rt view.
 * @param {string} idView
 * @param {{tiles: string, legend?: string|null, tileSize?: number, useMirror?: boolean}} config
 * @param {string} idProject
 * @param {import("pg").Client} [client]
 * @returns {Promise<{
 *   id: string,
 *   project: string,
 *   tile_url: string,
 *   legend_url: string|null,
 *   bounds: unknown
 * }|null>} The persisted raster values, or null when no matching view exists.
 */
export async function setViewRasterConfig(idView, config, idProject, client) {
  const pgClient = client || pgWrite;
  const { rows } = await pgClient.query(templates.setViewRasterConfig, [
    idView,
    config.tiles,
    config.legend || null,
    config.tileSize || 512,
    Boolean(config.useMirror),
    idProject,
  ]);
  return rows?.[0] || null;
}
