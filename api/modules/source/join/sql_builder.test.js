import { describe, expect, it } from "vitest";
import { SQLQueryBuilder, quoteIdentifier } from "./sql_builder.js";

function joinConfig() {
  return {
    id_source: "mx_join_result",
    base: {
      id_source: "mx_base_source",
      columns: ["@id", "Mixed Case", 'quoted"column'],
    },
    joins: [
      {
        id_source: "mx_join_source",
        type: "INNER",
        column_base: "@id",
        column_join: "foreign:id",
        columns: ["mtb:scale", "join value"],
        _prefix: "j0_",
      },
    ],
  };
}

describe("source join SQL builder", () => {
  it("quotes PostgreSQL identifiers and escapes embedded quotes", () => {
    expect(quoteIdentifier("@id")).toBe('"@id"');
    expect(quoteIdentifier('quoted"column')).toBe('"quoted""column"');
  });

  it("quotes special column names in selections, aliases, and joins", () => {
    const sql = new SQLQueryBuilder(joinConfig()).rowCountSQL();

    expect(sql).toMatch(/"base"\."@id" AS "@id"/);
    expect(sql).toMatch(/"base"\."Mixed Case" AS "Mixed Case"/);
    expect(sql).toMatch(/"base"\."quoted""column" AS "quoted""column"/);
    expect(sql).toMatch(/"join_j0__alias"\."mtb:scale" AS "j0_mtb:scale"/);
    expect(sql).toMatch(/"base"\."@id" = "join_j0__alias"\."foreign:id"/);
    expect(sql).toMatch(/FROM "mx_base_source"/);
    expect(sql).toMatch(/INNER JOIN "mx_join_source"/);
  });

  it("quotes the output view and identifiers used by previews", () => {
    const builder = new SQLQueryBuilder(joinConfig());
    const viewSql = builder.createViewSQL();
    const previewSql = builder.firstNRowsSQL(50);

    expect(viewSql).toMatch(/DROP VIEW IF EXISTS "mx_join_result"/);
    expect(viewSql).toMatch(/CREATE VIEW "mx_join_result" AS/);
    expect(previewSql).toMatch(/ST_GeometryType\("base"\."geom"\) AS "geom"/);
    expect(previewSql).toMatch(/"base"\."gid"/);
    expect(previewSql).toMatch(/LIMIT 50;/);
  });
});
