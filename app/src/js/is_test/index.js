/**
 * Test if entry is empty : empty array, empty string, etc.
 * @param {Any} item item to test
 */
export function isEmpty(item) {
  if (typeof item === 'undefined') {
    return true;
  } else if (isString(item)) {
    return isEqual(item, '');
  } else if (isObject(item)) {
    return isEqual(item, {});
  } else if (isArray(item)) {
    return isEqual(item, []);
  }
  return false;
}

export function isNotEmpty(item) {
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
    isString(item.type) &&
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
  if (isString(validator)) {
    validator = new Function(`return ${validator}`)();
  }
  type = isArray(type) ? type : [type];
  const valid = isFunction(validator) ? validator(item, this) : true;
  const typeOk = type.reduce((a, t) => {
    return a ? a : item.type === t;
  }, false);
  return isView(item) && typeOk && valid;
}

/**
 * Test if it's a MapX view of type vt
 * @param {Object} item to test
 */
export function isViewVt(item) {
  return isViewType(item, 'vt');
}

/**
 * Test if it's a MapX view of type rt
 * @param {Object} item to test
 */
export function isViewRt(item) {
  return isViewType(item, 'rt');
}
/**
 * Test if it's a MapX view of type gj
 * @param {Object} item to test
 */
export function isViewGj(item) {
  return isViewType(item, 'gj');
}
/**
 * Test if it's a MapX view is editable
 * @param {Object} item to test
 */
export function isViewEditable(item) {
  return isView(item) && item._edit === true;
}
/**
 * Test if it's a MapX view is local
 * @param {Object} item to test
 */
export function isViewLocal(item) {
  return (
    isView(item) &&
    isArray(item._components) &&
    item._components.indexOf('view_local') > -1
  );
}

/**
 * Test if story map
 * @param {Object} item Item to test
 * @return {Boolean}
 */
export function isStory(item) {
  return isViewType(item,'sm') && !!item?.data?.story;
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
export function isSorted(arr, desc) {
  return (
    isArray(arr) &&
    arr.every((val, i, arr) =>
      !i || desc ? val < arr[i + 1] : val >= arr[i - 1]
    )
  );
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
  const reg = new RegExp('MX-.{3}-.{3}-.{3}-.{3}-.{3}');
  return !!idProject && !!idProject.match(reg);
}

/**
 * Test if it's a MapX view of type vt
 * @param {Object} item to test
 */
export function isSourceId(id) {
  const reg = new RegExp(
    '^mx_(vector|[a-z]{3})(_vector)?_([0-9a-z]{5,6})_([0-9a-z]{5,6})_[0-9a-z]{5,6}_[0-9a-z]{5,6}(_u_[0-9]+|_o_u_[0-9]+)?$'
  );
  return isString(id) && !!id.match(reg);
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
  const expIdView = new RegExp('^MX-GJ-.{10}$|^MX-.{5}-.{5}-.{5}$');
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
export function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

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
  return typeof item === 'undefined';
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
  return isObject(map) && map._canvas instanceof HTMLCanvasElement;
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
 * Test if valide base64
 */
let regexDataImg = new RegExp(
  /^data:image\/(png|jpeg|svg);base64\,[a-zA-Z0-9\+\/\=]+$/
);
export function isBase64img(str) {
  try {
    let isValid = isStringRange(str, 22) && regexDataImg.test(str);
    if (!isValid) {
      return false;
    }
    let strb64 = str.split(',')[1];
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
      'image/apng',
      'image/bmp',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/tiff',
      'image/webp'
    ]
  };
  return types[group].indexOf(type) > -1;
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
 * Check if it's expected url for wms end point.
 * @param {String} url to test
 * @param {Object} opt options
 * @param {Boolean} opt.layers Should the url contains layers param ?
 * @return {Boolean} valid
 */
export function isUrlValidWms(url, opt) {
  opt = Object.assign({}, {layers: false}, opt);
  const okUrl = isUrl(url);
  if (!okUrl) {
    return false;
  }
  url = url.toLowerCase();

  const u = new URL(url);
  const okHttps = u.protocol === 'https:';
  const service = u.searchParams.get('service');
  const okWms =
    isString(service) &&
    !!service.match(/(wmsserver|wms)/i) &&
    (opt.layers ? u.searchParams.has('layers') : true) &&
    (opt.styles ? u.searchParams.has('styles') : true);

  return okHttps && okWms;
}

/**
 * Validate date string
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

/**
 * Validate date object
 * @param {Date} date to validate
 */
export function isDate(date) {
  return date instanceof Date;
}
