SELECT
  coalesce(data #> '{source,meta}', '{}'::jsonb) AS meta
FROM
  mx_views_latest
WHERE
  id = $1
