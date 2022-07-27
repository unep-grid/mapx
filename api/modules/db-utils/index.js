import {pgRead, pgWrite} from '#mapx/db';
import {settings} from '#root/settings';
import {parseTemplate, toBoolean} from '#mapx/helpers';
import {templates} from '#mapx/template';
import {isArray, isSourceId, isNumeric, isProjectId} from '@fxi/mx_valid';

/**
 * crypto key
 */
const {key} = settings.db.crypto;

/**
 * Test if a table exists
 *
 * @param {String} idTable id of the table
 * @return {Promise<Boolean>} Table exists
 */
async function tableExists(idTable, schema) {
  schema = schema || 'public';
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
 * Test if a table exists, has rows, has attribute and a value
 *
 * @param {String} idTable id of the table
 * @return {Promise<Boolean>} Table exists and has value
 */
async function tableHasValues(idTable, schema) {
  schema = schema || 'public';
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
    const hasAttr = attr && !['gid', 'geom'].includes(attr);
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
  type = 'vector'
) {
  if (typeof idSource === 'object') {
    const options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
    type = options.vector || 'vector';
  }

  /**
   * Validation
   */
  if (!isSourceId(idSource)) {
    throw Error('Register source : idSource not valid');
  }
  if (!isProjectId(idProject)) {
    throw Error('Register source : idProject not valid');
  }
  if (!isNumeric(idUser)) {
    // check instead of existing user...
    throw Error('Register source : idUser not valid');
  }
  if (!['vector', 'raster', 'tabular'].includes(type)) {
    throw Error('Register source : type not valid');
  }

  const sqlAddSource = `INSERT INTO mx_sources (
    id, editor, readers, editors, date_modified, type, project, data
  ) VALUES (
    $1::text,
    $2::integer,
    '["publishers"]',
    '["publishers"]',
    now(),
    $3::text,
    $4::text,
    '{"meta":{"text":{"title":{"en":"${title}"}}}}' 
  )`;
  await pgWrite.query(sqlAddSource, [idSource, idUser, type, idProject]);
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
  type = 'vector'
) {
  if (typeof idSource === 'object') {
    const options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
    type = options.vector || 'vector';
  }
  const stats = {
    removed: false,
    registered: false
  };
  const sqlCountRow = {
    text: `SELECT count(*) n FROM ${idSource}`
  };

  const r = await pgRead.query(sqlCountRow);
  const count = r.rowCount > 0 ? r.rows[0].n * 1 : 0;

  if (count === 0) {
    stats.removed = await removeSource(idSource);
  }

  if (!stats.removed) {
    await registerSource(idSource, idUser, idProject, title, type);
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
  var sqlDelete = {
    text: `DELETE FROM mx_sources WHERE id = $1::text`,
    values: [idSource]
  };
  var sqlDrop = {
    text: `DROP TABLE IF EXISTS ${idSource}`
  };
  await pgWrite.query(sqlDrop);
  await pgWrite.query(sqlDelete);
  const sourceExists = await tableExists(idSource);
  return !sourceExists;
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
    values: [idLayer]
  };
  const data = await pgRead.query(queryAttributes);
  return data.rows.map((a) => a.names);
}

/**
 * Get simple (json) column type
 * @param {String} idSource Id of the source
 * @param {String} idAttr Id of the attribute
 * @return {String} type
 */
async function getColumnsTypesSimple(idSource, idAttr) {
  if (!isSourceId(idSource) || !idAttr) {
    return null;
  }
  const cNames = isArray(idAttr) ? idAttr : [idAttr];
  const cNamesTxt = `('${cNames.join(`','`)}')`;

  const opt = {
    idSource: idSource,
    idAttributesString: cNamesTxt
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
  language = language || 'en';
  var queryAttributes = {
    text: `SELECT 
    data#>>'{"meta","text","title","${language}"}' AS title_lang,
    data#>>'{"meta","text","title","en"}' AS title_en
    FROM mx_sources
    WHERE id=$1`,
    values: [idLayer]
  };
  const res = await pgRead.query(queryAttributes);
  const [titles] = res.rows;
  return titles.title_lang || titles.title_en || idLayer;
}

/**
 * Check for layer geom validity
 * @param {String} idLayer id of the layer to check
 * @param {Boolean} useCache Use cache
 * @param {Boolean} autoCorrect Try an automatic correction
 * @param {Boolean} autoCorrect Try an automatic correction
 * @return {<Promise>Object} Geom validiy summary
 */
async function isLayerValid(idLayer, useCache, autoCorrect, analyze) {
  useCache = toBoolean(useCache, true);
  autoCorrect = toBoolean(autoCorrect, false);
  analyze = toBoolean(analyze, true);

  var idValidColumn = '_mx_valid';

  /**
   * Cache column creation
   */
  var sqlNewColumn = `
  ALTER TABLE ${idLayer} 
  ADD COLUMN IF NOT EXISTS ${idValidColumn} BOOLEAN
  DEFAULT null
  `;

  /*
   * Validation query
   */
  var sqlValidate = `
  UPDATE ${idLayer} 
  SET ${idValidColumn} = ST_IsValid(geom)
  WHERE ${idValidColumn} IS null
  `;

  /**
   * Autocorrect query
   */
  var sqlAutoCorrect = `
  UPDATE ${idLayer}
  SET geom = 
    CASE
      WHEN GeometryType(geom) ~* 'POLYGON'
      THEN ST_Multi(ST_Buffer(geom,0))
      ELSE ST_MakeValid(geom)
    END,
    ${idValidColumn} = true 
  WHERE 
    NOT ${idValidColumn} 
  `;

  /*
   * Set cache to true
   */
  var sqlDeleteColumn = `
  ALTER TABLE ${idLayer}
  DROP COLUMN IF EXISTS ${idValidColumn}
  `;

  /**
   * Count valid query
   */
  var sqlValidityStatus = `
  /*NO LOAD BALANCE*/
  SELECT count(${idValidColumn}) as n, ${idValidColumn} as valid
  FROM  ${idLayer}
  GROUP BY ${idValidColumn}`;

  const title = await getLayerTitle(idLayer);

  /**
   * ANALYZE first
   */
  if (analyze) {
    await analyzeSource(idLayer);
  }

  /**
   * Invalidate if not use cache
   */
  if (!useCache) {
    await pgWrite.query(sqlDeleteColumn);
  }
  await pgWrite.query(sqlNewColumn);
  /**
   * Validate if null
   */
  await pgWrite.query(sqlValidate);

  /**
   * Autocrrect
   */
  if (autoCorrect) {
    await pgWrite.query(sqlAutoCorrect);
  }
  /**
   * Get summary
   */
  const res = await pgRead.query(sqlValidityStatus);
  /**
   * Default
   */
  var out = {
    nValid: 0,
    nInvalid: 0
  };

  for (const row of res.rows) {
    var n = row.n ? row.n * 1 || 0 : 0;
    switch (row.valid) {
      case true:
        out.nValid = n;
        break;
      case false:
        out.nInvalid = n;
        break;
    }
  }

  return {
    id: idLayer,
    valid: true,
    title: title,
    status: out,
    useCache: useCache,
    autoCorrect: autoCorrect,
    analyze: analyze
  };
}

/**
 * Check for multiple layer geom validity
 * @param {Array} idsLayer Array of id of layer to check
 * @param {Boolean} force Force revalidation of previously wrong geom
 * @return {Promise<Object>} validation object
 */
function areLayersValid(idsLayers, useCache, autoCorrect) {
  if (!isArray(idsLayers)){
    idsLayers = [idsLayers];
  }
  const queries = [];
  for(const id of idsLayers){
    queries.push(isLayerValid(id, useCache, autoCorrect))
  } 
  return Promise.all(queries);
}

/**
 * Exports
 */
export {
  getColumnsNames,
  getColumnsTypesSimple,
  getSourceLastTimestamp,
  getLayerTitle,
  isLayerValid,
  areLayersValid,
  removeSource,
  tableHasValues,
  tableExists,
  decrypt,
  encrypt,
  registerSource,
  registerOrRemoveSource,
  analyzeSource
};
