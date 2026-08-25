import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const patchUrl = new URL(
  "./sql_patches/01_14_007_project_featured_legacy.sql",
  import.meta.url,
);

describe("project featured/archive invariant migration", () => {
  it("keeps featured and clears archived before adding the constraint", async () => {
    const sql = await readFile(patchUrl, "utf8");
    const normalizeAt = sql.indexOf("SET legacy = FALSE");
    const constraintAt = sql.indexOf("ADD CONSTRAINT");

    expect(normalizeAt).toBeGreaterThan(-1);
    expect(constraintAt).toBeGreaterThan(normalizeAt);
    expect(sql).toContain("legacy IS TRUE");
    expect(sql).toContain("featured_rank IS NOT NULL");
    expect(sql).toContain("legacy IS FALSE OR featured_rank IS NULL");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS");
  });
});
