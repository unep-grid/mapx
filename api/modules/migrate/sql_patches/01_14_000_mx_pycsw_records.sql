CREATE TABLE IF NOT EXISTS mx_pycsw_records (
  identifier TEXT PRIMARY KEY,
  typename TEXT NOT NULL,
  schema TEXT NOT NULL,
  mdsource TEXT NOT NULL DEFAULT 'local',
  insert_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- geo+json metadata copy: pycsw's legacy schema requires xml non-null
  xml TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL,
  metadata_type TEXT NOT NULL DEFAULT 'application/geo+json',
  anytext TEXT NOT NULL DEFAULT '',
  anytext_tsvector TSVECTOR,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL DEFAULT '',
  abstract TEXT NOT NULL DEFAULT '',
  edition TEXT,
  keywords TEXT NOT NULL DEFAULT '',
  keywordstype TEXT NOT NULL DEFAULT 'theme',
  themes TEXT,
  format TEXT,
  source TEXT,
  date TIMESTAMPTZ,
  date_modified TIMESTAMPTZ,
  date_revision TIMESTAMPTZ,
  date_creation TIMESTAMPTZ,
  date_publication TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'dataset',
  wkt_geometry TEXT,
  wkb_geometry geometry(Geometry,4326),
  vert_extent_min DOUBLE PRECISION,
  vert_extent_max DOUBLE PRECISION,
  crs TEXT,
  title_alternate TEXT,
  securityconstraints TEXT,
  parentidentifier TEXT,
  topicategory TEXT,
  resourcelanguage TEXT,
  geodescode TEXT,
  denominator BIGINT,
  distancevalue DOUBLE PRECISION,
  distanceuom TEXT,
  time_begin TIMESTAMPTZ,
  time_end TIMESTAMPTZ,
  servicetype TEXT,
  servicetypeversion TEXT,
  operation TEXT,
  couplingtype TEXT,
  operateson TEXT,
  operatesonidentifier TEXT,
  operatesoname TEXT,
  degree TEXT,
  accessconstraints TEXT,
  otherconstraints TEXT,
  classification TEXT,
  conditionapplyingtoaccessanduse TEXT,
  lineage TEXT,
  responsiblepartyrole TEXT,
  specificationtitle TEXT,
  specificationdate TIMESTAMPTZ,
  specificationdatetype TEXT,
  creator TEXT,
  publisher TEXT,
  contributor TEXT,
  organization TEXT,
  platform TEXT,
  instrument TEXT,
  sensortype TEXT,
  cloudcover DOUBLE PRECISION,
  bands TEXT,
  illuminationelevationangle DOUBLE PRECISION,
  links TEXT,
  contacts TEXT,
  relation TEXT
);

CREATE INDEX IF NOT EXISTS fts_gin_idx ON mx_pycsw_records USING GIN (anytext_tsvector);
CREATE INDEX IF NOT EXISTS wkb_geometry_idx ON mx_pycsw_records USING GIST (wkb_geometry);
CREATE INDEX IF NOT EXISTS mx_pycsw_records_modified_idx ON mx_pycsw_records USING BTREE (date_modified);

DROP TRIGGER IF EXISTS ftsupdate ON mx_pycsw_records;
CREATE TRIGGER ftsupdate
  BEFORE INSERT OR UPDATE ON mx_pycsw_records
  FOR EACH ROW
  EXECUTE PROCEDURE tsvector_update_trigger(
    'anytext_tsvector',
    'pg_catalog.english',
    'anytext'
  );

DROP TRIGGER IF EXISTS mx_pycsw_records_update_geometry ON mx_pycsw_records;
DROP FUNCTION IF EXISTS mx_pycsw_records_update_geometry();
CREATE FUNCTION mx_pycsw_records_update_geometry()
RETURNS trigger AS $mx_pycsw_records_update_geometry$
BEGIN
  IF NEW.wkt_geometry IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.wkb_geometry := ST_GeomFromText(NEW.wkt_geometry, 4326);
  RETURN NEW;
END;
$mx_pycsw_records_update_geometry$ LANGUAGE plpgsql;

CREATE TRIGGER mx_pycsw_records_update_geometry
  BEFORE INSERT OR UPDATE ON mx_pycsw_records
  FOR EACH ROW
  EXECUTE PROCEDURE mx_pycsw_records_update_geometry();

GRANT SELECT ON TABLE mx_pycsw_records TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mx_pycsw_records TO readwrite;
