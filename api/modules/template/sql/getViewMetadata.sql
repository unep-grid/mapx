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
v_log AS NOT MATERIALIZED (
 SELECT pid, ip_user, id_user, is_guest
  FROM mx_logs
  WHERE data #>> '{"id_view"}' = '{{idView}}'
  AND id_log = 'view_add'
),
v_log_ip_country AS (
  SELECT v.pid,
   v.id_user,
   v.is_guest,
   coalesce(m.country_name,'unknown') country_name,
   m.country_iso_code country
  FROM v_log v
  LEFT JOIN
  mx_ip m ON
  v.ip_user <<= m.network
),
v_stat_add_count_by_country AS (
  SELECT
  country,
  country_name,
  COUNT (*) 
  FROM
  v_log_ip_country 
  GROUP BY
  country,
  country_name
),
v_stat_add_count_by_country_order AS (
  SELECT *
  FROM 
  v_stat_add_count_by_country
  ORDER BY count desc
),
v_stat_add_count_by_country_json AS (
 SELECT json_agg(row_to_json(t)) tbl 
 FROM v_stat_add_count_by_country_order t
),
v_stat_add_count_by_users AS (
  SELECT COUNT(pid)
  FROM v_log
  WHERE NOT is_guest
),
v_stat_add_count_by_guests AS (
  SELECT COUNT(pid)
  FROM v_log
  WHERE is_guest 
),
v_stat_add_count_by_distinct_users AS (
  SELECT COUNT(DISTINCT id_user)
  FROM v_log
  WHERE NOT is_guest
),
v_editor AS (
  SELECT editor, COUNT(pid) FROM mx_views
  WHERE id = '{{idView}}'
  GROUP BY editor
),
v_editor_email AS (
  SELECT 
  u.email AS editor_email, 
  vt.count n_changes, 
  vt.editor = vl.editor current_editor
  FROM 
  v_editor AS vt, 
  v_last_editor vl, 
  mx_users u
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
v_projects_id_json_arrays AS (
  SELECT
    CASE WHEN 
      jsonb_typeof(data->'projects') = 'array'
    THEN data->'projects'
    ELSE jsonb_build_array(data->'projects')
  END AS projects
  FROM v_latest
),
v_projects_id AS (
  SELECT jsonb_array_elements_text(projects) id
  FROM v_projects_id_json_arrays
),
p_views_external AS (
 SELECT id
 FROM mx_projects
 WHERE views_external ? '{{idView}}' 
),
v_projects_id_all as (
  SELECT id
  FROM
  v_projects_id 
  UNION
  select id from 
  p_views_external
),
v_projects_distinct AS (
  SELECT DISTINCT id
  FROM
  v_projects_id_all 
),
v_projects_titles_json AS (
  SELECT json_agg(title) tbl
  FROM mx_projects p, v_projects_distinct vpd 
  WHERE p.id = vpd.id
),
-- v_projects_titles_json as (
  -- select json_agg(row_to_json(v_projects_titles)) as tbl
  -- SELECT json_agg(title) as tbl
  -- FROM v_projects_titles
-- ),
v_meta AS (
  SELECT json_build_object(
    'id', to_json(vl.id),
    'stat_n_add', to_json(vs_add_by_users.count + vs_add_by_guests.count),
    'stat_n_add_by_guests', to_json(vs_add_by_guests.count),
    'stat_n_add_by_users', to_json(vs_add_by_users.count),
    'stat_n_add_by_distinct_users', to_json(vs_add_by_distinct_users.count),
    'stat_n_add_by_country', to_json(vs_add_by_country.tbl),
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
  v_stat_add_count_by_guests vs_add_by_guests,
  v_stat_add_count_by_users vs_add_by_users,
  v_stat_add_count_by_distinct_users vs_add_by_distinct_users,
  v_stat_add_count_by_country_json vs_add_by_country,
  v_project_title vpt,
  v_projects_titles_json vpts,
  v_editor_json ve
)

SELECT * FROM v_meta;


