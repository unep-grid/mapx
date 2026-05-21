ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS map_boundary_type TEXT;

ALTER TABLE mx_projects
ALTER COLUMN map_boundary_type SET DEFAULT 'un';

UPDATE mx_projects
SET map_boundary_type = 'un'
WHERE map_boundary_type IS NULL
  OR map_boundary_type NOT IN ('un', 'wmo', 'osm', 'none');

ALTER TABLE mx_projects
ALTER COLUMN map_boundary_type SET NOT NULL;

ALTER TABLE mx_projects
DROP CONSTRAINT IF EXISTS mx_projects_map_boundary_type_check;

ALTER TABLE mx_projects
ADD CONSTRAINT mx_projects_map_boundary_type_check
CHECK (map_boundary_type IN ('un', 'wmo', 'osm', 'none'));
