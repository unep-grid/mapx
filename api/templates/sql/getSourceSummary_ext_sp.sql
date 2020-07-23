WITH layer_geojson_ext as ( 
  SELECT 
  ST_AsGeoJSON(
    ST_Extent(
      ST_buffer(
        ST_Envelope(geom)::geography
        , 1 )::geometry
    )
  )::json #> '{"coordinates",0}'
  AS extent FROM "{{idSource}}"
),
layer_sp_ext as (
  SELECT 
  json_build_object(
    'extent_sp', json_build_object(
      'lat1', lse.extent #> '{3,1}',
      'lng1', lse.extent #> '{3,0}',
      'lat2', lse.extent #> '{1,1}',
      'lng2', lse.extent #> '{1,0}'
    )
  )::json as extent
  FROM layer_geojson_ext as lse
)

SELECT extent::json as res from layer_sp_ext;

