import { pgWrite } from "#mapx/db";
import { settings } from "#root/settings";
import { buildPycswRecord } from "./pycsw_helpers.js";

const batchSize = 250;

export { updatePycswCatalog };

async function updatePycswCatalog(
  rows,
  {
    language = settings.pycsw?.language ||
      settings.validation_defaults.languages.default,
    geoserverPublicUrl = settings.geoserver_public?.url ||
      settings.geoserver?.url_public ||
      "",
    enabled = settings.pycsw?.enabled !== false,
    table = settings.pycsw?.table || "mx_pycsw_records",
  } = {},
) {
  if (!enabled) {
    return {
      skipped: true,
      count: 0,
    };
  }

  const records = rows.map((row) =>
    buildPycswRecord(row, {
      language,
      languages: settings.validation_defaults.languages,
      apiBaseUrl: getApiPublicBaseUrl(),
      geoserverPublicUrl,
    }),
  );
  const tableSql = quoteTableName(table);
  const client = await pgWrite.connect();

  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM ${tableSql}`);

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { sql, values } = getInsertBatch(tableSql, batch);

      await client.query(sql, values);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    skipped: false,
    count: records.length,
  };
}

function getInsertBatch(table, records) {
  const columns = [
    "identifier",
    "typename",
    "schema",
    "mdsource",
    "insert_date",
    "xml",
    "metadata",
    "metadata_type",
    "anytext",
    "language",
    "title",
    "abstract",
    "keywords",
    "keywordstype",
    "themes",
    "format",
    "source",
    "date",
    "date_modified",
    "date_revision",
    "date_creation",
    "date_publication",
    "type",
    "wkt_geometry",
    "crs",
    "time_begin",
    "time_end",
    "topicategory",
    "resourcelanguage",
    "accessconstraints",
    "otherconstraints",
    "conditionapplyingtoaccessanduse",
    "lineage",
    "responsiblepartyrole",
    "creator",
    "publisher",
    "contributor",
    "organization",
    "links",
    "contacts",
    "relation",
  ];
  const values = [];
  const placeholders = records.map((record, rowIndex) => {
    const rowValues = columns.map((column, columnIndex) => {
      values.push(record[column] ?? null);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });

    return `(${rowValues.join(", ")})`;
  });
  const sql = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES ${placeholders.join(", ")}
  `;

  return {
    sql,
    values,
  };
}

function getApiPublicBaseUrl() {
  const host = settings.api.host_public;
  const port = Number(settings.api.port_public);
  const protocol = port === 443 ? "https" : "http";
  const suffix = port && ![80, 443].includes(port) ? `:${port}` : "";

  return `${protocol}://${host}${suffix}`;
}

function quoteTableName(table) {
  if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/.test(table)) {
    throw new Error(`Invalid pycsw table name: ${table}`);
  }

  return table
    .split(".")
    .map((part) => `"${part}"`)
    .join(".");
}
