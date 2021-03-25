import * as test from './../is_test/index.js';
import {getView} from './../mx_helper_map.js';
import {path} from './../mx_helper_misc.js';
export * from './../is_test/index.js';
/**
 * MapX specific method to extend 'is_test'
 */

/**
 * Test if story map
 * @param {Object} item Item to test
 * @return {Boolean}
 */

export function isStory(item) {
  return isView(item) && !!path(item, 'data.story', false);
}

/**
 * Test if item is an language object, e.g. as defined in json schema
 * @param {Object} item to test
 * @return {Boolean}
 */
export function isLanguageObject(item) {
  const languages = mx.settings.languages;
  const isObject = test.isObject(item);
  if (!isObject) {
    return false;
  }
  let keys = Object.keys(item);
  /**
   * No other keys than language code allowed,
   * but missing keys accepted.
   */

  for (let l of languages) {
    if (keys.indexOf(l) == -1) {
      return false;
    }
  }
  return true;
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
