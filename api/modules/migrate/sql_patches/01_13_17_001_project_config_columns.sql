ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS logo TEXT CHECK (length(logo) <= 50000);
