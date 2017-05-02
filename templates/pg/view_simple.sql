SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology({{geom|geom}},0.01),10) AS the_geom_geojson, {{variableName|}} 
FROM {{layerName}}
WHERE {{geom|geom}} && !bbox_4326!
AND ST_Intersects( {{geom|geom}}, !bbox_4326! )


