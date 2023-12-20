WITH
  view_data AS (
    SELECT
      data #> '{attribute,names}' as attributes,
      data #> '{attribute,name}' as attribute,
      data #> '{attribute,type}' as attribute_type,
      data #>> '{source,layerInfo,name}' as layer,
      data #>> '{source,layerInfo,maskName}' as mask
    FROM
      mx_views_latest
    WHERE
      id = $1
      AND
    type = 'vt'
    LIMIT
      1
  ),
  source_data AS (
    SELECT
      id,
      coalesce(services, '[]'::jsonb) @> '"mx_postgis_tiler"'::jsonb AS use_postgis_tiles
    FROM
      mx_sources s,
      view_data v
    WHERE
      s.id = v.layer
  )
SELECT
  vd.attributes,
  vd.attribute,
  vd.attribute_type,
  vd.layer,
  vd.mask,
  sd.use_postgis_tiles
FROM
  view_data vd, source_data sd
