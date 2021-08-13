import commonloc from './locations.json';
import {getDictItem,getDictItemId} from './../mx_helper_language.js';
import {getMap} from './../mx_helper_map.js';

/**
 * FitBounds with name/code resolver for iso3,m49 and text
 * @param {Object} o options
 * @param {String} o.id map id
 * @param {String} o.code Code: iso3 or m49. E.g. 'COD','m49_004'
 * @param {String} o.name Name: Country or region mame. e.g. Africa, Bangladesh
 * @param {Boolean} o.inverse Inverse selection, e.g. for feature that cross
 * @param {Object} o.param Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions
 */
export async function commonLocFitBbox(o) {
  o = Object.assign({}, {param: {animate: true}}, o);
  const map = getMap();
  const bbox = await commonLocGetBbox(o);
  if (bbox) {
    map.fitBounds(bbox, o.param);
    return bbox;
  }
}

/**
 * Bounding box resolver for code iso3, m49 and text + language
 * @param {Object} o options
 * @param {String} o.code Code: iso3 or m49. E.g. 'COD','m49_004'
 * @param {String} o.name Name: Country or region mame. e.g. Africa, Bangladesh

 * @param {boolean} o.param Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions
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
* @return {Promise<Array>} array of object : {code:<code>,name:<name>}
*/
export async function commonLocGetTableCodes() {
  const out = [];
  const codes = commonLocGetListCodes();
  for (const c of codes) {
    const item = {
      code: c,
      name: await getDictItem(c)
    };
    out.push(item);
  }
  return out;
}
