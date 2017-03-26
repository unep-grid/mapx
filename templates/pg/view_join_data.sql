SELECT ST_AsGeoJSON( {{geom}},10) AS the_geom_geojson {{var}} {{#varadd}},{{.}}{{/varadd}} 
FROM  {{layer}}
WHERE {{geom}} && !bbox_4326!  
AND ST_Intersects( {{geom}}, !bbox_4326!); 

