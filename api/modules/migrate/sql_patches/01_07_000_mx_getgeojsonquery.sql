--
-- FUNCTION: public.mx_getgeojsonquery(text, double precision, text)
--

CREATE OR REPLACE FUNCTION public.mx_getgeojsonquery(
	_idview text,
	_zoom double precision,
	_bbox text,
	OUT result text)
    RETURNS text
    LANGUAGE 'plpgsql'

    COST 100
    IMMUTABLE
AS $BODY$
DECLARE
_idSource text;
_idSourceMask text;

BEGIN
  WITH _layers AS (
    SELECT data#>'{"source","layerInfo"}' AS info 
    FROM mx_views
    WHERE id = _idView
    ORDER BY date_modified DESC
    LIMIT 1 )
  SELECT info->>'name', info->>'maskName' INTO _idSource, _idSourceMask FROM _layers ;

  IF _idSource != '{}' THEN
    EXECUTE format(
      'SELECT count(geom)::int FROM %I AS t'
      , _idSource) INTO result;
  ELSE
END IF;
END;
$BODY$;

ALTER FUNCTION public.mx_getgeojsonquery(text, double precision, text)
    OWNER TO postgres;


