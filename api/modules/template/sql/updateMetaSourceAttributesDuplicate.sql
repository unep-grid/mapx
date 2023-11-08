UPDATE mx_sources
SET
  data = jsonb_set(
    jsonb_set(
      data,
      ARRAY['meta', 'text', 'attributes', $3],
      data #> ARRAY['meta', 'text', 'attributes', $2]
    ),
    ARRAY['meta', 'text', 'attributes_alias', $3],
    data #> ARRAY['meta', 'text', 'attributes_alias', $2]
  )
WHERE
  id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2;
