import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const patchUrl = new URL(
  "./sql_patches/01_14_003_project_featured_rank.sql",
  import.meta.url,
);

describe("project featured rank migration", () => {
  it("is idempotent and constrains featured ranks to positive integers", async () => {
    const sql = await readFile(patchUrl, "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS featured_rank INTEGER");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS");
    expect(sql).toContain("featured_rank IS NULL OR featured_rank > 0");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS");
    expect(sql).toContain("WHERE active IS TRUE AND featured_rank IS NOT NULL");
  });
});
