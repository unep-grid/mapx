UPDATE mx_projects
SET legacy = $2
WHERE id = $1
  AND active IS TRUE
RETURNING legacy;
