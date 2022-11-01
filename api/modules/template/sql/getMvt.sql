WITH
/** world bbox as 4326 **/ 
world as (
  SELECT ST_MakeEnvelope(
    -180,
    -85.051129,
    180,
    85.051129,
    4326
  ) geom
),
/** tile bbox as 3857 for ST_AsMVTGeom **/ 
bbox_tile AS (
  SELECT  ST_TileEnvelope(
    {{zoom}},
    {{x}},
    {{y}}
  ) as geom
),
/** tile bbox + margin as 3857. Margin must be numeric. NOT FOR ST_AsMVTGeom **/ 
bbox_tile_margin AS (
  SELECT  ST_TileEnvelope(
    {{zoom}},
    {{x}},
    {{y}},
    margin => ({{buffer}}::numeric / 4096)
  ) as geom
),
/* tile bbox limited by world */
bbox AS (
  SELECT 
  ST_Intersection(
    w.geom,
    ST_Transform(b.geom, 4326)
  ) geom
  FROM 
  bbox_tile_margin b,
  world w
),
/* select features */ 
features_tile as (
  SELECT
  layer.{{geom}},
  {{attributes_pg}} 
  FROM
  {{layer}} layer,
  bbox bbox
  WHERE
  bbox.geom && layer.{{geom}}
  AND
  ST_Intersects(
    bbox.geom,
    layer.{{geom}}
  )
),
/* clip features */ 
features_clip as (
  SELECT
  CASE WHEN
    tile.{{geom}} @ bbox.geom
    THEN
    tile.{{geom}}
  ELSE
    ST_Multi(
      ST_Intersection(
        tile.{{geom}},
        bbox.geom
      )
    )
END geom,
{{attributes_pg}}
FROM features_tile tile, bbox bbox
 ),
/* Simplify features CAN PRODUCE BAD GEOMETRY: must by done after intersection */ 
features_simple AS (
  SELECT
  CASE WHEN {{zoom}} > 10 THEN geom
  ELSE
    CASE WHEN {{isPointGeom}}
      -- no effect on single point
      THEN ST_RemoveRepeatedPoints(geom)
    ELSE
      ST_simplify(geom,(50/(512*(({{zoom}}+1)^2))))
END
END geom,
{{attributes_pg}}
FROM features_clip 
 ),
/* Convert geom to mvt geom buffer must be integer  */
features_mvt as (
  SELECT
  ST_AsMVTGeom (
    ST_Transform(f.geom, 3857),
    tile.geom,
    extent => 4096,
    buffer => {{buffer}}::integer,
    clip_geom => false
  ) as geom,
  {{attributes_pg}}
  FROM features_simple f, bbox_tile tile
)
/* Build MVT tile */
SELECT ST_AsMVT(
  f.*,
  '{{view}}',
  4096
) AS mvt from features_mvt f;
