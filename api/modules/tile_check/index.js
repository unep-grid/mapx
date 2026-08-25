import { pgRead } from "#mapx/db";
import { buildTestUrl } from "./substitute.js";
import { checkUrl } from "./fetch_check.js";
import { saveCheckResult } from "./store.js";

export { buildTestUrl } from "./substitute.js";
export { checkUrl } from "./fetch_check.js";

const CONCURRENCY = 10;

/**
 * Check the configured tile and legend resources for one raster view.
 * @param {{tile_url?: string, legend_url?: string, bounds?: unknown}} view
 * @returns {Promise<Object>}
 */
export async function checkRasterUrls(view) {
  const bounds = Array.isArray(view.bounds) ? view.bounds : null;
  const tileUrl = buildTestUrl(view.tile_url, { bounds });
  const legendConfigured =
    typeof view.legend_url === "string" && view.legend_url.length > 0;
  const [tileResult, legendResult] = await Promise.all([
    tileUrl
      ? checkUrl(tileUrl)
      : { valid: false, detail: "no_tile_template", tested_url: null },
    legendConfigured
      ? checkUrl(view.legend_url)
      : { valid: null, detail: "not_configured", tested_url: null },
  ]);
  const valid = tileResult.valid === true &&
    (!legendConfigured || legendResult.valid === true);
  const detail = [
    !tileResult.valid && `tiles:${tileResult.detail || "invalid"}`,
    legendConfigured && !legendResult.valid &&
      `legend:${legendResult.detail || "invalid"}`,
  ].filter(Boolean).join(", ") || null;

  return {
    valid,
    detail,
    tested_url: tileResult.tested_url,
    tile_valid: tileResult.valid,
    tile_http_status: tileResult.http_status,
    tile_content_type: tileResult.content_type,
    tile_detail: tileResult.detail,
    tile_tested_url: tileResult.tested_url,
    legend_configured: legendConfigured,
    legend_valid: legendResult.valid,
    legend_http_status: legendResult.http_status,
    legend_content_type: legendResult.content_type,
    legend_detail: legendResult.detail,
    legend_tested_url: legendResult.tested_url,
  };
}

/**
 * 'rt' views with at least one tile URL template, optionally scoped to a
 * project. Reuses mx_views_latest (CTE-based latest-pid perf pattern).
 */
export async function getCheckableViews(idProject) {
  const params = [];
  let where = `type = 'rt' AND data #>> '{source,tiles,0}' IS NOT NULL`;
  if (idProject) {
    params.push(idProject);
    where += ` AND project = $${params.length}`;
  }
  const sql = `
    SELECT
      id,
      project,
      data #>> '{source,tiles,0}' AS tile_url,
      data #>> '{source,legend}' AS legend_url,
      data #> '{source,bounds}' AS bounds
    FROM mx_views_latest
    WHERE ${where}
  `;
  const { rows } = await pgRead.query(sql, params);
  return rows;
}

/**
 * @param {Object} view
 * @param {Object} [opt]
 * @param {(view: Object) => void} [opt.onStart] called right before the
 *   fetch, used by the streaming "run now" socket handler to report a
 *   per-view "checking" state. Unused by the daily routine.
 * @param {(row: Object) => void} [opt.onDone] called right after the
 *   result is stored.
 */
async function checkView(view, opt = {}) {
  opt.onStart?.(view);

  let row;
  try {
    const result = await checkRasterUrls(view);

    row = {
      id_view: view.id,
      id_project: view.project,
      ...result,
    };
    await saveCheckResult(row);
  } catch (e) {
    console.error(`Tile check failed for view ${view.id}:`, e);
    row = {
      id_view: view.id,
      id_project: view.project,
      valid: false,
      detail: "check_failed",
      tested_url: null,
      tile_valid: false,
      tile_detail: "check_failed",
      tile_tested_url: null,
      legend_configured: Boolean(view.legend_url),
      legend_valid: view.legend_url ? false : null,
      legend_detail: view.legend_url ? "check_failed" : "not_configured",
      legend_tested_url: null,
    };
  }
  opt.onDone?.(row);
  return row;
}

export async function runChecks(views, opt = {}) {
  const results = [];
  for (let i = 0; i < views.length; i += CONCURRENCY) {
    const batch = views.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((view) => checkView(view, opt)),
    );
    results.push(...batchResults);
  }
  return results;
}

/**
 * Check every 'rt' view's tile URL in a project and store the results.
 * @param {String} idProject
 * @param {Object} [opt] see checkView's onStart/onDone
 * @returns {Promise<Array>} check results
 */
export async function checkProjectTiles(idProject, opt = {}) {
  const views = await getCheckableViews(idProject);
  return runChecks(views, opt);
}

/**
 * Check every 'rt' view's tile URL across all projects (used by the daily
 * routine).
 * @param {Object} [opt] see runChecks callbacks
 * @param {(summary: {total: number}) => void} [opt.onPlan] called after the
 *   views have been loaded and before checks start.
 * @returns {Promise<Array>} check results
 */
export async function checkAllTiles(opt = {}) {
  const views = await getCheckableViews();
  opt.onPlan?.({ total: views.length });
  return runChecks(views, opt);
}
