WITH 
  updated_mapbox AS (
    SELECT
      jsonb_set(data, '{style,_mapbox}', to_jsonb($2::text), true) AS data
    FROM
      mx_views_latest
    WHERE
      id = $1
    LIMIT 1
  ),
  updated_sld AS (
    SELECT
      jsonb_set(data, '{style,_sld}', to_jsonb($3::text), true) AS data
    FROM
      updated_mapbox
  ),
  updated_view AS (
    SELECT
      id,
      editor,
      target,
      now() as date_modified,
      updated_sld.data,
      type,
      nextval('mx_views_pid_seq'::regclass) as pid,
      project,
      readers,
      editors
    FROM
      mx_views_latest,
      updated_sld
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
