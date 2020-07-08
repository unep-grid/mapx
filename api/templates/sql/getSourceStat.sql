WITH
attr_max as (
  SELECT
  CASE 
WHEN {{hasAttr}}
  THEN max({{idAttr}})
ELSE null
END as max
FROM "{{idSource}}"
),
attr_min as (
  SELECT
  CASE
WHEN {{hasAttr}}
  THEN min({{idAttr}})
ELSE null
END as min
FROM "{{idSource}}"
),
attr_distinct as (
  SELECT DISTINCT
  CASE WHEN {{attrIsStr}} THEN
    {{idAttr}}
END
as values
FROM "{{idSource}}"
),
attr_distinct_json as (
  SELECT json_agg(values) as values from attr_distinct
),
layer_sp_extent_gj as (
  SELECT 
  CASE WHEN {{hasGeom}}
    THEN
    ST_AsGeoJSON(
      ST_Extent(
        ST_buffer(
          ST_Envelope(geom)::geography
          , 1 )::geometry
      )
    )
  ELSE null
END
AS extent FROM "{{idSource}}"
),
layer_time_extent as (
  SELECT 
  -- check min t0 or t1
  CASE 
WHEN NOT {{hasT0}} AND NOT {{hasT1}} THEN
  null
WHEN {{hasT0}} AND {{hasT1}} THEN
  MIN({{idAttrT0}})
WHEN {{hasT0}} AND NOT {{hasT1}} THEN
  MIN({{idAttrT0}})
WHEN {{hasT1}} AND NOT {{hasT0}} THEN
  MIN({{idAttrT1}})
END as min,
-- check max t1 or t0
CASE
WHEN NOT {{hasT1}} AND NOT {{hasT0}} THEN
  null
WHEN {{hasT0}} AND {{hasT1}} THEN
  MAX({{idAttrT1}})
WHEN {{hasT0}} AND NOT {{hasT1}} THEN
  MAX({{idAttrT0}})
WHEN {{hasT1}} AND NOT {{hasT0}} THEN
  MAX({{idAttrT1}})
END as max 
FROM "{{idSource}}"
)

SELECT json_build_object(
  'extent_time', json_build_object('min', to_json(lte.min), 'max', to_json(lte.max)),
  'extent_sp', lse.extent::json,
  'attr_min', to_json(amin.min),
  'attr_max', to_json(amax.max),
  'attr_distinct', to_json(adist.values)
) as stat
FROM 
layer_sp_extent_gj as lse, 
layer_time_extent as lte, 
attr_min as amin, 
attr_max as amax, 
attr_distinct_json as adist;

