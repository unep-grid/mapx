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
attr_array as (
  SELECT array_agg("{{idAttr}}") as agg 
  FROM "{{idSource}}" 
),
bins as (
  SELECT
  CASE
  WHEN '{{binsMethod}}' = 'jenks'
    THEN CDB_JenksBins( agg , {{binsNumber}})
  WHEN '{{binsMethod}}' = 'quantile'
    THEN CDB_QuantileBins( agg , {{binsNumber}})
  WHEN '{{binsMethod}}' = 'heads_tails'
    THEN CDB_HeadsTailsBins( agg , {{binsNumber}})
  WHEN '{{binsMethod}}' = 'equal_interval'
    THEN  CDB_EqualIntervalBins( agg , {{binsNumber}})
END as bins
FROM attr_array
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'attribute', '{{idAttr}}',
    'type', 'continuous',
    'min', to_json(attr_min.min),
    'max', to_json(attr_max.max),
    'bins', to_json(bins.bins),
    'binsMethod','{{binsMethod}}',
    'binsNumber','{{binsNumber}}'
  )
) as res
FROM
attr_max, 
attr_min, 
bins
-- attr_percentile_table_json as aperc

