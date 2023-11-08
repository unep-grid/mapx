UPDATE mx_sources
SET
  data = jsonb_set(
    -- First, set the new key with the value of the old key.
    jsonb_set(
      coalesce(data, '{}'::jsonb),
      ARRAY['meta', 'text', 'attributes', $3],
      coalesce(
        data #> ARRAY['meta', 'text', 'attributes', $2],
        '"{}"'::jsonb
      ),
      true
    ),
    -- Then, set the new key in the 'attributes_alias'.
    ARRAY['meta', 'text', 'attributes_alias', $3],
    coalesce(
      data #> ARRAY['meta', 'text', 'attributes_alias', $2],
      '"{}"'::jsonb
    ),
    true
  ) #- ARRAY['meta', 'text', 'attributes', $2] -- Remove the old key from 'attributes'.
  #- ARRAY['meta', 'text', 'attributes_alias', $2] -- Remove the old key from 'attributes_alias'.
WHERE
  id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2
