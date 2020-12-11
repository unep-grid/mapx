WITH id as (
  SELECT mx_decrypt('{{token}}','{{key}}')::jsonb #>>'{"id"}' as id
)

SELECT 
EXISTS(
  SELECT
  1
  FROM mx_users
  INNER JOIN id
  ON  ( id.id::integer = mx_users.id)
  LIMIT 1
)
as valid;

