ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS map_projection jsonb;
