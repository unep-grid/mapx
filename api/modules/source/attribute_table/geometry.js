import { pgWrite } from "#mapx/db";
import { toPgColumn } from "#mapx/helpers";
import { isEmpty, isNumeric, isSourceId } from "@fxi/mx_valid";
import { columnExists, getColumnsTypesSimple } from "#mapx/db_utils";

/**
 * Geometry SQL helpers for the table editor : feature read, insert,
 * geometry update and geometry status ( null / empty / present ).
 */
export const cols = {
  geom: "geom",
  gid: "gid",
  geom_status: "__mx_geom_status",
};

export function quoteId(id) {
  return `"${id}"`;
}

export function normalizeGeometry(geometry) {
  if (isEmpty(geometry)) {
    return null;
  }
  if (geometry?.type === "Feature") {
    return geometry.geometry || null;
  }
  return geometry;
}

export function toGeomTypeSimple(type) {
  const t = `${type || ""}`.toLowerCase();
  if (t.includes("point")) {
    return "point";
  }
  if (t.includes("line")) {
    return "line";
  }
  if (t.includes("polygon")) {
    return "polygon";
  }
  return null;
}

export async function getGeometryColumnInfo(idTable, client = pgWrite) {
  const res = await client.query(
    `
    SELECT type, srid
    FROM geometry_columns
    WHERE f_table_schema = 'public'
      AND f_table_name = $1
      AND f_geometry_column = $2
    LIMIT 1
    `,
    [idTable, cols.geom]
  );
  const row = res.rows[0] || {};
  return {
    type: row.type || "GEOMETRY",
    srid: row.srid || 4326,
    simpleType: toGeomTypeSimple(row.type),
  };
}

export async function getGeometryTypeSimple(idTable, client = pgWrite) {
  const columnInfo = await getGeometryColumnInfo(idTable, client);
  if (columnInfo.simpleType) {
    return columnInfo.simpleType;
  }
  const res = await client.query(
    `
    SELECT ST_GeometryType(${quoteId(cols.geom)}) AS geom_type
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(cols.geom)} IS NOT NULL
      AND NOT ST_IsEmpty(${quoteId(cols.geom)})
    LIMIT 1
    `
  );
  return toGeomTypeSimple(res.rows[0]?.geom_type) || "polygon";
}

/**
 * GeoJSON -> geometry SQL expression. Generic GEOMETRY columns are promoted
 * to MULTI* like explicitly multipart columns; explicitly simple columns keep
 * their declared type. `$1` is a placeholder for the GeoJSON param.
 */
export function getGeomSqlExpression(type) {
  const t = `${type || ""}`.toUpperCase();
  const base = `ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)`;
  if (t === "GEOMETRY" || t.startsWith("MULTI")) {
    return `ST_Multi(${base})`;
  }
  return base;
}

export function getGeomStatusSql() {
  return `
    CASE
      WHEN ${quoteId(cols.geom)} IS NULL THEN 'null'
      WHEN ST_IsEmpty(${quoteId(cols.geom)}) THEN 'empty'
      ELSE 'present'
    END AS ${quoteId(cols.geom_status)}
  `;
}

export async function getFeatureByGid(idTable, gid, client = pgWrite) {
  if (!isSourceId(idTable) || !isNumeric(gid)) {
    throw new Error("Invalid feature request");
  }
  const columns = await getColumnsTypesSimple(idTable, null, [cols.geom]);
  const names = columns
    .map((c) => c.column_name)
    .filter((name) => name !== cols.geom_status);
  const selectColumns = toPgColumn(names);
  const hasGeom = await columnExists(cols.geom, idTable, client);
  const geomSelect = hasGeom
    ? `,
      ${getGeomStatusSql()},
      ST_AsGeoJSON(${quoteId(cols.geom)})::json AS geom`
    : "";
  const res = await client.query(
    `
    SELECT ${selectColumns}${geomSelect}
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(cols.gid)} = $1
    `,
    [gid]
  );
  if (res.rowCount === 0) {
    throw new Error("Feature not found");
  }
  if (res.rowCount !== 1) {
    throw new Error(`Feature gid is not unique: ${gid}`);
  }
  return res.rows[0];
}

export async function addGeometryStatusToRows(idTable, rows, client = pgWrite) {
  if (isEmpty(rows)) {
    return rows;
  }
  const gids = rows.map((row) => row[cols.gid]).filter(isNumeric);
  if (isEmpty(gids)) {
    return rows;
  }
  const res = await client.query(
    `
    SELECT ${quoteId(cols.gid)}, ${getGeomStatusSql()}
    FROM ${quoteId(idTable)}
    WHERE ${quoteId(cols.gid)} = ANY($1::int[])
    `,
    [gids]
  );
  const statusByGid = new Map(
    res.rows.map((row) => [row[cols.gid], row[cols.geom_status]])
  );
  for (const row of rows) {
    row[cols.geom_status] = statusByGid.get(row[cols.gid]) || "null";
  }
  return rows;
}

export async function insertTableRow(idTable, geometry, client = pgWrite) {
  if (!isSourceId(idTable)) {
    throw new Error("Invalid table");
  }
  const hasGeom = await columnExists(cols.geom, idTable, client);
  const geom = normalizeGeometry(geometry);

  let res;
  if (hasGeom && !isEmpty(geom)) {
    const columnInfo = await getGeometryColumnInfo(idTable, client);
    res = await client.query(
      `
      INSERT INTO ${quoteId(idTable)} (${quoteId(cols.geom)})
      VALUES (${getGeomSqlExpression(columnInfo.type)})
      RETURNING ${quoteId(cols.gid)}
      `,
      [JSON.stringify(geom)]
    );
  } else {
    res = await client.query(
      `INSERT INTO ${quoteId(idTable)} DEFAULT VALUES RETURNING ${quoteId(
        cols.gid
      )}`
    );
  }

  const gid = res.rows[0]?.[cols.gid];
  return getFeatureByGid(idTable, gid, client);
}

export async function updateFeatureGeometry(
  idTable,
  gid,
  geometry,
  client = pgWrite
) {
  if (!isSourceId(idTable) || !isNumeric(gid)) {
    throw new Error("Invalid geometry update");
  }
  const hasGeom = await columnExists(cols.geom, idTable, client);
  if (!hasGeom) {
    throw new Error("Table has no geometry column");
  }
  const geom = normalizeGeometry(geometry);
  if (isEmpty(geom)) {
    const res = await client.query(
      `
      UPDATE ${quoteId(idTable)}
      SET ${quoteId(cols.geom)} = NULL
      WHERE ${quoteId(cols.gid)} = $1
      `,
      [gid]
    );
    assertSingleGeometryUpdate(res);
  } else {
    const columnInfo = await getGeometryColumnInfo(idTable, client);
    const geomSql = getGeomSqlExpression(columnInfo.type);
    const res = await client.query(
      `
      UPDATE ${quoteId(idTable)}
      SET ${quoteId(cols.geom)} = ${geomSql}
      WHERE ${quoteId(cols.gid)} = $2
      `,
      [JSON.stringify(geom), gid]
    );
    assertSingleGeometryUpdate(res);
  }
  return getFeatureByGid(idTable, gid, client);
}

function assertSingleGeometryUpdate(result) {
  if (result.rowCount !== 1) {
    throw new Error(
      `Expected to update one feature geometry, updated ${result.rowCount}`,
    );
  }
}
