SELECT
  column_name as column_name,
  data_type as column_type,
  (is_identity = 'YES') as is_identity
FROM
  information_schema.columns
WHERE
  table_name = $1
  AND column_name = ANY ($2)
