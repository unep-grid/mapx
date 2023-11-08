UPDATE mx_sources
SET
  data = jsonb_set(
    jsonb_set(
      data,
      ARRAY['meta', 'text', 'attributes', $2],
      $3::jsonb
    ),
    ARRAY['meta', 'text', 'attributes_alias', $2],
    $3::jsonb
  )
WHERE
  id = $1;
