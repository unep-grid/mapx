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
serie as (
  SELECT array_agg(gs) as v FROM  generate_series(0, 1, 0.01) as gs
),
attr_percentile as (
  SELECT
  percentile_cont((select v from serie)) 
  WITHIN GROUP (ORDER BY "{{idAttr}}") as p
  FROM {{idSource}}
),
attr_percentile_table as (
  SELECT 
  unnest(serie.v)*100 as percentile, 
  unnest(ptable.p) as value
  FROM attr_percentile ptable, serie
),
attr_percentile_table_json as (
  SELECT json_agg(ptable) as table
  FROM attr_percentile_table ptable
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
attr_percentile_table_json as aperc

