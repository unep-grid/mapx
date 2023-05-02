WITH
null_value as (
  -- Allowed text value to express "null"/"missing"/"not set" value
  SELECT 
  CASE 
   WHEN  LOWER('{{nullValue}}') = ANY (ARRAY['undefined','null','na','']) 
   THEN  NULL 
  ELSE
    '{{nullValue}}'
   END as val
),
attr_as_text AS (
  SELECT
  "{{idAttr}}"::TEXT as value
  FROM
  {{idSource}}
),
attr_without_null as (
  SELECT
  value
  FROM
  attr_as_text s, null_value n
  WHERE NOT
  (
    s.value IS NULL OR
    s.value = '' OR
    s.value ~ '^\s+$' OR
    CASE WHEN n.val IS NULL 
      --- NOT false = true 
      THEN false
      -- convert to float the nullValue
      ELSE
        s.value = n.val 
    END
  )
),
attr_freq_table as (
  SELECT
  value,
  count(*) as count FROM
  attr_without_null
  GROUP BY
  value
  ORDER BY count desc
),
attr_freq_table_limited as (
  SELECT * 
  FROM attr_freq_table
  LIMIT {{maxRowsCount}}
),
attr_freq_table_limited_json as (
  SELECT json_agg(
    json_build_object(
      'value', at.value, 
      'count', at.count
    ) 
  ) as json
  FROM attr_freq_table_limited at
),
count_full as (
  SELECT count(*) from  {{idSource}}
),
count_no_null as (
  SELECT count(*) from attr_without_null
),
count_null as (
  SELECT cf.count - cnn.count AS count 
  FROM
  count_full cf,
  count_no_null cnn
),
count_freq_table as (
  SELECT count(*) FROM attr_freq_table
),
count_freq_table_limited as (
  SELECT count(*) FROM attr_freq_table_limited
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'type', 'categorical',
    'attribute', '{{idAttr}}',
    'nullValue', n.val,
    'nullCount', to_json(cn.count),
    'row_count', to_json(cf.count),
    'table', coalesce(to_json(atj.json),'[]'::json),
    'table_row_count_all', to_json(cft.count), 
    'table_row_count', to_json(cftl.count)
  )
) as res
FROM
null_value n,
count_null cn,
count_full cf,
attr_freq_table_limited_json atj,
count_freq_table cft,
count_freq_table_limited cftl


