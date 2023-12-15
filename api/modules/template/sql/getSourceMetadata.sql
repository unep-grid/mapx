SELECT
  s.type AS type,
  s.data -> 'meta' AS metadata,
  s.data -> 'join' AS join_config,
  s.date_modified AS date_modified,
  u.email AS email_editor,
  s.services AS services
FROM
  mx_sources s
  JOIN mx_users u ON s.editor = u.id
WHERE
  s.id = $1;
