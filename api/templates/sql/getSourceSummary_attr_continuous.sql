WITH
attr_max as (
  SELECT
  max("{{idAttr}}")
FROM "{{idSource}}"
),
attr_min as (
  SELECT
  min("{{idAttr}}")
  FROM "{{idSource}}"
),
attr_buckets as (
  SELECT 
  "{{idAttr}}",
  ntile(100) 
  OVER (
    ORDER by "{{idAttr}}"
  ) 
  FROM  {{idSource}}
),
attr_percentile as (
  SELECT 
  ntile as percentile, 
  max("{{idAttr}}") as value
  FROM attr_buckets
  group by 1 order by 1
),
attr_percentile_json as (
  SELECT 
  json_agg(aperc) as table
  FROM attr_percentile aperc
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'attribute', '{{idAttr}}',
    'type', 'continuous',
    'min', to_json(amin.min),
    'max', to_json(amax.max),
    'table_percentiles', to_json(aperc.table)
  )
) as res
FROM
attr_max as amax, 
attr_min as amin, 
attr_percentile_json as aperc

