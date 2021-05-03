WITH
/**
 * Use only public proejct
 */
projects_public as (
  SELECT id, title, description, views_external
  FROM mx_projects
  WHERE
  public = true
),
/**
 * Views public from public project
 */
views_id_public_projects as (
  SELECT v.id id_view
  FROM mx_views_latest v, projects_public pp
  WHERE v.readers @> '["public"]'
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
  FROM mx_views_latest v, views_id_imported_project_public vp
  WHERE v.id = vp.id_view
),
/**
 * View exported to public projects
 */
views_id_exported as (
  SELECT id id_view, jsonb_array_elements_text(data #> '{\"projects\"}') id_project
  FROM mx_views_latest
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
 * Views create date ( lower pid )
 * initialy: released_at, but first public apparition date of a view
 * is unknown : it could be not public in its own project, but publicly available
 * in an external project
 */
views_oldest_public as (
  SELECT v.id,
  min(v.pid) AS pid
  FROM mx_views v, views_id_merge m
  WHERE v.id = m.id_view
  GROUP BY v.id
),
views_created_at as (
  SELECT v.id id_view,
  v.date_modified created_at
  FROM mx_views v, views_oldest_public o
  WHERE v.pid = o.pid
),
/**
 * Meta for non vt -> local meta
 */
views_non_vt_meta as (
  SELECT
  v.id id_view,
  v.project id_project,
  v.data #> '{source,meta}' || '{}' as meta,
  r.created_at
  FROM mx_views_latest v, views_id_merge m, views_created_at r
  WHERE
  m.id_view = v.id AND
  r.id_view = m.id_view AND
  v.type != 'vt'
  -- v.data #> '{"source"}' ? 'meta'
),
/**
 * Meta for vt -> from source
 */
views_vt_meta as (
  SELECT
  v.id id_view,
  v.project id_project,
  s.data #> '{"meta"}' AS meta,
  r.created_at
  FROM mx_sources s, mx_views_latest v, views_id_merge m, views_created_at r
  WHERE
  m.id_view = v.id AND
  r.id_view = m.id_view AND
  v.type = 'vt' AND
  v.data #>> '{source,layerInfo,name}' = s.id
),
/**
 * Merge both
 */
views_meta as (
  SELECT * FROM views_vt_meta UNION
  SELECT * FROM views_non_vt_meta
),
/**
 * Project description
 */
projects_subset as (
  SELECT DISTINCT id_project
  FROM
  views_meta
),
projects_desc as (
  SELECT
  p.id as id_project,
  jsonb_build_object(
    'project_title',
    p.title,
    'project_abstract',
    p.description
  ) as meta_multilingual
  FROM mx_projects p
  WHERE id IN (SELECT id_project from projects_subset)
),
/**
 * Extract / append value from jsonb
 */
views_built as (
  SELECT
  MD5(ROW(v.id,v.date_modified,m.meta)::text) AS hash,
  v.id view_id,
  v.project project_id,
  jsonb_build_object(
    'view_title' , v.data #> '{title}',
    'view_abstract', v.data #> '{abstract}',
    'source_title', m.meta #> '{text,title}',
    'source_abstract', m.meta #> '{text,abstract}',
    'source_notes', m.meta #> '{text,notes}'
  ) || p.meta_multilingual AS meta_multilingual,
  m.meta as meta,
  m.meta #> '{text,keywords,keys}' AS source_keywords,
  m.meta #> '{text,keywords,keys_m49}' AS source_keywords_m49,
  m.meta #>> '{temporal,range,start_at}' AS source_start_at,
  m.meta #>> '{temporal,range,end_at}' AS source_end_at,
  m.meta #>> '{temporal,issuance,released_at}' source_released_at,
  m.meta #>> '{temporal,issuance,modified_at}' source_modified_at,
  m.created_at view_created_at,
  v.date_modified view_modified_at,
  v.type view_type
  FROM mx_views_latest v
  INNER JOIN views_meta m ON v.id = m.id_view
  INNER JOIN projects_desc p ON v.project = p.id_project
),
/**
 * Alter types
 */
views_searchable as (
  SELECT
  hash,
  view_id,
  view_type,
  project_id,
  meta_multilingual,
  coalesce(source_keywords,'[]'::jsonb) as source_keywords,
  coalesce(source_keywords_m49,'[]'::jsonb) as source_keywords_m49,
  extract(epoch from to_timestamp(coalesce(source_start_at, '0001-01-01'),'YYYY-MM-DD')) AS source_start_at,
  extract(epoch from to_timestamp(coalesce(source_end_at, '0001-01-01'),'YYYY-MM-DD')) AS source_end_at,
  extract(epoch from to_timestamp(coalesce(source_released_at, '0001-01-01'),'YYYY-MM-DD')) source_released_at,
  extract(epoch from to_timestamp(coalesce(source_modified_at, '0001-01-01'),'YYYY-MM-DD')) source_modified_at,
  extract(epoch from view_created_at) view_created_at,
  extract(epoch from view_modified_at) view_modified_at
  FROM views_built
)
SELECT * from views_searchable;
