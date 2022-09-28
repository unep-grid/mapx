SELECT
  pid,
  id,
  project,
  date_modified,
  coalesce(
    data #>> '{meta,text,title,{{language}}}',
    data #>> '{meta,text,title,en}',
    ''
  ) as title,
  coalesce(
    data #>> '{meta,text,abstract,{{language}}}',
    data #>> '{meta,text,abstract,en}',
    ''
  ) as abstract,
  editor,
  readers,
  editors,
  services
FROM
  mx_sources
WHERE
  project = $1
  AND (
    editor = $2
    OR editors <@ $3::jsonb
  )
