import { initQueryParams } from "./../mx.js";
import { settings } from "./../settings";
import { asBoolean } from "./../mx_helper_misc.js";
import {
  isArray,
  isEmpty,
  isString,
  isBoolean,
  isObject,
  isNumeric,
  isArrayOfString,
  isArrayOfNumber,
  isBooleanCoercible,
} from "./../is_test";
import { isJSON } from "../is_test/index.js";

/**
 * Set url init param
 * @param {Object} param Object to use as default. If empty, get current query parameters
 * @param {Object} opt Options
 * @param {Boolean} opt.reset Reset current init params ?
 */
export function setQueryParametersInit(param = null, opt = { reset: false }) {
  const init = initQueryParams;
  param = isEmpty(param) ? getQueryParametersAsObject() : param;
  if (opt.reset) {
    for (const k of Object.keys(init)) {
      delete init[k];
    }
  }
  for (const [key, value] of Object.entries(param)) {
    init[key] = asArray(value);
  }
}

/**
 * Reset init parameters
 */
export function setQueryParametersInitReset() {
  setQueryParametersInit(null, { reset: true });
}

export function getQueryParametersInit() {
  return initQueryParams;
}

/**
 * Get stored query parameters
 * @param {String||Array} name/key to retrieve
 * @return {Array||Any}
 */

export function getQueryParameterInit(idParam, def) {
  let out = [];
  if (isArray(idParam)) {
    idParam.forEach(add, true);
  } else {
    add(idParam);
  }

  return asArray(out);

  function add(id) {
    const value = initQueryParams[id] || def;
    if (typeof value === "undefined") {
      return;
    }
    if (isArray(value)) {
      out.push(...value);
    } else {
      out.push(value);
    }
  }
}

export function getQueryViewsInit() {
  return {
    idViewsOpen: getQueryParameterInit(["idViewsOpen", "viewsOpen"]),
    collections: getQueryParameterInit(["idCollections", "collections"]),
    idViews: getQueryParameterInit(["idViews", "views"]),
    collectionsSelectOperator: getQueryParameterInit(
      "collectionsSelectOperator",
      "",
    )[0],
    noViews: getQueryParameterInit("noViews", false)[0],
    roleMax: getQueryParameterInit(
      ["viewsRoleMax", "filterViewsByRoleMax"],
      "",
    )[0],
  };
}
export function getQueryInit() {
  const qViews = getQueryViewsInit();
  const config = {
    isFlatMode: getQueryParameterInit("viewsListFlatMode", false)[0],
    isFilterActivated: getQueryParameterInit(
      "viewsListFilterActivated",
      false,
    )[0],
  };
  Object.assign(config, qViews);
  return config;
}

/**
 * Remove query parameters item based on default set in temporaryParamKeys
 */
export function cleanTemporaryQueryParameters() {
  const params = getQueryParametersAsObject();
  const keysCurrent = Object.keys(params);
  const keysPermanent = settings.paramKeysPermanent || [];

  keysCurrent.forEach((k) => {
    if (keysPermanent.indexOf(k) === -1) {
      delete params[k];
    }
  });
  setQueryParameters(params, { update: false });
}

/**
 * Get url query parameter by name
 *
 * @param {String|Array} name Name of the query parameter name. If name is an array, values will be concatenated in the same array
 * @return {Array} Array of values from the query parameter
 */
export function getQueryParameter(name) {
  if (isArray(name)) {
    return getQueryParameter_array(name);
  } else {
    const url = new URL(window.location.href);
    let value = url.searchParams.get(name);
    if (isBooleanCoercible(value)) {
      value = asBoolean(value);
    }
    return asArray(value);
  }
}

function getQueryParameter_array(names) {
  return names
    .map((n) => getQueryParameter(n))
    .reduce((p, a) => a.concat(p), []);
}

/**
 * Get all query parameters as an object
 * @param {String} urlString Url to decode. If empty window.location.href is used
 * @param {Object} opt Options
 * @param {Boolean} opt.lowerCase convert parameters to lower case
 * @return {Object}
 */
export function getQueryParametersAsObject(urlString = "", opt = {}) {
  const out = {};
  opt = Object.assign({}, { lowerCase: false }, opt);
  const url = new URL(urlString || window.location.href);
  url.searchParams.forEach((v, k) => {
    if (isBooleanCoercible(v)) {
      v = asBoolean(v);
    }
    /**
     * Note: check why lowercase was set
     * Answer : to lower case is more predictable, e.g. in checking for presence/absence of a parameter
     */
    if (opt.lowerCase) {
      out[k.toLowerCase()] = asArray(v);
    } else {
      out[k] = asArray(v);
    }
  });
  return out;
}

function asArray(str) {
  return !str
    ? []
    : isJSON(str)
      ? [JSON.parse(str)]
      : isArray(str)
        ? str
        : isString(str)
          ? str.split(",")
          : [str];
}

function asString(array) {
  return isString(array)
    ? array
    : isArray(array)
      ? array.join(",")
      : JSON.stringify(array);
}

/**
 * Replace current URL state using object values.
 * @param {Object} params - Object with search params as key/value pairs.
 * @param {Object} [opt] - Options.
 * @param {Boolean} [opt.update=true] - Update current state? If false, reset.
 * @return {null}
 */
export function setQueryParameters(params, opt = { update: true }) {
  const currentUrl = new URL(window.location.href);
  const searchParams = currentUrl.searchParams;

  if (!opt.update) {
    for (const k of searchParams) {
      searchParams.delete(k);
    }
  }

  for (const key of Object.keys(params)) {
    const value = asString(params[key]);
    searchParams.set(key, value);
  }

  history.replaceState(null, null, currentUrl);
}

/**
 * Update only version.
 * Shiny need a one parameter handler for binding, setQueryParameters takes two.
 */
export function setQueryParametersUpdate(params) {
  return setQueryParameters(params, { update: true });
}

/**
 * Convert object to params string
 *
 * @param {Object} opt Options
 * @param {Object} object to convert
 * @return {String} params string
 */
export function objToParams(data) {
  const esc = encodeURIComponent;

  const params = Object.keys(data).map((k) => {
    if (k) {
      let value = data[k];
      if (
        isString(value) ||
        isBoolean(value) ||
        isObject(value) ||
        isNumeric(value) ||
        isArrayOfString(value) ||
        isArrayOfNumber(value)
      ) {
        if (isObject(value)) {
          value = JSON.stringify(value);
        }
        return `${esc(k)}=${esc(value)}`;
      }
    }
  });
  return params.join("&");
}
