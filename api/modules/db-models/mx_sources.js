import { Sql } from "sql-ts";
const sql = new Sql("postgres");

export const sources = sql.define({
  name: "mx_sources",
  columns: [
    "id",
    "editor",
    "target",
    "date_modified",
    "data",
    "type",
    "pid",
    "project",
    "readers",
    "editors",
    "services",
    "validated",
  ],
});
