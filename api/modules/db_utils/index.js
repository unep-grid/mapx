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

const gid = settings.validation_defaults.tables.layer_id_col;
const geom = settings.validation_defaults.tables.layer_id_geom;

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
 * Register a source in mx_sources
 * @param {String|Object} idSourceOrOptions Id of the source or an options object
 * @param {Integer} idUser Id of the user
 * @param {String} idProject Id of the project
 * @param {String} [title] English title
 * @param {String} [type="vector"] Type : vector, raster, tabular
 * @param {Boolean} [enable_download=false]
 * @param {Boolean} [enable_wms=false]
 * @return {Promise<Boolean>} inserted
 */
async function registerSource(
  idSourceOrOptions,
  idUser,
  idProject,
  title,
  type = "vector",
  enable_download = false,
  enable_wms = false
) {
  let idSource = idSourceOrOptions;

  if (typeof idSourceOrOptions === "object") {
    const options = idSourceOrOptions;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
    type = options.type || "vector";
    enable_download = options.enable_download || false;
    enable_wms = options.enable_wms || false;
  }

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

  // Services
  const services = [];
  if (enable_wms) {
    services.push("gs_ws_b");
  }

  if (enable_download) {
    services.push("mx_download");
  }

  // Insert
  const meta = {
    meta: {
      text: {
        title: {
          en: title,
        },
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

  await pgWrite.query(sqlAddSource, [
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
    await registerSource(
      idSource,
      idUser,
      idProject,
      title,
      type,
      enable_download,
      enable_wms
    );

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
 * Get simple (json) column type
 * @param {String} idSource Id of the source
 * @param {String} idAttr Id of the attribute
 * @param {Array<String>} idAttrExclude Array of attribute ids to exclude. Default is ['gid','geom']
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
 * Get column type
 * @async
 * @param {string} idAttr
 * @param {string} idTable
 * @returns {Promise<string>} type
 */
async function getColumnDataType(columnName, tableName) {
  const result = await pgRead.query(
    `
    SELECT column_name, data_type
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = $1 AND column_name = $2;
  `,
    [tableName, columnName]
  );

  if (result.rowCount === 0) {
    throw new Error(`Column "${columnName}" not found in table "${tableName}"`);
  }

  return result.rows[0].data_type;
}

/**
 * Get the latest timestamp from a source / layer / table
 * @param {String} idSource Id of the source
 * @return {Number} timetamp
 */
async function getSourceLastTimestamp(idSource) {
  if (!isSourceId(idSource)) {
    return null;
  }

  const q = `
    SELECT date_modified 
    FROM mx_sources 
    WHERE id = $1 
  `;
  const data = await pgRead.query(q, [idSource]);
  const [row] = data.rows;

  if (!row) {
    return 0;
  }

  return row.date_modified;
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
 * @return {array} array of attribute used
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
 * Duplicate a postgres column
 * Transaction is handled upstream
 * @async
 * @param {string} idColumn
 * @param {string} idColumnNew
 * @param {pg.Client} postgres
 * @return {Promise<boolean>} done
 */
async function duplicateTableColumn(idSource, sourceName, destName, pgClient) {
  try {
    if (sourceName === destName) {
      throw new Error(
        "Source and destination names are the same, duplicate impossible"
      );
    }

    const sourceExists = await columnExists(sourceName, idSource, pgClient);

    if (!sourceExists) {
      throw new Error(
        `Table "${idSource}" does not exist or does not have a column ${sourceName}`
      );
    }

    /**
     * Update source layer
     * ( using template literral, as new/old name should be valid
     */
    const sourceColumnType = await getColumnDataType(sourceName, idSource);

    await pgClient.query(`
    ALTER TABLE "${idSource}" 
    ADD COLUMN IF NOT EXISTS"${destName}" ${sourceColumnType};
    UPDATE "${idSource}" SET "${destName}" = "${sourceName}";
    `);
  } catch (error) {
    console.error("Error duplicating source attributes", error);
    throw new Error(error);
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
 * Exports
 */
export {
  insertRow,
  getLayerViewsAttributes,
  getColumnsNames,
  getColumnsTypesSimple,
  getSourceLastTimestamp,
  getLayerTitle,
  isLayerValid,
  sanitizeUpdates,
  areLayersValid,
  removeSource,
  removeView,
  tableHasValues,
  tableExists,
  columnExists,
  columnsExist,
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
