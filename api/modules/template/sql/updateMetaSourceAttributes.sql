WITH
old_data AS (
  SELECT
    id,
    jsonb_extract_path(data, 'meta', 'text', 'attributes', $2) AS old_attr_desc,
    jsonb_extract_path(data, 'meta', 'text', 'attributes_alias', $2) AS old_attr_alias
  FROM mx_sources
  WHERE id = $1
)
UPDATE mx_sources
SET data = jsonb_set(
  jsonb_set(
    data,
    ARRAY['meta', 'text', 'attributes', $3]::text[],
    old_attr_desc
  ),
  ARRAY['meta', 'text', 'attributes_alias', $3]::text[],
  old_attr_alias
)
FROM old_data
WHERE mx_sources.id = $1
  AND mx_sources.id = old_data.id
  AND old_data.old_attr_desc IS NOT NULL;

