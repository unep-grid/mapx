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
          GREATEST(-90, ST_YMin (bbox.extent)),
          'lng1',
          GREATEST(-180, ST_XMin (bbox.extent)),
          'lat2',
          LEAST(90, ST_YMax (bbox.extent)),
          'lng2',
          LEAST(180, ST_XMax (bbox.extent))
        )
      ) as extent
    FROM
      bbox
  )
SELECT
  extent::json as res
FROM
  layer_sp_ext;
