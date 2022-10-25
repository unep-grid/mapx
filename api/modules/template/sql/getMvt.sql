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
 bbox_tile AS (
   SELECT TileBBox({{zoom}},{{x}}, {{y}}, 4326) as geom
 ),
 bbox AS (
    SELECT 
	ST_Intersection(a.geom,b.geom) geom
	FROM 
	bbox_tile b,
	web_mercator a
 ),
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
 features_simple AS (
	 SELECT
 CASE WHEN {{zoom}} > 10 THEN geom
   ELSE
     CASE WHEN false
       -- no effect on single point
       THEN ST_RemoveRepeatedPoints(geom)
     ELSE
       ST_simplify(geom,(50/(512*(({{zoom}}+1)^2))))
   END
   END geom,
   {{attributes_pg}}
   FROM features_clip 
 ),
 features_mvt as (
   SELECT
   ST_AsMVTGeom (
     ST_Transform(geom, 3857),
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
