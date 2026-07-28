import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#mapx/db", () => ({
  pgWrite: {},
}));

vi.mock("#mapx/db_utils", () => ({
  columnExists: vi.fn(),
}));

vi.mock("#mapx/helpers", () => ({
  toPgColumn: vi.fn(),
}));

import { columnExists } from "#mapx/db_utils";
import { getSourceIdentityStatus, repairSourceIdentity } from "./identity.js";

const idTable = "mx_vector_a_b_c_d_e";

function validColumn(overrides = {}) {
  return {
    data_type: "bigint",
    not_null: true,
    is_identity: true,
    column_default: null,
    is_unique: true,
    ...overrides,
  };
}

function makeCompatibleRepairClient(geometryType) {
  let duplicate = true;
  let generated = false;
  let notNull = false;
  let unique = false;
  return {
    query: vi.fn(async (query) => {
      const text = typeof query === "string" ? query : query.text;
      if (text.includes("FROM pg_attribute")) {
        return {
          rowCount: 1,
          rows: [
            validColumn({
              not_null: notNull,
              is_identity: generated,
              is_unique: unique,
            }),
          ],
        };
      }
      if (text.includes("count(*) FILTER")) {
        return {
          rows: [
            {
              row_count: duplicate ? 2 : 1,
              null_count: 0,
              duplicate_count: duplicate ? 1 : 0,
            },
          ],
        };
      }
      if (text.includes("to_jsonb(source_row)")) {
        return { rowCount: 0, rows: [] };
      }
      if (text.includes("GROUP BY") && text.includes("LIMIT 10")) {
        return { rows: duplicate ? [{ gid: 2 }] : [] };
      }
      if (text.includes("FROM geometry_columns")) {
        return {
          rows: [{ type: geometryType, srid: 4326 }],
        };
      }
      if (text.includes("DELETE FROM")) {
        duplicate = false;
      }
      if (text.includes("SET NOT NULL")) {
        notNull = true;
      }
      if (text.includes("ADD GENERATED")) {
        generated = true;
      }
      if (text.includes("ADD CONSTRAINT")) {
        unique = true;
      }
      return { rowCount: 1, rows: [] };
    }),
  };
}

beforeEach(() => {
  columnExists.mockReset();
});

describe("getSourceIdentityStatus", () => {
  it("reports a valid generated unique gid", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [validColumn()] }),
    };

    await expect(
      getSourceIdentityStatus(idTable, client),
    ).resolves.toMatchObject({
      valid: true,
      repairable: true,
      issues: [],
      rowCount: null,
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it("reports duplicate, null and non-generated gids", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            validColumn({
              not_null: false,
              is_identity: false,
              is_unique: false,
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ row_count: 4, null_count: 1, duplicate_count: 1 }],
        })
        .mockResolvedValueOnce({ rows: [{ gid: 7 }] }),
    };

    await expect(
      getSourceIdentityStatus(idTable, client),
    ).resolves.toMatchObject({
      valid: false,
      issues: ["null_gid", "duplicate_gid", "missing_gid_default"],
      duplicateGids: [7],
    });
  });

  it("reports a missing gid without querying table values", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };

    await expect(
      getSourceIdentityStatus(idTable, client),
    ).resolves.toMatchObject({
      valid: false,
      issues: ["missing_gid"],
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});

describe("repairSourceIdentity", () => {
  it("refuses conflicting duplicate attributes before changing rows", async () => {
    columnExists.mockResolvedValue(true);
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            validColumn({
              not_null: false,
              is_identity: false,
              is_unique: false,
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ row_count: 2, null_count: 0, duplicate_count: 1 }],
        })
        .mockResolvedValueOnce({ rows: [{ gid: 2 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ gid: 2 }] }),
    };

    await expect(repairSourceIdentity(idTable, 3, client)).rejects.toThrow(
      "Conflicting duplicate gids",
    );
    expect(client.query).toHaveBeenCalledTimes(5);
    expect(
      client.query.mock.calls.some(([query]) =>
        `${query}`.includes('ALTER COLUMN "geom"'),
      ),
    ).toBe(false);
  });

  it.each([
    ["POINT", "MULTIPOINT"],
    ["LINESTRING", "MULTILINESTRING"],
    ["POLYGON", "MULTIPOLYGON"],
  ])(
    "promotes %s columns before merging compatible duplicates",
    async (geometryType, promotedType) => {
      columnExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const client = makeCompatibleRepairClient(geometryType);

      await expect(
        repairSourceIdentity(idTable, 3, client),
      ).resolves.toMatchObject({
        valid: true,
        repaired: true,
      });
      expect(
        client.query.mock.calls.some(([query]) =>
          `${query}`.includes(`TYPE geometry(${promotedType}, 4326)`),
        ),
      ).toBe(true);
      expect(
        client.query.mock.calls.some(([query]) =>
          `${query}`.includes("ST_UnaryUnion(ST_Collect"),
        ),
      ).toBe(true);
    },
  );

  it("merges generic geometries without altering the column typmod", async () => {
    columnExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const client = makeCompatibleRepairClient("GEOMETRY");

    await expect(
      repairSourceIdentity(idTable, 3, client),
    ).resolves.toMatchObject({
      valid: true,
      repaired: true,
    });
    expect(
      client.query.mock.calls.some(([query]) =>
        `${query}`.includes("ST_UnaryUnion(ST_Collect"),
      ),
    ).toBe(true);
    expect(
      client.query.mock.calls.some(([query]) =>
        `${query}`.includes('ALTER COLUMN "geom"'),
      ),
    ).toBe(false);
    expect(
      client.query.mock.calls.some(([query]) =>
        `${query}`.includes("ADD GENERATED BY DEFAULT AS IDENTITY"),
      ),
    ).toBe(true);
  });
});
