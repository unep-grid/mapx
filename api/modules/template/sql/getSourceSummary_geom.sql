WITH
  gtype as (
    SELECT
      gid,
      CASE
        WHEN lower(ST_GeometryType (geom)) like '%point' THEN 'point'
        WHEN lower(ST_GeometryType (geom)) like '%polygon' THEN 'polygon'
        WHEN lower(ST_GeometryType (geom)) like '%linestring' THEN 'line'
      END geom_type
    FROM
      "{{idSource}}"
    WHERE ST_GeometryType (geom) is not NULL
  ),
  gtable as (
    SELECT
      count(gid) geom_count,
      geom_type
    FROM
      gtype
    GROUP BY
      geom_type
  ),
  gtable_json as (
    SELECT
      json_agg (
        json_build_object ('type', gt.geom_type, 'count', gt.geom_count)
      ) AS table
    FROM
      gtable gt
  )
SELECT
  json_build_object ('geom_type_table', gt.table) res
FROM
  gtable_json as gt;
