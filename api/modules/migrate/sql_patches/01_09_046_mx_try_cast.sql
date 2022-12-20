-- taken from https://dba.stackexchange.com/a/203986/213542
-- usage SELECT try_cast('foo'::text, NULL::text);
CREATE OR REPLACE FUNCTION mx_try_cast(_in text, INOUT _out ANYELEMENT)
  LANGUAGE plpgsql AS
$func$
BEGIN
   EXECUTE format('SELECT cast(%L as %s)', $1, pg_typeof(_out))
   INTO  _out;
EXCEPTION WHEN others THEN
   -- do nothing: _out already carries default
END
$func$;

ALTER FUNCTION public.mx_try_cast(text,anyelement)
OWNER TO postgres;
