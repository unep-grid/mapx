import * as t from '@fxi/mx_valid';

export {parse, stringify};

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

function parse(str) {
  return JSON.parse(str);
}

function stringify(data) {
  try {
    data = new JsonSanitizer(data).sanitize();
    return JSON.stringify(data);
  } catch (e) {
    console.error('Error in stringify helper', e, data);
  }
}
