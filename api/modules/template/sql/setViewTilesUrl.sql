WITH
  updated_view_data AS (
    SELECT
      jsonb_set(data, '{source,tiles,0}', to_jsonb($2::text), true) AS data
    FROM
      mx_views_latest
    WHERE
      id = $1
      AND project = $3
    LIMIT 1
  ),
  updated_view AS (
    SELECT
      id,
      editor,
      target,
      now() as date_modified,
      updated_view_data.data,
      type,
      nextval('mx_views_pid_seq'::regclass) as pid,
      project,
      readers,
      editors
    FROM
      mx_views_latest,
      updated_view_data
    WHERE
      mx_views_latest.id = $1
    LIMIT 1
  )
INSERT INTO
  mx_views
SELECT
  *
FROM
  updated_view
