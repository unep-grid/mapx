/**
 * Overlap SQL builders.
 *
 * Source creation preserves the gid and attributes of layers[0]; subsequent
 * layers are dissolved geometry masks. Area calculation instead treats every
 * layer as a dissolved mask.
 */

import { isSourceId, isSafeName } from "@fxi/mx_valid";

function quoteId(identifier) {
  if (!isSourceId(identifier) && !isSafeName(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function buildMaskCtes(layers) {
  return layers.slice(1).map((idLayer, index) => {
    return `
    mask_${index + 1} AS (
      SELECT ST_UnaryUnion(ST_Collect(layer.geom)) AS geom
      FROM ${quoteId(idLayer)} AS layer
      CROSS JOIN country_mask
      WHERE layer.geom && country_mask.geom
        AND ST_Intersects(layer.geom, country_mask.geom)
    )`;
  });
}

function buildIntersectionExpression(nMasks) {
  let expression = `ST_Intersection(base.geom, country_mask.geom)`;
  for (let index = 1; index <= nMasks; index++) {
    expression = `ST_Intersection(${expression}, mask_${index}.geom)`;
  }
  return expression;
}

function buildCrossJoins(nMasks) {
  const joins = ["CROSS JOIN country_mask"];
  for (let index = 1; index <= nMasks; index++) {
    joins.push(`CROSS JOIN mask_${index}`);
  }
  return joins.join("\n      ");
}

function buildMaskPredicates(nMasks) {
  const predicates = ["country_mask.geom IS NOT NULL"];
  for (let index = 1; index <= nMasks; index++) {
    predicates.push(`mask_${index}.geom IS NOT NULL`);
  }
  return predicates.join("\n        AND ");
}

/**
 * Build the overlap query while keeping source identifiers quoted and values
 * parameterized. The base layer is always layers[0].
 */
export function buildCreateOverlapSql({ idSource, layers, attributes }) {
  if (!isSourceId(idSource) || !Array.isArray(layers) || layers.length < 1) {
    throw new Error("Invalid overlap SQL configuration");
  }
  const base = quoteId(layers[0]);
  const masks = buildMaskCtes(layers);
  const maskSql = masks.length > 0 ? `,\n${masks.join(",\n")}` : "";
  const intersection = buildIntersectionExpression(masks.length);
  const attributeSql = attributes.map(quoteId).join(", ");
  const selectedAttributes = attributeSql ? `, ${attributeSql}` : "";

  return `
    CREATE TABLE ${quoteId(idSource)} AS
    WITH country_mask AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom
      FROM mx_countries
      WHERE iso3code = $1
    )${maskSql},
    base_parts AS (
      SELECT
        base.gid,
        ${intersection} AS geom
      FROM ${base} AS base
      ${buildCrossJoins(masks.length)}
      WHERE ${buildMaskPredicates(masks.length)}
        AND base.geom && country_mask.geom
        AND ST_Intersects(base.geom, country_mask.geom)
    ),
    grouped_parts AS (
      SELECT
        gid,
        ST_UnaryUnion(ST_Collect(geom)) AS geom
      FROM base_parts
      WHERE geom IS NOT NULL
        AND NOT ST_IsEmpty(geom)
      GROUP BY gid
    )
    SELECT base.gid${selectedAttributes}, grouped_parts.geom
    FROM ${base} AS base
    JOIN grouped_parts USING (gid)
  `;
}

export function buildOverlapGeometryProfileSql({ idSource }) {
  const table = quoteId(idSource);
  return `
    SELECT COALESCE(
      array_agg(
        DISTINCT ST_Dimension(part.geom)
        ORDER BY ST_Dimension(part.geom)
      ),
      ARRAY[]::integer[]
    ) AS dimensions
    FROM ${table} AS overlap_result
    CROSS JOIN LATERAL ST_Dump(overlap_result.geom) AS part
    WHERE overlap_result.geom IS NOT NULL
      AND NOT ST_IsEmpty(overlap_result.geom)
  `;
}

export function deriveOverlapGeometryType(dimensions) {
  const unique = [
    ...new Set(
      (Array.isArray(dimensions) ? dimensions : [])
        .map(Number)
        .filter((dimension) => Number.isInteger(dimension)),
    ),
  ];
  if (unique.length !== 1) {
    return "GEOMETRY";
  }
  return (
    {
      0: "POINT",
      1: "LINESTRING",
      2: "POLYGON",
    }[unique[0]] || "GEOMETRY"
  );
}

export function buildAreaOverlapSql({ layers }) {
  if (!Array.isArray(layers) || layers.length < 1) {
    throw new Error("Invalid overlap area configuration");
  }
  const masks = layers.map((idLayer, index) => {
    return `
    layer_${index} AS (
      SELECT ST_UnaryUnion(ST_Collect(layer.geom)) AS geom
      FROM ${quoteId(idLayer)} AS layer
      CROSS JOIN country_mask
      WHERE layer.geom && country_mask.geom
        AND ST_Intersects(layer.geom, country_mask.geom)
    )`;
  });
  let intersection = "country_mask.geom";
  for (let index = 0; index < layers.length; index++) {
    intersection = `ST_Intersection(${intersection}, layer_${index}.geom)`;
  }

  return `
    WITH country_mask AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom
      FROM mx_countries
      WHERE iso3code = $1
    ),
    ${masks.join(",\n")},
    overlap AS (
      SELECT ST_CollectionExtract(${intersection}, 3) AS geom
      FROM country_mask
      ${layers.map((_, index) => `CROSS JOIN layer_${index}`).join("\n      ")}
    )
    SELECT COALESCE(
      ST_Area(ST_Transform(geom, 4326)::geography),
      0
    )::double precision AS area_m2
    FROM overlap
  `;
}

export function buildFinalizeOverlapSql({ idSource, geometryType, srid }) {
  const table = quoteId(idSource);
  const type = `${geometryType || ""}`.toUpperCase();
  const isGeneric = type === "GEOMETRY";
  const multiType = isGeneric
    ? "GEOMETRY"
    : type.startsWith("MULTI")
      ? type
      : `MULTI${type || "POLYGON"}`;
  const dimension = type.includes("POINT")
    ? 1
    : type.includes("LINESTRING")
      ? 2
      : 3;
  const constraint = quoteId(`${idSource}_pkey`);

  const normalizedGeometry = isGeneric
    ? "ST_Multi(geom)"
    : `ST_Multi(ST_CollectionExtract(geom, ${dimension}))`;

  return [
    `
    ALTER TABLE ${table}
    ALTER COLUMN geom TYPE geometry(${multiType}, ${Number(srid) || 4326})
    USING ST_SetSRID(
      ${normalizedGeometry},
      ${Number(srid) || 4326}
    )
    `,
    `
    ALTER TABLE ${table}
    ALTER COLUMN gid SET NOT NULL
    `,
    `
    ALTER TABLE ${table}
    ALTER COLUMN gid ADD GENERATED BY DEFAULT AS IDENTITY
    `,
    `
    SELECT setval(
      pg_get_serial_sequence($1, 'gid'),
      GREATEST(COALESCE(max(gid), 0), 1),
      COALESCE(max(gid), 0) > 0
    )
    FROM ${table}
    `,
    `
    ALTER TABLE ${table}
    ADD CONSTRAINT ${constraint} PRIMARY KEY (gid)
    `,
  ];
}
