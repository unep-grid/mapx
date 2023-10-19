-- Drop previous artifacts if they exist
DROP TRIGGER IF EXISTS mx_sources_meta_keywords_trg ON mx_sources;

DROP MATERIALIZED VIEW IF EXISTS mx_sources_meta_keywords CASCADE;

-- cascade includes indexes
DROP FUNCTION IF EXISTS mx_sources_meta_keywords_sync () CASCADE;

-- Create the materialized view for distinct keywords
CREATE MATERIALIZED VIEW
  mx_sources_meta_keywords AS (
    -- Extracting keywords from mx_sources when they are arrays
    WITH
      keywords_sources_array AS (
        SELECT
          JSONB_ARRAY_ELEMENTS_TEXT(data #> '{meta, text, keywords, keys}') AS keyword
        FROM
          mx_sources
        WHERE
        type IN ('vector', 'tabular')
        AND JSONB_TYPEOF(data #> '{meta, text, keywords, keys}') = 'array'
      ),
      -- Extracting keywords from mx_sources when they are strings
      -- Note: In some cases, R processing has converted single-element arrays to strings
      keywords_sources_string AS (
        SELECT
          data #>> '{meta, text, keywords, keys}' AS keyword
        FROM
          mx_sources
        WHERE
        type IN ('vector', 'tabular')
        AND JSONB_TYPEOF(data #> '{meta, text, keywords, keys}') = 'string'
      ),
      -- Extracting keywords from mx_views_latest when they are arrays
      keywords_views_array AS (
        SELECT
          JSONB_ARRAY_ELEMENTS_TEXT(data #> '{source, meta, text, keywords, keys}') as keyword
        FROM
          mx_views_latest
        WHERE
        type IN ('cc', 'rt')
        AND JSONB_TYPEOF(data #> '{source, meta, text, keywords, keys}') = 'array'
      ),
      -- Extracting keywords from mx_views_latest when they are strings
      -- Note: In some cases, R processing has converted single-element arrays to strings
      keywords_views_string AS (
        SELECT
          data #>> '{source, meta, text, keywords, keys}' AS keyword
        FROM
          mx_views_latest
        WHERE
        type IN ('cc', 'rt')
        AND JSONB_TYPEOF(data #> '{source, meta, text, keywords, keys}') = 'string'
      ),
      -- Final union of keywords_sources and keywords_views
      keywords AS (
        SELECT
          keyword
        FROM
          keywords_views_array
        UNION ALL
        SELECT
          keyword
        FROM
          keywords_views_string
        UNION ALL
        SELECT
          keyword
        FROM
          keywords_sources_array
        UNION ALL
        SELECT
          keyword
        FROM
          keywords_sources_string
      )
      -- Distinct selection and ordering
    SELECT
      count(keyword) count,
      keyword
    FROM
      keywords
    WHERE
      keyword != ''
    GROUP BY
      keyword
    ORDER BY
      count DESC
  );

-- Create a GIN trigram index on the keyword column
CREATE INDEX mx_sources_meta_keywords_trgm ON mx_sources_meta_keywords USING GIN (keyword gin_trgm_ops);

-- Trigger function to refresh the materialized view
CREATE
OR REPLACE FUNCTION mx_sources_meta_keywords_sync () RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mx_sources_meta_keywords;
    RETURN NULL; -- Since it's a STATEMENT level trigger, RETURN value is not used
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh the materialized view after changes to mx_sources
CREATE TRIGGER mx_sources_meta_keywords_trg
AFTER INSERT
OR
UPDATE
OR DELETE ON mx_sources FOR EACH STATEMENT
EXECUTE FUNCTION mx_sources_meta_keywords_sync ();

-- Trigger to refresh the materialized view after changes to mx_views
CREATE TRIGGER mx_views_meta_keywords_trg
AFTER INSERT
OR
UPDATE
OR DELETE ON mx_views FOR EACH STATEMENT
EXECUTE FUNCTION mx_sources_meta_keywords_sync ();

ALTER MATERIALIZED VIEW public.mx_sources_meta_keywords OWNER TO mapxw;

GRANT
SELECT
  ON TABLE public.mx_sources_meta_keywords TO mapxr;
