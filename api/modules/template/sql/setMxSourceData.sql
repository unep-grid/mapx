UPDATE mx_sources
SET data = jsonb_set_nested(
data,
  ARRAY[{{path}}],
  '{{value}}'
)
WHERE id = '{{idSource}}'
RETURNING *

