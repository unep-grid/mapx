WITH
attr_max as (
  SELECT
  max("{{idAttr}}")::numeric
  FROM "{{idSource}}"
),
attr_min as (
  SELECT
  min("{{idAttr}}")::numeric
  FROM "{{idSource}}"
),
attr_array as (
  SELECT array_agg("{{idAttr}}"::numeric) as agg 
  FROM "{{idSource}}" 
),
bins as (
  -- return and array. e.g. {81742.142857142857,163484.285714285714,245226.428571428571,326968.571428571428,408710.714285714285,490452.857142857142,572194.999999999999}
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
attr_bin_max as (
  -- workaround to find largest value in bins, as heads_tails and 
  -- equal_interval do not always use max as the max bin
  SELECT MAX(b) max FROM ( SELECT unnest(bins) b from bins) ub
),
classes as (
  -- return a table such as
  --        from         |         to
  --- --------------------+---------------------
  --                   1 |  81742.142857142857
  --  81743.142857142857 | 163484.285714285714
  -- 163485.285714285714 | 245226.428571428571
  -- 245227.428571428571 | 326968.571428571428
  -- 326969.571428571428 | 408710.714285714285
  -- 408711.714285714285 | 490452.857142857142
  -- 490453.857142857142 | 572194.999999999999 <- should be replaced by real max
  -- 
  -- remove max bin class, add min as first 'from' class, unnest
  SELECT
  unnest(
    array_remove(
      array_prepend(amin.min,b.bins),
      abinmax.max
    )
  ) as "from" ,
  -- remove max bin class, add real max class as last 'to' class, unnest
  unnest(
    array_append(
    array_remove(b.bins, abinmax.max),
    amax.max
   )
  ) as "to"
  FROM bins b, attr_min amin, attr_max amax, attr_bin_max abinmax
),
freqtable as (
  SELECT 
  "from", 
  "to", 
  ( "to" - "from" )  as diff, 
  (
    SELECT count(*) 
    FROM "{{idSource}}" a 
    WHERE 
    CASE
    WHEN b.from = b.to
      THEN
        a."{{idAttr}}" = b.from AND a."{{idAttr}}" = b.to
    WHEN b.from > b.to AND b.from = amin.min
      THEN 
        a."{{idAttr}}" >= b.from AND a."{{idAttr}}" <= b.to
      ELSE
        a."{{idAttr}}" > b.from AND a."{{idAttr}}" <= b.to
  END
) as count
FROM classes b, attr_min amin, attr_max amax
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

