WITH
/**
* Use only public proejct
*/
projects_public as ( 
  SELECT *,
      CASE WHEN coalesce(title #>> '{"{{language}}"}','') = ''
        THEN 
          CASE WHEN coalesce(title #>> '{"en"}','') = '' 
          THEN id 
          ELSE title #>> '{"en"}' END
        ELSE title #>> '{"{{language}}"}'  
      END as _title_project
  FROM mx_projects
  WHERE
  public = true
  AND
    CASE WHEN {{hasProjectExclude}} 
    THEN id != '{{idProjectExclude}}' 
    ELSE true 
  END
),
/**
* Filter view by type
*/
views_subset as (
  SELECT
  id,
  editor,
  target,
  date_modified,
  data - '{attribute,table}'::text[] as data,
  type,
  pid,
  project,
  readers,
  editors
  FROM mx_views_latest v
  WHERE 
  (
    CASE WHEN {{hasFilterTypes}} THEN v.type IN (
     SELECT (unnest(array[{{sqlTypesFilter}}]::text[]))
    )
    ELSE true END
  )
  AND 
    CASE WHEN {{hasProjectExclude}} 
    THEN project != '{{idProjectExclude}}' 
    ELSE true 
  END
),
/**
* Views public from public project
*/
views_id_public_projects as (
  SELECT v.id id_view
  FROM views_subset v, projects_public pp
  WHERE
  v.readers @> '["public"]'
  AND
  v.project = pp.id
),
/**
* View imported
*/
views_id_imported_project_public as (
  SELECT DISTINCT jsonb_array_elements_text(views_external) id_view
  FROM projects_public
),
views_id_imported  as (
  SELECT v.id id_view
  FROM views_subset v, views_id_imported_project_public vp
  WHERE v.id = vp.id_view
),
/**
* View exported to public projects
*/
views_id_exported as (
  SELECT id id_view, jsonb_array_elements_text(data #> '{\"projects\"}') id_project
  FROM views_subset
  WHERE jsonb_typeof(data #> '{\"projects\"}') = 'array' 
),
views_id_projects_public as (
  SELECT ve.id_view
  FROM views_id_exported ve, projects_public pp
  WHERE ve.id_project = pp.id
),
/**
* Merge
*/
views_id_merge as (
  SELECT DISTINCT id_view 
  FROM views_id_exported 
  UNION SELECT id_view from views_id_imported 
  UNION SELECT id_view from views_id_public_projects
),
/**
* Final set
*/
views_public as (
  SELECT vo.*,
  (
   CASE WHEN coalesce(vo.data #>> '{"title","en"}','') = ''
    THEN
    CASE WHEN coalesce(vo.data #>> '{"title","en"}','') = '' 
      THEN vo.id 
    ELSE vo.data #>> '{"title","en"}' END
    ELSE vo.data #>> '{"title","en"}'  
   END
  ) as _title
  FROM views_subset vo, views_id_merge vm
  WHERE vo.id = vm.id_view
),
/**
* Views with source metadata
*/ 
-- views_source_meta as (
  -- SELECT vp.*,
  -- coalesce(s.data #> '{meta}',vp.data #> '{source,meta}','{}'::jsonb) as _meta
  -- FROM views_public vp
  -- FULL OUTER JOIN  mx_sources s ON vp.data #>> '{source.layerInfo.name}' = s.id
-- ),
/**
* views public with project title
*/
views_public_project_title as (
  SELECT v.*,p._title_project
  FROM views_public v, projects_public p
  WHERE v.project = p.id
)

SELECT {{selectKeys}} from views_public_project_title;
