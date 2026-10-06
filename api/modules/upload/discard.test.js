import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasSourceDependencies: vi.fn(async () => false),
}));

vi.mock("#mapx/source", () => ({
  hasSourceDependencies: mocks.hasSourceDependencies,
}));

import { discardUpload } from "./discard.js";

const idSource = "mx_aaaaa_bbbbb_ccccc_ddddd_eeeee";
const idView = "MX-AAAAA-BBBBB-CCCCC";

function createClient() {
  const queries = [];
  return {
    queries,
    query: vi.fn(async (sql) => {
      queries.push(sql);
      return { rows: [], rowCount: 0 };
    }),
  };
}

describe("discardUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes the view before checking dependencies, then source and table", async () => {
    const client = createClient();
    mocks.hasSourceDependencies.mockImplementationOnce(async () => {
      // the upload's own view must already be gone (incident: source kept)
      expect(client.queries.at(-1)).toContain("DELETE FROM mx_views");
      return false;
    });

    await discardUpload({ idSource, idView }, client);

    expect(client.queries).toEqual([
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("DELETE FROM mx_views"),
      expect.stringContaining("DELETE FROM mx_sources"),
      `DROP TABLE IF EXISTS ${idSource}`,
    ]);
    expect(mocks.hasSourceDependencies).toHaveBeenCalledWith(idSource, client);
  });

  it("drops the table of a source that was never registered", async () => {
    const client = createClient();

    await discardUpload({ idSource }, client);

    expect(client.queries).not.toContainEqual(
      expect.stringContaining("DELETE FROM mx_views"),
    );
    expect(client.queries.at(-1)).toBe(`DROP TABLE IF EXISTS ${idSource}`);
  });

  it("keeps a source used by another view", async () => {
    const client = createClient();
    mocks.hasSourceDependencies.mockResolvedValueOnce(true);

    await expect(discardUpload({ idSource, idView }, client)).rejects.toThrow(
      "has dependencies",
    );
    expect(client.queries).not.toContainEqual(
      expect.stringContaining("DELETE FROM mx_sources"),
    );
    expect(client.queries).not.toContainEqual(
      expect.stringContaining("DROP TABLE"),
    );
  });

  it("rejects an invalid source id before any query", async () => {
    const client = createClient();

    await expect(
      discardUpload({ idSource: "mx_x; DROP TABLE mx_users" }, client),
    ).rejects.toThrow("Invalid source id");
    expect(client.query).not.toHaveBeenCalled();
  });
});
