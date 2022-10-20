WITH bbox AS (
  SELECT TileBBox({{zoom}},{{x}}, {{y}}, 4326) as {{geom}}
),
mask as(
  SELECT ST_Buffer(ST_Collect(k.{{geom}}),0) geom
  FROM {{mask}} k, bbox b
  WHERE
  k.{{geom}} && b.{{geom}}
),
main as(
  SELECT m.{{geom}}, {{attributes_pg}}
  FROM  {{layer}} m, mask k, bbox b
  WHERE
  m.{{geom}} && b.{{geom}} AND 
  m.{{geom}} && k.{{geom}}
),
overlap as (
  SELECT {{attributes_pg}},
  CASE WHEN {{isPointGeom}} 
    THEN
    CASE 
      WHEN ST_CoveredBy(
        m.{{geom}},
        k.{{geom}}
      ) 
      THEN m.{{geom}} 
    ELSE
      ST_Multi(
        ST_Intersection(
          k.{{geom}},
          ST_MakeValid(m.{{geom}})
        )
      )
END
ELSE
  m.{{geom}} END as {{geom}}
  FROM main m, mask k
  WHERE ST_Intersects(m.geom,k.geom)
),
simple as (
  SELECT {{attributes_pg}},
  CASE 
WHEN {{isPointGeom}}
  -- no effect on single point 
  THEN ST_RemoveRepeatedPoints(overlap.{{geom}})
ELSE 
  ST_simplify(overlap.{{geom}},(50/(512*(({{zoom}}+1)^2))))
END geom
FROM overlap
)


SELECT {{attributes_pg}}, 
ST_AsGeoJSON({{geom}}) geom 
FROM simple

