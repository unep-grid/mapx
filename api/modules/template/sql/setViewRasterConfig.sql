WITH
  updated_view_data AS (
    SELECT
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              data,
              '{source,tiles}',
              jsonb_build_array($2::text, $2::text),
              true
            ),
            '{source,legend}',
            to_jsonb($3::text),
            true
          ),
          '{source,tileSize}',
          to_jsonb($4::integer),
          true
        ),
        '{source,useMirror}',
        to_jsonb($5::boolean),
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
FROM updated_view;
