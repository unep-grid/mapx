WITH
attr_null_value as (
  -- set nullValue as null if not a number
  SELECT 
  CASE 
   WHEN  '{{nullValue}}' ~ '^[-+]?[0-9]*\.?[0-9]+$'
   THEN  '{{nullValue}}'
  ELSE
    NULL 
   END as _value
),
attr_no_null as (
  SELECT
  "{{idAttr}}" as _attr
  FROM "{{idSource}}" s, attr_null_value n
  WHERE NOT (
    "{{idAttr}}" IS NULL OR
    CASE WHEN n._value IS NULL 
      --- NOT false = true 
      THEN false
      -- convert to float the nullValue
    ELSE
      "{{idAttr}}" = n._value::NUMERIC 
END
)
),
attr_no_null_count AS (
  SELECT count(*) count
  FROM attr_no_null
),
table_count AS (
  SELECT count(*) count
  FROM "{{idSource}}"
),
attr_null_count AS (
  SELECT (a.count - s.count) as count 
  FROM table_count a, attr_no_null_count s
),
attr_max AS (
  SELECT
  MAX(_attr)::NUMERIC 
  FROM attr_no_null
),
attr_min AS (
  SELECT
  MIN(_attr)::NUMERIC
  FROM attr_no_null
),
attr_m AS (
  SELECT
  MIN(_attr)::NUMERIC
  FROM attr_no_null
),
attr_array AS (
  SELECT array_agg(_attr::NUMERIC) AS agg
  FROM attr_no_null
),
attr_distinct AS (
  SELECT COUNT(DISTINCT _attr) AS val_distinct
  FROM attr_no_null
),
bins_valid AS (
  -- ensure that the number of bins is never greater than the distinct number of values
  SELECT
  CASE
    WHEN val_distinct < {{binsNumber}}
    THEN val_distinct::INTEGER
    ELSE {{binsNumber}}::INTEGER
  END AS bins_nb_valid
  FROM attr_distinct
),
bins AS (
  -- return an array. e.g. {81742.142857142857,163484.285714285714,245226.428571428571,326968.571428571428,408710.714285714285,490452.857142857142,572194.999999999999}
  SELECT
  CASE
    WHEN '{{binsMethod}}' = 'jenks'
    THEN CDB_JenksBins(a.agg, v.bins_nb_valid)
    WHEN '{{binsMethod}}' = 'quantile'
    THEN CDB_QuantileBins(a.agg, v.bins_nb_valid)
    WHEN '{{binsMethod}}' = 'heads_tails'
    THEN CDB_HeadsTailsBins(a.agg, v.bins_nb_valid)
    WHEN '{{binsMethod}}' = 'equal_interval'
    THEN CDB_EqualIntervalBins(a.agg, v.bins_nb_valid)
  END AS bins
  FROM attr_array a, bins_valid v
),
attr_bin_max AS (
  -- workaround to find largest value in bins, as heads_tails and
  -- equal_interval do not always use max as the max bin
  SELECT MAX(b) max FROM (SELECT unnest(bins) b FROM bins) ub
),
classes AS (
  -- return a table such as
  --        from         |         to
  -- --------------------+---------------------
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
    array_prepend(
      amin.min,
      array_remove(b.bins, abinmax.max)
    )
  ) AS "from",
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
  SELECT COUNT(a.from) = 1 AS bin_vmin_unique
  FROM classes a, attr_min amin
  WHERE a.from = amin.min
),
freqtable AS (
  SELECT
  "from",
  "to",
  ("to" - "from") AS diff,
  (
    SELECT COUNT(*)
    FROM attr_no_null a
    WHERE
    CASE
      WHEN b.from = b.to
      THEN a._attr = b.from AND a._attr = b.to
      WHEN b.from < b.to AND b.from = amin.min AND bvminc.bin_vmin_unique
      THEN a._attr >= b.from AND a._attr <= b.to
      ELSE a._attr > b.from AND a._attr <= b.to
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
      'count', ft.count
    )
  ) AS freq_array
  FROM freqtable ft
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'attribute', '{{idAttr}}',
    'type', 'continuous',
    'nullValue', n._value,
    'nullCount',nc.count,
    'min', amin.min,
    'max', amax.max,
    'bins', b.bins,
    'binsMethod', '{{binsMethod}}',
    'binsNumber', v.bins_nb_valid,
    'table', ft.freq_array
  )
) AS res
FROM
attr_min amin,
attr_max amax,
bins b,
bins_valid v,
freqtable_json ft,
attr_null_value n,
attr_null_count nc

