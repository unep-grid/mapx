const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const settings = require('@root/settings');

/**
 * Conversion of array of column names to pg columns
 */
function toPgColumn(arr) {
  return '"' + arr.join('","') + '"';
}

/**
 * Get distinct value in array
 */

function getDistinct(arr) {
  var test = {};
  var out = [];
  arr.forEach(function(v) {
    if (!test[v]) {
      test[v] = true;
      out.push(v);
    }
  });
  return out;
}
/**
 * Send string for result message
 * @param {Object} obj object to be converted in string for messages
 */
function toRes(obj) {
  return JSON.stringify(obj) + '\t\n';
}

/**
 * Simple custom json send
 * @param {Object} res Result object
 * @param {Object} data Data stringifiable to JSON
 * @param {Object} opt
 * @param {Object} opt.end If true, send, else continue writing
 * @param {Object} opt.etag If set, add custom etag
 */
function sendJSON(res, data, opt) {
  opt = Object.assign({}, {end: true}, opt);
  opt.end = opt.end === true || false;
  data = JSON.stringify(data || '');
  res.setHeader('Mapx-Content-Length', data.length || 0);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'max-age=0, s-maxage=0');
  if (opt.etag) {
    res.setHeader('Etag', opt.etag);
  }
  if (opt.end) {
    res.send(data);
  } else {
    res.write(data);
  }
}

/**
 * Simple send error wrapper
 * @param {Object} res Result object
 * @param {Error} error Error object
 * @return null
 */
function sendError(res, error) {
  res.send(
    toRes({
      type: 'error',
      msg: error.message
    })
  );
}

/**
 * Simple boolean converter.
 * @param {*} value Value to convert
 * @param {Boolean} def Default value
 * @return {Boolean}
 */
function toBoolean(value, def) {
  var tDef = typeof def;
  var tValue = typeof value;

  if (tDef !== 'boolean') {
    throw new Error('toBoolean : default not boolean');
  }
  if (tValue === 'boolean') {
    return value;
  }
  if (tValue === 'undefined') {
    return def;
  }
  if (value === 'true' || value === 't') {
    return true;
  }
  if (value === 'false' || value === 'f') {
    return false;
  }
  return Boolean(value);
}

/**
 * Random string composer : such as mx_mb9oa_6qmem_pkq9q_ajyer
 */
function randomString(prefix, nRep, nChar, toLower, toUpper) {
  nRep = nRep || 4;
  nChar = nChar || 5;
  prefix = prefix || 'mx';
  toLower = toLower || false;
  toUpper = toUpper || false;
  var out = [];
  var sep = '_';
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var n = chars.length - 1;
  var c = '';
  for (var i = 0; i < nRep; i++) {
    out.push(sep);
    for (var j = 0; j < nChar; j++) {
      c = chars[Math.round(Math.random() * n)];
      out.push(c);
    }
  }
  out = prefix + out.join('');
  if (toLower) {
    out = out.toLowerCase();
  }
  if (toUpper) {
    out = out.toUpperCase();
  }
  return out;
}

/*
 * Read text sync
 */
function readTxt(p) {
  p = path.resolve(p);
  return fs.readFileSync(p, (endoding = 'UTF-8'));
}

/**
 * Simple template parsing
 */
function parseTemplate(template, data) {
  if (!template) {
    template = '< template empty >';
  }
  return template.replace(/{{([^{}]+)}}/g, (matched, key) => {
    return data[key];
  });
}

/**
 * Combine sync method for readTxt + parseTemplate
 */

function readTemplate(file, data) {
  const txt = readTxt(file);
  return parseTemplate(txt, data);
}

/*
 * Get user ip
 */
const ip = {
  get: function(req, res) {
    res.send(req.ip);
  }
};

/**
 * Attributes to pg col
 */
function attrToPgCol(attribute, attributes) {
  if (!attribute || attribute.constructor === Object) {
    attribute = [];
  }
  if (!attributes || attributes.constructor === Object) {
    attributes = [];
  }
  if (attribute.constructor !== Array) {
    attribute = [attribute];
  }
  if (attributes.constructor !== Array) {
    attributes = [attributes];
  }
  var attr = getDistinct(attribute.concat(attributes));
  if (attr.indexOf('gid') === -1) {
    attr.push('gid');
  }
  return toPgColumn(attr);
}

/**
 * Convert js array [1,2,3] to pg array ('1','2','5');
 *
 * @param {Array} arr Array to convert
 * @param {Any} def Default value, in case of empty array.
 */
function arrayToPgArray(arr, def) {
  if (typeof arr === 'string') {
    arr = [arr];
  }
  arr = arr || [];
  if (arr.length === 0) {
    return def || "('')";
  } 
  return "('" + arr.join("','") + "')";
}

/**
 * Send json as zip in res with proper header
 * @param {Object} data to send
 * @return {Promise} Promise object with zip buffer
 */
function dataToJsonZip(data) {
  const buffer = Buffer.from(JSON.stringify(data), 'utf-8');
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, function(err, zOut) {
      if (err) {
        reject(err);
      } else {
        resolve(zOut);
      }
    });
  });
}

/**
 * Wrapper on throw new Error
 * @param {String} reason Error message
 */
function stop(reason) {
  throw new Error(reason);
}

/**
 * Convert string input from query string (e.g. test=1,2,4 => [1,2,3]) as an array and clean
 * @param {String} v String value to convert
 */
function asArray(v) {
  v = v || [];
  var r = [];
  if (v instanceof Array) {
    r = cleanArray(v);
  } else {
    r = cleanArray(v.split(','));
  }
  return r;
}

/**
 * Clean array, remove empty item
 * @param {Array} arr Array to clean
 */
function cleanArray(arr) {
  return arr.reduce((a, v) => (v ? a.concat(v) : a), []);
}

/**
 * Find values for a given key
 * Source (2019/10/22): https://gist.github.com/shakhal/3cf5402fc61484d58c8d
 * @param {Object} obj Object to parse
 * @param {String} key Key for which values must be retrieved
 */
function findValues(obj, key) {
  var list = [];
  var i;
  if (!obj) {
    return list;
  }
  if (obj instanceof Array) {
    for (i in obj) {
      list = list.concat(findValues(obj[i], key));
    }
    return list;
  }
  if (obj[key]) {
    list.push(obj[key]);
  }

  if (typeof obj === 'object' && obj !== null) {
    var children = Object.keys(obj);
    if (children.length > 0) {
      for (i = 0; i < children.length; i++) {
        list = list.concat(findValues(obj[children[i]], key));
      }
    }
  }
  return list;
}

/**
 * Get config from client
 */
function mwGetConfigMap(req, res) {
  return sendJSON(res, settings.map);
}

/**
 * Delay
 */
function wait(duration) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(resolve, duration);
    } catch (e) {
      reject(e);
    }
  });
}
const asyncDelay = wait;

/**
 * Apply once a serie of callback, with timeout
 *
 * @param {Array} cbs Array of callback
 * @param {Object} opt Options
 * @param {Number} opt.timeoutMs Maximum time (ms);
 * @param {Function} opt.onSuccess Cb on sucess
 * @param {Function} opt.onError Cb on error
 */
async function once(cbs, opt) {
  opt = Object.assign(
    {},
    {
      onError: console.error,
      onSuccess: console.log,
      timeoutMs: 1 * 60 * 1000
    },
    opt
  );
  try {
    const r = await withTimeLimit(cbs, opt.timeoutMs);
    opt.onSuccess(cbs, r);
  } catch (e) {
    opt.onError(cbs, e);
  }
}

/**
 * Repeat once every n milisecond
 *
 * @param {Array} cbs Array of callback
 * @param {Object} opt Options
 * @param {Boolean} opt.before Apply callback before interval. Default : false, apply after interval
 * @param {Numer} opt.intervalMs Repeat after n ms
 * @param {Number} opt.timeoutMs Maximum time (ms);
 * @param {Function} opt.onSuccess Cb on sucess
 * @param {Function} opt.onError Cb on error
 */
async function onceInterval(cbs, opt) {
  try {
    opt = Object.assign(
      {},
      {
        intervalMs: 1 * 60 * 60 * 1000,
        before: false
      },
      opt
    );
    if (opt.before) {
      await once(cbs, opt);
    }
    await wait(opt.intervalMs);
    if (!opt.before) {
      await once(cbs, opt);
    }
    await onceInterval(cbs, opt);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Do something if timeout is reached
 *
 * NOTE: this should be simplified or converted to AbortController
 *
 * @param {Function||Array} cbs Callback ori arary of callback
 * @param {Number} timeoutMs Timeout in ms
 * @param {Function} cbTimeout Optional timeout function, with a single param, the callback evaluated. NOTE: this will be called for each failed cb from cbs;
 */
async function withTimeLimit(cbs, timeoutMs, cbTimeout) {
  timeoutMs = timeoutMs || 1 * 60 * 1000;
  if (!Array.isArray(cbs)) {
    cbs = [cbs];
  }
  /**
   * Wait for all promises
   */

  const res = await Promise.all(
    cbs.map(async (c) => {
      /**
       * Check if the timeout or the cb resolve first
       */

      const r = await Promise.race([c(), tOut(c)]);
      if (r && r._timeout) {
        /**
         * If the timeout wins, use the cbTimeout, reject
         */
        if (cbTimeout instanceof Function) {
          cbTimeout(r._cb);
        } else {
          console.warn(`Timeout reached for ${r._cb.name} (${timeoutMs})`);
        }
        return Promise.reject(r);
      }
      return r;
    })
  );
  return res;

  /**
   * Timeout evaluation
   */
  async function tOut(c) {
    await wait(timeoutMs);
    return {_timeout: timeoutMs, _cb: c};
  }
}

/**
 * Set default headers
 */
function mwSetHeaders(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Expose-Headers', 'Content-Length');
  res.header('Access-Control-Expose-Headers', 'Mapx-Content-Length');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
}

/**
 * Exports
 */
module.exports = {
  toPgColumn,
  attrToPgCol,
  arrayToPgArray,
  asArray,
  cleanArray,
  findValues,
  getDistinct,
  parseTemplate,
  toRes,
  sendJSON,
  dataToJsonZip,
  sendError,
  toBoolean,
  randomString,
  readTxt,
  readTemplate,
  stop,
  asyncDelay,
  wait,
  once,
  onceInterval,
  withTimeLimit,
  /**
   * Middleware
   */
  mwGetConfigMap,
  mwSetHeaders,
  /** check if used **/
  ip
};
