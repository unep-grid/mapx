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


