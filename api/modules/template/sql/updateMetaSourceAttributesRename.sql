UPDATE mx_sources
SET
  data = jsonb_set(
    -- First, set the new key with the value of the old key.
    jsonb_set(
      data,
      ARRAY['meta', 'text', 'attributes', $3],
      data #> ARRAY['meta', 'text', 'attributes', $2],
      true
    ),
    -- Then, set the new key in the 'attributes_alias'.
    ARRAY['meta', 'text', 'attributes_alias', $3],
    data #> ARRAY['meta', 'text', 'attributes_alias', $2],
    true
  ) #- ARRAY['meta', 'text', 'attributes', $2] -- Remove the old key from 'attributes'.
  #- ARRAY['meta', 'text', 'attributes_alias', $2] -- Remove the old key from 'attributes_alias'.
WHERE
  id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2;
