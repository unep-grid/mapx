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
  /* $1 idProject */
  project = $1
  AND (
    /* $2 idUser */ 
    editor = $2
    OR editors ? $2::varchar
    /* $3 user groups as stringified array e.g. '["admins","publishers"]' */
    OR editors ?| ARRAY(SELECT jsonb_array_elements_text($3::jsonb)) 
  )
ORDER BY title ASC 
