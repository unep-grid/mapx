WITH sources_project AS (
   SELECT 
    data, id, type
   FROM 
    mx_sources 
   WHERE 
    ($2::text IS NULL OR project = $2) OR global = true
),
id_sources AS (
  SELECT id as id_source, jsonb_array_elements(
    coalesce(data#>'{join,joins}','[]'::jsonb)
  ) #>> '{id_source}' AS id_source_join
  FROM sources_project
  WHERE type = 'join'
  UNION
  SELECT id as id_source, data#>>'{join,base,id_source}' as id_source_join
  FROM sources_project
  WHERE type = 'join'
  UNION
  SELECT id as id_source, null as id_source_join
  FROM sources_project
  WHERE type != 'join'
)

SELECT id_source 
FROM id_sources
WHERE id_source = $1 OR id_source_join = $1
