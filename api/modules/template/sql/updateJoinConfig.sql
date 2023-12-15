UPDATE mx_sources
SET
  data = jsonb_set(data, '{join}', $1::jsonb, true),
  date_modified = NOW()
WHERE
  id = $2
