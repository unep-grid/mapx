ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS logo TEXT CHECK (length(logo) <= 50000),
ADD COLUMN IF NOT EXISTS org_name VARCHAR(100) CHECK (length(org_name) <= 100),
ADD COLUMN IF NOT EXISTS org_contact_name VARCHAR(100) CHECK (length(org_contact_name) <= 100),
ADD COLUMN IF NOT EXISTS org_contact_email VARCHAR(255) CHECK (
  org_contact_email IS NULL OR 
  length(org_contact_email) <= 255 AND 
  (org_contact_email = '' OR org_contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
