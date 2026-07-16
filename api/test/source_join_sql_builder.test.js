/* global describe, it */

import assert from "node:assert/strict";
import {
  SQLQueryBuilder,
  quoteIdentifier,
} from "../modules/source/join/sql_builder.js";

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
    assert.equal(quoteIdentifier("@id"), '"@id"');
    assert.equal(quoteIdentifier('quoted"column'), '"quoted""column"');
  });

  it("quotes special column names in selections, aliases, and joins", () => {
    const sql = new SQLQueryBuilder(joinConfig()).rowCountSQL();

    assert.match(sql, /"base"\."@id" AS "@id"/);
    assert.match(sql, /"base"\."Mixed Case" AS "Mixed Case"/);
    assert.match(sql, /"base"\."quoted""column" AS "quoted""column"/);
    assert.match(
      sql,
      /"join_j0__alias"\."mtb:scale" AS "j0_mtb:scale"/
    );
    assert.match(sql, /"base"\."@id" = "join_j0__alias"\."foreign:id"/);
    assert.match(sql, /FROM "mx_base_source"/);
    assert.match(sql, /INNER JOIN "mx_join_source"/);
  });

  it("quotes the output view and identifiers used by previews", () => {
    const builder = new SQLQueryBuilder(joinConfig());
    const viewSql = builder.createViewSQL();
    const previewSql = builder.firstNRowsSQL(50);

    assert.match(viewSql, /DROP VIEW IF EXISTS "mx_join_result"/);
    assert.match(viewSql, /CREATE VIEW "mx_join_result" AS/);
    assert.match(previewSql, /ST_GeometryType\("base"\."geom"\) AS "geom"/);
    assert.match(previewSql, /"base"\."gid"/);
    assert.match(previewSql, /LIMIT 50;/);
  });
});
