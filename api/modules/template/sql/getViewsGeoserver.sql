WITH src_enabled as (
  SELECT
    id id_source
  FROM
    mx_sources
  WHERE
    services ? 'gs_ws_b'
),
views_geoserver as (
  SELECT
    v.id,
    v.data #> '{title,en}' title,
    v.data #> '{abstract,en}' abstract,
    s.id_source,
    v.project id_project,
    v.data #> '{style,_sld}' style_sld
  FROM
    mx_views_latest v,
    src_enabled s
  WHERE
    v.type = 'vt' 
    AND v.readers @> '["public"]'
    AND v.data #>> '{source,layerInfo,name}' = s.id_source
),
view_geoserver_extent_raw as (
  SELECT
    *,
    ST_EstimatedExtent(id_source, 'geom') _extent
  FROM
    views_geoserver
),
views_geoserver_extent as (
  SELECT
    id,
    title,
    abstract,
    id_source,
    id_project,
    style_sld,
    json_build_object(
      'miny',
      ST_Ymin(_extent),
      'minx',
      ST_Xmin(_extent),
      'maxy',
      ST_Ymax(_extent),
      'maxx',
      ST_Xmax(_extent),
      'crs',
      json_build_object('@class', 'projected', '$', 'EPSG:4326')
    ) bbox_source
  FROM
    view_geoserver_extent_raw
)
SELECT
  *
from
  views_geoserver_extent;
