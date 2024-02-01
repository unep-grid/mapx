WITH
  base AS (
    SELECT
      jsonb_array_elements_text(data #> '{join,base,columns}') AS column_name,
      jsonb_array_elements(data #> '{join,joins}') ->> 'column_base' as column_base
    FROM
      mx_sources
    WHERE
    type = 'join'
    AND data #>> '{join,base,id_source}' = $1
  ),
  joins AS (
    SELECT
      jsonb_array_elements_text(je -> 'columns') AS column_name,
      je ->> 'column_join' AS column_join
    FROM
      mx_sources s,
      jsonb_array_elements(s.data #> '{join,joins}') je
    WHERE
      s.type = 'join'
      AND je ->> 'id_source' = $1
  ),
  columns AS (
    SELECT DISTINCT
      column_name
    FROM
      (
        SELECT
          column_name
        FROM
          base
        UNION ALL
        SELECT
          column_base
        FROM
          base
        UNION ALL
        SELECT
          column_name
        FROM
          joins
        UNION ALL
        SELECT
          column_join
        FROM
          joins
      ) all_columns
  )
SELECT
  *
FROM
  columns
WHERE
  column_name is not null;
