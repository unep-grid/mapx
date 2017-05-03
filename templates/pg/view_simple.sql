SELECT ST_AsGeoJSON({{geom|geom}},10) AS the_geom_geojson, {{variableName|}}
FROM {{layerName}}
WHERE {{geom|geom}} && !bbox_4326!
AND ST_Intersects( {{geom|geom}}, !bbox_4326! )


