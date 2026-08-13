WITH
  view_metadata AS (
    -- Get metadata-only catalog entries for 'cc' and 'rt'.
    SELECT
      coalesce(s.data #> '{meta}', '{}'::jsonb) AS meta
    FROM mx_views_latest v
    LEFT JOIN mx_sources_latest s
      ON s.id = v.data #>> '{source,metadataId}' AND s.type = 'external'
    WHERE
    v.type IN ('cc', 'rt')
    AND v.id = '{{idView}}'
    UNION ALL
    -- Get meta for 'vt'
    SELECT
      s.data -> 'meta' AS meta
    FROM
      mx_views_latest v
      JOIN mx_sources_latest s ON v.data #>> '{source,layerInfo,name}' = s.id
    WHERE
      v.type = 'vt'
      AND v.id = '{{idView}}'
  )
SELECT
  meta
FROM
  view_metadata;
