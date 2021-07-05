WITH bbox as (
  SELECT 
    ST_EstimatedExtent('{{idSource}}','geom') as extent
),
layer_sp_ext as (
  SELECT
  json_build_object(
    'extent_sp', json_build_object(
      'lat1', ST_Ymin(bbox.extent),
      'lng1', ST_Xmin(bbox.extent),
      'lat2', ST_Ymax(bbox.extent),
      'lng2', ST_Xmax(bbox.extent)
    )
  ) as extent
  FROM bbox
)

SELECT extent::json as res from layer_sp_ext;
