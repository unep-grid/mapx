import os from "os";
import { pgRead, pgWrite } from "#mapx/db";
import { isArray, isFunction, isObject } from "@fxi/mx_valid";
import { toBoolean } from "#mapx/helpers";
import { analyzeSource, getLayerTitle } from "./index.js";
import { settings } from "#root/settings";
import { getSourceJoinLayers } from "#mapx/source";
import { getSourceType } from "#mapx/db_utils";

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

  const type = await getSourceType(idLayer);
  if (type === "join") {
    const layers = await getSourceJoinLayers(idLayer);
    /**
     * Multi geom join not yet implemented, use the first (base);
     */
    idLayer = layers[0];
  }

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
  WHERE true`;
  const sqlValidateCache = `${sqlValidate} AND ${idValidColumn} IS null`;

  /**
   * Autocorrect geom
   *
   * - Postgis (https://postgis.net/docs/ST_MakeValid.html)
   * - Buffer + convert o multi for polygon ( faster, predictible )
   * Know issues :
   *  - buffer can drop invalid polygons
   *  - makevalid can reduce the geometry dimensions ( poly -> lines -> points )
   */
  const sqlFixGeom = `UPDATE ${idLayer}
  SET geom =
    CASE
      WHEN GeometryType(${idGeomColumn}) ~* 'POLYGON'
      THEN ST_Multi(ST_Buffer(${idGeomColumn},0))
      ELSE ST_MakeValid(${idGeomColumn})
    END
  WHERE
    NOT ${idValidColumn}
  `;

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
   * Autocorrect steps :
   * - Validation
   * - Geom validation
   * - revalidate
   * - Extent / world
   * - revalidate
   */
  if (validate && autoCorrect) {
    if (withProgress) {
      await _req_prog("validate", sqlValidate, gids, onProgress, 1, 33);
      await _req_prog("fix_geom", sqlFixGeom, gids, onProgress, 34, 66);
      await _req_prog("validate", sqlValidate, gids, onProgress, 67, 100);
    } else {
      await pgWrite.query(sqlValidate);
      await pgWrite.query(sqlFixGeom);
      await pgWrite.query(sqlValidate);
      await pgWrite.query(sqlValidate);
    }
  }

  /**
   * Get summary
   */
  const stat = await getStatValidation(idLayer);

  return {
    id: idLayer,
    valid: stat.unknown === 0 && stat.invalid === 0,
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
 * @param {Number} pStart Progress start at (on 100)
 * @param {Number} pEnd Progress end at (on 100)
 * @param {Function} onProgress callback
 */
async function _req_prog(label, sql, gids, onProgress, pStart, pEnd) {
  let p = 0;
  pStart = pStart / 100 || 0;
  pEnd = pEnd / 100 || 1;

  const gidsCopy = [...gids];
  const iL = gidsCopy.length;
  const chunkSize = os.cpus().length * 10;
  if (iL <= chunkSize) {
    onProgress({ percent: 0.5, label: label });
    await pgWrite.query(sql);
  } else {
    const groupsL = Math.ceil(iL / chunkSize);
    for (let i = 0; i < groupsL; i++) {
      p = (pEnd - pStart) * ((i + 1) / groupsL) + pStart;
      onProgress({ percent: p, label: label });
      const gidGroup = gidsCopy.splice(0, chunkSize);
      const gidTxt = gidGroup.join(",");
      const sqlGid = `${sql} AND ${idGeomId} in (${gidTxt})`;
      await pgWrite.query(sqlGid);
    }
  }
}
