-- Create the mx_themes table
CREATE TABLE mx_themes (
    pid SERIAL PRIMARY KEY,
    id VARCHAR(100) NOT NULL UNIQUE,
    id_project  VARCHAR(40) NOT NULL, 
    creator INTEGER NOT NULL,
    last_editor INTEGER NOT NULL,
    date_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    colors JSONB NOT NULL,
    dark BOOLEAN DEFAULT FALSE,
    tree BOOLEAN DEFAULT FALSE,
    water BOOLEAN DEFAULT FALSE,
    description JSONB DEFAULT '{}',
    label JSONB DEFAULT '{}'
);

-- Create index for faster theme lookup
CREATE INDEX mx_themes_id_idx ON mx_themes(id);
CREATE INDEX mx_themes_id_project_idx ON mx_themes(id_project);
CREATE INDEX mx_themes_creator_idx ON mx_themes(creator);
CREATE INDEX mx_themes_metadata_idx ON mx_themes(dark, tree, water);

-- Set table ownership to mapxw
ALTER TABLE mx_themes OWNER TO mapxw;

-- Grant read permission to mapxr
GRANT SELECT ON mx_themes TO mapxr;

-- Create trigger to update date_modified on changes
CREATE OR REPLACE FUNCTION mx_theme_date_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.date_modified = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER mx_themes_date_modified_trg
BEFORE UPDATE ON mx_themes
FOR EACH ROW EXECUTE
FUNCTION mx_theme_date_modified_column();
