import { describe, expect, it, vi } from "vitest";

vi.mock("#mapx/db", () => ({
  pgWrite: {},
}));

vi.mock("#mapx/helpers", () => ({
  toPgColumn: vi.fn(),
}));

vi.mock("#mapx/db_utils", () => ({
  columnExists: vi.fn(),
  getColumnsTypesSimple: vi.fn(),
}));

import {
  getGeometryColumnInfo,
  getGeomSqlExpression,
} from "./geometry.js";

const base = "ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)";

describe("getGeomSqlExpression", () => {
  it.each([
    "GEOMETRY",
    "MULTIPOINT",
    "MULTILINESTRING",
    "MULTIPOLYGON",
  ])("promotes writes for %s columns", (type) => {
    expect(getGeomSqlExpression(type)).toBe(`ST_Multi(${base})`);
  });

  it.each(["POINT", "LINESTRING", "POLYGON"])(
    "preserves explicitly simple %s columns",
    (type) => {
      expect(getGeomSqlExpression(type)).toBe(base);
    },
  );
});

describe("getGeometryColumnInfo", () => {
  it("returns the declared type, SRID and simple family", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ type: "MULTIPOINT", srid: 4326 }],
      }),
    };

    await expect(
      getGeometryColumnInfo("mx_vector_a_b_c_d_e", client),
    ).resolves.toEqual({
      type: "MULTIPOINT",
      srid: 4326,
      simpleType: "point",
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM geometry_columns"),
      ["mx_vector_a_b_c_d_e", "geom"],
    );
  });
});
