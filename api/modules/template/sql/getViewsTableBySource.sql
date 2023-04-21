/**
 * $1 id source
 */
WITH
views_with_layer as (
  SELECT 'layer' as type, id, project, data #> '{title,en}' as title
  FROM mx_views_latest
  WHERE type = 'vt'
  AND
  data #>> '{source,layerInfo,name}' = $1
),
views_with_dashboard as (
  SELECT 'dashboard' as type, id, project, data #> '{title,en}' as title
  FROM mx_views_latest
  WHERE type = 'vt'
  AND  
  jsonb_array_length(data #> '{dashboard,widgets}') > 0
  AND
  (
    data #>> '{source,layerInfo,name}' = $1
    OR
    data #>> '{dashboard,widgets}' ~ $1
  )
),
views_with_custom_code as (
  SELECT 'custom_code' as type, id, project, data #> '{title,en}' as title
  FROM mx_views_latest
  WHERE
  type = 'cc' AND
  data #>> '{methods}' ~ $1
),
views_with_custom_style as (
  SELECT 'custom_style' as type, id, project, data #> '{title,en}' as title
  FROM mx_views_latest
  WHERE
  type = 'vt'
  AND
  data #>> '{source,layerInfo,name}' = $1
  AND
  (data #>> '{style,custom,json}')::jsonb ->> 'enable' = 'true'
),
views_all  as (
  SELECT * FROM views_with_layer
  UNION
  SELECT * FROM views_with_dashboard
  UNION
  SELECT * FROM views_with_custom_code
  UNION 
  SELECT * FROM views_with_custom_style
),
views_project as (
  SELECT 
  v.type,
  v.id,
  v.project, 
  v.title, 
  p.title #> '{en}' as project_name
  FROM views_all v, mx_projects p
  WHERE 
  v.project = p.id
)
SELECT * from views_project;


