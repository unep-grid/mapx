SELECT
  id,
  services
FROM
  mx_sources_latest
WHERE
  id = $1
