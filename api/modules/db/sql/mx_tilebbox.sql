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
    OWNER TO mapxw;
