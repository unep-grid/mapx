import commonloc from './locations.json';
import {getDictItem, getDictItemId} from './../mx_helper_language.js';
import {getMap,getBoundsArray} from './../mx_helper_map.js';
import {getArrayDiff} from './../array_stat';
/**
 * FitBounds with name/code resolver for iso3,m49 and text
 * @param {Object} o options
 * @param {String} o.id map id
 * @param {String} o.code Code: iso3 or m49. E.g. 'COD','m49_004'
 * @param {String} o.name Name: Country or region mame. e.g. Africa, Bangladesh
 * @param {Boolean} o.inverse Inverse selection, e.g. for feature that cross
 * @param {Object} o.param Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions
 * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
 */
export async function commonLocFitBbox(o) {
  o = Object.assign({}, {param: {animate: true}}, o);
  const map = getMap();
  const bbox = await commonLocGetBbox(o);
  if (bbox) {
    const bboxCurr = getBoundsArray();
    const hasDiff = getArrayDiff(bboxCurr,bbox).length > 0;
    if(!hasDiff){
      return bbox;
    }
    map.fitBounds(bbox, o.param);
    await map.once('moveend')
    return bbox;
  }
}

/**
 * Bounding box resolver for code iso3, m49 and text + language
 * @param {Object} o options
 * @param {String} o.code Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004'
 * @param {String} o.name Name: Country or region mame. e.g. Africa, Bangladesh
 * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
 */
export async function commonLocGetBbox(o) {
  o = Object.assign({}, {code: 'WLD', name: null, language: null}, o);
  if (o.name) {
    o.code = await getDictItemId(o.name, o.language);
  }
  const res = commonloc[o.code];
  if (!res) {
    console.warn('Common location name or id not found, available location:');
    console.table(await commonLocGetTableCodes());
    return;
  }

  return res;
}

/**
 * Get list of valid codes
 * @return {Array} array of codes
 */
export function commonLocGetListCodes() {
  return Object.keys(commonloc);
}

/**
 * Get table of valid code and names
 * @param {Object} opt Options
 * @param {String} opt.language Language (ISO 639-1 two letters code, default 'en')
 * @return {Promise<Array>} array of object : {code:<code>,name:<name>}
 */
export async function commonLocGetTableCodes(opt) {
  opt = Object.assign({}, opt);
  const out = [];
  const codes = commonLocGetListCodes();
  for (const c of codes) {
    const item = {
      code: c,
      name: await getDictItem(c, opt.language)
    };
    out.push(item);
  }
  return out;
}
