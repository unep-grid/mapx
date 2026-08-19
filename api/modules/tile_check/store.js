import { pgWrite } from "#mapx/db";

/**
 * Upsert one view's tile-check result. Not versioned (unlike mx_views):
 * results are recomputed periodically, no history is kept.
 * notified_at is intentionally left out of the SET clause so a later
 * notification pass can own it.
 * @param {Object} row
 * @param {String} row.id_view
 * @param {String} row.id_project
 * @param {Boolean} row.valid
 * @param {Number} [row.http_status]
 * @param {String} [row.content_type]
 * @param {String} [row.detail]
 * @param {String} [row.tested_url]
 */
export async function saveCheckResult(row) {
  const sql = `
    INSERT INTO mx_views_tiles_check (
      id_view, id_project, checked_at, valid, http_status, content_type, detail, tested_url
    ) VALUES ($1, $2, now(), $3, $4, $5, $6, $7)
    ON CONFLICT (id_view) DO UPDATE SET
      id_project = EXCLUDED.id_project,
      checked_at = EXCLUDED.checked_at,
      valid = EXCLUDED.valid,
      http_status = EXCLUDED.http_status,
      content_type = EXCLUDED.content_type,
      detail = EXCLUDED.detail,
      tested_url = EXCLUDED.tested_url
  `;
  await pgWrite.query(sql, [
    row.id_view,
    row.id_project,
    row.valid,
    row.http_status ?? null,
    row.content_type ?? null,
    row.detail ?? null,
    row.tested_url ?? null,
  ]);
}
