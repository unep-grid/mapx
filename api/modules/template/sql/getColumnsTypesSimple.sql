SELECT
column_name as column_name,
data_type as column_type
FROM information_schema.columns
WHERE table_name=$1 AND column_name=ANY($2)
