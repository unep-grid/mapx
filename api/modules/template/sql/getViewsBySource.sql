SELECT
  *
FROM
  mx_views_latest
WHERE
 type = 'vt'
AND data #>> '{source,layerInfo,name}' = $1

