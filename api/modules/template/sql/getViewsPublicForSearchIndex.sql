WITH
/**
 * Filter public projects
 */
projects_public AS (
  SELECT
    id as id_project,
    title,
    description,
    views_external
  FROM
    mx_projects p
  WHERE
    public = TRUE
),
/**
 * Filter public views
 */
views_public AS (
  SELECT
    *
  FROM
    mx_views_latest vl
  WHERE
    vl.readers @> '["public"]'
),
/**
 * Any view imported
 * ⚠️  Some views id could have been removed from the db, but
 * still exists in views_external.
 */
tmp_views_any_imported_in_public_projects as (
  SELECT
    id_project,
    jsonb_array_elements_text(views_external) as id_view
  FROM
    projects_public
),
/**
 * Views only imported in public project
 */
tmp_views_public_imported_in_public_projects as (
  SELECT
    id_any.id_view,
    id_any.id_project
  FROM
    tmp_views_any_imported_in_public_projects id_any,
    views_public vp
  WHERE
    id_any.id_view = vp.id
),
/**
 * Views exported in any project
 */
tmp_views_exported_in_any_projects AS (
  SELECT
    id id_view,
    jsonb_array_elements_text(data #> '{projects}') AS id_project
  FROM
    views_public
  WHERE
    jsonb_typeof(data #> '{projects}') = 'array'
  UNION
  SELECT
    id id_view,
    data #>> '{projects}' AS id_project
  FROM
    views_public
  WHERE
    jsonb_typeof(data #> '{projects}') = 'string'
),
/**
 * Views only exported in public project
 */
tmp_views_public_exported_in_public_projects AS (
  SELECT
    id_any.id_view,
    id_any.id_project
  FROM
    tmp_views_exported_in_any_projects id_any,
    projects_public pp
  WHERE
    pp.id_project = id_any.id_project
),
/**
 * Views public in public project
 */
tmp_views_public_from_public_projects AS (
  SELECT
    vp.id id_view,
    vp.project id_project
  FROM
    views_public vp,
    projects_public pp
  WHERE
    vp.project = pp.id_project
),
/**
 * Distinct views list
 */
tmp_views_public_loooong AS (
  SELECT
    vp.id_view,
    vp.id_project,
    vp.origin,
    mp.title as project_title,
    mp.description as project_description
  FROM
    (
      SELECT
        *,
        'project' as origin
      FROM
        tmp_views_public_from_public_projects
      UNION
      SELECT
        *,
        'imported' as origin
      FROM
        tmp_views_public_imported_in_public_projects
      UNION
      SELECT
        *,
        'exported' as origin
      FROM
        tmp_views_public_exported_in_public_projects
    ) vp,
    mx_projects mp
  WHERE
    vp.id_project = mp.id
),
tmp_views_public AS (
  SELECT
    id_view,
    json_agg(id_project) as projects_id,
    json_agg(
      jsonb_build_object(
        'id_project',
        id_project,
        'origin',
        origin,
        'title',
        project_title,
        'description',
        project_description
      )
    ) as projects_data
  FROM
    tmp_views_public_loooong
  GROUP BY
    id_view
),
/**
 * Views creation date (lowest pid)
 */
tmp_views_oldest_pid AS (
  SELECT
    v.id id_view,
    min(v.pid) AS pid
  FROM
    mx_views v,
    tmp_views_public p
  WHERE
    v.id = p.id_view -- Uncomment line to have "release_date"
    -- AND v.readers @> '["public"]'
  GROUP BY
    v.id
),
tmp_views_created_at AS (
  SELECT
    v.id AS id_view,
    v.date_modified AS created_at
  FROM
    mx_views v,
    tmp_views_oldest_pid o
  WHERE
    v.pid = o.pid
),
/**
 * Meta for non vt -> local meta
 */
tmp_views_meta_non_vt AS (
  SELECT
    v.id AS id_view,
    coalesce(v.data #> '{source, meta}', '{}'::jsonb) AS meta
  FROM
    views_public v
  WHERE
    v.type != 'vt'
),
/**
 * Meta for vt -> from source
 */
tmp_views_meta_vt AS (
  SELECT
    v.id AS id_view,
    coalesce(s.data #> '{meta}', '{}'::jsonb) AS meta
  FROM
    mx_sources s,
    views_public v
  WHERE
    v.type = 'vt'
    AND v.data #>> '{source, layerInfo, name}' = s.id
),
/**
 * Merge both
 */
tmp_views_meta AS (
  SELECT
    *
  FROM
    tmp_views_meta_non_vt
  UNION ALL
  SELECT
    *
  FROM
    tmp_views_meta_vt
),
/**
 * Improve 90 x performance, I don't know why
 */
views_built_peformance_issue_if_not_there AS (
  SELECT
    *
  FROM
    views_public v
    INNER JOIN tmp_views_meta m ON v.id = m.id_view
    INNER JOIN tmp_views_created_at c ON v.id = c.id_view
    INNER JOIN tmp_views_public p ON v.id = p.id_view
),
/**
 * Extract / append value from jsonb
 */
views_built AS (
  SELECT
    v.id AS view_id,
    v.project AS project_id,
    (
      jsonb_build_object(
        'view_title',
        v.data #> '{title}',
        'view_abstract',
        v.data #> '{abstract}',
        'source_title',
        m.meta #> '{text, title}',
        'source_abstract',
        m.meta #> '{text, abstract}',
        'source_notes',
        m.meta #> '{text, notes}'
      )
    ) AS meta_multilingual,
    p.projects_data,
    p.projects_id,
    /**
    * R jsonlite bug : list of one converted to 'string'
    */ 
    CASE jsonb_typeof(m.meta -> '{text, keywords, keys}')
      WHEN 'array' THEN m.meta #> '{text, keywords, keys}'
      WHEN 'string' THEN jsonb_build_array(m.meta #> '{text, keywords, keys}')
      ELSE '[]'::jsonb
    END AS source_keywords,
    CASE jsonb_typeof(m.meta #> '{text, keywords, keys_m49}')
      WHEN 'array' THEN m.meta #> '{text, keywords, keys_m49}'
      WHEN 'string' THEN jsonb_build_array(m.meta #> '{text, keywords, keys_m49}')
      ELSE '[]'::jsonb
    END AS source_keywords_m49,
    CASE jsonb_typeof(m.meta #> '{text, keywords, keys_gemet}')
      WHEN 'array' THEN m.meta #> '{text, keywords, keys_gemet}'
      WHEN 'string' THEN jsonb_build_array(m.meta #> '{text, keywords, keys_gemet}')
      ELSE '[]'::jsonb
    END AS source_keywords_gemet,
    NULLIF(
      m.meta #>> '{temporal, range, start_at}',
      '0001-01-01'
    ) AS source_start_at,
    NULLIF(
      m.meta #>> '{temporal, range, end_at}',
      '0001-01-01'
    ) AS source_end_at,
    NULLIF(
      m.meta #>> '{temporal, issuance, released_at}',
      '0001-01-01'
    ) AS source_released_at,
    NULLIF(
      m.meta #>> '{temporal, issuance, modified_at}',
      '0001-01-01'
    ) AS source_modified_at,
    c.created_at AS view_created_at,
    v.date_modified AS view_modified_at,
    v.type AS view_type
  FROM
    views_public v
    INNER JOIN tmp_views_meta m ON v.id = m.id_view
    INNER JOIN tmp_views_created_at c ON v.id = c.id_view
    INNER JOIN tmp_views_public p ON v.id = p.id_view
),
/**
* Gemet multilingual
*/
views_gemet_rows as (
  SELECT view_id, jsonb_array_elements_text(source_keywords_gemet::jsonb)::int concept
  FROM views_built
),
views_gemet_lang as (
  SELECT vg.view_id, vg.concept, mg.label, mg.language  
  FROM views_gemet_rows vg
  JOIN  mx_gemet mg USING (concept)
),
views_gemet_agg as (
  SELECT 
  view_id,
  jsonb_agg(
    jsonb_build_object(
      'concept',concept,
      'language',language,
      'label',label
    )
  ) source_keywords_gemet_multilingual
  FROM views_gemet_lang 
  GROUP BY view_id
),
views_built_gemet as (
  SELECT *
  -- FROM views_gemet_agg vg JOIN views_built_types vb
  FROM views_built vg FULL JOIN views_gemet_agg vb
  USING (view_id)
),
/**
 * Convert to useable types
 */
views_built_types AS (
  SELECT
    view_id,
    project_id,
    meta_multilingual,
    projects_data,
    projects_id,
    view_type,
    source_keywords,
    source_keywords_m49,
    source_keywords_gemet,
    COALESCE(source_keywords_gemet_multilingual, '[]'::jsonb) AS source_keywords_gemet_multilingual,
    EXTRACT(
      EPOCH
      FROM
        to_timestamp(source_start_at, 'YYYY-MM-DD')
    )::bigint AS source_start_at,
    EXTRACT(
      EPOCH
      FROM
        to_timestamp(source_end_at, 'YYYY-MM-DD')
    )::bigint AS source_end_at,
    EXTRACT(
      EPOCH
      FROM
        to_timestamp(source_released_at, 'YYYY-MM-DD')
    )::bigint AS source_released_at,
    EXTRACT(
      EPOCH
      FROM
        to_timestamp(source_modified_at, 'YYYY-MM-DD')
    )::bigint AS source_modified_at,
    EXTRACT(
      EPOCH
      FROM
        view_created_at
    )::bigint AS view_created_at,
    EXTRACT(
      EPOCH
      FROM
        view_modified_at
    )::bigint AS view_modified_at
  FROM
    views_built_gemet
),

/**
 * Add range epoch start / end
 */
views_built_range as (
  SELECT
    *,
    LEAST (
      source_start_at,
      source_released_at,
      source_modified_at,
      source_modified_at,
      view_created_at,
      view_modified_at
    ) AS range_start_at,
    GREATEST (
      source_end_at,
      source_released_at,
      source_modified_at,
      source_modified_at,
      view_created_at,
      view_modified_at
    ) AS range_end_at
  FROM
    views_built_types
),
/**
 * Add range years start / end
 */
views_built_range_years as (
  SELECT
    *,
    EXTRACT(
      YEAR
      FROM
        to_timestamp(range_start_at)
    )::integer AS range_start_at_year,
    EXTRACT(
      YEAR
      FROM
        to_timestamp(range_end_at)
    )::integer AS range_end_at_year
  FROM
    views_built_range
),
/**
 * Add range years range serie as array
 */
views_built_range_years_serie as (
  SELECT
    *,
    (
      SELECT
        json_agg(years)
      FROM
        generate_series(range_start_at_year, range_end_at_year) years
    ) AS range_years
  FROM
    views_built_range_years
)
/**
 * Build active_year
 */
SELECT
  *
FROM
  views_built_range_years_serie;
