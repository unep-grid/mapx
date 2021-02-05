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


