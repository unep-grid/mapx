/* jshint  esversion:6  */

/**
 * Test if entry is empty : empty array, empty string, etc.
 * @param {Any} item item to test
 */
export function isEmpty(item) {
  if (!item) {
    return true;
  } else if (isObject(item)) {
    return isEqual(item, {});
  } else if (isArray(item)) {
    return isEqual(item, []);
  }
}
export function isNotEmpty(item){
  return !isEmpty(item);
}

/**
 * Test if entry is an object
 * @param {Object} item
 */
export function isObject(item) {
  return !!item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Test if it's a MapX view.
 * @param {Object} item to test
 */
export function isView(item) {
  return (
    isObject(item) &&
    mx.helpers.isString(item.type) &&
    !!item.type.match(/^(vt|rt|cc||sm||gj)$/)
  );
}
export function isViewsArray(arr) {
  const h = mx.helpers;
  return (
    isArray(arr) &&
    (function() {
      // Workaround for the loop optimisation thats convert foreach to for
      return h.all(arr.map((v) => isView(v)));
    })()
  );
}

/**
 * Test if item is an language object, e.g. as defined in json schema
 * @param {Object} item to test
 */
export function isLanguageObject(item) {
  const h = mx.helpers;
  var languages = mx.settings.languages;
  return (
    isObject(item) &&
    (function() {
      // Workaround for the loop optimisation thats convert foreach to for
      return h.all(Object.keys(item).map((l) => languages.indexOf(l) > -1));
    })()
  );
}
export function isLanguageObjectArray(arr) {
  const h = mx.helpers;
  return (
    isArray(arr) &&
    (function() {
      // Workaround for the loop optimisation thats convert foreach to for
      return h.all(arr.map(isLanguageObject));
    })()
  );
}
/**
 * Test for promise
 * @param {Promise} item item to test
 */
export function isPromise(item) {
  return item instanceof Promise;
}

/**
 * Test for canvas
 * @param {Element} item item to test
 */
export function isCanvas(item) {
  return item instanceof HTMLCanvasElement;
}

/**
 * Test for fontawesome icon class
 * @param {Element} item item to test
 */
export function isIconFont(item) {
  return isElement(item) && item.classList.contains('fa');
}

/**
 * Test if entry is an aray
 * @param {Array} item array
 */
export function isArray(item) {
  return !!item && typeof item === 'object' && Array.isArray(item);
}

/**
 * Test if entry is an table (array of object)
 * @param {Array} item array
 */
export function isTable(item) {
  const h = mx.helpers;
  return (
    h.isArray(item) &&
    (function() {
      return h.all(item.map((i) => h.isObject(i)));
    })()
  );
}
export function isArrayOfObject(item) {
  return isTable(item);
}
/**
 * Test if entry is JSON
 * @param {String} String to test
 */
export function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Test if entry is numeric
 * @param {String|Number} n string or number to test
 */
export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Test if entry is boolean
 * @param {Boolean} b boolean to test
 */
export function isBoolean(b) {
  return b === true || b === false;
}

/**
 * Test if is map
 * @param {Object} map Map object
 */
export function isMap(map) {
  return mx.helpers.isObject(map) && !!map._canvas;
}
/**
 * Test if entry is string and have the correct number of characters
 * @param {String} str, character to test
 * @param {Number} min Minumum number of characters. Default 0.
 * @param {Number} max Maximum number of characters. Default Infinity.
 */
export function isStringRange(str, min, max) {
  min = min || 0;
  max = max || Infinity;
  var isValid = !!str && typeof str === 'string';
  if (!isValid) {
    return false;
  }
  str = str.trim();
  return str.length >= min && str.length <= max;
}

/**
 * Test if string contain HTML
 * @param {String} n string to test
 * @note https://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not#answer-36773193
 */
export function isHTML(str) {
  return isString(str) && /(<([^>]+)>)/i.test(str);
}

/**
 * Test if entry is an email
 * @param {String} email
 */
export function isEmail(email) {
  return (
    isString(email) &&
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      email
    )
  );
}

/**
 * Test if entry is string
 * @param {String} str string to test
 */
export function isString(str) {
  return typeof str === 'string';
}
/**
 * Test if entry is function
 * @param {Function} fun Function to test
 */
export function isFunction(fun) {
  return fun instanceof Function;
}

/**
 * Check if an object is a html element
 * @param {Object} obj object to test
 */
export function isElement(obj) {
  return obj instanceof Element;
}

/**
 * Test for object equality
 *
 * @note asnwer by Ebrahim Byagowi at https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
 *
 * @param {Object} x First object to compare
 * @param {Object} y Second object to compare
 * @return {Boolean} Are those object equal ?
 */
export function isEqual(x, y) {
  'use strict';
  /**
   *
   *
   */
  if (x === null || x === undefined || y === null || y === undefined) {
    return x === y;
  }
  // after this just checking type of one would be enough
  if (x.constructor !== y.constructor) {
    return false;
  }
  // if they are functions, they should exactly refer to same one (because of closures)
  if (x instanceof Function) {
    return x === y;
  }
  // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
  if (x instanceof RegExp) {
    return x === y;
  }
  if (x === y || x.valueOf() === y.valueOf()) {
    return true;
  }
  if (Array.isArray(x) && x.length !== y.length) {
    return false;
  }

  // if they are dates, they must had equal valueOf
  if (x instanceof Date) {
    return false;
  }

  // if they are strictly equal, they both need to be object at least
  if (!(x instanceof Object)) {
    return false;
  }
  if (!(y instanceof Object)) {
    return false;
  }

  // recursive object equality check
  var p = Object.keys(x);
  return (
    Object.keys(y).every(function(i) {
      return p.indexOf(i) !== -1;
    }) &&
    p.every(function(i) {
      return isEqual(x[i], y[i]);
    })
  );
}

/**
 * Validate url
 * @param {String} url to test
 * @note https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url
 * @note https://mathiasbynens.be/demo/url-regex
 */
export function isUrl(url) {
  return (
    isString(url) &&
    /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
      url
    )
  );
}

/**
 * Validate date
 * @param {String|Number} date to validate
 */
export function isDateString(date) {
  return (
    isString(date) &&
    (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
      /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/.test(
        date
      ))
  );
}
