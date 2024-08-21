WITH
  v_latest AS (
    SELECT
      *
    FROM
      mx_views_latest
    WHERE
      id = $1
    LIMIT
      1
  ),
  v_source_id AS (
    SELECT
      data #>> '{source,layerInfo,name}' as id_source
    FROM
      v_latest
    WHERE
    type = 'vt'
  ),
  v_services AS (
    SELECT
      coalesce(services, '[]') AS services
    FROM
      mx_sources,
      v_source_id
    WHERE
      mx_sources.id = v_source_id.id_source
  ),
  v_last_editor AS (
    SELECT
      editor
    FROM
      v_latest
  ),
  v_date_created AS (
    SELECT
      date_modified
    FROM
      mx_views
    WHERE
      id = $1
    ORDER BY
      date_modified ASC
    LIMIT
      1
  ),
  v_changes_editors AS (
    SELECT
      editor,
      COUNT(pid) n_changes
    FROM
      mx_views
    WHERE
      id = $1
    GROUP BY
      editor
  ),
  v_changes_editors_email AS (
    SELECT
      u.id as id,
      u.email AS email,
      vc.n_changes AS n_changes,
      vc.editor = vl.editor AS is_current
    FROM
      v_changes_editors vc,
      v_last_editor vl,
      mx_users u
    WHERE
      u.id = vc.editor
  ),
  v_changes_editors_table AS (
    SELECT
      coalesce(json_agg(row_to_json(vc)), '[]') AS tbl
    FROM
      v_changes_editors_email vc
  ),
  v_editors_table AS (
    SELECT
      coalesce(
        json_agg(json_build_object('id', u.id, 'email', u.email)),
        '[]'
      ) AS tbl
    FROM
      mx_users u,
      v_latest vl
    WHERE
      vl.editors ? u.id::varchar
  ),
  v_readers_table AS (
    SELECT
      coalesce(
        json_agg(json_build_object('id', u.id, 'email', u.email)),
        '[]'
      ) AS tbl
    FROM
      mx_users u,
      v_latest vl
    WHERE
      vl.readers ? u.id::varchar
  ),
  v_project_info AS (
    SELECT
      p.public as public,
      p.title AS title
    FROM
      mx_projects p,
      v_latest vl
    WHERE
      vl.project = p.id
  ),
  v_projects_id_json_arrays AS (
    SELECT
      CASE
        WHEN jsonb_typeof(data -> 'projects') = 'array' THEN data -> 'projects'
        ELSE jsonb_build_array(data -> 'projects')
      END AS projects
    FROM
      v_latest
  ),
  v_projects_id AS (
    SELECT
      jsonb_array_elements_text(projects) id
    FROM
      v_projects_id_json_arrays
  ),
  p_views_external AS (
    SELECT
      id
    FROM
      mx_projects
    WHERE
      views_external ? $1
  ),
  v_projects_id_all as (
    SELECT
      id
    FROM
      v_projects_id
    UNION
    select
      id
    from
      p_views_external
  ),
  v_projects_distinct AS (
    SELECT DISTINCT
      id
    FROM
      v_projects_id_all
  ),
  v_projects_table AS (
    SELECT
      coalesce(
        json_agg(
          json_build_object('title', p.title, 'id', p.id, 'public', p.public)
        ),
        '[]'
      ) tbl
    FROM
      mx_projects p,
      v_projects_distinct vpd
    WHERE
      p.id = vpd.id
  ),
  v_meta AS (
    SELECT
      json_build_object(
        'id',
        to_json(vl.id),
        'editor',
        to_json(vl.editor),
        'project',
        to_json(vl.project),
        'projects',
        (vl.data #> '{"projects"}')::json,
        'project_title',
        to_json(vpi.title),
        'project_public',
        to_json(vpi.public),
        'projects_data',
        to_json(vpds.tbl),
        'readers',
        to_json(vl.readers),
        'editors',
        to_json(vl.editors),
        'date_modified',
        to_json(vl.date_modified),
        'date_created',
        to_json(vc.date_modified),
        'type',
        to_json(vl.type),
        'title',
        (vl.data #> '{"title"}')::json,
        'abstract',
        (vl.data #> '{"abstract"}')::json,
        'classes',
        (vl.data #> '{"classes"}')::json,
        'collections',
        (vl.data #> '{"collections"}')::json,
        'table_changes_editors',
        vct.tbl,
        'table_editors',
        vet.tbl,
        'table_readers',
        vrt.tbl,
        'services',
        vs.services
      ) AS meta
    FROM
      v_latest vl,
      v_date_created vc,
      v_project_info vpi,
      v_projects_table vpds,
      v_changes_editors_table vct,
      v_editors_table vet,
      v_readers_table vrt,
      v_services vs
  )
SELECT
  *
FROM
  v_meta;
