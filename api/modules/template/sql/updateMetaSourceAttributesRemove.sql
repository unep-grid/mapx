WITH
  updated_data AS (
    SELECT
      (
        coalesce(data, '{}'::jsonb) #- ARRAY['meta', 'text', 'attributes', $2] #- ARRAY['meta', 'text', 'attributes_alias', $2]
      ) AS new_data
    FROM
      mx_sources
    WHERE
      id = $1
  )

UPDATE mx_sources
SET
  data = updated_data.new_data
FROM
  updated_data
WHERE
  mx_sources.id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2
