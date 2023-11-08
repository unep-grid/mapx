UPDATE mx_sources
SET
  data = jsonb_set(
    jsonb_set(
      coalesce(data, '{}'::jsonb),
      ARRAY['meta', 'text', 'attributes', $3],
      coalesce(
        data #> ARRAY['meta', 'text', 'attributes', $2],
        '"{}"'::jsonb
      ),
      true
    ),
    ARRAY['meta', 'text', 'attributes_alias', $3],
    coalesce(
      data #> ARRAY['meta', 'text', 'attributes_alias', $2],
      '"{}"'::jsonb
    ),
    true
  )
WHERE
  id = $1
  AND data -> 'meta' -> 'text' -> 'attributes' ? $2;
