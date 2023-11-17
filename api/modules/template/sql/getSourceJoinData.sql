SELECT
  data #> '{join}' config
FROM
  mx_sources
WHERE
  id = $1
  AND
type = 'join'
limit
  1
