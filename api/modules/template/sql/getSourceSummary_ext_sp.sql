WITH
  id_source AS (
    SELECT
      CASE
        WHEN '{{type}}' = 'vector' THEN '{{idSource}}'
        ELSE (
          SELECT
            data #>> '{join,base,id_source}'
          FROM
            mx_sources
          WHERE
            id = '{{idSource}}'
        )
      END AS source
  ),
  bbox AS (
    SELECT
      ST_EstimatedExtent (
        (
          SELECT
            source
          FROM
            id_source
        ),
        'geom'
      ) as extent
  ),
  layer_sp_ext AS (
    SELECT
      json_build_object(
        'extent_sp',
        json_build_object(
          'lat1',
          ST_Ymin (bbox.extent),
          'lng1',
          ST_Xmin (bbox.extent),
          'lat2',
          ST_Ymax (bbox.extent),
          'lng2',
          ST_Xmax (bbox.extent)
        )
      ) as extent
    FROM
      bbox
  )
SELECT
  extent::json as res
FROM
  layer_sp_ext;
