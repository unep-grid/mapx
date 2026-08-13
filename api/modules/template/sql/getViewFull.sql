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
  CASE WHEN v.type IN ('rt', 'cc') THEN coalesce(
    (
      SELECT s.data #> '{meta}'
      FROM mx_sources_latest s
      WHERE s.id = v.data #>> '{source,metadataId}'
        AND s.type = 'external'
    ),
    '{}'::jsonb
  ) END AS _meta,
  /**
   * alias title
   */
  COALESCE(
    NULLIF(v.data #>> '{"title","{{language}}"}', ''),
    NULLIF(v.data #>> '{"title","en"}', ''),
    v.id
  ) as _title,
  /**
   * alias description
   */
  COALESCE(
    NULLIF(v.data #>> '{"abstract","{{language}}"}', ''),
    v.data #>> '{"abstract","en"}'
  ) as _description,
  /**
   * alias project title
   */
  COALESCE(
    NULLIF(p.title #>> '{"{{language}}"}', ''),
    NULLIF(p.title #>> '{"en"}', ''),
    p.id
  ) _title_project
FROM
  mx_views_latest v
  LEFT JOIN mx_projects p ON p.id = v.project
WHERE
  v.id = $1
