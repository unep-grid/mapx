DROP FUNCTION IF EXISTS CDB_EqualIntervalBins ( in_array anyarray, breaks INT );
DROP FUNCTION IF EXISTS CDB_HeadsTailsBins ( in_array NUMERIC[], breaks INT);
DROP FUNCTION IF EXISTS CDB_JenksBins(in_array NUMERIC[], breaks INT, iterations INT, invert BOOLEAN);
DROP FUNCTION IF EXISTS CDB_JenksBinsIteration ( in_matrix NUMERIC[], breaks INT, classes INT[], invert BOOLEAN, sdam NUMERIC, max_search INT);
DROP FUNCTION IF EXISTS CDB_QuantileBins(in_array numeric[], breaks int);
DROP FUNCTION IF EXISTS public.mx_decrypt(data text, psw text);
DROP FUNCTION IF EXISTS public.mx_encrypt(data text, psw text);
DROP FUNCTION IF EXISTS public.mx_getgeojsonquery(_idview text, _zoom double precision, _bbox text, OUT result text);
DROP FUNCTION IF EXISTS public.tilebbox(z integer, x integer, y integer, srid integer);
