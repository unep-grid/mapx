WITH
  view_metadata AS (
    -- Get meta for 'cc' and 'rt'
    SELECT
      data #> '{source,meta}' AS meta
    FROM
      mx_views_latest
    WHERE
    type IN ('cc', 'rt')
    AND id = '{{idView}}'
    UNION ALL
    -- Get meta for 'vt'
    SELECT
      s.data -> 'meta' AS meta
    FROM
      mx_views_latest v
      JOIN mx_sources s ON v.data #>> '{source,layerInfo,name}' = s.id
    WHERE
      v.type = 'vt'
      AND v.id = '{{idView}}'
  )
SELECT
  meta
FROM
  view_metadata;
