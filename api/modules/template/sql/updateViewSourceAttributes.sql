WITH latest_views AS (
  SELECT
  *
  FROM
  mx_views_latest
  WHERE
  data #>> '{source,layerInfo,name}' = $1
),
updated_name AS (
  SELECT
  pid,
  jsonb_set(
    data,
    '{attribute,name}',
    (
      CASE
          WHEN data #>> '{attribute,name}' = $2::text
            THEN to_jsonb($3::text)
          ELSE data #> '{attribute,name}'
        END
      )
    ) AS data
    FROM
    latest_views
  ),
  updated_names as (
    SELECT 
    pid,
    CASE 
    WHEN data #>> '{attribute,names}' is null
      THEN jsonb_set(data,'{attribute,names}','[]'::jsonb,true)
    ELSE
      jsonb_set(
        data,
        '{attribute,names}',
        (
          CASE 
        WHEN data #> '{attribute,names}' ? $2::text
          THEN (data #> '{attribute,names}' || to_jsonb($3::text)) - $2::text
        ELSE data #> '{attribute,names}'
    END
  )
)
END as data
FROM 
updated_name
),

updated_views AS (
  SELECT
  l.id,
  l.editor,
  l.target,
  now() as date_modified,
  u.data,
  l.type,
  nextval('mx_views_pid_seq'::regclass) as pid,
  l.project,
  l.readers,
  l.editors
  FROM
  latest_views l,
  updated_names u
  WHERE
  l.pid = u.pid
)

INSERT INTO mx_views
SELECT *
FROM updated_views
RETURNING *
