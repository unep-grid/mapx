SELECT
  data
FROM
  mx_sources_latest
WHERE
  id = $1
  AND
type = 'join'
limit
  1
