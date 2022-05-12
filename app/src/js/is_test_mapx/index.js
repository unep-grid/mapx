import {getLanguagesAll} from '../language/index.js';
import * as test from './../is_test/index.js';
import {getView} from './../map_helpers/index.js';
export * from './../is_test/index.js';
/**
 * MapX specific method to extend 'is_test'
 */


/**
 * Test if item is an language object, e.g. as defined in json schema
 * @param {Object} item to test
 * @return {Boolean}
 */
export function isLanguageObject(item) {
  const isObject = test.isObject(item);
  if (!isObject) {
    return false;
  }
  const keys = Object.keys(item);
  /**
   * No other keys than language code allowed,
   * but missing keys accepted.
   */
  let valid = false;
  for (let k of keys) {
    if(!isLanguageId(k)){
      return false;
    }else{
      valid = true;
    }
  }
  return valid;
}

/**
* Test if language code os supported
* @param {String} id Two letter language id
* @return {Boolean}
*/ 
export function isLanguageId(id){
  const languages = getLanguagesAll();
  return languages.includes(id)
}



/**
 * Test if item is an language object array, e.g. as defined in json schema
 * @param {Object} item to test
 * @return {Boolean}
 */
export function isLanguageObjectArray(arr) {
  return test.isArrayOf(arr, isLanguageObject);
}

/**
 * Check if a view is open
 * @param {String|Object} view View or view id
 * @return {Boolean}
 */
export function isViewOpen(view) {
  view = getView(view);
  return test.isView(view) && view._open === true;
}


