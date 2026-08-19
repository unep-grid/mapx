import { pgRead } from "#mapx/db";
import { buildTestUrl } from "./substitute.js";
import { checkUrl } from "./fetch_check.js";
import { saveCheckResult } from "./store.js";

const CONCURRENCY = 10;

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
  const bounds = Array.isArray(view.bounds) ? view.bounds : null;
  const testUrl = buildTestUrl(view.tile_url, { bounds });

  opt.onStart?.(view);

  const result = testUrl
    ? await checkUrl(testUrl)
    : { valid: false, detail: "no_tile_template", tested_url: null };

  const row = {
    id_view: view.id,
    id_project: view.project,
    ...result,
  };
  await saveCheckResult(row);
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
 * @returns {Promise<Array>} check results
 */
export async function checkAllTiles() {
  const views = await getCheckableViews();
  return runChecks(views);
}
