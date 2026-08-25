/*
 * Featured projects must remain active in the main catalog. Preserve the
 * featured state when repairing rows created before this invariant existed.
 */
UPDATE mx_projects
SET legacy = FALSE
WHERE legacy IS TRUE
  AND featured_rank IS NOT NULL;

ALTER TABLE mx_projects
DROP CONSTRAINT IF EXISTS mx_projects_featured_legacy_check;

ALTER TABLE mx_projects
ADD CONSTRAINT mx_projects_featured_legacy_check
CHECK (legacy IS FALSE OR featured_rank IS NULL);
