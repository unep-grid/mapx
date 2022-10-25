SELECT
  id,
  services
FROM
  mx_sources
WHERE
  type = 'vector'
  AND id = '{{idSource}}'
