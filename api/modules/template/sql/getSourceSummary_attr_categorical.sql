WITH
attr_table_raw as (
  SELECT
  "{{idAttr}}" as value,
  count(*) as count FROM
  {{idSource}}
  WHERE 
  "{{idAttr}}" IS NOT NULL
  AND "{{idAttr}}" != ''
  GROUP BY
  "{{idAttr}}"
  ORDER BY count desc
),
attr_table as (
  SELECT * 
  FROM attr_table_raw
  LIMIT {{maxRowsCount}}
),
attr_table_raw_count as (
  SELECT count(*) from attr_table_raw
),
attr_table_count as (
  SELECT count(*) from attr_table
),
attr_table_json as (
  SELECT json_agg(
    json_build_object(
      'value', at.value, 
      'count', at.count
    ) 
  ) as json
  FROM attr_table at
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'type', 'categorical',
    'attribute', '{{idAttr}}',
    'table', to_json(atj.json),
    'table_row_count_all', to_json(tcr.count), 
    'table_row_count', to_json(tc.count)
  )
) as res
FROM
attr_table_json as atj, 
attr_table_count as tc,
attr_table_raw_count as tcr;
