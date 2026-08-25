import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const patchUrl = new URL(
  "./sql_patches/01_14_008_orphan_external_metadata.sql",
  import.meta.url,
);

describe("orphan external metadata migration", () => {
  it("deletes all revisions only when no latest view references the source", async () => {
    const sql = await readFile(patchUrl, "utf8");

    expect(sql).toContain("FROM mx_sources_latest source");
    expect(sql).toContain("source.type = 'external'");
    expect(sql).toContain("FROM mx_views_latest view");
    expect(sql).toContain("'{source,metadataId}'");
    expect(sql).toContain("DELETE FROM mx_sources source");
    expect(sql).toContain("WHERE source.id = orphan.id");
  });
});
