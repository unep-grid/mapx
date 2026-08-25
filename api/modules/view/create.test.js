import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  newIdView: vi.fn(),
}));

vi.mock("./id.js", () => ({ newIdView: mocks.newIdView }));

import { insertNewView } from "./create.js";

const firstId = "MX-AAAAA-BBBBB-CCCCC";
const secondId = "MX-DDDDD-EEEEE-FFFFF";

function viewData() {
  return {
    editor: 7,
    data: { title: { en: "Raster" } },
    type: "rt",
    project: "MX-AAA-BBB-CCC-DDD-EEE",
  };
}

describe("new view insertion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries with a new server-generated ID after a collision", async () => {
    mocks.newIdView.mockReturnValueOnce(firstId).mockReturnValueOnce(secondId);
    const client = {
      query: vi.fn(async (sql, values) => {
        if (String(sql).includes("INSERT INTO mx_views")) {
          return values[0] === firstId
            ? { rowCount: 0, rows: [] }
            : { rowCount: 1, rows: [{ id: values[0] }] };
        }
        return { rowCount: 1, rows: [] };
      }),
    };

    await expect(insertNewView(viewData(), client)).resolves.toEqual({
      id: secondId,
    });
    expect(mocks.newIdView).toHaveBeenCalledTimes(2);
    expect(
      client.query.mock.calls.filter(([sql]) =>
        String(sql).includes("pg_advisory_xact_lock"),
      ),
    ).toHaveLength(2);
    const insertSql = String(
      client.query.mock.calls.find(([sql]) =>
        String(sql).includes("INSERT INTO mx_views"),
      )[0],
    );
    expect(insertSql).toContain("SELECT $1::text");
    expect(insertSql).toContain("WHERE id = $1::text");
  });

  it("fails after repeated collisions instead of creating a revision", async () => {
    mocks.newIdView.mockReturnValue(firstId);
    const client = {
      query: vi.fn(async (sql) =>
        String(sql).includes("INSERT INTO mx_views")
          ? { rowCount: 0, rows: [] }
          : { rowCount: 1, rows: [] },
      ),
    };

    await expect(insertNewView(viewData(), client)).rejects.toThrow(
      "Could not allocate a unique view identifier",
    );
    expect(mocks.newIdView).toHaveBeenCalledTimes(5);
  });
});
