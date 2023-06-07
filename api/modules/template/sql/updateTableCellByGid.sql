WITH sub AS (
   SELECT gid   
   FROM   "{{id_table}}"
   WHERE  gid = {{gid}}
   LIMIT  1
   )
UPDATE "{{id_table}}" s
SET "{{column_name}}" = $1::{{column_type}}
FROM sub
WHERE s.gid = sub.gid;
