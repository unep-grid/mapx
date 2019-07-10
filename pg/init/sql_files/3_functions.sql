
--
-- FUNCTION: public.mx_decrypt(text, text)
--

CREATE OR REPLACE FUNCTION public.mx_decrypt(
	data text,
	psw text)
    RETURNS text
    LANGUAGE 'plpgsql'

    COST 100
    VOLATILE
AS $BODY$
BEGIN
  RETURN pgp_sym_decrypt(decode(data,'hex'),psw);
  EXCEPTION
WHEN others THEN
  RAISE USING
  MESSAGE = format('Decryption failed. sqlstate: %s, message: %s',
    SQLSTATE,SQLERRM);
  RETURN NULL;
END;
$BODY$;

ALTER FUNCTION public.mx_decrypt(text, text)
    OWNER TO postgres;


--
-- FUNCTION: public.mx_encrypt(text, text)
--

CREATE OR REPLACE FUNCTION public.mx_encrypt(
	data text,
	psw text)
    RETURNS text
    LANGUAGE 'plpgsql'

    COST 100
    VOLATILE
AS $BODY$
BEGIN
  RETURN encode(pgp_sym_encrypt(data,psw),'hex');
  EXCEPTION
WHEN others THEN
  RAISE USING
  MESSAGE = format('Encryption failed. sqlstate: %s, message: %s',
    SQLSTATE,SQLERRM);
  RETURN NULL;
END;
$BODY$;

ALTER FUNCTION public.mx_encrypt(text, text)
    OWNER TO postgres;


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


--
-- FUNCTION: public.tilebbox(integer, integer, integer, integer)
--

CREATE OR REPLACE FUNCTION public.tilebbox(
	z integer,
	x integer,
	y integer,
	srid integer DEFAULT 3857)
    RETURNS geometry
    LANGUAGE 'plpgsql'

    COST 100
    IMMUTABLE
AS $BODY$
declare
    max numeric := 20037508.34;
    res numeric := (max*2)/(2^z);
    bbox geometry;
begin
    bbox := ST_MakeEnvelope(
        -max + (x * res),
        max - (y * res),
        -max + (x * res) + res,
        max - (y * res) - res,
        3857
    );
    if srid = 3857 then
        return bbox;
    else
        return ST_Transform(bbox, srid);
    end if;
end;
$BODY$;

ALTER FUNCTION public.tilebbox(integer, integer, integer, integer)
    OWNER TO postgres;
