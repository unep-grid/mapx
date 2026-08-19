/*
 * Health-check results for external raster tile/WMS URLs referenced by
 * 'rt' views (data.source.tiles and data.source.legend). Plain upsert table, NOT versioned like
 * mx_views: results are recomputed periodically, no history is kept.
 */
CREATE TABLE IF NOT EXISTS mx_views_tiles_check (
  id_view character varying(20) PRIMARY KEY,
  id_project character varying(22),
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  valid boolean NOT NULL,
  detail text,
  tested_url text,
  tile_valid boolean NOT NULL,
  tile_http_status integer,
  tile_content_type text,
  tile_detail text,
  tile_tested_url text,
  legend_configured boolean NOT NULL,
  legend_valid boolean,
  legend_http_status integer,
  legend_content_type text,
  legend_detail text,
  legend_tested_url text,
  -- Kept as aliases for existing consumers of the original tile-only shape.
  http_status integer,
  content_type text,
  notified_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS mx_views_tiles_check_project_idx
  ON mx_views_tiles_check USING BTREE (id_project);

/*
 * This patch runs as the admin role (pgAdmin), not mapxw, so the table
 * would otherwise be owned by the admin role with no grants for the
 * pgWrite/pgRead pools (mapxw/mapxr) -> "permission denied". Same fix as
 * 01_13_018_themes.sql / 01_08_027_mx_gemet_labels_definitions.sql.
 */
ALTER TABLE mx_views_tiles_check OWNER TO mapxw;
GRANT SELECT ON mx_views_tiles_check TO mapxr;
