import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const patchUrl = new URL(
  "./sql_patches/01_14_005_external_metadata_sources.sql",
  import.meta.url,
);

describe("external metadata source migration", () => {
  it("creates one deterministic catalog entry and a new view revision", async () => {
    const sql = await readFile(patchUrl, "utf8");
    expect(sql).toContain("WHERE v.type IN ('rt', 'cc')");
    expect(sql).toContain("md5('external-metadata:' || v.id)");
    expect(sql).toContain("'external'");
    expect(sql).toContain("INSERT INTO mx_views");
    expect(sql).toContain("'{source,metadataId}'");
    expect(sql).toContain("#- '{source,meta}'::text[]");
  });

  it("fails on id collisions and preserves an existing external reference", async () => {
    const sql = await readFile(patchUrl, "utf8");
    expect(sql).toContain("existing.id IS NULL AS create_external");
    expect(sql).toContain("External metadata source id collision");
    expect(sql).toContain("WHERE create_external");
  });

  it("gives migrated entries a readable, non-empty title", async () => {
    const sql = await readFile(patchUrl, "utf8");

    expect(sql).toContain("source_meta #> '{text,title}'");
    expect(sql).toContain("data -> 'title'");
    expect(sql).toContain("Raster source metadata");
    expect(sql).toContain("Custom code source metadata");
    expect(sql).toContain("jsonb_build_object('title', source_title)");
    expect(sql.indexOf("data -> 'title'")).toBeLessThan(
      sql.indexOf("source_meta #> '{text,title}'"),
    );
  });

  it("rebuilds a source-only keyword index in the same patch", async () => {
    const sql = await readFile(patchUrl, "utf8");

    expect(sql).toContain("CREATE MATERIALIZED VIEW");
    expect(sql).toContain("'vector', 'tabular', 'external'");
    expect(sql).toContain("keywords remain in mx_sources");
    expect(sql).toContain("CREATE TRIGGER mx_sources_meta_keywords_insert_trg");
    expect(sql).not.toContain("keywords_legacy_views");
    expect(sql).not.toContain("CREATE TRIGGER mx_views_meta_keywords_trg");
  });
});
