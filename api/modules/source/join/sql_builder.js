import { isNotEmpty } from "@fxi/mx_valid";
/**
 * Class for building SQL queries for various operations like creating views,
 * counting rows, and fetching the first N rows based on a configuration.
 */
export class SQLQueryBuilder {
  /**
   * Initializes a new instance of SQLQueryBuilder.
   * @param {Object} config - The configuration object for query building.
   */
  constructor(config) {
    this.config = config;
    this.baseAlias = "base";
  }

  /**
   * Formats column names for SQL query.
   * @param {Object} options - Options for formatting columns.
   * @param {string[]} options.columns - Array of column names.
   * @param {string} options.tableAlias - Alias for the table.
   * @param {string} options.columnPrefix - Prefix for the column names.
   * @param {boolean} options.addLeadingComma - Whether to add a leading comma.
   * @returns {string} Formatted column string for SQL query.
   */
  formatColumns({ columns, tableAlias, columnPrefix, addLeadingComma }) {
    const addComma = isNotEmpty(columns) && addLeadingComma;
    const sql =
      `${addComma ? "," : ""}` +
      columns
        .map((col) => `${tableAlias}.${col} AS ${columnPrefix}${col}`)
        .join(", ");
    return sql;
  }

  /**
   * Builds the core part of the SQL query.
   * @returns {string} Core SQL query string.
   */
  buildCoreQuery(config = { geom: "include" }) {
    const colsBase = [];

    switch (config?.geom) {
      case "include":
        colsBase.push(...[`${this.baseAlias}.geom`, `${this.baseAlias}.gid`]);
        break;
      case "type":
        colsBase.push(...[`ST_GeometryType(${this.baseAlias}.geom) geom`]);
        break;
      case "exclude":
      default:
        null;
    }

    const colsMain = this.formatColumns({
      columns: this.config.base.columns,
      tableAlias: this.baseAlias,
      columnPrefix: "",
    });

    const colsJoin = this.config.joins
      .map((join) =>
        this.formatColumns({
          columns: join.columns,
          tableAlias: `join_${join._prefix}_alias`,
          columnPrefix: join._prefix,
        })
      )
      .join(",");

    const selectParts = [...colsBase, colsMain, colsJoin].filter(
      (part) => part.length > 0
    );
    const selectClause = `SELECT ${selectParts.join(",\n")}`;

    let joinClauses = this.config.joins
      .map((join) => {
        const joinAlias = `join_${join._prefix}_alias`;
        return `${join.type} JOIN ${join.id_source}
            AS ${joinAlias}
            ON ${this.baseAlias}.${join.column_base} = ${joinAlias}.${join.column_join}`;
      })
      .join("\n");

    const query = `${selectClause}
                 FROM ${this.config.base.id_source}
                 AS ${this.baseAlias} ${joinClauses}`;

    return query;
  }

  /**
   * Builds the SQL query for creating a view.
   * @returns {string} SQL query for creating a view.
   */
  createViewSQL() {
    let coreQuery = this.buildCoreQuery({ geom: "include" });
    return `
    DROP VIEW IF EXISTS ${this.config.id_source};
    CREATE VIEW ${this.config.id_source} AS ${coreQuery};`;
  }

  /**
   * Builds the SQL query for counting rows.
   * @returns {string} SQL query for row count.
   */
  rowCountSQL() {
    let coreQuery = this.buildCoreQuery({ geom: "exclude" });
    return `SELECT COUNT(*) FROM (${coreQuery}) AS temp;`;
  }

  /**
   * Builds the SQL query to fetch the first N rows.
   * @param {number} n - The number of rows to fetch.
   * @returns {string} SQL query for fetching the first N rows.
   */
  firstNRowsSQL(n) {
    let coreQuery = this.buildCoreQuery({ geom: "type" });
    return `${coreQuery} LIMIT ${n};`;
  }
}
