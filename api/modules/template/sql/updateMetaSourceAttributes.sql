WITH
old_data_attr AS (
  SELECT id, jsonb_extract_path(data, 'meta', 'text', 'attributes', $2) AS old_attr
  FROM mx_sources
  WHERE id = $1
),
old_data_attr_desc AS (
  SELECT id, jsonb_extract_path(data, 'meta', 'text', 'attributes_description', $2) AS old_attr_desc
  FROM mx_sources
  WHERE id = $1
)
UPDATE mx_sources
SET data = jsonb_set(
  jsonb_set(
    data,
    ARRAY['meta', 'text', 'attributes', $3]::text[],
    old_data_attr.old_attr
  ),
  ARRAY['meta', 'text', 'attributes_description', $3]::text[],
  old_data_attr_desc.old_attr_desc
)
FROM old_data_attr, old_data_attr_desc
WHERE mx_sources.id = $1
  AND mx_sources.id = old_data_attr.id
  AND mx_sources.id = old_data_attr_desc.id
  AND old_data_attr.old_attr IS NOT NULL
  AND old_data_attr_desc.old_attr_desc IS NOT NULL;
