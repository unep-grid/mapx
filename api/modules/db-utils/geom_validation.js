import { pgRead, pgWrite } from "#mapx/db";
import { isArray } from "@fxi/mx_valid";
import { toBoolean } from "#mapx/helpers";
import { analyzeSource, getLayerTitle } from "./index.js";
import { settings } from "#root/settings";

const def = settings.validation_defaults;
const idValidColumn = def.tables.layer_id_valid;
const idGeomColumn = def.tables.layer_id_geom;
const idGeomId = def.tables.layer_id_col;

/**
 * Check for layer geom validity
 * @param {String} idLayer id of the layer to check
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
  validate
) {
  useCache = toBoolean(useCache, true);
  autoCorrect = toBoolean(autoCorrect, false);
  analyze = toBoolean(analyze, true);
  validate = toBoolean(validate, true);
  const title = await getLayerTitle(idLayer);

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
   */
  const sqlValidateCache = `
  UPDATE ${idLayer} 
  SET ${idValidColumn} = ST_IsValid(${idGeomColumn})
  AND ST_CoveredBy(
    ${idGeomColumn},
    ST_MakeEnvelope(-180, -90, 180, 90, 4326)
  )
  WHERE ${idValidColumn} IS null
  `;
  const sqlValidate = `
  UPDATE ${idLayer} 
  SET ${idValidColumn} = ST_IsValid(${idGeomColumn})
  AND ST_CoveredBy(
    ${idGeomColumn},
    ST_MakeEnvelope(-180, -90, 180, 90, 4326)
  )`;

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

  /**
   * Validate
   * - With cache : validate only if 'null'
   * - Without caceh : always validate
   */
  if (validate) {
    if (!useCache) {
      await pgWrite.query(sqlValidate);
    } else {
      await pgWrite.query(sqlValidateCache);
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
    //console.log("Start world correction");
    await pgWrite.query(sqlAutoCorrectWorld);
    //console.log("Re validate after world corrections");
    await pgWrite.query(sqlValidate);
    //console.log("Start geom correction");
    await pgWrite.query(sqlAutoCorrectGeom);
    //console.log("Re validate after geom corrections");
    await pgWrite.query(sqlValidate);
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

  /**
   * Get summary ex.
   * [
   *  {status: "unknown", n:10 },
   *  {status: "valid",   n:12 },
   *  {status: "invalid", n:5  }
   * ]
   */
  const res = await pgRead.query(sqlValidityStatus);
  /**
   * Default
   */
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const d = res.rows.find((r) => r.status === v) || {};
    out[v] = d?.n || 0;
  }

  return out;
}
