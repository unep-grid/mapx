-- Drop previous artifacts if they exist
DROP TRIGGER 
    IF EXISTS mx_sources_meta_keywords_trg 
    ON mx_sources;

DROP MATERIALIZED VIEW 
    IF EXISTS mx_sources_meta_keywords 
    CASCADE; -- cascade includes indexes

DROP FUNCTION 
    IF EXISTS mx_sources_meta_keywords_sync() 
    CASCADE;

-- Create the materialized view for distinct keywords
CREATE MATERIALIZED VIEW mx_sources_meta_keywords AS (
WITH keywords as (
SELECT DISTINCT
 jsonb_array_elements_text(data #> '{meta,text,keywords,keys}') AS keyword
FROM 
  mx_sources
)
SELECT 
 row_number() OVER () AS id,
 keyword 
FROM keywords
);

-- Create a GIN trigram index on the keyword column
CREATE INDEX mx_sources_meta_keywords_trgm 
ON mx_sources_meta_keywords USING GIN(keyword gin_trgm_ops);
    
-- Trigger function to refresh the materialized view
CREATE OR REPLACE FUNCTION mx_sources_meta_keywords_sync()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mx_sources_meta_keywords;
    RETURN NULL; -- Since it's a STATEMENT level trigger, RETURN value is not used
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh the materialized view after changes to mx_sources
CREATE TRIGGER mx_sources_meta_keywords_trg
AFTER 
    INSERT OR UPDATE OR DELETE 
    ON mx_sources
FOR EACH STATEMENT 
    EXECUTE FUNCTION mx_sources_meta_keywords_sync();

ALTER MATERIALIZED VIEW public.mx_sources_meta_keywords OWNER TO mapxw;
GRANT SELECT ON TABLE public.mx_sources_meta_keywords TO mapxr;
