/**
 * Keep mx_sources revisions immutable and expose only the latest revision.
 */
ALTER TABLE public.mx_sources
DROP CONSTRAINT IF EXISTS mx_sources_id_key;

CREATE INDEX IF NOT EXISTS mx_sources_id_idx
ON public.mx_sources USING btree (id);

CREATE INDEX IF NOT EXISTS mx_sources_id_latest_idx
ON public.mx_sources USING btree (id, pid DESC);

CREATE INDEX IF NOT EXISTS mx_sources_date_modified_idx
ON public.mx_sources USING btree (date_modified);

CREATE INDEX IF NOT EXISTS mx_sources_editor_idx
ON public.mx_sources USING btree (editor);

CREATE OR REPLACE VIEW public.mx_sources_latest AS
WITH latest_pid AS (
  SELECT id, max(pid) AS pid
  FROM public.mx_sources
  GROUP BY id
)
SELECT
  s.id,
  s.editor,
  s.target,
  s.date_modified,
  s.data,
  s.type,
  s.pid,
  s.project,
  s.readers,
  s.editors,
  s.services,
  s.validated,
  s.global
FROM public.mx_sources s
JOIN latest_pid l ON l.id = s.id AND l.pid = s.pid;

ALTER VIEW public.mx_sources_latest OWNER TO mapxw;
GRANT SELECT ON TABLE public.mx_sources_latest TO readonly;
GRANT SELECT ON TABLE public.mx_sources_latest TO readwrite;

CREATE OR REPLACE FUNCTION mx_sources_reject_update() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'mx_sources is append-only; insert a new revision instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mx_sources_reject_update_trg ON public.mx_sources;
CREATE TRIGGER mx_sources_reject_update_trg
BEFORE UPDATE ON public.mx_sources
FOR EACH ROW EXECUTE FUNCTION mx_sources_reject_update();

/*
 * Rebuild the keyword materialized view against current source revisions.
 */
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_trg ON public.mx_sources;
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_insert_trg ON public.mx_sources;
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_delete_trg ON public.mx_sources;
DROP TRIGGER IF EXISTS mx_views_meta_keywords_trg ON public.mx_views;
DROP FUNCTION IF EXISTS mx_sources_meta_keywords_sync() CASCADE;
DROP FUNCTION IF EXISTS mx_sources_meta_keywords_sync_insert() CASCADE;
DROP FUNCTION IF EXISTS mx_sources_meta_keywords_sync_delete() CASCADE;
DROP FUNCTION IF EXISTS mx_views_meta_keywords_sync() CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mx_sources_meta_keywords CASCADE;

CREATE MATERIALIZED VIEW public.mx_sources_meta_keywords AS
WITH
keywords_sources_array AS (
  SELECT jsonb_array_elements_text(data #> '{meta,text,keywords,keys}') AS keyword
  FROM public.mx_sources_latest
  WHERE type IN ('vector', 'tabular')
    AND jsonb_typeof(data #> '{meta,text,keywords,keys}') = 'array'
),
keywords_sources_string AS (
  SELECT data #>> '{meta,text,keywords,keys}' AS keyword
  FROM public.mx_sources_latest
  WHERE type IN ('vector', 'tabular')
    AND jsonb_typeof(data #> '{meta,text,keywords,keys}') = 'string'
),
keywords_views_array AS (
  SELECT jsonb_array_elements_text(data #> '{source,meta,text,keywords,keys}') AS keyword
  FROM public.mx_views_latest
  WHERE type IN ('cc', 'rt')
    AND jsonb_typeof(data #> '{source,meta,text,keywords,keys}') = 'array'
),
keywords_views_string AS (
  SELECT data #>> '{source,meta,text,keywords,keys}' AS keyword
  FROM public.mx_views_latest
  WHERE type IN ('cc', 'rt')
    AND jsonb_typeof(data #> '{source,meta,text,keywords,keys}') = 'string'
),
keywords AS (
  SELECT keyword FROM keywords_sources_array
  UNION ALL
  SELECT keyword FROM keywords_sources_string
  UNION ALL
  SELECT keyword FROM keywords_views_array
  UNION ALL
  SELECT keyword FROM keywords_views_string
)
SELECT count(keyword) AS count, keyword
FROM keywords
WHERE keyword <> ''
GROUP BY keyword
ORDER BY count DESC;

CREATE INDEX mx_sources_meta_keywords_trgm
ON public.mx_sources_meta_keywords USING gin (keyword gin_trgm_ops);

CREATE OR REPLACE FUNCTION mx_sources_meta_keywords_sync_insert()
RETURNS TRIGGER AS $$
DECLARE
  previous_data jsonb;
  previous_type text;
BEGIN
  SELECT data, type
  INTO previous_data, previous_type
  FROM public.mx_sources
  WHERE id = NEW.id AND pid < NEW.pid
  ORDER BY pid DESC
  LIMIT 1;

  IF (NEW.type IN ('vector', 'tabular') OR previous_type IN ('vector', 'tabular'))
     AND (
       NEW.type IS DISTINCT FROM previous_type
       OR NEW.data #> '{meta,text,keywords,keys}'
          IS DISTINCT FROM previous_data #> '{meta,text,keywords,keys}'
     )
  THEN
    REFRESH MATERIALIZED VIEW public.mx_sources_meta_keywords;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mx_sources_meta_keywords_sync_delete()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mx_sources_meta_keywords;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mx_views_meta_keywords_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW.type IN ('cc', 'rt') THEN
    REFRESH MATERIALIZED VIEW public.mx_sources_meta_keywords;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mx_sources_meta_keywords_insert_trg
AFTER INSERT ON public.mx_sources
FOR EACH ROW EXECUTE FUNCTION mx_sources_meta_keywords_sync_insert();

CREATE TRIGGER mx_sources_meta_keywords_delete_trg
AFTER DELETE ON public.mx_sources
FOR EACH STATEMENT EXECUTE FUNCTION mx_sources_meta_keywords_sync_delete();

CREATE TRIGGER mx_views_meta_keywords_trg
AFTER INSERT OR DELETE ON public.mx_views
FOR EACH ROW EXECUTE FUNCTION mx_views_meta_keywords_sync();

ALTER MATERIALIZED VIEW public.mx_sources_meta_keywords OWNER TO mapxw;
GRANT SELECT ON TABLE public.mx_sources_meta_keywords TO readonly;
