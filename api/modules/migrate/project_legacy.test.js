import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const patchUrl = new URL(
  "./sql_patches/01_14_004_project_legacy.sql",
  import.meta.url,
);
const listSqlUrl = new URL(
  "../template/sql/getAccessibleProjects.sql",
  import.meta.url,
);
const setSqlUrl = new URL(
  "../template/sql/setLegacyProject.sql",
  import.meta.url,
);

describe("project legacy migration", () => {
  it("adds an idempotent non-null legacy flag disabled by default", async () => {
    const sql = await readFile(patchUrl, "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS legacy BOOLEAN");
    expect(sql).toContain("NOT NULL DEFAULT FALSE");
  });

  it("lists the flag and updates only active projects", async () => {
    const [listSql, setSql] = await Promise.all([
      readFile(listSqlUrl, "utf8"),
      readFile(setSqlUrl, "utf8"),
    ]);
    expect(listSql).toContain("p.legacy");
    expect(setSql).toContain("SET legacy = $2");
    expect(setSql).toContain("active IS TRUE");
    expect(setSql).toContain("RETURNING legacy");
  });
});
