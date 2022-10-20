WITH features_simple as (
  SELECT
  CASE WHEN {{zoom}} > 10 THEN {{geom}}
  ELSE 
    CASE WHEN {{isPointGeom}}
      -- no effect on single point 
      THEN ST_RemoveRepeatedPoints({{geom}})
    ELSE 
      ST_simplify({{geom}},(50/(512*(({{zoom}}+1)^2))))
  END
  END geom,
  {{attributes_pg}}
  FROM
  {{layer}}
  WHERE
  ST_Intersects(
    {{geom}},
    ST_Transform(
      ST_TileEnvelope({{zoom}}, {{x}}, {{y}}),
      4326
    )
  )
),
features_mvt as (
  SELECT
  ST_AsMVTGeom (
    ST_Transform({{geom}}, 3857),
    ST_TileEnvelope({{zoom}}, {{x}}, {{y}})
  ) as geom,
  {{attributes_pg}}
  FROM features_simple
)

SELECT ST_AsMVT(
  f.*,
  '{{view}}',
  4096
) AS mvt from features_mvt f;


