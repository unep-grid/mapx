WITH layer_time_extent as (
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
  'extent_time', json_build_object(
    'min', to_json(lte.min), 
    'max', to_json(lte.max)
  ) 
) as res FROM layer_time_extent lte;

