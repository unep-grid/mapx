WITH
/**
 * Project config by user
 */
p_config AS (
  SELECT
  admins @> '[{{idUser}}]'::jsonb as u_is_admin,
  publishers @> '[{{idUser}}]'::jsonb as u_is_publisher,
  members @> '[{{idUser}}]'::jsonb as u_is_member,
  public as is_public,
  views_external as v_ext
  FROM mx_projects 
  WHERE id = '{{idProject}}'
),
v_all AS (
  SELECT *,
  /**
   * Edit private
   */
  (
    ( v.editor = {{idUser}} ) OR
    ( v.editors @> '[{{idUser}}]'::jsonb ) OR
    ( p.u_is_publisher AND v.editors ?| array['publishers'] ) OR
    ( p.u_is_admin AND v.editors ?| array['publishers','admins'] )
  )
  as _edit,
  /**
   * Source private
   */
  ( 
    v.data #>> '{"source","layerInfo","name"}' 
  )
  as _source,
  /**
   * Title private
   */
  (
    CASE WHEN
      coalesce(data #>> '{"title","{{language}}"}','') = ''
      THEN 
      ( 
        CASE WHEN coalesce(data #>> '{"title","en"}','') = '' 
          THEN id 
        ELSE data #>> '{"title","en"}' 
    END
  )
ELSE
  data #>> '{"title","{{language}}"}' 
    END
  )
  as _title
  /**
   * Data source
   */
  FROM mx_views_latest v, p_config p

  /**
   * Filter by role
   */
  WHERE 
  (
    CASE WHEN
      coalesce({{idViews}},'') = ''
      THEN
      (
        true
      )
    ELSE (
      v.id in {{idViews}}
    )
    END
  )
  AND
  (
    v.project = '{{idProject}}' OR 
    v.data #> '{"projects"}' @> '["{{idProject}}"]'::jsonb OR 
    v.data #> '{"projects"}' = '"{{idProject}}"'::jsonb OR
    v.id IN (SELECT jsonb_array_elements_text(p.v_ext))
  )
  AND
  (
    p.is_public OR 
    p.u_is_member OR
    p.u_is_publisher OR
    p.u_is_admin 
  )
  AND ( 
    ( v.editor = {{idUser}} ) OR
    ( v.editors @> '[{{idUser}}]'::jsonb ) OR
    ( v.readers @> '["{{idUser}}"]' ) OR
    ( v.readers @> '["public"]' ) OR
    ( p.u_is_member AND v.readers ?| array['members'] ) OR
    ( p.u_is_publisher AND v.readers ?| array['members','publishers'] ) OR
    ( p.u_is_admin AND v.readers ?| array['members','publishers','admins'] )
  )
),

/**
 * Metadata
 */
v_meta AS (
  SELECT
  v.id as id,
  coalesce( s.data #> '{"meta"}', '{}' ) AS _meta
  FROM v_all v LEFT OUTER JOIN mx_sources s
  ON v.data #>> '{"source","layerInfo","name"}' = s.id
),

v_list AS (
  /**
   * View list
   */
  SELECT 
  v.id,
  v.editor,
  v.editors,
  v.readers,
  v.type,
  v.pid,
  v.project,
  v.data,
  v._edit,
  v._title,
  v._source,
  m._meta
  FROM v_all v, v_meta m 
  WHERE v.id = m.id
)


SELECT {{selectString}} FROM v_list;



