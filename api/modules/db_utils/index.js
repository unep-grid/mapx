import { pgTest, pgRead, pgWrite } from "#mapx/db";
import { settings } from "#root/settings";
import { parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { getUserRoles } from "#mapx/authentication";
import { isEmpty, isArray, isSourceId, isProjectId } from "@fxi/mx_valid";
import { isLayerValid, areLayersValid } from "./geom_validation.js";
import { insertRow } from "./insert.js";
export * from "./metadata.js";

/**
 * crypto key
 */
const { key } = settings.db.crypto;

const def = settings.validation_defaults;
const gid = def.tables.layer_id_col;
const geom = def.tables.layer_id_geom;
const languages = def.languages.codes;

/**
 * Types, should matches "app/src/js/handsontable/types.js"
 */
const pgTypesData = [
  "jsonb",
  "boolean",
  "bigint",
  "double precision",
  "integer",
  "numeric",
  "real",
  "smallint",
  "text",
  "date",
  "character varying",
  "time with time zone",
  "time without time zone",
  "timestamp with time zone",
  "timestamp without time zone",
];

/**
 * Check if type is know
 * @param {String} type Type name
 * @return {Boolean} ok
 */
function isTypeValid(type) {
  return pgTypesData.includes(type);
}

/**
 * Check if type and value are valid
 * @param {String} type Type name
 * @return {Promise<Boolean>} ok
 */
async function sanitize(value, type) {
  /**
   * Avoid injection, validate type first
   */
  const tok = isTypeValid(type);
  if (!tok) {
    throw new Error("Type not registered: " + type);
  }
  const r = await pgTest.query(
    `SELECT mx_try_cast($1,cast(NULL as ${type}))::text casted`,
    [value]
  );
  const v = r.rows[0].casted;
  return v;
}

async function sanitizeUpdate(update) {
  update.value_sanitized = await sanitize(update.value_new, update.column_type);
  return update;
}

/**
 * Check if updates are valid
 * Updates are formated as :
 *
 * {
 *   row_id:<integer>,
 *   column_name:<string>,
 *   column_type:<string>,
 *   value_new:<any>
 * }
 *
 * @param {Array} updates Array of update  * @return {Boolean} ok
 * @return {Array} Array of updates, with new update.value_sanitized
 */
async function sanitizeUpdates(updates) {
  try {
    const tasks = [];
    for (const update of updates) {
      tasks.push(sanitizeUpdate(update));
    }
    const out = await Promise.all(tasks);
    return out;
  } catch (err) {
    console.error(err);
    return updates;
  }
}

/**
 * Test if a table exists
 *
 * @param {String} idTable id of the table
 * @return {Promise<Boolean>} Table exists
 */
async function tableExists(idTable, schema) {
  schema = schema || "public";
  const sqlExists = `
  SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = '${schema}'
   AND    table_name = '${idTable}'
   )`;
  const res = await pgRead.query(sqlExists);
  const exists = res.rowCount > 0 && res.rows[0].exists;

  return exists;
}

/**
 * Test if a columm in a table exist
 *
 * @param {String} idColumn id of the column
 * @param {String} idTable id of the table
 * @param {pg.Client} pgClient - The node-postgres client.
 * @return {Promise<Boolean>} Table exists
 */
async function columnExists(idColumn, idTable, client) {
  try {
    const pgClient = client || pgRead;
    const sql = `
    SELECT EXISTS ( 
    SELECT 1
    FROM information_schema.columns 
    WHERE table_name=$1 
    AND column_name=$2
    )`;
    const res = await pgClient.query(sql, [idTable, idColumn]);
    const exists = res.rowCount > 0 && res.rows[0].exists;
    return exists;
  } catch (e) {
    console.error(e);
  }

  return false;
}
/**
 * Use columnExists on multiple columns
 */
async function columnsExist(idColumns, idTable, client) {
  let ok = true;
  for (const col of idColumns) {
    ok = ok && (await columnExists(col, idTable, client));
  }
  return ok;
}

/**
 * Test if a table exists, has rows, has attribute and a value
 *
 * @param {String} idTable id of the table
 * @return {Promise<Boolean>} Table exists and has value
 */
async function tableHasValues(idTable, schema) {
  schema = schema || "public";
  const sqlFirstRow = `
   SELECT * FROM ${idTable} LIMIT 1
  `;
  const exists = await tableExists(idTable, schema);

  if (!exists) {
    return false;
  }

  const resFirstRow = await pgRead.query(sqlFirstRow);

  if (resFirstRow.rowCount === 0) {
    return false;
  }
  /**
   * Check if at least one attribute column besides gid and geom
   * exists and has value;
   */
  const [firstRow] = resFirstRow.rows;
  const attributes = Object.keys(firstRow);

  for (const attr of attributes) {
    const hasAttr = attr && ![gid, geom].includes(attr);
    if (hasAttr && firstRow[attr]) {
      return true;
    }
  }
  return false;
}

/**
 * Decrypt message using default key
 * @param {String} txt Message to decrypt
 * @return {String} decrypted message
 */
async function decrypt(txt) {
  const sqlDecrypt = `SELECT mx_decrypt('` + txt + `','` + key + `') as msg`;
  const res = await pgRead.query(sqlDecrypt);
  if (res.rowCount > 0) {
    return JSON.parse(res.rows[0].msg);
  } else {
    return {};
  }
}

/**
 * Encrypt message using default key
 * @param {String} txt Message to encrypt
 * @return {String} encrypted message
 */
function encrypt(txt) {
  const sql = `SELECT mx_encrypt('` + txt + `','` + key + `') as msg`;
  const result = pgRead.query(sql);
  if (result.rowCount > 0) {
    return result.rows[0].msg;
  } else {
    return false;
  }
}

/**
 * Update table stats using ANALYZE
 * @param {String} idTable Id of the table
 */
async function analyzeSource(idTable) {
  const sqlAnalyze = `ANALYZE ${idTable}`;
  await pgWrite.query(sqlAnalyze);
}

/**
 * Register a source in mx_sources.
 * @param {Object} options Options object containing source details.
 * @param {String} options.idSource Id of the source.
 * @param {Integer} options.idUser Id of the user.
 * @param {String} options.idProject Id of the project.
 * @param {String} [options.title] English title.
 * @param {String} [options.type="vector"] Type: vector, raster, tabular.
 * @param {String} [options.language"] langauge 2 letters code
 * @param {Boolean} [options.enable_download=false] Enable download option.
 * @param {Boolean} [options.enable_wms=false] Enable WMS (Web Map Service).
 * @param {PgClient} [client=pgWrite] The PostgreSQL client for database operations.
 * @return {Promise<Boolean>} inserted - Promise resolving to a boolean indicating success.
 */
async function registerSource(options, client = pgWrite) {
  const {
    idSource,
    idUser,
    idProject,
    title,
    type = "vector",
    enable_download = false,
    enable_wms = false,
    language = "en",
  } = options;

  const roles = await getUserRoles(idUser, idProject);

  // Validation
  if (!isSourceId(idSource)) {
    throw Error("Register source: idSource not valid");
  }

  if (!isProjectId(idProject)) {
    throw Error("Register source: idProject not valid");
  }

  if (!roles.publisher) {
    throw Error("Register source: Unauthorized");
  }

  if (!["vector", "raster", "tabular", "join"].includes(type)) {
    throw Error("Register source: type not valid");
  }
  if (!languages.includes(language)) {
    throw Error("Register source: language not valid");
  }

  // Services
  const services = [];
  if (enable_wms) {
    services.push("gs_ws_b");
  }

  if (enable_download) {
    services.push("mx_download");
  }

  const titleLanguage = {};

  titleLanguage[language] = title;

  // Insert
  const meta = {
    meta: {
      text: {
        title: titleLanguage,
      },
    },
  };

  const sqlAddSource = `
        INSERT INTO mx_sources (
            id,
            editor,
            readers,
            editors,
            date_modified,
            type,
            project,
            data,
            services
        )
        VALUES (
            $1::text,
            $2::integer,
            '["publishers"]',
            '["publishers"]',
            now(),
            $3::text,
            $4::text,
            $5::jsonb,
            $6::jsonb
        )`;

  await client.query(sqlAddSource, [
    idSource,
    idUser,
    type,
    idProject,
    JSON.stringify(meta),
    JSON.stringify(services),
  ]);

  return true;
}
/**
 * Updates the date_modified column of the mx_sources table for the specified source ID.
 *
 * @param {string} idSource - The ID of the source in the mx_sources table.
 * @returns {Promise<boolean>} - Returns true if the update is successful, false otherwise.
 * @throws {Error} - Throws an error if there's an issue with the database operation.
 */
export async function updateMxSourceTimestamp(idSource, pgClient = null) {
  if (!isSourceId(idSource)) {
    return false;
  }

  const client = pgClient || pgWrite;

  const updateMxSourcesQuery = `
      UPDATE mx_sources
      SET date_modified = NOW()
      WHERE id = $1
    `;

  const result = await client.query(updateMxSourcesQuery, [idSource]);

  if (result.rowCount !== 1) {
    throw new Error("Rows affected is not equal to 1");
  }

  return true;
}

/**
 * Set mx_source data values, and create recursive keys if needed
 * @param {string} idSource source id
 * @param {array} path array i.e ["settings","editor","columns_order"]
 * @param {array|object} value value stringifiable
 * @return {Promise<array>} rows affected
 */
export async function setMxSourceData(idSource, path, value) {
  const client = await pgWrite.connect();
  await client.query("BEGIN");
  const out = [];
  try {
    const pathArray = path.map((item) => `'${item}'`).join(",");
    const valueString = JSON.stringify(value);
    const qsql = parseTemplate(templates.setMxSourceData, {
      path: pathArray,
      value: valueString,
      idSource,
    });
    const res = await client.query(qsql);

    if (res.rowCount !== 1) {
      throw new Error("Row count not 1");
    }

    out.push(...res.rows);

    client.query("COMMIT");
  } catch (e) {
    client.query("ROLLBACK");
    throw new Error("setSourceData failed");
  } finally {
    client.release();
  }
  return out;
}
/**
 * Sget mx_source data values
 * @param {string} idSource source id
 * @param {array} path array i.e ["settings","editor","columns_order"]
 * @return {Promise<array|object>} value stored
 */
export async function getMxSourceData(idSource, path) {
  const pathJSON = path.map((item) => `"${item}"`).join(",");
  const res = await pgRead.query(`
SELECT data #> '{${pathJSON}}' as value 
FROM mx_sources
WHERE id = '${idSource}'
LIMIT 1`);
  return res.rows?.[0]?.value;
}

/**
 * Test empty table : if no records, remove table, else register it as source
 * @param {String|Object} idSource id of the layer to add, or object with idSource, idUser, idProject, title.
 */
async function registerOrRemoveSource(
  idSource,
  idUser,
  idProject,
  title,
  type = "vector",
  enable_download = null,
  enable_wms = false
) {
  if (typeof idSource === "object") {
    const options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
    type = options.vector || "vector";
  }
  const stats = {
    removed: false,
    registered: false,
  };
  const sqlCountRow = {
    text: `SELECT count(*) n FROM ${idSource}`,
  };

  const r = await pgRead.query(sqlCountRow);
  const count = r.rowCount > 0 ? r.rows[0].n * 1 : 0;

  if (count === 0) {
    stats.removed = await removeSource(idSource);
  }

  if (!stats.removed) {
    await registerSource({
      idSource,
      idUser,
      idProject,
      title,
      type,
      enable_download,
      enable_wms,
    });

    stats.registered = true;
  }

  return stats;
}

/**
 * Remove source
 * @param {String} idSource Source to remove
 * @return {Promise<Boolean>} Removed
 */
async function removeSource(idSource) {
  const sqlDelete = {
    text: `DELETE FROM mx_sources WHERE id = $1::text`,
    values: [idSource],
  };
  const sqlDrop = {
    text: `DROP TABLE IF EXISTS ${idSource}`,
  };
  await pgWrite.query(sqlDrop);
  await pgWrite.query(sqlDelete);
  const sourceExists = await tableExists(idSource);
  return !sourceExists;
}

/**
 * Remove view
 * @param {String} idView Id  of the view to remove
 * @return {Promise<Boolean>} Removed
 */
async function removeView(idView) {
  const sqlDelete = {
    text: `DELETE FROM mx_views WHERE id = $1::text`,
    values: [idView],
  };
  await pgWrite.query(sqlDelete);
  return true;
}
/**
 * Get layer columns names
 * @param {String} id of the layer
 */
async function getColumnsNames(idLayer) {
  var queryAttributes = {
    text: `SELECT column_name AS names 
    FROM information_schema.columns 
    WHERE table_name=$1`,
    values: [idLayer],
  };
  const data = await pgRead.query(queryAttributes);
  return data.rows.map((a) => a.names);
}

/**
 * Get layer dimensions (gid expected)
 * @param {String} id of the table
 * @return{Object} { nrow : <n>, ncol :<n>}
 */
async function getTableDimension(idTable) {
  const colNames = await getColumnsNames(idTable);
  const ncol = colNames.length;
  const resRows = await pgRead.query(`SELECT count(${gid}) FROM ${idTable}`);
  const nrow = resRows.rows[0]?.count;
  return {
    nrow,
    ncol,
  };
}

/**
 * Get columns types
 * @async
 * @param {String} idSource Id of the source
 * @param {String|Array<String>} idAttr Id of the attribute. If empty, all
 * attributes are returned
 * @param {Array<String>} idAttrExclude Array of attribute ids to exclude,
 * default are ['gid','geom']
 * @return {Promise<array>} Array of types
 */
async function getColumnsTypesSimple(
  idSource,
  idAttr,
  idAttrExclude = ["gid", "geom"]
) {
  if (!isSourceId(idSource)) {
    return [];
  }
  if (isEmpty(idAttr)) {
    idAttr = await getColumnsNames(idSource);
  }

  const sqlSrcAttr = templates.getColumnsTypesSimple;
  const cNames = isArray(idAttr) ? idAttr : [idAttr];
  const cNamesFiltered = cNames.filter((col) => !idAttrExclude.includes(col));

  const values = [idSource, cNamesFiltered];
  const resp = await pgRead.query(sqlSrcAttr, values);
  return resp.rows;
}

/**
 * Get the latest timestamp from a source / layer / table
 * @param {String} idSource Id of the source
 * @param {pg.Client} [client=pgRead] - PostgreSQL client to be used for the query. Defaults to `pgRead` if not provided.
 * @return {Number} timetamp
 */
async function getSourceLastTimestamp(idSource, client = pgRead) {
  if (!isSourceId(idSource)) {
    return null;
  }

  const res = await client.query(templates.getSourceDateModified, [idSource]);

  if (res.rowCount === 0) {
    throw new Error("No timestamp found for source " + idSource);
  }

  const [row] = res.rows;

  return row.date_modified;
}
/**
 * Get source type
 * @param {String} idSource
 * @param {pg.Client} [client=pgRead] - PostgreSQL client to be used for the query. Defaults to `pgRead` if not provided.
 * @return {String} type
 */
async function getSourceType(idSource, client = pgRead) {
  if (!isSourceId(idSource)) {
    return null;
  }
  const q = `
    SELECT type
    FROM mx_sources 
    WHERE id = $1 
  `;
  const data = await client.query(q, [idSource]);
  const [row] = data.rows;

  if (!row) {
    return null;
  }

  return row.type;
}

/**
 * Checks if a source exists in the database.
 * @param {String} idSource - Id of the source to be checked.
 * @param {pg.Client} [client=pgRead] - PostgreSQL client to be used for the query. Defaults to `pgRead` if not provided.
 * @returns {Promise<Boolean>} - A promise that resolves to `true` if the source exists, or `false` if it does not.
 */
async function isSourceRegistered(idSource, client = pgRead) {
  if (!isSourceId(idSource)) {
    return false;
  }

  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM mx_sources
      WHERE id = $1
    )`;

  const data = await client.query(query, [idSource]);
  const [row] = data.rows;

  return row.exists;
}

/**
 * Get the latest timestamp from a source / layer / table
 * @param {String} idSource Id of the source
 * @return {Number} timetamp
 */
export async function getSourceLastTimestampCommit(idSource) {
  if (!isSourceId(idSource)) {
    return null;
  }
  const q = `
WITH
  maxTimestampData as (
    SELECT
      pg_xact_commit_timestamp(xmin) as t
    FROM
      $1
  ),
  maxTimestampStructure as (
    SELECT
      pg_xact_commit_timestamp(xmin) as t
    FROM
      pg_class
    WHERE
      relname = $1
  ),
  maxBoth as (
    SELECT
      t
    FROM
      maxTimestampData
    UNION
    SELECT
      t
    FROM
      maxTimestampStructure
  )
SELECT
  max(t) as timestamp
from
  maxBoth;
  `;

  const data = await pgRead.query(q, [idSource]);

  const [row] = data.rows;

  if (row) {
    return row.timestamp;
  }
}

/**
 * Get layer title
 * @param {String} id of the layer
 */
async function getLayerTitle(idLayer, language) {
  language = language || "en";
  var queryAttributes = {
    text: `SELECT 
    data#>>'{"meta","text","title","${language}"}' AS title_lang,
    data#>>'{"meta","text","title","en"}' AS title_en
    FROM mx_sources
    WHERE id=$1`,
    values: [idLayer],
  };
  const res = await pgRead.query(queryAttributes);
  const [titles] = res.rows;
  return titles.title_lang || titles.title_en || idLayer;
}

/**
 * Get layer/table column name used for styling in views
 * NOTE: not including attributes used in cc, custom style and widgets
 * i.e -> atributes a,b,c are used in source xy by at least one view
 * @param {string} idLayer Id of the layer
 * @return {Promise<string[]>} array of attribute used
 */
async function getLayerViewsAttributes(idLayer) {
  const sql = `
  SELECT DISTINCT
  jsonb_array_elements(
    data #> '{attribute,names}' || 
    jsonb_build_array(data #> '{attribute,name}') 
  ) column_name
  FROM mx_views_latest
  WHERE data #>> '{source,layerInfo,name}' = $1`;
  const res = await pgRead.query(sql, [idLayer]);
  if (res.rowCount === 0) {
    return [];
  }
  const names = res.rows.map((row) => row.column_name);
  return names;
}

/**
 * Retrieves distinct column names of a source used in join.
 * @param {string} idLayer - The ID of the layer to query.
 * @returns {Promise<string[]>} A promise that resolves to an array of distinct column names.
 */
async function getLayerJoinAttributes(idLayer) {
  try {
    const query = templates.getSourceColumnsInJoin;
    const res = await pgRead.query(query, [idLayer]);
    return res.rows.map((row) => row.column_name);
  } catch (err) {
    console.error("Error executing query", err.stack);
    throw err;
  }
}

/**
 * Retrieves source known used sources' columns.
 * @param {string} idLayer - The ID of the layer to query.
 * @returns {Promise<string[]>} A promise that resolves to an array of distinct column names.
 */
async function getLayerUsedAttributes(idLayer) {
  const attributes = [];
  const attributesInViews = await getLayerViewsAttributes(idLayer);
  const attributesInJoin = await getLayerJoinAttributes(idLayer);
  attributes.push(...attributesInJoin);
  attributes.push(...attributesInViews);
  return attributes;
}

/**
 * @async
 * @param {string} idSource - The ID of the source.
 * @param {string} oldName - The old name to search for and replace in the JSONB object.
 * @param {string} newName - The new name to replace the old name with in the JSONB object.
 * @param {pg.Client} pgClient - The node-postgres client instance to use for database operations.
 * @throws {Error} If an error occurs during the update operation.
 */
async function renameTableColumn(idSource, oldName, newName, pgClient) {
  try {
    /**
     * Use existing client in case of rallback
     */
    pgClient = pgClient || pgWrite;

    if (oldName === newName) {
      console.log("Old and new names are the same, no update needed.");
      return;
    }

    const oldExists = await columnExists(oldName, idSource, pgClient);
    const newExists = await columnExists(newName, idSource, pgClient);

    if (!oldExists) {
      throw new Error(
        `Table "${idSource}" does not exist or does not have a column ${oldName}`
      );
    }

    if (newExists) {
      throw new Error(`Table "${idSource}" already have a column ${newName}`);
    }

    /**
     * Update source layer
     * ( using template literral, as new/old name should be valid
     */
    await pgClient.query(
      `ALTER TABLE ${idSource} 
      RENAME COLUMN "${oldName}" 
      TO "${newName}"`
    );
  } catch (error) {
    console.error("Error renaming source column", error);
    throw new Error(error);
  }
}

/**
 * Updates view attribute
 * @async
 * @param {string} idSource - The ID of the source.
 * @param {string} oldName - The old name to search for and replace in the JSONB object.
 * @param {string} newName - The new name to replace the old name with in the JSONB object.
 * @param {pg.Client} pgClient - The node-postgres client instance to use for database operations.
 * @return {Promise<array>} Array of affected views
 * @throws {Error} If an error occurs during the update operation.
 */
async function updateViewsAttribute(idSource, oldName, newName, pgClient) {
  try {
    /*
     * Use connectionn in case of transaction
     */
    pgClient = pgClient || pgWrite;
    /**
     * Update views
     */
    const queryUpdateViews = templates.updateViewsSourceAttributes;
    const { rows: views } = await pgClient.query(queryUpdateViews, [
      idSource,
      oldName,
      newName,
    ]);

    /**
     * Return affected views
     */
    return views;
  } catch (error) {
    console.error("Error updating source attributes", error);
    throw new Error(error);
  }
}

/**
 * Duplicates a column in a PostgreSQL table.
 * Assumes transaction management is handled upstream.
 *
 * @async
 * @param {String} idSource - Name of the table where the column will be duplicated.
 * @param {String} sourceColumn - Name of the source column to be duplicated.
 * @param {String} newColumn - Name for the new, duplicated column.
 * @param {pg.Client} pgClient - PostgreSQL client for database interaction.
 * @throws {Error} If the source and new column names are the same, or if the source column doesn't exist.
 * @return {Promise<void>}
 */
async function duplicateTableColumn(
  idSource,
  sourceColumn,
  newColumn,
  pgClient
) {
  try {
    if (sourceColumn === newColumn) {
      throw new Error("Source and new column names must be different.");
    }

    const columnTypes = await getColumnsTypesSimple(idSource, [sourceColumn]);
    if (isEmpty(columnTypes)) {
      throw new Error(
        `Table "${idSource}" does not exist or lacks column "${sourceColumn}".`
      );
    }

    const columnType = columnTypes[0].column_type;
    await pgClient.query(`
      ALTER TABLE "${idSource}" 
      ADD COLUMN IF NOT EXISTS "${newColumn}" ${columnType};
      UPDATE "${idSource}" SET "${newColumn}" = "${sourceColumn}";
    `);
  } catch (error) {
    console.error("Error in duplicating column:", error);
    throw error;
  }
}

async function removeTableColumn(idTable, column, pgClient = pgWrite) {
  const qSql = parseTemplate(templates.updateTableRemoveColumn, {
    id_table: idTable,
    column_name: column,
  });
  await pgClient.query(qSql);
}

async function addTableColumn(idTable, column, type, pgClient = pgWrite) {
  const qSql = parseTemplate(templates.updateTableAddColumn, {
    id_table: idTable,
    column_name: column,
    column_type: type,
  });
  await pgClient.query(qSql);
}

async function updateTableCellByGid(
  id_table,
  gid,
  column_name,
  column_type,
  value_new = null,
  client = pgRead
) {
  const qSql = parseTemplate(templates.updateTableCellByGid, {
    id_table,
    gid,
    column_name,
    column_type,
  });
  const regDatePg = new RegExp("^date|^timestamp");
  const isDate = regDatePg.test(column_type);
  if (isDate) {
    /**
     * Date time conversion
     * - if its empty -> null
     * - if it's a date -> use a proper date instance
     * - if target type require a timestamp and value dont have one
     *   the timezone of te server will be used ⚠️
     */
    value_new = isEmpty(value_new) ? null : new Date(value_new);
  }

  const res = await client.query(qSql, [value_new]);
  if (res.rowCount !== 1) {
    throw new Error("Error during update_cell : row affected =! 1");
  }
}

/**
 * Asynchronously checks if a specific ID exists in a given column of a PostgreSQL table.
 *
 * @param {string} table - The name of the table to query.
 * @param {string} id_col - The name of the column in which to look for the ID.
 * @param {(string|number)} id - The ID value to check for in the table.
 * @param {Client} [client=pgRead] - The PostgreSQL client to use for the query. Defaults to `pgRead`.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the ID exists, `false` otherwise.
 **/
const idExists = async (table, id_col, id, client = pgRead) => {
  try {
    const query = `
    SELECT EXISTS(
    SELECT 1 FROM ${table} WHERE ${id_col} = $1
  )
    `;
    const values = [id];

    const res = await client.query(query, values);
    return res.rows[0].exists;
  } catch (err) {
    console.error("Error executing query", err.stack);
    return false;
  }
};

/**
 * Wraps a function with a PostgreSQL transaction.
 *
 * @param {Function} action - The function to execute within the transaction.
 * @returns {Promise<any>} - Result of the executed action.
 */
async function withTransaction(action) {
  const client = await pgWrite.connect();
  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Exports
 */
export {
  withTransaction,
  insertRow,
  getLayerViewsAttributes,
  getLayerUsedAttributes,
  getLayerJoinAttributes,
  getColumnsNames,
  getColumnsTypesSimple,
  getSourceLastTimestamp,
  getSourceType,
  getLayerTitle,
  isLayerValid,
  isSourceRegistered,
  sanitizeUpdates,
  areLayersValid,
  removeSource,
  removeView,
  tableHasValues,
  tableExists,
  columnExists,
  columnsExist,
  idExists,
  decrypt,
  encrypt,
  registerSource,
  registerOrRemoveSource,
  analyzeSource,
  getTableDimension,
  renameTableColumn,
  updateViewsAttribute,
  duplicateTableColumn,
  removeTableColumn,
  addTableColumn,
  updateTableCellByGid,
};
