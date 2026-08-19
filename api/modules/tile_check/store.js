import { pgWrite } from "#mapx/db";

/**
 * Upsert one view's tile-check result. Not versioned (unlike mx_views):
 * results are recomputed periodically, no history is kept.
 * notified_at is intentionally left out of the SET clause so a later
 * notification pass can own it.
 * @param {Object} row
 * @param {String} row.id_view
 * @param {String} row.id_project
 * @param {Boolean} row.valid Overall validity.
 */
export async function saveCheckResult(row) {
  const sql = `
    INSERT INTO mx_views_tiles_check (
      id_view, id_project, checked_at, valid, detail, tested_url,
      tile_valid, tile_http_status, tile_content_type, tile_detail, tile_tested_url,
      legend_configured, legend_valid, legend_http_status, legend_content_type,
      legend_detail, legend_tested_url, http_status, content_type
    ) VALUES (
      $1, $2, now(), $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $7, $8
    )
    ON CONFLICT (id_view) DO UPDATE SET
      id_project = EXCLUDED.id_project,
      checked_at = EXCLUDED.checked_at,
      valid = EXCLUDED.valid,
      detail = EXCLUDED.detail,
      tested_url = EXCLUDED.tested_url,
      tile_valid = EXCLUDED.tile_valid,
      tile_http_status = EXCLUDED.tile_http_status,
      tile_content_type = EXCLUDED.tile_content_type,
      tile_detail = EXCLUDED.tile_detail,
      tile_tested_url = EXCLUDED.tile_tested_url,
      legend_configured = EXCLUDED.legend_configured,
      legend_valid = EXCLUDED.legend_valid,
      legend_http_status = EXCLUDED.legend_http_status,
      legend_content_type = EXCLUDED.legend_content_type,
      legend_detail = EXCLUDED.legend_detail,
      legend_tested_url = EXCLUDED.legend_tested_url,
      http_status = EXCLUDED.http_status,
      content_type = EXCLUDED.content_type
  `;
  await pgWrite.query(sql, [
    row.id_view,
    row.id_project,
    row.valid,
    row.detail ?? null,
    row.tested_url ?? null,
    row.tile_valid,
    row.tile_http_status ?? null,
    row.tile_content_type ?? null,
    row.tile_detail ?? null,
    row.tile_tested_url ?? null,
    row.legend_configured,
    row.legend_valid ?? null,
    row.legend_http_status ?? null,
    row.legend_content_type ?? null,
    row.legend_detail ?? null,
    row.legend_tested_url ?? null,
  ]);
}
