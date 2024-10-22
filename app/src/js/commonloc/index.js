import { CommonLoc } from "./common_loc.js";

/**
 * FitBounds with name/code resolver for iso3,m49 and text
 * @param {Object} options Configuration options
 * @param {String} options.id map id
 * @param {String} options.code Code: iso3 or m49. E.g. 'COD','m49_004'
 * @param {String} options.name Name: Country or region mame. e.g. Africa, Bangladesh
 * @param {Boolean} options.inverse Inverse selection, e.g. for feature that cross
 * @param {Object} options.param Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions
 * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
 */
export async function commonLocFitBbox(options) {
  const cLoc = new CommonLoc();
  const config = {
    id: options?.id,
    code: options?.code,
    name: options?.name,
    param: options?.param || { animate: true },
  };

  return cLoc.fitBbox(config);
}

/**
 * Bounding box resolver for code iso3, m49 and text + language
 * @param {Object} options Configuration options
 * @param {String|Array<string>} options.code Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004'
 * @param {String|Array<string>} options.name Name: Country or region mame. e.g. Africa, Bangladesh
 * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
 */
export async function commonLocGetBbox(options) {
  const cLoc = new CommonLoc();
  const config = {
    code: options?.code || ["WLD"],
    name: options?.name || null,
  };

  return cLoc.getBbox(config);
}

/**
 * Get list of valid codes
 * @return {Array} array of codes
 */
export function commonLocGetListCodes() {
  const cLoc = new CommonLoc();
  return cLoc.getListCodes();
}

/**
 * Get table of valid code and names
 * @param {Object} options Configuration options
 * @param {String} options.language Language (ISO 639-1 two letters code, default 'en')
 * @return {Promise<Array>} array of object : {code:<code>,name:<name>}
 */
export async function commonLocGetTableCodes(options = {}) {
  const cLoc = new CommonLoc();
  return cLoc.getTableCodes(options);
}
