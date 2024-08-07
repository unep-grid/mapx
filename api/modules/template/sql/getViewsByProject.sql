WITH
role_filter as (
  SELECT
  CASE 
WHEN '{{roleMax}}' = 'admin' THEN 4
WHEN '{{roleMax}}' = 'publisher' THEN 3 
WHEN '{{roleMax}}' = 'member' THEN 2
WHEN '{{roleMax}}' = 'public' THEN 1
ELSE 5
END as max
),
/**
 * Project config by user
 */
p_base AS (
  SELECT
  admins @> '[{{idUser}}]'::jsonb as u_is_admin,
  publishers @> '[{{idUser}}]'::jsonb as u_is_publisher,
  members @> '[{{idUser}}]'::jsonb as u_is_member,
  public as is_public,
  COALESCE(
    NULLIF(title #>> '{"{{language}}"}',''),
    NULLIF(title #>> '{"en"}',''),
    id
  ) title,
  views_external as v_ext
FROM mx_projects 
WHERE id = '{{idProject}}'
),
p_config AS (
  /*
   * Role inheritance
   */
  SELECT
  ( u_is_admin ) AND r.max >=  4 as u_is_admin,
  ( u_is_admin OR u_is_publisher ) AND r.max >= 3  as u_is_publisher,
  ( u_is_admin OR u_is_publisher OR u_is_member ) AND r.max >= 2 as u_is_member,
  ( is_public ) AND r.max >= 1 as is_public,
  v_ext
  FROM p_base, role_filter r
),
v_all AS (
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
  /**
   * alias edit
   */
  (
    v.editors @> '["{{idUser}}"]'::jsonb OR
    p.u_is_publisher AND (
      ( v.editor = {{idUser}} ) OR
      ( v.editors ?| array['publishers'] ) OR
      ( p.u_is_admin AND v.editors ?| array['admins'] )
    )
  )
  as _edit,
  /**
   * alias source
   */
  ( 
    v.data #>> '{"source","layerInfo","name"}' 
  )
  as _source,
  /**
   * alias title
   */
   COALESCE(
   NULLIF(data #>> '{"title","{{language}}"}',''), 
   NULLIF(data #>> '{"title","en"}',''), 
   id
  ) as _title,

  /**
   * alias description
   */
 COALESCE(
   NULLIF(data #>> '{"abstract","{{language}}"}',''), 
   data #>> '{"abstract","en"}'
  ) as _description
/**
 * Data source
 */
FROM mx_views_latest v, p_config p
WHERE
/**
 * Filter by selected type
 */
(
  CASE WHEN {{hasFilterTypes}} THEN v.type IN (
    SELECT (unnest(array[{{sqlTypesFilter}}]::text[]))
  )
ELSE true END
)
AND
(
  /**
   * Filter by selected views
   */
  (

    CASE WHEN {{hasFilterViews}} THEN v.id IN (
      SELECT (unnest(array[{{sqlViewsFilter}}]::text[]))
    )
  ELSE true END
  )
  AND
  /**
   * Filter by selected collections
   */
  (
    CASE WHEN {{hasFilterCollections}} THEN 
      v.data #> '{"collections"}' {{sqlCollectionsSelectOperator}} array[{{sqlCollectionsFilter}}]::text[]
    ELSE true END
    )
  )
  AND
  /**
   * Filter by role
   */
  (
    p.is_public OR 
    p.u_is_member OR
    p.u_is_publisher OR
    p.u_is_admin 
  )

  AND
  /**
   * Filter by selected project
   */
  (
    v.project = '{{idProject}}' OR 
    v.data #> '{"projects"}' @> '["{{idProject}}"]'::jsonb OR 
    v.data #> '{"projects"}' = '"{{idProject}}"'::jsonb OR
    v.id IN (SELECT jsonb_array_elements_text(p.v_ext))
  )
  AND
  /**
   * Filter by role in project
   */
  ( 
    ( v.editor = {{idUser}} ) OR
    ( v.editors @> '["{{idUser}}"]'::jsonb ) OR
    ( p.u_is_publisher AND v.editors ?| array['publishers'] ) OR
    ( p.u_is_admin AND v.editors ?| array['admins'] ) OR
    ( v.readers @> '["{{idUser}}"]' ) OR
    ( v.readers @> '["public"]' ) OR
    ( p.u_is_member AND v.readers ?| array['members'] ) OR
    ( p.u_is_publisher AND v.readers ?| array['publishers'] ) OR
    ( p.u_is_admin AND v.readers ?| array['admins'] )
  )
),

/**
* View list 
* -> single project, repeated on all row
*/ 
v_list AS (
  SELECT 
  v.*,
  p.title _title_project
  FROM v_all v, p_base p 
)

SELECT {{selectKeys}} FROM v_list;
