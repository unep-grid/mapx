CREATE INDEX IF NOT EXISTS mx_sources_global_idx ON mx_sources USING BTREE (global);
CREATE INDEX IF NOT EXISTS mx_sources_project_idx ON mx_sources USING BTREE (project);
CREATE INDEX IF NOT EXISTS mx_sources_type_idx ON mx_sources USING BTREE (type);

CREATE INDEX IF NOT EXISTS mx_views_data_source_idx ON mx_views USING GIN (data);
CREATE INDEX IF NOT EXISTS mx_views_project_idx ON mx_views USING BTREE (project);
CREATE INDEX IF NOT EXISTS mx_views_type_idx ON mx_views USING BTREE (type);
