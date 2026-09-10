WITH
  updated_view_data AS (
    SELECT
      jsonb_set(
        coalesce(data, '{}'::jsonb),
        '{source}',
        CASE
          WHEN jsonb_typeof(data -> 'source') = 'object'
            THEN data -> 'source'
          ELSE '{}'::jsonb
        END || jsonb_build_object(
          'type', 'raster',
          'tiles', jsonb_build_array($2::text, $2::text),
          'legend', $3::text,
          'tileSize', $4::integer,
          'useMirror', $5::boolean
        ),
        true
      ) AS data
    FROM mx_views_latest
    WHERE id = $1
      AND project = $6
      AND type = 'rt'
    LIMIT 1
  ),
  updated_view AS (
    SELECT
      nextval('mx_views_pid_seq'::regclass) AS pid,
      id,
      editor,
      target,
      now() AS date_modified,
      updated_view_data.data,
      type,
      project,
      readers,
      editors
    FROM mx_views_latest, updated_view_data
    WHERE mx_views_latest.id = $1
    LIMIT 1
  )
INSERT INTO mx_views (
  pid, id, editor, target, date_modified, data, type, project, readers, editors
)
SELECT pid, id, editor, target, date_modified, data, type, project, readers, editors
FROM updated_view
RETURNING
  id,
  project,
  data #>> '{source,tiles,0}' AS tile_url,
  data #>> '{source,legend}' AS legend_url,
  data #> '{source,bounds}' AS bounds;
