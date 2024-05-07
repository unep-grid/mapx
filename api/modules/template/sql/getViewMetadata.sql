WITH
v_latest AS (
  SELECT *
  FROM mx_views_latest WHERE id = $1
  LIMIT 1
),
v_last_editor AS (
  SELECT editor
  FROM v_latest
),
v_date_created AS (
  SELECT date_modified
  FROM mx_views WHERE id = $1
  ORDER BY date_modified ASC LIMIT 1
),
v_log AS NOT MATERIALIZED (
 SELECT pid, ip_user, id_user, is_guest, date_modified
  FROM mx_logs
  WHERE data #>> '{"id_view"}' = $1
  AND id_log = 'view_add'
  AND date_modified > (CURRENT_DATE - $2::integer)
),
v_log_ip_country AS (
  SELECT v.pid,
   v.id_user,
   v.is_guest,
   coalesce(m.country_name, 'unknown') country_name,
   m.country_iso_code country
  FROM v_log v
  LEFT JOIN
  mx_ip m ON
  v.ip_user <<= m.network
  WHERE 
  v.date_modified > (CURRENT_DATE - $2::integer)
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
v_stat_add_count_by_country_table AS (
 SELECT coalesce(
  json_agg(row_to_json(t)),
  '[]'
  ) tbl 
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
v_changes_editors AS (
  SELECT editor, COUNT(pid) n_changes FROM mx_views
  WHERE id = $1
  GROUP BY editor
),
v_changes_editors_email AS (
  SELECT 
  u.email AS editor_email, 
  vc.n_changes AS n_changes, 
  vc.editor = vl.editor AS current_editor
  FROM 
  v_changes_editors vc, 
  v_last_editor vl, 
  mx_users u
  WHERE u.id = vc.editor
),
v_changes_editors_table AS (
  SELECT coalesce(json_agg(row_to_json(vc)),'[]') AS tbl
  FROM v_changes_editors_email vc
),
v_editors_table AS (
  SELECT coalesce(json_agg(json_build_object('id', u.id, 'email', u.email)),'[]') AS tbl
  FROM mx_users u, v_latest vl
  WHERE vl.editors ? u.id::varchar
),
--- if readers not public, but unclude a specific user ( not implemetned yet )
v_readers_table AS (
  SELECT coalesce(json_agg(json_build_object('id', u.id, 'email', u.email)),'[]') AS tbl
  FROM mx_users u, v_latest vl
  WHERE vl.readers ? u.id::varchar
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
 WHERE views_external ? $1 
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
v_projects_table AS (
  SELECT coalesce(json_agg(
    json_build_object(
     'title', p.title,
     'id', p.id,
     'public',p.public
    )
  ),'[]') tbl
  FROM mx_projects p, v_projects_distinct vpd 
  WHERE p.id = vpd.id
),

v_meta AS (
  SELECT json_build_object(
    'id', to_json(vl.id),
    'stat_n_add', to_json(vs_add_by_users.count + vs_add_by_guests.count),
    'stat_n_add_by_guests', to_json(vs_add_by_guests.count),
    'stat_n_add_by_users', to_json(vs_add_by_users.count),
    'stat_n_add_by_distinct_users', to_json(vs_add_by_distinct_users.count),
    'stat_n_add_by_country', vs_add_by_country.tbl,
    'editor', to_json(vl.editor),
    'project', to_json(vl.project),
    'projects', (vl.data #> '{"projects"}')::json,
    'project_title', to_json(vpt.title),
    'projects_data', to_json(vpds.tbl),
    'readers', to_json(vl.readers),
    'editors', to_json(vl.editors),
    'date_modified', to_json(vl.date_modified),
    'date_created', to_json(vc.date_modified),
    'type', to_json(vl.type),
    'title', ( vl.data #> '{"title"}')::json,
    'abstract', (vl.data #> '{"abstract"}')::json,
    'classes', (vl.data #> '{"classes"}')::json,
    'collections', (vl.data #> '{"collections"}')::json,
    'table_changes_editors', vct.tbl,
    'table_editors', vet.tbl, 
    'table_readers', vrt.tbl
  ) AS meta
  FROM v_latest vl,
  v_date_created vc,
  v_stat_add_count_by_guests vs_add_by_guests,
  v_stat_add_count_by_users vs_add_by_users,
  v_stat_add_count_by_distinct_users vs_add_by_distinct_users,
  v_stat_add_count_by_country_table vs_add_by_country,
  v_project_title vpt,
  v_projects_table vpds,
  v_changes_editors_table vct,
  v_editors_table vet, 
  v_readers_table vrt
)

SELECT * FROM v_meta;


