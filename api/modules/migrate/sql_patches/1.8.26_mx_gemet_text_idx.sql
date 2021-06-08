CREATE INDEX IF NOT EXISTS mx_gemet_text_idx ON mx_gemet USING GIN (text gin_trgm_ops);
