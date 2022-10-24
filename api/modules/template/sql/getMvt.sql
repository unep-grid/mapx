WITH 
web_mercator as (
  SELECT ST_MakeEnvelope(
    -180,
    -85.051129,
    180,
    85.051129,
    4326
  ) geom 
),
features_simple as (
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
    {{geom}}
    @
    ST_Transform(
      ST_TileEnvelope({{zoom}}, {{x}}, {{y}}),
      4326
     )
),
features_clip as (
  SELECT 
  CASE WHEN 
    f.{{geom}} @ m.geom
  THEN
    f.geom
  ELSE 
    ST_Multi(
      ST_Intersection(
        f.{{geom}},
        m.geom
    )
  )
  END geom,
  {{attributes_pg}} 
  FROM {{layer}} f, web_mercator m
),
features_mvt as (
  SELECT
  ST_AsMVTGeom (
    ST_Transform({{geom}}, 3857),
    ST_TileEnvelope({{zoom}}, {{x}}, {{y}})
  ) as geom,
  {{attributes_pg}}
  FROM features_clip
)

SELECT ST_AsMVT(
  f.*,
  '{{view}}',
  4096
) AS mvt from features_mvt f;


