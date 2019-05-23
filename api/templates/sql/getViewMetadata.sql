WITH
v_latest AS (
  SELECT *
  FROM mx_views_latest WHERE id = '{{idView}}'
),
v_last_editor AS (
  SELECT editor
  FROM v_latest
),
v_date_created AS (
  SELECT date_modified
  FROM mx_views WHERE id = '{{idView}}'
  ORDER BY date_modified ASC LIMIT 1
),
v_stat_add_count AS (
  SELECT COUNT(pid)
  FROM mx_logs
  WHERE id_log = 'view_add'
  AND data #>> '{"id_view"}' = '{{idView}}'
),
v_stat_add_distinct_user AS (
  SELECT COUNT(DISTINCT id_user)
  FROM mx_logs
  WHERE id_log = 'view_add'
  AND data #>> '{id_view}' = '{{idView}}'
),
v_editor AS (
  SELECT editor, COUNT(pid) FROM mx_views
  WHERE id = '{{idView}}'
  GROUP BY editor
),
v_editor_email AS (
  SELECT u.email AS editor_email, vt.count n_changes, vt.editor = vl.editor current_editor
  FROM v_editor AS vt, v_last_editor vl, mx_users u
  WHERE u.id = vt.editor
),
v_editor_json AS (
  SELECT json_agg(row_to_json(v_editor_email)) AS tbl
  FROM v_editor_email
),
v_project_title AS (
  SELECT p.title AS title
  FROM mx_projects p, v_latest vl
  WHERE vl.project = p.id
),
v_projects_titles_json_arrays AS (
  SELECT
    CASE WHEN jsonb_typeof(data->'projects') = 'array'
    THEN data->'projects'
    ELSE jsonb_build_array(data->'projects')
  END AS projects
  FROM v_latest
),
v_projects_titles_json AS (
  SELECT json_agg(title) tbl
  FROM mx_projects p, (
    SELECT DISTINCT jsonb_array_elements_text(projects) id
    FROM v_projects_titles_json_arrays
  ) vps
  WHERE p.id = vps.id
),
-- v_projects_titles_json as (
  -- select json_agg(row_to_json(v_projects_titles)) as tbl
  -- SELECT json_agg(title) as tbl
  -- FROM v_projects_titles
-- ),
v_meta AS (
  SELECT json_build_object(
    'id', to_json(vl.id),
    'stat_n_add', to_json(vs_add.count),
    'stat_n_distinct_user', to_json(vs_distinct_user.count),
    'editor', to_json(vl.editor),
    'project', to_json(vl.project),
    'projects', (vl.data #> '{"projects"}')::json,
    'project_title', to_json(vpt.title),
    'readers', to_json(vl.readers),
    'editors', to_json(vl.editors),
    'date_modified', to_json(vl.date_modified),
    'date_created', to_json(vc.date_modified),
    'type', to_json(vl.type),
    'title', ( vl.data #> '{"title"}')::json,
    'abstract', (vl.data #> '{"abstract"}')::json,
    'classes', (vl.data #> '{"classes"}')::json,
    'projects_titles', vpts.tbl,
    'collections', (vl.data #> '{"collections"}')::json,
    'table_editors', ve.tbl
  ) AS meta
  FROM v_latest vl,
  v_date_created vc,
  v_stat_add_count vs_add,
  v_stat_add_distinct_user vs_distinct_user,
  v_project_title vpt,
  v_projects_titles_json vpts,
  v_editor_json ve
)

SELECT * FROM v_meta;


