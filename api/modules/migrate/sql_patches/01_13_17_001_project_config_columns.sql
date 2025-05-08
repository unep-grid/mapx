ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS logo TEXT CHECK (length(logo) <= 50000),
ADD COLUMN IF NOT EXISTS org_name VARCHAR(100) CHECK (length(org_name) <= 100),
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100) CHECK (length(contact_name) <= 100),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) CHECK (
  contact_email IS NULL OR 
  length(contact_email) <= 255 AND 
  (contact_email = '' OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
