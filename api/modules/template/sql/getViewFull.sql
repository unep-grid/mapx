SELECT
  v.id,
  v.editor,
  v.target,
  v.date_modified,
  v.data #- '{attribute,table}'::text[] as data,
  v.type,
  v.pid,
  v.project,
  v.readers,
  v.editors
FROM
  mx_views_latest v
WHERE
  id = $1
