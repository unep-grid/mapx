import { pgRead, pgWrite } from "#mapx/db";
import { isArray, isFunction, isObject } from "@fxi/mx_valid";
import { toBoolean } from "#mapx/helpers";
import { analyzeSource, getLayerTitle } from "./index.js";
import { settings } from "#root/settings";

const def = settings.validation_defaults;
const idValidColumn = def.tables.layer_id_valid;
const idGeomColumn = def.tables.layer_id_geom;
const idGeomId = def.tables.layer_id_col;

/**
 * Check for layer geom validity
 * TODO: USE sql package
 * @param {String | Object} idLayer id of the layer to check OR config object
 * @param {Boolean} useCache Use cache
 * @param {Boolean} autoCorrect Try an automatic correction
 * @param {Boolean} autoCorrect Try an automatic correction
 * @return {<Promise>Object} Geom validiy summary
 */
export async function isLayerValid(
  idLayer,
  useCache,
  autoCorrect,
  analyze,
  validate,
  onProgress
) {
  /**
   * Allow config object as first argument
   */
  if (isObject(idLayer)) {
    const opt = idLayer;
    idLayer = opt.idLayer;
    useCache = opt.useCache;
    analyze = opt.analyze;
    validate = opt.validate;
    autoCorrect = opt.autoCorrect;
    onProgress = opt.onProgress;
  }

  useCache = toBoolean(useCache, true);
  autoCorrect = toBoolean(autoCorrect, false);
  analyze = toBoolean(analyze, true);
  validate = toBoolean(validate, true);
  const title = await getLayerTitle(idLayer);
  const withProgress = isFunction(onProgress);
  /**
   * Add validation column (cache)
   */
  const sqlNewColumn = `
  ALTER TABLE ${idLayer} 
  ADD COLUMN IF NOT EXISTS ${idValidColumn} BOOLEAN
  DEFAULT null
  `;

  /**
   * Remove validation column (cache)
   */
  const sqlDeleteColumn = `
  ALTER TABLE ${idLayer}
  DROP COLUMN IF EXISTS ${idValidColumn}
  `;

  /*
   * Validation query
   * - cache version : only validate feature not already validated
   * - normal version : all feature (re) validated
   * ⚠️  as _req_prog add AND clause, WHERE should be set
   */

  const sqlValidate = `
  UPDATE ${idLayer} 
  SET ${idValidColumn} = ST_IsValid(${idGeomColumn})
  AND ST_CoveredBy(
    ${idGeomColumn},
    ST_MakeEnvelope(-180, -90, 180, 90, 4326)
  ) 
  WHERE true`;
  const sqlValidateCache = `${sqlValidate} AND ${idValidColumn} IS null`;

  /**
   * Autocorrect geom
   *
   * - Postgis (https://postgis.net/docs/ST_MakeValid.html)
   * - Buffer + convert o multi for polygon ( faster, predictible )
   */
  const sqlAutoCorrectGeom = `
  UPDATE ${idLayer}
  SET ${idGeomColumn} = 
    CASE
      WHEN GeometryType(${idGeomColumn}) ~* 'POLYGON'
      THEN ST_Multi(ST_Buffer(${idGeomColumn},0))
      ELSE ST_MakeValid(${idGeomColumn})
    END
  WHERE 
    NOT ${idValidColumn} 
  `;

  /**
   * Autocorrect extent
   * - Crop geom outside "world"
   */
  const sqlAutoCorrectWorld = `
  UPDATE ${idLayer} 
  SET ${idGeomColumn} = ST_Multi(ST_Intersection(
    ${idGeomColumn},
    ST_MakeEnvelope(-180, -90, 180, 90, 4326)
  ))
  WHERE
    NOT ${idValidColumn}`;

  /**
   * ANALYZE first
   */
  if (analyze) {
    await analyzeSource(idLayer);
  }

  /**
   * Delete column if cache is not wanted
   */
  if (!useCache) {
    await pgWrite.query(sqlDeleteColumn);
  }
  /**
   * Always check if the column exists
   * and create it if required
   */
  await pgWrite.query(sqlNewColumn);

  /*
   * Using with progress, loop over gid.
   * TODO: check if there is a better way..
   */
  const gids = withProgress ? await getGids(idLayer) : [];

  /**
   * Validate
   * - With cache : validate only if 'null'
   * - Without caceh : always validate
   */
  if (validate && !autoCorrect) {
    const sqlV = useCache ? sqlValidateCache : sqlValidate;
    if (withProgress) {
      await _req_prog("validate", sqlV, gids, onProgress);
    } else {
      await pgWrite.query(sqlV);
    }
  }

  /**
   * Autocorrect:
   * - Extent / world
   * - revalidate ( if world correction removed invalidated geom )
   * - Geom
   * - revalidate
   */
  if (validate && autoCorrect) {
    if (withProgress) {
      await _req_prog("fix_world", sqlAutoCorrectWorld, gids, onProgress);
      await _req_prog("validate", sqlValidate, gids, onProgress);
      await _req_prog("fix_geom", sqlAutoCorrectGeom, gids, onProgress);
      await _req_prog("validate", sqlValidate, gids, onProgress);
    } else {
      await pgWrite.query(sqlAutoCorrectWorld);
      await pgWrite.query(sqlValidate);
      await pgWrite.query(sqlAutoCorrectGeom);
      await pgWrite.query(sqlValidate);
    }
  }

  /**
   * Get summary
   */
  const stat = await getStatValidation(idLayer);

  return {
    id: idLayer,
    valid: stat.unknown > 0 || stat.invalid > 0,
    title: title,
    stat: stat,
    validate: validate,
    useCache: useCache,
    autoCorrect: autoCorrect,
    analyze: analyze,
  };
}

/**
 * Check for multiple layer geom validity
 * @param {Array} idsLayer Array of id of layer to check
 * @param {Boolean} force Force revalidation of previously wrong geom
 * @return {Promise<Object>} validation object
 */
export async function areLayersValid(idsLayers, useCache, autoCorrect) {
  if (!isArray(idsLayers)) {
    idsLayers = [idsLayers];
  }
  const queries = [];
  for (const id of idsLayers) {
    queries.push(isLayerValid(id, useCache, autoCorrect));
  }
  return Promise.all(queries);
}

/**
 * Return validation status summary
 * @param {String} idLayer Layer id
 * @return {Promise<object>} Stat e.g. {unknown:0,valid:10,invalid:11}
 */
async function getStatValidation(idLayer) {
  const values = ["unknown", "valid", "invalid"];
  const out = {};
  /**
   * Count valid query
   */
  const sqlValidityStatus = `
  SELECT count(${idGeomId}) as n,
  CASE WHEN ${idValidColumn} IS NULL THEN
  'unknown'
  WHEN ${idValidColumn} THEN
  'valid' ELSE 
  'invalid' 
  END status
  FROM ${idLayer}
  GROUP BY ${idValidColumn}`;

  const sqlValidValues = `
   SELECT ${idGeomId}, ${idValidColumn} from ${idLayer}`;

  /**
   * Get summary ex.
   * [
   *  {status: "unknown", n:10 },
   *  {status: "valid",   n:12 },
   *  {status: "invalid", n:5  }
   * ]
   */
  const resStatus = await pgRead.query(sqlValidityStatus);
  const resValues = await pgRead.query(sqlValidValues);
  /**
   * Default
   */
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const d = resStatus.rows.find((r) => r.status === v) || {};
    out[v] = d?.n || 0;
  }

  out.values = resValues.rows;

  return out;
}

async function getGids(idLayer) {
  const sql = `SELECT ${idGeomId} from ${idLayer}`;
  const res = await pgRead.query(sql);
  const gids = res.rows.map((r) => r.gid);
  return gids;
}

/**
 * Loop over gids list
 * TODO: find a less idiotic approach
 * @param {Srring} label Label for onProgress data
 * @param {String} sql Sql string
 * @param {Array} gids Array of gids
 * @param {Function} onProgress callback
 */
async function _req_prog(label, sql, gids, onProgress) {
  let sqlGid = "";
  let p = 0;
  const gidsCopy = [...gids];
  let iL = gidsCopy.length;
  const chunkSize = 50;
  if (iL <= chunkSize) {
    onProgress({ percent: 0.5, label: label });
    await pgWrite.query(sqlGid);
  } else {
    const groupsL = Math.ceil(iL / chunkSize);

    for (let i = 0; i < groupsL; i++) {
      p = i / groupsL;
      onProgress({ percent: p, label: label });
      const gidGroup = gidsCopy.splice(0, chunkSize);
      const gidTxt = gidGroup.join(",");
      const sqlGid = `${sql} AND ${idGeomId} in (${gidTxt})`;
      await pgWrite.query(sqlGid);
    }
  }
}
