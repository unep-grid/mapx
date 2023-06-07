WITH src_enabled AS (
  SELECT
    s.id id_source
  FROM
    mx_sources s,
    mx_projects p
  WHERE
    s.project = p.id
    AND (s.services ? 'gs_ws_a' OR s.services ? 'gs_ws_b')
    AND p.public
),
views_geoserver AS (
  SELECT
    v.id,
    v.data #> '{title,en}' title,
    v.data #> '{abstract,en}' abstract,
    s.id_source,
    v.project id_project,
    v.data #> '{style,_sld}' style_sld,
    v.data #> '{style,_mapbox}' style_mapbox,
    (v.data #>> '{style,custom,json}')::jsonb #>> '{enable}' = 'true' style_custom
  FROM
    mx_views_latest v,
    src_enabled s
  WHERE
    v.type = 'vt'
    AND v.readers @> '["public"]'
    AND v.data #>> '{source,layerInfo,name}' = s.id_source
),
view_geoserver_extent_raw AS (
  SELECT
    *,
    ST_EstimatedExtent(id_source, 'geom') _extent
  FROM
    views_geoserver
),
views_geoserver_extent AS (
  SELECT
    id,
    title,
    abstract,
    id_source,
    id_project,
    style_sld,
    style_mapbox,
    style_custom,
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
FROM
  views_geoserver_extent;
