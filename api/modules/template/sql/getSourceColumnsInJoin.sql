WITH 
  columns_from_base AS (
    SELECT
      s.id,
      jsonb_array_elements_text(s.data #> '{join,base,columns}') AS column_name
    FROM
      mx_sources s
    WHERE
      s.type = 'join'
      AND s.data #>> '{join,base,id_source}' = $1
  ),
  source_columns AS (
    SELECT
      s.id,
      jsonb_array_elements(s.data #> '{join,joins}') AS join_element
    FROM
      mx_sources s
    WHERE
      s.type = 'join'
  ),
  columns_from_joins AS (
    SELECT
      sc.id,
      jsonb_array_elements_text(sc.join_element -> 'columns') AS column_name
    FROM
      source_columns sc
    WHERE
      sc.join_element ->> 'id_source' = $1
  ),
  columns_all AS (
    SELECT
      column_name
    FROM
      columns_from_base
    UNION ALL
    SELECT
      column_name
    FROM
      columns_from_joins
  )
SELECT DISTINCT
  column_name
FROM
  columns_all;
