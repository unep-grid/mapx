/**
 * Check if the current environment is Node.js
 */
const isNodeEnv = typeof process !== "undefined" && !!process.env;

/**
 * Test if entry is empty : empty array, empty string, etc.
 * @param {Any} item item to test
 */
export function isEmpty(item) {
  if (typeof item === "undefined" || item === null) {
    return true;
  } else if (isString(item)) {
    return isEqual(item, "");
  } else if (isElement(item)) {
    return isEqual(item.childElementCount, 0);
  } else if (isObject(item)) {
    return isEqual(item, {});
  } else if (isArray(item)) {
    return isEqual(item, []);
  }
  return false;
}

/**
 * Inverse isEmpty
 */
export function isNotEmpty(item) {
  return !isEmpty(item);
}

/**
 * Simple lat/lng bbox expected from source summary
 * @note : currently match api/modules/template/sql/getSourceSummary_ext_sp.sql
 * @param {Object} item
 * @return {Boolean} Is lat/lng bbox object
 */
export function isBbox(item) {
  return (
    isObject(item) &&
    isNumericRange(item.lat1, -90, 90) &&
    isNumericRange(item.lat2, -90, 90) &&
    isNumericRange(item.lng1, -180, 180) &&
    isNumericRange(item.lng2, -180, 180)
  );
}

/**
 * Simple lat/lng bbox expected from source meta
 * @param {Object} item
 * @return {Boolean} valid meta bbox
 */
export function isBboxMeta(item) {
  return (
    isObject(item) &&
    isNumericRange(item.lat_min, -90, 90) &&
    isNumericRange(item.lat_max, -90, 90) &&
    isNumericRange(item.lng_min, -180, 180) &&
    isNumericRange(item.lng_max, -180, 180) &&
    item.lat_min < item.lat_max &&
    item.lng_min < item.lng_max
  );
}

/**
 * Test if entry is an object
 * @param {Object} item
 */
export function isObject(item) {
  return (
    !!item &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    !isElement(item)
  );
}

/**
 * Test if it's a MapX view.
 * @param {Object} item to test
 */
export function isView(item) {
  return (
    isObject(item) &&
    isViewId(item?.id) &&
    isProjectId(item?.project) &&
    isString(item?.type) &&
    isNotEmpty(item?.data) &&
    !!item.type.match(/^(vt|rt|cc||sm||gj)$/)
  );
}

/**
 * Test if it's a view of given type
 * @param {Object} item to test
 * @param {String|Array} type or array of types
 * @param {Function} validator Additionnal validator that must return boolean
 */
export function isViewType(item, type, validator) {
  type = isArray(type) ? type : [type];

  const viewOk = isView(item);

  if (!viewOk) {
    return false;
  }

  const typeOk = type.includes(item.type);

  if (!typeOk) {
    return false;
  }

  if (!validator) {
    return true;
  }

  if (isString(validator)) {
    validator = new Function(`return ${validator}`)();
  }
  const valid = isFunction(validator) ? validator(item) : true;
  return valid;
}

/**
 * Test if it's a MapX view of type vt
 * @param {Object} item to test
 */
export function isViewVt(item) {
  return isViewType(item, "vt");
}

/**
 * Test if it's a MapX view of type rt
 * @param {Object} item to test
 */
export function isViewRt(item) {
  return isViewType(item, "rt");
}
/**
 * Test if it's a MapX view of type gj
 * @param {Object} item to test
 */
export function isViewGj(item) {
  return isViewType(item, "gj");
}
/**
 * Test if it's a MapX view of type gj
 * @param {Object} item to test
 */
export function isViewSm(item) {
  return isViewType(item, "sm");
}
/**
 * Test if it's a MapX view is editable
 * @param {Object} item to test
 */
export function isViewEditable(item) {
  return isView(item) && item._edit === true;
}

/**
 * Test if view vt has style rules
 * @param {Object} item to test
 */
export function isViewVtWithRules(item) {
  return isViewVt(item) && !isEmpty(item?.data?.style?.rules);
}

/**
 * Test if view vt has custom style
 * @param {Object} item to test
 */
export function isViewVtWithStyleCustom(item) {
  return (
    isViewVt(item) &&
    !!JSON.parse(item?.data?.style?.custom?.json || "{}")?.enable
  );
}
/**
 * Test if view vt has specific attribute type r
 * @param {Object} item to test
 * @param {String} attribute type e.g. string;
 */
export function isViewVtWithAttributeType(item, type = "string") {
  return isViewVt(item) && item?.data?.attribute?.type === type;
}

/**
 * Test if view rt has legend url
 * @param {Object} item to test
 */
export function isViewRtWithLegend(item) {
  return isViewRt(item) && isUrl(item?.data?.source?.legend);
}

/**
 * Test if view rt has tiles
 * @param {Object} item to test
 */
export function isViewRtWithTiles(item) {
  return isViewRt(item) && !isEmpty(item?.data?.source?.tiles);
}

/**
 * Test if view  has dashbaord
 * @param {Object} item to test
 */
export function isViewDashboard(item) {
  return isView(item) && !isEmpty(item?.data?.dashboard);
}

/**
 * Test if story map
 * @param {Object} item Item to test
 * @return {Boolean}
 */
export function isStory(item) {
  return (
    isViewType(item, "sm") && !!(item?.data?.story?.steps || []).length > 0
  );
}

/**
 * Generic "array of" tester
 * @param {Array} arr Array
 * @param {Function} fun Function
 * @return {Boolean}
 */
export function isArrayOf(arr, fun) {
  return (
    isArray(arr) &&
    arr.reduce((a, i) => {
      return !a ? a : fun(i);
    }, true)
  );
}

/**
 * Test if is array of views object
 * @param {Array} arr Array to test
 */
export function isArrayOfViews(arr) {
  return isArrayOf(arr, isView);
}

// jshint ignore:start
/**
 * Test if a raster view has wms url
 * @param {Object} view
 * @return {Boolean} valid
 */
export function isViewWms(view) {
  return isViewRt(view) && isUrlValidWms(view?.data?.source?.tiles[0]);
}
// jshint ignore:end

/**
 * Test if array of views id
 * @param {Array} arr Array of views id
 * @return {Boolean}
 */
export function isArrayOfViewsId(arr) {
  return isArrayOf(arr, isViewId);
}

/**
 * Check if array is sorted
 * @param {Array} arr Array to test
 * @param {Boolean} desc Descendent ?
 */
export function isSortedArray(arr, desc) {
  if (!isArray(arr)) {
    return false;
  }

  let sorted = true;

  for (let i = 0; i < arr.length; i++) {
    if (sorted) {
      const a = arr[i];
      const b = arr[i + 1];
      if (isNotEmpty(b)) {
        sorted = isAgteB(a, b, !desc);
      }
    }
  }

  return sorted;
}

/**
 * Compare value an return
 * @param {Any} a A value
 * @param {Any} b B value
 * @return {boolean}
 */
export function isAgteB(a, b, asc = true) {
  if (a === b) {
    return true;
  }
  if (isNumeric(a) && isNumeric(b)) {
    return asc ? a < b : b > a;
  } else {
    a = String(a);
    b = String(b);
    return asc ? a.localeCompare(b) < 0 : b.localeCompare(a) > 0;
  }
}
/**
 * Compare a to b ( for sorting )
 * @param {Any} a A value
 * @param {Any} b B value
 * @return {Number} 1,-1 or 0
 */
export function isAgtB(a, b, asc = true) {
  if (isDate(a) && isDate(b)) {
    return asc ? a.getTime() - b.getTime() : b.getTime() - a.getTime();
  } else if (isNumeric(a) && isNumeric(b)) {
    return asc ? a - b : b - a;
  } else {
    a = String(a);
    b = String(b);
    return asc ? a.localeCompare(b) : b.localeCompare(a);
  }
}

/**
 * Test for RegExp instance
 * @param {Any} value
 * @return {Logical} is RegExp instance
 */
export function isRegExp(value) {
  return value instanceof RegExp;
}

/**
 * Test for valid project id
 * @param {String} id Project id to test
 * @return {Boolean}
 */
export function isProjectId(idProject) {
  const reg = new RegExp("MX-.{3}-.{3}-.{3}-.{3}-.{3}");
  return !!idProject && !!idProject.match(reg);
}

/**
 * Determines if the given ID is a valid MapX source ID.
 *
 * A valid MapX source ID starts with 'mx', followed optionally by '_vector',
 * and then by 5 to 7 segments of the pattern '_[a-z0-9]{1,6}'. The entire ID's
 * length should be within the range of 10 to 50 characters.
 *
 * @param {string} id - The ID to test.
 * @returns {boolean} - Returns true if the ID matches the pattern and length constraints; otherwise, false.
 */
export function isSourceId(id) {
  const reg = new RegExp("^mx(?:_vector)?(_[a-z0-9]{1,6}){5,7}$");
  return isStringRange(id, 10, 50) && !!id.match(reg);
}

/**
 * Test if it's an array of MapX source id
 * @param {Array} arr Array of item to test
 */
export function isArrayOfSourceId(arr) {
  return isArray(arr) && arr.every(isSourceId);
}

/**
 * Test for valid view id
 * @param {String} id View id to test
 * @return {Boolean}
 */
export function isViewId(idView) {
  const expIdView = new RegExp("^MX-GJ-.{10}$|^MX-.{5}-.{5}-.{5}$");
  return !!idView && isString(idView) && !!idView.match(expIdView);
}
/**
 * Test for valid project
 * @param {Object} p Project object
 * @return {Boolean}
 */
export function isProject(p) {
  return isObject(p) && isProjectId(p.id);
}
/**
 * Test for valid project array
 * @param {Array} arr Array of projects
 * @return {Boolean}
 */
export function isProjectsArray(arr) {
  return isArrayOf(arr, isProject);
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
  if (typeof HTMLCanvasElement === "undefined") {
    return false;
  }
  return item instanceof HTMLCanvasElement;
}

/**
 * Test for fontawesome icon class
 * @param {Element} item item to test
 */
export function isIconFont(item) {
  return (
    isElement(item) &&
    (item.classList.contains("fa") || item.classList.contains("label-icon"))
  );
}

/**
 * Test if entry is an aray
 * @param {Array} item array
 */
export function isArray(item) {
  return !!item && typeof item === "object" && Array.isArray(item);
}
export function isArrayOfString(item) {
  return isArrayOf(item, isString);
}
export function isArrayOfNumber(item) {
  return isArrayOf(item, isNumeric);
}

/**
 * Test if entry is an table (array of object)
 * @param {Array} item array
 */
export function isTable(item) {
  return isArrayOf(item, isObject);
}

export function isArrayOfObject(item) {
  return isTable(item);
}
/**
 * Test if entry is JSON
 * @param {String} String to test
 */
export function isJSON(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
export const isJson = isJSON;

/**
 * Test if stringifiable
 * @param {Any} item
 * @return {Boolean}
 */
export function isStringifiable(item) {
  return (
    !isUndefined(item) &&
    (isObject(item) ||
      isArray(item) ||
      isString(item) ||
      isNumeric(item) ||
      isBoolean(item))
  );
}

/**
 * Test if entry is undefined
 * @param {Any} item
 * @return {Boolean}
 */
export function isUndefined(item) {
  return typeof item === "undefined";
}

/**
 * Test if entry is numeric
 * @param {String|Number} n string or number to test
 */
export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Test if entry is numeric and in range
 * @param {String|Number} n string or number to test
 * @param {Number} min Minumum
 * @param {Number} max Maximum
 */
export function isNumericRange(n, min = 0, max = 100) {
  return isNumeric(n) && n >= min && n <= max;
}

/**
 * Test if entry is boolean
 * @param {Boolean} b boolean to test
 */
export function isBoolean(b) {
  return b === true || b === false;
}
export function isTrue(b) {
  return b === true;
}
export function isFalse(b) {
  return b === false;
}

/**
 * Test for a loose boolean type, e.g. from csv...
 * @param {Boolean} b boolean to test
 * @return {Boolean}
 */
export function isBooleanCoercible(value) {
  return ["false", "true", "FALSE", "TRUE", true, false].includes(value);
}

/**
 * Test if is map
 * @param {Object} map Map object
 */
export function isMap(map) {
  return isObject(map) && isCanvas(map._canvas);
}

/**
 * Checks if a LngLat coordinate is inside the given LngLatBounds object.
 *
 * @param {mapboxgl.LngLat} lngLat - The LngLat coordinate to check.
 * @param {mapboxgl.LngLatBounds} bounds - The LngLatBounds object to check against.
 * @returns {boolean} - Returns true if the LngLat coordinate is inside the LngLatBounds, otherwise false.
 */
export function isLngLatInsideBounds(lngLat, bounds) {
  return (
    lngLat.lng >= bounds.getWest() &&
    lngLat.lng <= bounds.getEast() &&
    lngLat.lat >= bounds.getSouth() &&
    lngLat.lat <= bounds.getNorth()
  );
}

/**
 * Checks if a LngLatBounds object is inside another LngLatBounds
 *
 * @param {mapboxgl.LngLatBounds} bounds_test - The LngLatBounds object to check.
 * @param {mapboxgl.LngLatBounds} bounds - The LngLatBounds object to compare t.
 * @returns {boolean} - Returns true if the LngLatBounds object is inside the current bounds of getMaxBounds, otherwise false.
 */
export function isBoundsInsideBounds(bounds_test, bounds) {
  // Get the four corner coordinates of the input bounds
  const sw = bounds_test.getSouthWest();
  const se = bounds_test.getSouthEast();
  const nw = bounds_test.getNorthWest();
  const ne = bounds_test.getNorthEast();

  // Check if all corner coordinates are inside the maxBounds
  return (
    isLngLatInsideBounds(sw, bounds) &&
    isLngLatInsideBounds(se, bounds) &&
    isLngLatInsideBounds(nw, bounds) &&
    isLngLatInsideBounds(ne, bounds)
  );
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
  var isValid = !!str && typeof str === "string";
  if (!isValid) {
    return false;
  }
  str = str.trim();
  return str.length >= min && str.length <= max;
}

/**
 * Test for special char : not allowed
 * NOTES: if /g flag is set: inconsistant result:
 * Regex.lastIndex is not reseted between calls,
 * https://medium.com/@nikjohn/regex-test-returns-alternating-results-bd9a1ae42cdd
 */
const regexUnsafeName = /^[0-9\s]|[\\\;\:\.\,\^\(\)\'\`\"\*\+\{\}\s\!\?]/;
const regexUnsafe = /[\\\;\:\.\,\^\(\)\'\`\"\*\+\{\}\!\?]/;

/**
 * Test if input value is "safe".
 * Use server side
 * -> avoid unwanted stuff for db : columns, values, .. when prepared queries are not possible.
 * @param {Any} x Any
 */
export function isSafe(x) {
  if (isEmpty(x)) {
    return true;
  }
  if (isNumeric(x)) {
    return true;
  }
  return isString(x) && !regexUnsafe.test(x);
}

/**
 * Test if input is "safe" for naming db table, column.
 * @param {Any} x Any
 */
export function isSafeName(x) {
  if (isEmpty(x)) {
    return false;
  }
  if (isNumeric(x)) {
    return false;
  }
  return isString(x) && !regexUnsafeName.test(x);
}

/*
 * isSafe companion : replace unsafe char by replacement string
 * -> for db names
 * @param {String} x String to make "safe"
 * @raturn {String} "safe" string
 */
export function makeSafeName(x, repl = "_") {
  if (!isString(x)) {
    return;
  }
  const reg = new RegExp(regexUnsafeName, ["g"]);
  const name = x.replaceAll(reg, repl);
  return name.toLowerCase();
}

/**
 * Test if valide base64
 */
const regexDataImg = new RegExp(
  /^data:image\/(png|jpeg|svg);base64\,[a-zA-Z0-9\+\/\=]+$/,
);
export function isBase64img(str) {
  try {
    let isValid = isStringRange(str, 22) && regexDataImg.test(str);
    if (!isValid) {
      return false;
    }
    let strb64 = str.split(",")[1];
    return isStringRange(strb64, 10);
  } catch (err) {
    return false;
  }
}

/**
 * Quick type checker by group eg. image
 * @param {String} type Type to test
 * @param {String} group Group : image, ... NOTE: to be completed
 */
export function isValidType(type, group) {
  const types = {
    image: [
      "image/apng",
      "image/bmp",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/tiff",
      "image/webp",
    ],
  };
  return types[group].indexOf(type) > -1;
}

/**
 * Test if a given string contains HTML.
 * @param {String} str The string to test.
 * @returns {Boolean} True if the string contains HTML, otherwise false.
 */
export function isHTML(str) {
  if (!isString(str)) {
    return false;
  }

  // Check if running in a browser environment
  if (isNodeEnv && window.DOMParser) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return Array.from(doc.body.childNodes).some((node) => node.nodeType === 1);
  } else {
    // Fallback for environments without DOMParser (like Node.js)
    return /(<([^>]+)>)/i.test(str);
  }
}

/**
 * Test if entry is an email
 * @param {String} email
 */
export function isEmail(email) {
  return (
    isString(email) &&
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      email,
    )
  );
}

/**
 * Test if entry is string
 * @param {String} str string to test
 */
export function isString(str) {
  return typeof str === "string";
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
  if (typeof Element === "undefined") {
    return false;
  }
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
    Object.keys(y).every(function (i) {
      return p.indexOf(i) !== -1;
    }) &&
    p.every(function (i) {
      return isEqual(x[i], y[i]);
    })
  );
}

/**
 * Compares two values for equivalence, ignoring types and leading/trailing whitespace.
 *
 * @param {*} a - The first value to compare.
 * @param {*} b - The second value to compare.
 * @returns {boolean} - Returns true if the normalized forms of the two values are equivalent, false otherwise.
 */
export function isEqualNoType(a, b) {
  // Convert both values to strings, trim whitespace, and convert to numbers if possible
  const normalizedA = normalizeValue(a);
  const normalizedB = normalizeValue(b);

  // Check for equivalence
  return normalizedA === normalizedB;
}

/**
 * Normalizes a value by converting it to a string, trimming whitespace,
 * and converting it to a number if it represents a valid number.
 *
 * @param {*} value - The value to normalize.
 * @returns {string|number} - The normalized value.
 */
export function normalizeValue(value) {
  // Convert to string and trim whitespace
  let strValue = String(value).trim();

  // Attempt to convert to a number, return the original string if this is not possible
  let numValue = Number(strValue);
  return Number.isNaN(numValue) ? strValue : numValue;
}

/**
 * Validate url
 * @param {String} url to test
 * @note new version uses Url & tryCatch
 * @note https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url
 * @note https://mathiasbynens.be/demo/url-regex
 * @return {Boolean}
 */
export function isUrl(url) {
  if (url instanceof URL) {
    return true;
  }
  if (!isString(url)) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate url with https
 * @param {String} url to test
 * @return {Boolean}
 */
export function isUrlHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

/**
 * Check if it's expected url for wms end point.
 * @param {String} url to test
 * @param {Object} opt options
 * @param {Boolean} opt.layers Should the url contains layers param ?
 * @return {Boolean} valid
 */
export function isUrlValidWms(url, opt) {
  opt = Object.assign({}, { layers: false }, opt);
  const okUrl = isUrl(url);
  if (!okUrl) {
    return false;
  }
  url = url.toLowerCase();

  const u = new URL(url);
  const service = u.searchParams.get("service");
  const okWms =
    isString(service) &&
    !!service.match(/(wmsserver|wms)/i) &&
    (opt.layers ? u.searchParams.has("layers") : true) &&
    (opt.styles ? u.searchParams.has("styles") : true);

  return okWms;
}

/**
 * Validate date string
 * @param {Number} date to validate
 */
export function isDateStringRegex(date) {
  // start with a YYYY-MM-DD or YYYY/MM/DD date,
  // YYYY-MM-DD:12:12:12 is valid
  const regDate = /^\d{4}[-\/]\d{2}[-\/]\d{2}/;
  return isString(date) && regDate.test(date);
}

/**
 * Validate date string
 * @param {String|Number} date to validate
 */
export function isDateString(item) {
  try {
    if (!isDateStringRegex(item)) {
      return false;
    }
    const date = new Date(item);
    const isDate = !isNaN(date.getTime());
    return isDate;
  } catch (_) {
    return false;
  }
}

/**
 * Validate date object
 * @param {Date} date to validate
 */
export function isDate(date) {
  return date instanceof Date;
}
