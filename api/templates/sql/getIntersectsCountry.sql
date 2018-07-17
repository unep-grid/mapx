WITH layerCountry as (
  SELECT geom from {{idLayerCountry}} where iso3code in ({{idIso3}}) ),
layerIntersect as (
  SELECT lQ.gid as _gid, ST_intersects(lQ.geom,lC.geom) AS _int 
  FROM layerCountry AS lC, {{idLayer}} AS lQ
),
layerSubset as (
  SELECT _gid from layerIntersect 
  WHERE _int = true
)
SELECT * 
FROM {{idLayer}}
WHERE gid in ( 
  SELECT _gid FROM layerSubset
);
