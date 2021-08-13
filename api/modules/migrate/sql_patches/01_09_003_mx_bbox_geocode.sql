DROP FUNCTION IF EXISTS mx_bbox_geocode(text,text,integer);
CREATE FUNCTION public.mx_bbox_geocode(
  search text DEFAULT 'WLD',
  language text DEFAULT 'en',
  srid integer DEFAULT 4326
)
RETURNS geometry
LANGUAGE 'plpgsql'
IMMUTABLE
PARALLEL SAFE

AS $BODY$
declare
  bbox geometry;
  code text;
  begin
    EXECUTE 'SELECT id FROM mx_dict_translate WHERE UPPER( ' || 
    language || 
    ') = UPPER(' || 
    quote_nullable(search) ||
    ') limit 1'
    INTO code;

    IF (code IS null ) THEN
      code := search;
  END IF;

  bbox := (
    WITH iso as (
      SELECT iso3code 
      FROM mx_countries
      WHERE 
      iso3code = code 
      OR
      m49_region_code = code
      OR
      m49_subregion_code = code
      OR
      m49_intermediate_region_code = code 
    ),
    extent as (
      SELECT ST_Extent(c.geom) AS box
      FROM mx_countries_un c,iso i
      WHERE c.iso3code = i.iso3code
    )
    SELECT box from extent
  );

  if srid = 4326 then
    return bbox;
  else
    return ST_Transform(ST_SetSRID(bbox,4326), srid);
  end if;

end;
$BODY$;

ALTER FUNCTION public.mx_bbox_geocode(text,text, integer)
OWNER TO postgres;


