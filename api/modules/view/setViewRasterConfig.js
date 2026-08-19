import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

/**
 * Update the complete raster source configuration for an rt view.
 * @param {string} idView
 * @param {{tiles: string, legend?: string|null, tileSize?: number, useMirror?: boolean}} config
 * @param {string} idProject
 * @param {import("pg").Client} [client]
 * @returns {Promise<boolean>}
 */
export async function setViewRasterConfig(idView, config, idProject, client) {
  const pgClient = client || pgWrite;
  await pgClient.query(templates.setViewRasterConfig, [
    idView,
    config.tiles,
    config.legend || null,
    config.tileSize || 512,
    Boolean(config.useMirror),
    idProject,
  ]);
  return true;
}
