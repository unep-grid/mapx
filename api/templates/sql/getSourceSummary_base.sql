WITH
rows_count as (
  SELECT
  COUNT(*) 
  FROM "{{idSource}}"
)

SELECT json_build_object(
  'row_count', to_json(rc.count)
) as res
FROM rows_count rc;


