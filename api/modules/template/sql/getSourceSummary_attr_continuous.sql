WITH
attr_max AS (
  SELECT
  MAX("{{idAttr}}")::NUMERIC
  FROM "{{idSource}}"
),
attr_min AS (
  SELECT
  MIN("{{idAttr}}")::NUMERIC
  FROM "{{idSource}}"
),
attr_array AS (
  SELECT array_agg("{{idAttr}}"::NUMERIC) AS agg 
  FROM "{{idSource}}" 
),
bins AS (
  -- return and array. e.g. {81742.142857142857,163484.285714285714,245226.428571428571,326968.571428571428,408710.714285714285,490452.857142857142,572194.999999999999}
  SELECT
  CASE
    WHEN '{{binsMethod}}' = 'jenks'
    THEN CDB_JenksBins(agg, {{binsNumber}})
    WHEN '{{binsMethod}}' = 'quantile'
    THEN CDB_QuantileBins(agg, {{binsNumber}})
    WHEN '{{binsMethod}}' = 'heads_tails'
    THEN CDB_HeadsTailsBins(agg, {{binsNumber}})
    WHEN '{{binsMethod}}' = 'equal_interval'
    THEN  CDB_EqualIntervalBins(agg, {{binsNumber}})
  END AS bins
  FROM attr_array
),
attr_bin_max AS (
  -- workaround to find largest value in bins, as heads_tails and 
  -- equal_interval do not always use max as the max bin
  SELECT MAX(b) max FROM (SELECT unnest(bins) b FROM bins) ub
),
classes AS (
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
      array_prepend(amin.min, b.bins),
      abinmax.max
    )
  ) AS "from" ,
  -- remove max bin class, add real max class as last 'to' class, unnest
  unnest(
    array_append(
    array_remove(b.bins, abinmax.max),
    amax.max
   )
  ) AS "to"
  FROM bins b, attr_min amin, attr_max amax, attr_bin_max abinmax
),
bin_vmin_count AS (
  SELECT
  CASE
    WHEN count(a.from) = 1
    THEN TRUE
    ELSE FALSE
  END AS bin_vmin_unique
  FROM classes a, attr_min amin
  WHERE a.from = amin.min
),
freqtable AS (
  SELECT 
  "from", 
  "to", 
  ("to" - "from") AS diff, 
  (
    SELECT count(*) 
    FROM "{{idSource}}" a 
    WHERE 
    CASE
      WHEN b.from = b.to
      THEN
        a."{{idAttr}}" = b.from AND a."{{idAttr}}" = b.to
      WHEN b.from < b.to AND b.from = amin.min AND bvminc.bin_vmin_unique 
      THEN 
        a."{{idAttr}}" >= b.from AND a."{{idAttr}}" <= b.to
      ELSE
        a."{{idAttr}}" > b.from AND a."{{idAttr}}" <= b.to
    END
) AS count
FROM classes b, attr_min amin, attr_max amax, bin_vmin_count bvminc
),
freqtable_json AS (
  SELECT json_agg(
    json_build_object(
      'from', ft.from, 
      'to', ft.to,
      'diff', ft.diff, 
      'count',ft.count
    ) 
  ) AS freq_array
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
) AS res
FROM
attr_max, 
attr_min, 
bins,
freqtable_json ft
-- attr_percentile_table_json as aperc

