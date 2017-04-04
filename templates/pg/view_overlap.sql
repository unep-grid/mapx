SELECT * FROM (
  WITH bbox AS(
    SELECT !bbox_4326! {{geom}}
  ),
 mask as(
    SELECT ST_Buffer(ST_Collect(k.geom),0) geom
    FROM {{layerMaskName}} k, bbox b
    WHERE
    k.{{geom}} && b.{{geom}}
  ),
  main as(
    SELECT m.{{geom}}, m.{{variableName|}} 
    FROM  {{layerName}} m, mask k, bbox b 
    WHERE 
    m.{{geom}} && b.{{geom}} AND 
    m.{{geom}} && k.{{geom}}
  ),
  overlap as (
    SELECT m.{{variableName|}},
    CASE WHEN GeometryType(m.{{geom}}) != $$POINT$$
      THEN CASE WHEN ST_CoveredBy(
        m.{{geom}},
        k.{{geom}}
      )
      THEN m.{{geom}}
    ELSE
      ST_Multi(
        ST_Intersection(
          k.{{geom}},
          m.{{geom}}
        )
      ) END
    ELSE
      m.{{geom}} END as {{geom}}
      FROM main m, mask k
      WHERE ST_Intersects(m.geom,k.geom)
    )

    SELECT ST_AsGeoJSON(o.{{geom}},8) AS the_geom_geojson, o.{{variableName}} FROM overlap o

  ) t
