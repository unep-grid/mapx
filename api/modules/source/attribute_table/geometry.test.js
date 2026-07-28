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
  getFeatureByGid,
  getGeometryColumnInfo,
  getGeomSqlExpression,
  updateFeatureGeometry,
} from "./geometry.js";
import { columnExists, getColumnsTypesSimple } from "#mapx/db_utils";
import { toPgColumn } from "#mapx/helpers";

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

describe("feature identity guards", () => {
  it("rejects duplicate rows instead of hiding them with LIMIT", async () => {
    getColumnsTypesSimple.mockResolvedValue([
      { column_name: "gid" },
      { column_name: "name" },
    ]);
    toPgColumn.mockReturnValue('"gid", "name"');
    columnExists.mockResolvedValue(false);
    const client = {
      query: vi.fn().mockResolvedValue({
        rowCount: 2,
        rows: [{ gid: 4 }, { gid: 4 }],
      }),
    };

    await expect(
      getFeatureByGid("mx_vector_a_b_c_d_e", 4, client),
    ).rejects.toThrow("Feature gid is not unique");
    expect(client.query.mock.calls[0][0]).not.toContain("LIMIT 1");
  });

  it("rejects geometry updates affecting multiple gids", async () => {
    columnExists.mockResolvedValue(true);
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ type: "MULTIPOINT", srid: 4326 }],
        })
        .mockResolvedValueOnce({ rowCount: 2 }),
    };

    await expect(
      updateFeatureGeometry(
        "mx_vector_a_b_c_d_e",
        4,
        { type: "Point", coordinates: [0, 0] },
        client,
      ),
    ).rejects.toThrow("Expected to update one feature geometry");
  });
});
