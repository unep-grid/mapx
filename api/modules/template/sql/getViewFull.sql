WITH v as (
  SELECT * 
  FROM mx_views_latest
  WHERE id = '{{idView}}'
)

SELECT 
  v.id,
  v.editor,
  v.target,
  v.date_modified,
  v.data #- '{attribute,table}'::text[] as data,
  v.type,
  v.pid,
  v.project,
  v.readers,
  v.editors,
  v.data #>> '{source,layerInfo,name}' _id_source,
  coalesce( s.data #> '{meta}', v.data #> '{source,meta}','{}'::jsonb ) AS _meta
FROM v LEFT OUTER JOIN mx_sources s
ON v.data #>> '{source,layerInfo,name}' = s.id


  


