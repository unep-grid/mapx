import { pgTest, pgRead, pgWrite } from "#mapx/db";
import { settings } from "#root/settings";
import { parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isArray, isSourceId, isNumeric, isProjectId } from "@fxi/mx_valid";
import { isLayerValid, areLayersValid } from "./geom_validation.js";
import { insertRow } from "./insert.js";

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
 * @return {Promise<Boolean>} Table exists
 */
async function columnExists(idColumn, idTable) {
  try {
    const sql = `
    SELECT EXISTS ( 
    SELECT 1
    FROM information_schema.columns 
    WHERE table_name=$1 
    AND column_name=$2
    )`;
    const res = await pgRead.query(sql, [idTable, idColumn]);
    const exists = res.rowCount > 0 && res.rows[0].exists;
    return exists;
  } catch (e) {
    console.error(e);
  }

  return false;
}

/**
 * Test if the first geometry of a layer is (multi)point geometry
 * @param {String} idLayer Layer id
 * @param {String} schema Schema
 * @return {Promise<boolean>} true if point like
 */
async function isPointLikeGeom(idLayer, schema) {
  schema = schema || "public";
  const sqlPointLike = `
  SELECT ST_GeometryType(${geom}) like '%Point' as ispoint from ${schema}.${idLayer}`;
  const res = await pgRead.query(sqlPointLike);
  return res.rowCount > 0 && res.rows[0].ispoint;
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
 * @param {String} idSource Id of the source
 * @param {Integer} idUser Id of the user
 * @param {String} idProject Id of the project
 * @param {String} title English title
 * @param {String} type Type : vector,raster,tabular
 * @return {Promise<Boolean>} inserted
 */
async function registerSource(
  idSource,
  idUser,
  idProject,
  title,
  type = "vector",
  enable_download,
  enable_wms
) {
  if (typeof idSource === "object") {
    const options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
    type = options.vector || "vector";
  }

  /**
   * Validation
   */
  if (!isSourceId(idSource)) {
    throw Error("Register source : idSource not valid");
  }
  if (!isProjectId(idProject)) {
    throw Error("Register source : idProject not valid");
  }
  if (!isNumeric(idUser)) {
    // check instead of existing user...
    throw Error("Register source : idUser not valid");
  }
  if (!["vector", "raster", "tabular"].includes(type)) {
    throw Error("Register source : type not valid");
  }

  /**
   * Services
   */
  const services = [];

  if (enable_wms) {
    services.push("gs_ws_b");
  }
  if (enable_download) {
    services.push("mx_download");
  }

  const strServices = JSON.stringify(services);

  /**
   * Insert
   */
  const sqlAddSource = `INSERT INTO mx_sources (
    id, editor, readers, editors, date_modified, type, project, data, services
  ) VALUES (
    $1::text,
    $2::integer,
    '["publishers"]',
    '["publishers"]',
    now(),
    $3::text,
    $4::text,
    '{"meta":{"text":{"title":{"en":"${title}"}}}}',
    $5::jsonb
  )`;
  await pgWrite.query(sqlAddSource, [
    idSource,
    idUser,
    type,
    idProject,
    strServices,
  ]);
  return true;
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
 * @return {Promise<arrayA} Array of types
 */
async function getColumnsTypesSimple(idSource, idAttr) {
  if (!isSourceId(idSource) || !idAttr) {
    return [];
  }
  const cNames = isArray(idAttr) ? idAttr : [idAttr];
  const cNamesTxt = `('${cNames.join(`','`)}')`;

  const opt = {
    idSource: idSource,
    idAttributesString: cNamesTxt,
  };

  const sqlSrcAttr = parseTemplate(templates.getColumnsTypesSimple, opt);
  const resp = await pgRead.query(sqlSrcAttr);
  return resp.rows;
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
  const q = `WITH maxTimestampData as (
            SELECT pg_xact_commit_timestamp(xmin) as t 
            FROM ${idSource}
          ),
          maxTimestampStructure as (
            SELECT pg_xact_commit_timestamp(xmin) as t 
            FROM pg_class
            WHERE relname = '${idSource}'
          ),
          maxBoth as (
             SELECT t 
             FROM maxTimestampData
             UNION
             SELECT t 
            FROM maxTimestampStructure
            )
          SELECT max(t) as timestamp from maxBoth;`;
  const data = await pgRead.query(q);
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
  isPointLikeGeom,
  decrypt,
  encrypt,
  registerSource,
  registerOrRemoveSource,
  analyzeSource,
  getTableDimension,
};
