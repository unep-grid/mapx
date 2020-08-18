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
  SELECT array_agg("{{idAttr}}"::numeric) as agg 
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
),
classes as (
  SELECT unnest(
    array_remove(
      array_prepend(amin.min::numeric,b.bins),
      amax.max::numeric
    )
  ) as "from" ,
  unnest(b.bins) as "to"
  FROM bins b, attr_min amin, attr_max amax
), 
freqtable as (
  SELECT 
  "from", 
  "to", 
  ( "to" - "from" )  as diff, 
  (
    SELECT count(*) 
    FROM "{{idSource}}" a 
    WHERE a.{{idAttr}} >= b.from 
    AND a.{{idAttr}} <= b.to + 1e-10 
  ) as count
  FROM classes b
),
freqtable_json as (
  SELECT json_agg(
    json_build_object(
      'from', ft.from, 
      'to', ft.to,
      'diff', ft.diff, 
      'count',ft.count
    ) 
  ) as freq_array
  FROM freqtable ft
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'attribute', '{{idAttr}}',
    'type', 'continuous',
    'min', to_json(attr_min.min),
    'max', to_json(attr_max.max),
    'bins', to_json(bins.bins),
    'binsMethod','{{binsMethod}}',
    'binsNumber',{{binsNumber}},
    'table', to_json(ft.freq_array)
  )
) as res
FROM
attr_max, 
attr_min, 
bins,
freqtable_json ft
-- attr_percentile_table_json as aperc

