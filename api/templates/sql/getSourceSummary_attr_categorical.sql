WITH
attr_table as (
  SELECT
  "{{idAttr}}" as value,
  count(*) FROM
  {{idSource}}
  GROUP BY
  "{{idAttr}}"
  order by count desc
)

SELECT json_build_object(
  'attribute_stat', json_build_object(
    'type', 'categorical',
    'attribute', '{{idAttr}}',
    'table', json_agg(at)
  )
) as res
FROM
attr_table as at
