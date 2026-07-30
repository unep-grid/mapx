WITH source_kind AS (
  SELECT lower(postgis_typmod_type(a.atttypmod)) AS declared_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a
    ON a.attrelid = c.oid
   AND a.attname = 'geom'
   AND NOT a.attisdropped
  WHERE n.nspname = 'public'
    AND c.relname = '{{layer_name}}'
  LIMIT 1
),
bounds AS MATERIALIZED (
  SELECT coalesce(
    ST_EstimatedExtent('public', '{{layer_name}}', 'geom'),
    (
      SELECT ST_Extent(geom)
      FROM {{layer}}
      WHERE geom IS NOT NULL
        AND NOT ST_IsEmpty(geom)
    )
  )::box2d AS bbox
),
viewport AS (
  SELECT
    bbox,
    ST_XMin(bbox) AS min_x,
    ST_YMin(bbox) AS min_y,
    ST_XMax(bbox) AS max_x,
    ST_YMax(bbox) AS max_y,
    least(
      {{width}}::double precision /
        greatest(ST_XMax(bbox) - ST_XMin(bbox), 1e-12),
      {{height}}::double precision /
        greatest(ST_YMax(bbox) - ST_YMin(bbox), 1e-12)
    ) AS scale
  FROM bounds
  WHERE bbox IS NOT NULL
),
transform AS (
  SELECT
    *,
    declared_type LIKE '%point%' OR declared_type LIKE 'geometry%'
      AS has_points,
    declared_type LIKE '%line%'
      OR declared_type LIKE '%polygon%'
      OR declared_type LIKE 'geometry%'
      AS has_paths,
    ({{width}} - (max_x - min_x) * scale) / 2 - min_x * scale
      AS offset_x,
    ({{height}} - (max_y - min_y) * scale) / 2 - min_y * scale
      AS offset_y,
    greatest(
      (max_x - min_x) / {{width}}::double precision,
      (max_y - min_y) / {{height}}::double precision,
      1e-12
    ) AS tolerance
  FROM viewport
  CROSS JOIN source_kind
),
point_cells AS (
  SELECT
    floor(least(
      {{width}} - 1,
      greatest(0, ST_X(point.geom) * t.scale + t.offset_x)
    ) / {{bin_size}})::integer * {{bin_size}} AS x,
    floor(least(
      {{height}} - 1,
      greatest(
        0,
        {{height}} - (ST_Y(point.geom) * t.scale + t.offset_y)
      )
    ) / {{bin_size}})::integer * {{bin_size}} AS y,
    count(*)::integer AS count
  FROM {{layer}} source
  CROSS JOIN transform t
  CROSS JOIN LATERAL (
    SELECT ST_PointOnSurface(ST_Force2D(source.geom)) AS geom
  ) point
  WHERE source.geom IS NOT NULL
    AND NOT ST_IsEmpty(source.geom)
    AND t.has_points
    AND GeometryType(source.geom) IN ('POINT', 'MULTIPOINT')
  GROUP BY 1, 2
),
point_layer AS (
  SELECT jsonb_build_object(
    'kind', 'bins',
    'geometryType', 'point',
    'size', {{bin_size}},
    'cells', jsonb_agg(
      jsonb_build_object('x', x, 'y', y, 'count', count)
      ORDER BY y, x
    )
  ) AS layer
  FROM point_cells
  HAVING count(*) > 0
),
path_geometries AS MATERIALIZED (
  SELECT
    CASE
      WHEN GeometryType(source.geom) IN ('POLYGON', 'MULTIPOLYGON')
        THEN 'polygon'
      ELSE 'line'
    END AS geometry_type,
    ST_Translate(
      ST_Scale(
        ST_SimplifyPreserveTopology(
          ST_SnapToGrid(ST_Force2D(source.geom), t.tolerance),
          t.tolerance
        ),
        t.scale,
        t.scale
      ),
      t.offset_x,
      t.offset_y
    ) AS geom
  FROM {{layer}} source
  CROSS JOIN transform t
  WHERE source.geom IS NOT NULL
    AND NOT ST_IsEmpty(source.geom)
    AND t.has_paths
    AND GeometryType(source.geom) IN (
      'LINESTRING',
      'MULTILINESTRING',
      'POLYGON',
      'MULTIPOLYGON'
    )
),
path_layers AS MATERIALIZED (
  SELECT jsonb_agg(
    jsonb_build_object(
      'kind', 'path',
      'geometryType', geometry_type,
      'd', path_data
    )
    ORDER BY geometry_type
  ) AS layers
  FROM (
    SELECT
      geometry_type,
      replace(ST_AsSVG(ST_Collect(geom), 0, 1), ';', ' ') AS path_data
    FROM path_geometries
    WHERE geom IS NOT NULL
      AND NOT ST_IsEmpty(geom)
    GROUP BY geometry_type
  ) paths
  WHERE path_data IS NOT NULL
),
coverage_cells AS (
  SELECT
    floor(least(
      {{width}} - 1,
      greatest(0, ST_X(point.geom))
    ) / {{bin_size}})::integer * {{bin_size}} AS x,
    floor(least(
      {{height}} - 1,
      greatest(0, {{height}} - ST_Y(point.geom))
    ) / {{bin_size}})::integer * {{bin_size}} AS y
  FROM path_geometries paths
  CROSS JOIN LATERAL (
    SELECT ST_PointOnSurface(paths.geom) AS geom
  ) point
  WHERE paths.geom IS NOT NULL
    AND NOT ST_IsEmpty(paths.geom)
  GROUP BY 1, 2
),
coverage_layer AS MATERIALIZED (
  SELECT jsonb_build_object(
    'kind', 'coverage',
    'geometryType', 'mixed',
    'size', {{bin_size}},
    'cells', jsonb_agg(
      jsonb_build_object('x', x, 'y', y)
      ORDER BY y, x
    )
  ) AS layer
  FROM coverage_cells
  HAVING count(*) > 0
),
preferred AS MATERIALIZED (
  SELECT
    coalesce(
      (SELECT jsonb_agg(layer) FROM point_layer),
      '[]'::jsonb
    ) ||
    coalesce((SELECT layers FROM path_layers), '[]'::jsonb) AS layers
),
fallback AS MATERIALIZED (
  SELECT
    coalesce(
      (SELECT jsonb_agg(layer) FROM point_layer),
      '[]'::jsonb
    ) ||
    coalesce(
      (SELECT jsonb_agg(layer) FROM coverage_layer),
      '[]'::jsonb
    ) AS layers
)
SELECT CASE
  WHEN t.bbox IS NULL THEN NULL
  WHEN jsonb_array_length(preferred.layers) = 0 THEN NULL
  ELSE jsonb_build_object(
    'kind', 'vector',
    'width', {{width}},
    'height', {{height}},
    'bbox', jsonb_build_array(t.min_x, t.min_y, t.max_x, t.max_y),
    'geometryTypes', (
      SELECT coalesce(
        jsonb_agg(DISTINCT layer->>'geometryType'),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(preferred.layers) layer
    ),
    'layers', CASE
      WHEN octet_length(preferred.layers::text) <= {{max_payload_bytes}}
        THEN preferred.layers
      ELSE fallback.layers
    END
  )
END AS preview
FROM transform t
CROSS JOIN preferred
CROSS JOIN fallback;
