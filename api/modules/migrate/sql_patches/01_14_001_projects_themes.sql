ALTER TABLE mx_projects
ADD COLUMN IF NOT EXISTS themes TEXT[] NOT NULL DEFAULT '{}';

UPDATE mx_projects
SET themes = '{}'
WHERE themes IS NULL;

ALTER TABLE mx_projects
DROP CONSTRAINT IF EXISTS mx_projects_themes_check;

ALTER TABLE mx_projects
ADD CONSTRAINT mx_projects_themes_check
CHECK (
  array_position(themes, NULL) IS NULL
  AND themes <@ ARRAY[
    'biota',
    'boundaries',
    'farming',
    'climatologyMeteorologyAtmosphere',
    'economy',
    'elevation',
    'environment',
    'geoscientificInformation',
    'health',
    'imageryBaseMapsEarthCover',
    'intelligenceMilitary',
    'inlandWaters',
    'location',
    'oceans',
    'planningCadastre',
    'society',
    'structure',
    'transportation',
    'utilitiesCommunication'
  ]::TEXT[]
);

CREATE INDEX IF NOT EXISTS mx_projects_themes_idx
ON mx_projects USING GIN (themes);
