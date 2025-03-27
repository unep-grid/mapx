import * as t from "../../is_test/index.js";

class JsonSanitizer {
  constructor(data) {
    const szr = this;
    szr.n = 0;
    szr.max = 3;
    szr.data = data;
  }

  inc() {
    this.n++;
  }
  dec() {
    this.n--;
  }

  setData(data) {
    this.data = data;
  }

  sanitize() {
    return this._sanitizer(this.data);
  }

  _sanitizer(data) {
    const szr = this;
    if (t.isString(data) || t.isNumeric(data)) {
      return data;
    } else {
      szr.inc();
      const isArr = t.isArray(data);
      const isObj = t.isObject(data);
      const keys = isArr ? data : isObj ? Object.keys(data) : null;
      const out = isArr ? [] : {};
      try {
        keys.forEach((k) => {
          let value = isArr ? k : data[k];

          /**
           * Recursive
           */
          if (t.isObject(value)) {
            if (szr.n <= szr.max) {
              value = szr._sanitizer(value);
            }
          }

          const isFunction = t.isFunction(value);
          const isStringifiable = isFunction || t.isStringifiable(value);

          if (!isFunction && !isStringifiable) {
            return;
          }

          /**
           * Convert function
           */
          if (isFunction) {
            value = value.toString();
          }

          /**
           * Push value
           */
          if (isArr) {
            out.push(value);
          } else {
            out[k] = value;
          }
        });
      } catch (e) {
        console.warn(e);
      }
      szr.dec();
      return out;
    }
  }
}

export function parse(str) {
  let out;
  try {
    out = JSON.parse(str);
  } catch (_) {}
  return out;
}

export function stringify(data) {
  let out = "";
  try {
    data = new JsonSanitizer(data).sanitize();
    out = JSON.stringify(data);
  } catch (_) {}
  return out;
}

/**
 * Applies a patch object to a source object, returning a new object.
 * Only modifies properties specified in the patch.
 * 
 * @param {Object} source - Original object
 * @param {Object} patch - Updates to apply
 * @returns {Object} New object with patches applied
 */
export function patchObject(source, patch) {
  // Handle non-object cases
  if (!source || typeof source !== 'object' || !patch || typeof patch !== 'object') {
    return patch ?? source;
  }
  
  // Create shallow copy of source
  const result = Array.isArray(source) ? [...source] : {...source};
  
  // Apply patches
  Object.keys(patch).forEach(key => {
    const patchValue = patch[key];
    
    // Skip null/undefined values
    if (patchValue === null || patchValue === undefined) return;
    
    // Handle nested objects
    if (typeof patchValue === 'object' && !Array.isArray(patchValue) && 
        typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = patchObject(source[key], patchValue);
    } else {
      result[key] = patchValue;
    }
  });
  
  return result;
}
