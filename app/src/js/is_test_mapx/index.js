import { getLanguagesAll } from "../language/index.js";
import { settings } from "../mx.js";
import { ViewBase } from "../views_builder/view_base.js";
import { isObject, isArrayOf, isView } from "./../is_test/index.js";
import { getView } from "./../map_helpers/index.js";
export * from "./../is_test/index.js";

/**
 * MapX specific method to extend 'is_test'
 */

/**
 * Test if item is an language object, e.g. as defined in json schema
 * @param {Object} item to test
 * @return {Boolean}
 */
export function isLanguageObject(item) {
  const isObjectItem = isObject(item);
  if (!isObjectItem) {
    return false;
  }
  const keys = Object.keys(item);
  /**
   * No other keys than language code allowed,
   * but missing keys accepted.
   */
  let valid = false;
  for (let k of keys) {
    if (!isLanguageId(k)) {
      return false;
    } else {
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
export function isLanguageId(id) {
  const languages = getLanguagesAll();
  return languages.includes(id);
}

/**
 * Test if item is an language object array, e.g. as defined in json schema
 * @param {Object} item to test
 * @return {Boolean}
 */
export function isLanguageObjectArray(arr) {
  return isArrayOf(arr, isLanguageObject);
}

/**
 * Check if a view is open
 * @param {String|Object} view View or view id
 * @return {Boolean}
 */
export function isViewOpen(view) {
  view = getView(view);
  return isView(view) && view._open === true;
}

/**
 * Check if a view is an instance
 * @note : 'instance' is just a test on  _vb === ViewBase, but a test will be 
 *         performed to check if view === ViewInstance
 * @param {String|Object} view View or view id
 * @return {Boolean}
 */
export function isViewInstance(view) {
  view = getView(view);
  return isView(view) && view._vb instanceof ViewBase;
}

/**
 * Test if it's a MapX view is local
 * @param {Object} item to test
 */
export function isViewLocal(item) {
  return isView(item) && item?.project === settings?.project?.id;
}
