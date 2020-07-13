WITH layer_sp_ext as ( 
  SELECT 
  ST_AsGeoJSON(
    ST_Extent(
      ST_buffer(
        ST_Envelope(geom)::geography
        , 1 )::geometry
    )
  )
  AS extent FROM "{{idSource}}"
)

SELECT json_build_object(
  'extent_sp', lse.extent::json
) as res
FROM layer_sp_ext as lse;

