SELECT ST_AsGeoJSON(geom,7) AS the_geom_geojson, {{variableName|}} from
( SELECT {{variableName|}}
 , CASE 
   WHEN ST_CoveredBy(main.{{geom}}, mask.{{geom}}) 
   THEN main.{{geom}} 
   ELSE 
    ST_Multi(
      ST_Intersection(ST_MakeValid(main.{{geom}}), ST_MakeValid(mask.{{geom}}))
      ) END AS geom 
 FROM {{layerName}} AS main 
   INNER JOIN ( SELECT {{geom}} from {{layerMaskName}} ) AS mask 
    ON ST_Intersects(main.{{geom}}, mask.{{geom}})
    WHERE main.{{geom}} && !bbox_4326!
  ) temp
