WITH bboxLatLong AS (
  SELECT TileBBox({{zoom}},{{x}}, {{y}}, 4326) as {{geom}}
),
geomType as (
  SELECT ST_GeometryType({{geom}}) like '%Point' as isPoint 
  FROM {{layer}} 
  LIMIT 1
),
tileExtent as (
  SELECT
  {{attributes_pg}},
  CASE WHEN {{zoom}} > 10 THEN layer.{{geom}}
  ELSE
    CASE WHEN g.isPoint
      -- no effect on single point 
      THEN ST_RemoveRepeatedPoints(layer.{{geom}})
    ELSE 
      ST_simplify(layer.{{geom}},(50/(512*(({{zoom}}+1)^2))))
    END 
    END geom
    FROM
  {{layer}} layer,
  bboxLatLong bbox,
  geomType g
  WHERE
  bbox.{{geom}} && layer.{{geom}}
   AND
  ST_Intersects(
    bbox.{{geom}},
    layer.{{geom}}
  )
),
geojson AS (
  SELECT
  json_build_object(
    'type', 'Feature',
    'geometry', ST_AsGeoJSON(geom)::json,
    'properties', to_jsonb(tileExtent.*) - 'geom'
  ) AS feature
  FROM tileExtent
)
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', json_agg(geojson.feature)
) AS geojson
FROM geojson;
