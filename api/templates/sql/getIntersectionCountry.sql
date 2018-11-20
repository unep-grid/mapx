WITH layerCountry as (
  SELECT geom as _geom
  FROM {{idLayerCountry}} 
  WHERE iso3code in ( {{idIso3}}) ),
layerQuery as (
  SELECT *
  FROM layerCountry AS lCountry, {{idLayer}} AS lQuery
  WHERE ST_intersects(lQuery.geom, lCountry._geom)
),
layerIntersection as (
SELECT 
{{attributes}},
ST_Intersection(lQuery.geom, lCountry._geom) AS geom
FROM layerCountry AS lCountry, layerQuery AS lQuery
)

SELECT * FROM layerIntersection;

