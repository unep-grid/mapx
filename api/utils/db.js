const pgRead = require.main.require('./db').pgRead;
const pgWrite = require.main.require('./db').pgWrite;
const settings = require.main.require('./settings');
const utils = require('./utils.js');
const key = settings.db.crypto.key;
const valid = require('@fxi/mx_valid');
const template = require('../templates');

/**
 * Test if a table exists and has rows
 *
 * @async
 * @param {String} id of the table
 * @return {Promise<Boolean>} Table exists
 */
exports.tableHasValues = function(idTable, schema) {
  schema = schema || 'public';
  var sqlExists = `
  /*NO LOAD BALANCE*/
  SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = '${schema}'
   AND    table_name = '${idTable}'
   )`;
  var sqlEmpty = `
   /*NO LOAD BALANCE*/
   SELECT count(geom) as n from ${idTable}
  `;
  var isThere = false;
  var hasValues = false;

  return pgRead
    .query(sqlExists)
    .then((res) => {
      isThere = res.rowCount > 0 && res.rows[0].exists === true;
      if (!isThere) {
        return false;
      } else {
        return pgRead.query(sqlEmpty);
      }
    })
    .then((res) => {
      if (res) {
        hasValues = res.rowCount > 0 && res.rows[0].n * 1 > 0;
      }
      return isThere && hasValues;
    });
};

/**
 * Decrypt message using default key
 * @param {String} txt Message to decrypt
 * @return {String} decrypted message
 */
exports.decrypt = function(txt) {
  var sqlDecrypt = "SELECT mx_decrypt('" + txt + "','" + key + "') as msg";
  return pgRead.query(sqlDecrypt).then(function(result) {
    if (result.rowCount > 0) {
      return JSON.parse(result.rows[0].msg);
    } else {
      return {};
    }
  });
};

/**
 * Encrypt message using default key
 * @param {String} txt Message to encrypt
 * @return {String} encrypted message
 */
exports.encrypt = function(txt) {
  var sql = "SELECT mx_encrypt('" + txt + "','" + key + "') as msg";
  return pgRead.query(sql).then(function(result) {
    if (result.rowCount > 0) {
      return result.rows[0].msg;
    } else {
      return false;
    }
  });
};

/**
 * Register a source in mx_sources
 * @param {String} idSource Id of the source
 * @param {Integer} idUser Id of the user
 * @param {String} idProject Id of the project
 * @param {String} title English title
 * @return {Boolean} inserted
 */
exports.registerSource = registerSource;

function registerSource(idSource, idUser, idProject, title) {
  var options = {};

  if (typeof idSource === 'object') {
    options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
  }

  var sqlAddSource = `INSERT INTO mx_sources (
    id, editor, readers, editors, date_modified, type, project, data
  ) VALUES (
    $1::text,
    $2::integer,
    '["publishers"]',
    '["publishers"]',
    now(),
    'vector',
    $3::text,
    '{"meta":{"text":{"title":{"en":"${title}"}}}}' 
  )`;

  return pgWrite.query(sqlAddSource, [idSource, idUser, idProject]).then(() => {
    return true;
  });
}

/**
 * Test empty table : if no records, remove table, else register it as source
 * @param {String|Object} idSource id of the layer to add, or object with idSource, idUser, idProject, title.
 */
exports.registerOrRemoveSource = function(idSource, idUser, idProject, title) {
  if (typeof idSource === 'object') {
    options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
  }

  var sqlCountRow = {
    text: `SELECT count(*) n FROM ${idSource}`
  };

  return pgRead
    .query(sqlCountRow)
    .then((r) => {
      var count = r.rowCount > 0 ? r.rows[0].n * 1 : 0;
      if (count === 0) {
        return removeSource(idSource).then(() => {
          return {removed: true};
        });
      } else {
        return Promise.resolve({removed: false});
      }
    })
    .then((res) => {
      if (res.removed === true) {
        return Promise.resolve({registered: false});
      } else {
        return registerSource(idSource, idUser, idProject, title).then(() => {
          return {registered: true};
        });
      }
    });
};

/**
 * Remove source
 * @param {String} idSource Source to remove
 */
function removeSource(idSource) {
  var sqlDelete = {
    text: `DELETE FROM mx_sources WHERE id = $1::text`,
    values: [idSource]
  };
  var sqlDrop = {
    text: `DROP TABLE IF EXISTS ${idSource}`
  };
  return pgWrite.query(sqlDrop).then(() => {
    return pgWrite.query(sqlDelete);
  });
}
exports.removeSource = removeSource;

/**
 * Get layer columns names
 * @param {String} id of the layer
 */
exports.getColumnsNames = async function(idLayer) {
  var queryAttributes = {
    text: `SELECT column_name AS names 
    FROM information_schema.columns 
    WHERE table_name=$1`,
    values: [idLayer]
  };
  const data = await pgRead.query(queryAttributes);
  return data.rows.map((a) => a.names);
};

/**
 * Get simple (json) column type
 * @param {String} idSource Id of the source
 * @param {String} idAttr Id of the attribute
 * @return {String} type
 */
exports.getColumnsTypesSimple = async function(idSource, idAttr) {
  if (!valid.isSourceId(idSource) || !idAttr) {
    return null;
  }
  const cNames = valid.isArray(idAttr) ? idAttr : [idAttr];
  const cNamesTxt = `('${cNames.join("','")}')`;

  const opt = {
    idSource: idSource,
    idAttributesString: cNamesTxt
  };

  const sqlSrcAttr = utils.parseTemplate(template.getColumnsTypesSimple, opt);
  const resp = await pgRead.query(sqlSrcAttr);
  return resp.rows;
};

/**
 * Get the latest timestamp from a source / layer / table
 * @param {String} idSource Id of the source
 * @return {numeric} timetamp
 */
exports.getSourceLastTimestamp = async function(idSource) {
  if (!valid.isSourceId(idSource)) {
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
  const row = data.rows[0];

  if (row) {
    return row.timestamp;
  }
};
/**
 * Get layer title
 * @param {String} id of the layer
 */
function getLayerTitle(idLayer, language) {
  language = language || 'en';
  var queryAttributes = {
    text: `SELECT data#>>'{"meta","text","title","${language}"}' AS title 
    FROM mx_sources
    WHERE id=$1`,
    values: [idLayer]
  };
  return pgRead.query(queryAttributes).then((r) => {
    return r.rows[0].title;
  });
}
exports.getLayerTitle = getLayerTitle;

/**
 * Check for layer geom validity
 * @param {String} idLayer id of the layer to check
 * @param {Boolean} useCache Use cache
 * @param {Boolean} autoCorrect Try an automatic correction
 */
function isLayerValid(idLayer, useCache, autoCorrect) {
  useCache = utils.toBoolean(useCache, true);
  autoCorrect = utils.toBoolean(autoCorrect, false);

  var title = '';
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

  return getLayerTitle(idLayer)
    .then((t) => {
      title = t;
      return pgWrite.query(sqlNewColumn);
    })
    .then(() => {
      if (useCache) {
        return Promise.resolve();
      } else {
        /**
         * Invalidate if not use cache
         */
        return pgWrite.query(sqlDeleteColumn).then(() => {
          return pgWrite.query(sqlNewColumn);
        });
      }
    })
    .then(() => {
      /**
       * Validate if null
       */
      return pgWrite.query(sqlValidate);
    })
    .then(() => {
      if (autoCorrect) {
        return pgWrite.query(sqlAutoCorrect);
      } else {
        return Promise.resolve();
      }
    })
    .then(() => {
      /**
       * Get summary
       */
      return pgRead.query(sqlValidityStatus);
    })
    .then((res) => {
      /**
       * Default
       */
      var out = {
        nValid: 0,
        nInvalid: 0
      };

      res.rows.forEach((row) => {
        var n = row.n ? row.n * 1 || 0 : 0;
        switch (row.valid) {
          case true:
            out.nValid = n;
            break;
          case false:
            out.nInvalid = n;
            break;
        }
      });

      return {
        id: idLayer,
        valid: out.nInvalid === 0,
        title: title,
        status: out,
        useCache: useCache,
        autoCorrect: autoCorrect
      };
    });
}
exports.isLayerValid = isLayerValid;

/**
 * Check for multiple layer geom validity
 * @param {Array} idsLayer Array of id of layer to check
 * @param {Boolean} force Force revalidation of previously wrong geom
 */
exports.areLayersValid = function(idsLayers, useCache, autoCorrect) {
  idsLayers = idsLayers instanceof Array ? idsLayers : [idsLayers];
  var queries = idsLayers.map(function(id) {
    return isLayerValid(id, useCache, autoCorrect);
  });
  return Promise.all(queries);
};
