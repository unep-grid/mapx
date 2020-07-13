WITH
rows_count as (
  SELECT
  COUNT(*) 
  FROM "{{idSource}}"
)

SELECT json_build_object(
  'rowCount', to_json(rc.count)
) as res
FROM rows_count rc;


