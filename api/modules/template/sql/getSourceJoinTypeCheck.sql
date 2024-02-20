SELECT
  a.data_type AS base_type,
  b.data_type AS join_type
FROM
  information_schema.columns a,
  information_schema.columns b
WHERE
  a.table_name = $1
  AND a.column_name = $2
  AND b.table_name = $3
  AND b.column_name = $4
