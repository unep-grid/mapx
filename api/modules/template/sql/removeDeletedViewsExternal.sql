/**
 * Remove view IDs deleted by the current project-deletion transaction from
 * every project's views_external array.
 *
 * The text[] operand is important: a project row is updated once while all
 * matching array elements are removed together.
 */
UPDATE mx_projects
SET views_external = views_external - $1::text[]
WHERE views_external ?| $1::text[];
