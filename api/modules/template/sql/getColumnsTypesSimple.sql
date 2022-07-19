SELECT
CASE 
WHEN data_type='boolean' THEN 'boolean'
WHEN data_type='character varying' THEN 'string'
WHEN data_type='numeric' THEN 'number'
WHEN data_type='integer' THEN 'number'
WHEN data_type='double precision' THEN 'number'
WHEN data_type='bigint' THEN 'number'
WHEN data_type='smallint' THEN 'number'
WHEN data_type='real' THEN 'number'
WHEN data_type='serial' THEN 'number'
WHEN data_type='smallserial' THEN 'number'
WHEN data_type='bigserial' THEN 'number'
ELSE 'string'
END as value,
column_name as id
FROM information_schema.columns
WHERE table_name='{{idSource}}' AND column_name in {{idAttributesString}}
