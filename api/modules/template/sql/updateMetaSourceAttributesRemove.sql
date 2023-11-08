UPDATE mx_sources
SET
  data = data #- ARRAY['meta', 'text', 'attributes', $2] #- ARRAY['meta', 'text', 'attributes_alias', $2]
WHERE
  id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2;
