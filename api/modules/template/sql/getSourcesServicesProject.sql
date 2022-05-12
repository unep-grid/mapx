SELECT
  id,
  services
FROM
  mx_sources
WHERE
  type = 'vt'
  AND project = '{{project}}'
