WITH source_data AS (
  SELECT 
  id,
  type, 
  date_modified,
  data
  FROM 
  mx_sources 
  WHERE 
  id = $1
),
join_source_ids AS (
  SELECT id AS id_source from source_data
  UNION
  SELECT jsonb_array_elements(coalesce(data#>'{join,joins}','[]'::jsonb)) #>> '{id_source}' AS id_source
  FROM source_data
  WHERE type = 'join'
  UNION
  SELECT data#>>'{join,base,id_source}' as id_source
  FROM source_data
  WHERE type = 'join'
),
join_dates AS (
  SELECT MAX(date_modified) AS join_date_modified
  FROM mx_sources
  WHERE id IN (SELECT id_source FROM join_source_ids)
)
SELECT 
CASE
WHEN type = 'join' THEN (SELECT join_date_modified FROM join_dates)
ELSE date_modified
END AS date_modified
FROM 
source_data;
