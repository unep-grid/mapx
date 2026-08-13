SELECT
  *
FROM
  mx_views_latest
WHERE data #>> '{source,layerInfo,name}' = $1
   OR data #>> '{source,metadataId}' = $1
