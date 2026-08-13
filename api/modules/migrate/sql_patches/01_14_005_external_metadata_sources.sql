/*
 * Move rt/cc source metadata into metadata-only mx_sources entries.
 * The application is deployed only after this migration completes: normalized
 * mx_sources metadata is therefore the sole authoritative RT/CC representation.
 */
/*
 * Keyword autocomplete previously included mx_views. Suspend every historical
 * trigger during the bulk migration, then rebuild the source-only index and
 * restore only mx_sources triggers.
 */
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_trg ON mx_sources;
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_insert_trg ON mx_sources;
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_delete_trg ON mx_sources;
DROP TRIGGER IF EXISTS mx_views_meta_keywords_trg ON mx_views;

CREATE TEMP TABLE mx_external_metadata_migration ON COMMIT DROP AS
SELECT
  v.*,
  coalesce(
    existing.id,
    'mx_' || substr(md5('external-metadata:' || v.id), 1, 5) ||
    '_' || substr(md5('external-metadata:' || v.id), 6, 5) ||
    '_' || substr(md5('external-metadata:' || v.id), 11, 5) ||
    '_' || substr(md5('external-metadata:' || v.id), 16, 5) ||
    '_' || substr(md5('external-metadata:' || v.id), 21, 5) ||
    '_' || substr(md5('external-metadata:' || v.id), 26, 5)
  ) AS id_external,
  existing.id IS NULL AS create_external
FROM mx_views_latest v
LEFT JOIN mx_sources_latest existing
  ON existing.id = v.data #>> '{source,metadataId}'
 AND existing.type = 'external'
WHERE v.type IN ('rt', 'cc');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM mx_external_metadata_migration m
    JOIN mx_sources s ON s.id = m.id_external
    WHERE m.create_external
  ) THEN
    RAISE EXCEPTION 'External metadata source id collision';
  END IF;
END;
$$;

WITH metadata_prepared AS (
  SELECT
    migration.*,
    CASE
      WHEN jsonb_typeof(data #> '{source,meta}') = 'object'
        THEN data #> '{source,meta}'
      ELSE '{}'::jsonb
    END AS source_meta
  FROM mx_external_metadata_migration migration
  WHERE create_external
),
metadata_titled AS (
  SELECT
    prepared.*,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_each_text(
          CASE
            WHEN jsonb_typeof(data -> 'title') = 'object'
              THEN data -> 'title'
            ELSE '{}'::jsonb
          END
        ) title
        WHERE btrim(title.value) <> ''
      ) THEN data -> 'title'
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_each_text(
          CASE
            WHEN jsonb_typeof(source_meta #> '{text,title}') = 'object'
              THEN source_meta #> '{text,title}'
            ELSE '{}'::jsonb
          END
        ) title
        WHERE btrim(title.value) <> ''
      ) THEN source_meta #> '{text,title}'
      ELSE jsonb_build_object(
        'en',
        CASE type
          WHEN 'rt' THEN 'Raster source metadata'
          ELSE 'Custom code source metadata'
        END
      )
    END AS source_title
  FROM metadata_prepared prepared
)
INSERT INTO mx_sources (
  id, editor, target, date_modified, data, type, project,
  readers, editors, services, validated, global
)
SELECT
  id_external,
  editor,
  target,
  date_modified,
  jsonb_build_object(
    'meta',
    source_meta || jsonb_build_object(
      'text',
      CASE
        WHEN jsonb_typeof(source_meta -> 'text') = 'object'
          THEN source_meta -> 'text'
        ELSE '{}'::jsonb
      END || jsonb_build_object('title', source_title)
    )
  ),
  'external',
  project,
  coalesce(readers, '[]'::jsonb),
  coalesce(editors, '[]'::jsonb),
  '[]'::jsonb,
  false,
  false
FROM metadata_titled;

/* Preserve history: add a normalized latest revision instead of rewriting it. */
INSERT INTO mx_views (
  id, editor, target, date_modified, data, type, project, readers, editors
)
SELECT
  id,
  editor,
  target,
  date_modified,
  jsonb_set(
    CASE
      WHEN jsonb_typeof(data -> 'source') = 'object' THEN data
      ELSE jsonb_set(coalesce(data, '{}'::jsonb), '{source}', '{}'::jsonb, true)
    END #- '{source,meta}'::text[],
    '{source,metadataId}',
    to_jsonb(id_external),
    true
  ),
  type,
  project,
  readers,
  editors
FROM mx_external_metadata_migration;

/*
 * Rebuild the autocomplete index from authoritative source metadata only.
 * mx_sources_meta_keywords is derived data: it flattens keyword arrays and
 * stores their frequency for fuzzy suggestions; keywords remain in mx_sources.
 */
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
  WHERE type IN ('vector', 'tabular', 'external')
    AND jsonb_typeof(data #> '{meta,text,keywords,keys}') = 'array'
),
keywords_sources_string AS (
  SELECT data #>> '{meta,text,keywords,keys}' AS keyword
  FROM public.mx_sources_latest
  WHERE type IN ('vector', 'tabular', 'external')
    AND jsonb_typeof(data #> '{meta,text,keywords,keys}') = 'string'
),
keywords AS (
  SELECT keyword FROM keywords_sources_array
  UNION ALL
  SELECT keyword FROM keywords_sources_string
)
SELECT count(keyword) AS count, keyword
FROM keywords
WHERE keyword <> ''
GROUP BY keyword
ORDER BY count DESC;

CREATE INDEX mx_sources_meta_keywords_trgm
ON public.mx_sources_meta_keywords USING gin (keyword gin_trgm_ops);

/* Refresh only when a latest source revision can change indexed keywords. */
CREATE OR REPLACE FUNCTION mx_sources_meta_keywords_sync_insert()
RETURNS TRIGGER AS $$
DECLARE
  previous_data jsonb;
  previous_type text;
BEGIN
  SELECT data, type INTO previous_data, previous_type
  FROM public.mx_sources
  WHERE id = NEW.id AND pid < NEW.pid
  ORDER BY pid DESC
  LIMIT 1;

  IF (NEW.type IN ('vector', 'tabular', 'external')
      OR previous_type IN ('vector', 'tabular', 'external'))
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

/* Physical deletes can remove several source revisions at once. */
CREATE OR REPLACE FUNCTION mx_sources_meta_keywords_sync_delete()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mx_sources_meta_keywords;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mx_sources_meta_keywords_insert_trg
AFTER INSERT ON public.mx_sources
FOR EACH ROW EXECUTE FUNCTION mx_sources_meta_keywords_sync_insert();

CREATE TRIGGER mx_sources_meta_keywords_delete_trg
AFTER DELETE ON public.mx_sources
FOR EACH STATEMENT EXECUTE FUNCTION mx_sources_meta_keywords_sync_delete();

ALTER MATERIALIZED VIEW public.mx_sources_meta_keywords OWNER TO mapxw;
GRANT SELECT ON TABLE public.mx_sources_meta_keywords TO readonly;
GRANT SELECT ON TABLE public.mx_sources_meta_keywords TO readwrite;
