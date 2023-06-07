SELECT
column_name as column_name,
data_type as column_type
FROM information_schema.columns
WHERE table_name='{{idSource}}' AND column_name in {{idAttributesString}}
