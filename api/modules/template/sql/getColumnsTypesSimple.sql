SELECT
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type,
  a.attidentity != '' as is_identity
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = $1::regclass
  AND a.attnum > 0 
  AND NOT a.attisdropped
  AND a.attname = ANY ($2)
