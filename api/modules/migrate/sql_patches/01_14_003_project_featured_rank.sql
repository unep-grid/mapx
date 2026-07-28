ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS featured_rank INTEGER;

ALTER TABLE mx_projects
DROP CONSTRAINT IF EXISTS mx_projects_featured_rank_check;

ALTER TABLE mx_projects
ADD CONSTRAINT mx_projects_featured_rank_check
CHECK (featured_rank IS NULL OR featured_rank > 0);

CREATE INDEX IF NOT EXISTS mx_projects_featured_rank_idx
ON mx_projects (featured_rank, id)
WHERE active IS TRUE AND featured_rank IS NOT NULL;
