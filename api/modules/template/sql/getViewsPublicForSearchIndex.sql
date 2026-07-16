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
   * Compute the approximate extent once per distinct public vector source.
   * Joining geometry_columns prevents missing source tables from aborting the
   * catalogue refresh. ST_EstimatedExtent returns NULL when statistics are not
   * available, in which case stored metadata is used later as a fallback.
   */
  public_vector_sources AS MATERIALIZED (
    SELECT DISTINCT
      v.data #>> '{source,layerInfo,name}' AS source_id,
      gc.f_table_schema AS table_schema,
      gc.f_geometry_column AS geometry_column
    FROM
      views_public v
      INNER JOIN geometry_columns gc
        ON gc.f_table_name = v.data #>> '{source,layerInfo,name}'
        AND gc.f_table_schema = current_schema()
        AND gc.f_geometry_column = 'geom'
    WHERE
      v.type = 'vt'
  ),
  public_vector_source_extents_raw AS MATERIALIZED (
    SELECT
      source_id,
      ST_EstimatedExtent(
        table_schema,
        source_id,
        geometry_column
      ) AS extent
    FROM
      public_vector_sources
  ),
  public_vector_source_extents AS MATERIALIZED (
    SELECT
      source_id,
      CASE
        WHEN extent IS NULL THEN NULL
        ELSE jsonb_build_object(
          'lat_min', GREATEST(-90, ST_YMin(extent)),
          'lng_min', GREATEST(-180, ST_XMin(extent)),
          'lat_max', LEAST(90, ST_YMax(extent)),
          'lng_max', LEAST(180, ST_XMax(extent))
        )
      END AS estimated_bbox
    FROM
      public_vector_source_extents_raw
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
      json_agg(project_title) as projects_title_multilingual,
      json_agg(project_description) as projects_description_multilingual
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
      mx_sources_latest s,
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
      p.projects_id,
      p.projects_title_multilingual,
      p.projects_description_multilingual,
      m.meta #> '{spatial,bbox}' AS source_bbox,
      e.estimated_bbox AS source_estimated_bbox,
      v.data #> '{geometry,extent}' AS view_extent,
      /**
       * R jsonlite bug : list of one converted to 'string'
       * more info in known_bugs.txt 
       */
      CASE jsonb_typeof(m.meta #> '{text, keywords, keys}')
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
      CASE jsonb_typeof(m.meta #> '{text, keywords, keys_topic}')
        WHEN 'array' THEN m.meta #> '{text, keywords, keys_topic}'
        WHEN 'string' THEN jsonb_build_array(m.meta #> '{text, keywords, keys_topic}')
        ELSE '[]'::jsonb
      END AS source_keywords_topic,
      m.meta #>> '{text,data_attribution}' AS source_data_attribution,
      m.meta #>> '{text,citation}' AS source_citation,
      m.meta #> '{text,language,codes}' AS source_language_codes,
      m.meta #> '{contact,contacts}' AS source_contacts,
      m.meta #> '{license,licenses}' AS source_licenses,
      m.meta #> '{origin,homepage}' AS source_homepage,
      m.meta #> '{origin,source,urls}' AS source_urls,
      m.meta #> '{annex,references}' AS source_annex_urls,
      m.meta #>> '{temporal,issuance,periodicity}' AS source_periodicity,
      m.meta #> '{temporal,range,is_timeless}' AS source_is_timeless,
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
      v.type AS view_type,
      EXISTS (
        SELECT
          1
        FROM
          mx_sources_latest s
          INNER JOIN mx_projects sp ON s.project = sp.id
        WHERE
          v.type = 'vt'
          AND v.data #>> '{source, layerInfo, name}' = s.id
          AND sp.public
          AND (s.services ? 'gs_ws_a' OR s.services ? 'gs_ws_b')
      ) AS is_geoserver_published
    FROM
      views_public v
      INNER JOIN tmp_views_meta m ON v.id = m.id_view
      INNER JOIN tmp_views_created_at c ON v.id = c.id_view
      INNER JOIN tmp_views_public p ON v.id = p.id_view
      LEFT JOIN public_vector_source_extents e
        ON v.data #>> '{source,layerInfo,name}' = e.source_id
  ),
  /**
   * Gemet multilingual
   */
  views_gemet_rows AS (
    SELECT
      view_id,
      jsonb_array_elements_text(source_keywords_gemet::jsonb)::int concept
    FROM
      views_built
  ),
  views_gemet_lang AS (
    SELECT
      vg.view_id,
      vg.concept,
      mg.label,
      mg.language
    FROM
      views_gemet_rows vg
      JOIN mx_gemet mg USING (concept)
  ),
  views_gemet_pivot AS (
    SELECT
      view_id,
      concept,
      jsonb_object_agg(language, label) AS language_labels
    FROM
      views_gemet_lang
    GROUP BY
      view_id,
      concept
  ),
  views_gemet_agg AS (
    SELECT
      view_id,
      jsonb_agg(
        jsonb_build_object('id', concept) || language_labels
      ) AS source_keywords_gemet_multilingual
    FROM
      views_gemet_pivot
    GROUP BY
      view_id
  ),
  views_built_gemet as (
    SELECT
      *
    FROM
      views_built vg
      FULL JOIN views_gemet_agg vb USING (view_id)
  ),
  /**
   * m49/iso multilingual
   */
  views_m49_rows as (
    SELECT
      view_id,
      jsonb_array_elements_text(source_keywords_m49::jsonb) id
    FROM
      views_built
  ),
  views_m49_lang as (
    SELECT
      vg.view_id,
      dict.*
    FROM
      views_m49_rows vg
      JOIN mx_dict_translate dict using (id)
  ),
  views_m49_agg as (
    SELECT
      view_id,
      jsonb_agg(
        jsonb_build_object(
          'id',
          id,
          'en',
          en,
          'fr',
          fr,
          'es',
          es,
          'ru',
          ru,
          'zh',
          zh,
          'ar',
          ar,
          'fa',
          fa,
          'ps',
          ps,
          'bn',
          bn,
          'de',
          de
        )
      ) source_keywords_m49_multilingual
    FROM
      views_m49_lang
    GROUP BY
      view_id
  ),
  views_built_m49 as (
    SELECT
      *
    FROM
      views_built_gemet vg
      FULL JOIN views_m49_agg vb USING (view_id)
  ),
  /**
   * Convert to useable types
   */
  views_built_types AS (
    SELECT
      view_id,
      project_id,
      meta_multilingual,
      projects_id,
      projects_title_multilingual,
      projects_description_multilingual,
      source_bbox,
      source_estimated_bbox,
      view_extent,
      view_type,
      is_geoserver_published,
      source_keywords,
      source_keywords_m49,
      source_keywords_gemet,
      source_keywords_topic,
      source_data_attribution,
      source_citation,
      COALESCE(source_language_codes, '[]'::jsonb) AS source_language_codes,
      COALESCE(source_contacts, '[]'::jsonb) AS source_contacts,
      COALESCE(source_licenses, '[]'::jsonb) AS source_licenses,
      COALESCE(source_homepage, '{}'::jsonb) AS source_homepage,
      COALESCE(source_urls, '[]'::jsonb) AS source_urls,
      COALESCE(source_annex_urls, '[]'::jsonb) AS source_annex_urls,
      source_periodicity,
      source_is_timeless,
      COALESCE(source_keywords_gemet_multilingual, '[]'::jsonb) AS source_keywords_gemet_multilingual,
      COALESCE(source_keywords_m49_multilingual, '[]'::jsonb) AS source_keywords_m49_multilingual,
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
      views_built_m49
  ),
  /**
   * Add range epoch start / end
   */
  views_built_range as (
    SELECT
      *,
      LEAST(
        source_start_at,
        source_released_at,
        source_modified_at,
        source_modified_at,
        view_created_at,
        view_modified_at
      ) AS range_start_at,
      GREATEST(
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
