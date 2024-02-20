WITH
  base AS (
    SELECT
      id,
      data,
      data #>> '{join,base,id_source}' AS source_base,
      jsonb_array_elements(data #> '{join,joins}') ->> 'id_source' as source_join
    FROM
      mx_sources
    WHERE
    type = 'join'
  )
SELECT
  id,
  data
FROM
  base
WHERE
  source_join = $1
  OR source_base = $1
