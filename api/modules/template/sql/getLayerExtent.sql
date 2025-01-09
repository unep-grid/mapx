WITH
  layer_info AS (
    SELECT
      f_table_schema as schema,
      f_table_name as table_name,
      f_geometry_column as geom_column
    FROM
      geometry_columns
    WHERE
      f_table_name =  '{{idSource}}'
  ),
  bbox AS (
    SELECT
      CASE
        WHEN EXISTS (
          SELECT
            1
          FROM
            layer_info
        ) THEN COALESCE(
          ST_EstimatedExtent (schema, table_name, geom_column),
          ST_MakeEnvelope (-180, -90, 180, 90, 4326)
        )
        ELSE ST_MakeEnvelope (-180, -90, 180, 90, 4326)
      END as extent
    FROM
      layer_info
  )
SELECT
  json_build_object(
    'lat_min',
    GREATEST(-90, ST_YMin(bbox.extent)),
    'lng_min',
    GREATEST(-180, ST_XMin(bbox.extent)),
    'lat_max',
    LEAST(90, ST_YMax(bbox.extent)),
    'lng_max',
    LEAST(180, ST_XMax(bbox.extent))
  ) as bbox
FROM
  bbox;
