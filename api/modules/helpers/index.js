import { isArray, isString, isEmpty } from "@fxi/mx_valid";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { settings } from "#root/settings";
import { readFile } from "fs/promises";
import { clearDownload, deleteOldFiles } from "./deleteOldFiles.js";
import crypto from "crypto";
import he from "he";

/**
 * Conversion of array of column names to pg columns
 * @param {Array} array of attibutes string
 * @param {Object} opt options
 * @param {Array} opt.castText Optional list  of attributes to cast as text
 * @return {String} String usable in posgres query
 */
function toPgColumn(arr, opt) {
  if (isEmpty(opt?.castText)) {
    return `"${arr.join('","')}"`;
  }
  const ct = opt.castText;
  const inner = arr.map((a) => {
    if (ct.includes(a)) {
      return `"${a}"::text`;
    } else {
      return `"${a}"`;
    }
  });
  return `${inner.join(",")}`;
}

/**
 * Get distinct value in array
 */
function getDistinct(arr) {
  var test = {};
  var out = [];
  for (const v of arr) {
    if (!test[v]) {
      test[v] = true;
      out.push(v);
    }
  }
  return out;
}

/**
 * Clone raw
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Escape literals
 * Ported from PostgreSQL 9.2.4 source code in src/interfaces/libpq/fe-exec.c
 */
function escapeLiteral(str) {
  let hasBackslash = false;
  let escaped = "'";

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "'") {
      escaped += c + c;
    } else if (c === "\\") {
      escaped += c + c;
      hasBackslash = true;
    } else {
      escaped += c;
    }
  }

  escaped += "'";

  if (hasBackslash === true) {
    escaped = " E" + escaped;
  }

  return escaped;
}

function sanitizeData(data) {
  if (typeof data === "string") {
    return he.escape(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  } else if (typeof data === "object" && data !== null) {
    const sanitizedObj = {};
    for (const key in data) {
      sanitizedObj[key] = sanitizeData(data[key]);
    }
    return sanitizedObj;
  } else {
    return data;
  }
}

/**
 * Send string for result message
 * @param {Object} obj object to be converted in string for messages
 */
function toRes(obj) {
  return JSON.stringify(obj) + "\t\n";
}

/**
 * Simple custom json send
 * @param {Object} res Result object
 * @param {Object} data Data stringifiable to JSON
 * @param {Object} opt
 * @param {Boolean} opt.toRes If true, add '\t\n' for message delimiter (see toRes)
 * @param {Boolean} opt.end If true, send, else continue writing
 * @param {String} opt.etag If set, add custom etag
 * @param {Function} opt.write_cb Function for the write function, if not 'end'.
 */
function sendJSON(res, data, opt) {
  try {
    opt = {
      end: true,
      ...opt,
    };
    opt.end = opt.end || false;
    data = isString(data) ? data : JSON.stringify(data || "");
    res.setHeader("Mapx-Content-Length", data.length || 0);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "max-age=0, s-maxage=0");
    if (opt.etag) {
      res.setHeader("Etag", opt.etag);
    }
    if (opt.toRes) {
      data = data + "\t\n";
    }
    if (opt.end) {
      res.send(data);
    } else {
      res.write(data, "utf8", opt.write_cb);
    }
  } catch (e) {
    sendError(res, e);
  }
}

/**
 * Simple send error wrapper
 * @param {Object} res Result object
 * @param {Error|String} error Error object or message
 * @param {Number} [code=500] Code of the error
 */
function sendError(res, error, code = 500) {
  let errorMessage = isString(error) ? error : error.message;

  const out = {
    message: errorMessage,
    type: "error",
  };

  res.status(code).send(toRes(out));
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

  if (tDef !== "boolean") {
    throw Error("toBoolean : default not boolean");
  }
  if (tValue === "boolean") {
    return value;
  }
  if (tValue === "undefined") {
    return def;
  }
  if (value === "true" || value === "t") {
    return true;
  }
  if (value === "false" || value === "f") {
    return false;
  }
  return Boolean(value);
}

/**
 * Random string composer for views id, source id, or any uniq identifier.
 *
 * @param {String} prefix E.g. => mx_ in mx_123_124
 * @param {Number} nRep Number of groups. E.g. 4 => 123_123_123_123
 * @param {nChar} nChar Number of characters per group : E.g. 2 => 12_12_12
 * @param {Boolean} toUpper To uppercase
 * @param {Boolean} toLower To lowercase
 * @param {String} separator Separator. Default = '_'
 * @return {String} identifier
 */
function randomString(prefix, nRep, nChar, toLower, toUpper, sep) {
  nRep = nRep || 4;
  nChar = nChar || 5;
  prefix = prefix || "mx";
  toLower = toLower || false;
  toUpper = toUpper || false;
  const out = [prefix];
  const sep_s = sep || "_";
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const n = chars.length - 1;

  for (let i = 0; i < nRep; i++) {
    out.push(sep_s);
    for (let j = 0; j < nChar; j++) {
      out.push(chars[Math.round(Math.random() * n)]);
    }
  }

  let outStr = out.join("");
  if (toLower) {
    outStr = outStr.toLowerCase();
  }
  if (toUpper) {
    outStr = outStr.toUpperCase();
  }
  return outStr;
}

/**
 * Create ID
 */
function uid() {
  return crypto.randomBytes(16).toString("hex");
}

/*
 * Read text sync
 */
function readTxt(p) {
  p = path.resolve(p);
  return fs.readFileSync(p, { encoding: "UTF-8" });
}

/**
 * Simple template parsing
 */
function parseTemplate(template, data) {
  return template.replace(/{{([^{}]+)}}/g, (_, key) => data[key]);
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
  get: function (req, res) {
    res.send(req.ip);
  },
};

/**
 * Attributes to pg col
 */
function attrToPgCol(attribute = "gid", attributes = [], opt) {
  const { gidAdd = false } = opt || { gidAdd: false };

  if (isString(attribute)) {
    attribute = [attribute];
  }
  if (isString(attributes)) {
    attributes = [attributes];
  }

  attributes = [...attributes, ...attribute];

  if (gidAdd) {
    attributes.push("gid");
  }

  return toPgColumn(getDistinct(attributes));
}

/**
 * Convert js array [1,2,3] to pg array ('1','2','5');
 *
 * @param {Array} arr Array to convert
 * @param {Any} def Default value, in case of empty array.
 */
function arrayToPgArray(arr, def) {
  if (isString(arr)) {
    arr = [arr];
  }
  arr = arr || [];
  if (arr.length === 0) {
    return def || `('')`;
  }
  return `('` + arr.join(`','`) + `')`;
}

/**
 * Send json as zip in res with proper header
 * @param {Object} data to send
 * @return {Promise} Promise object with zip buffer
 */
function dataToJsonZip(data) {
  const buffer = Buffer.from(JSON.stringify(data), "utf-8");
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, function (err, zOut) {
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
  throw Error(reason);
}

/**
 * Convert string input from query string (e.g. test=1,2,4 => [1,2,3]) as an array and clean
 * @param {String} v String value to convert
 */
function asArray(v) {
  if (isEmpty(v) || v === "null") {
    return [];
  }

  if (isString(v) && v.includes(",")) {
    v = v.split(",");
  }

  if (isString(v)) {
    return [v];
  }

  if (isArray(v)) {
    return cleanArray(v);
  }

  return [];
}

/**
 * Clean array, remove empty item
 * @param {Array} arr Array to clean
 */
function cleanArray(arr) {
  for (const [i, v] of arr.entries()) {
    if (isEmpty(v) || v === "null") {
      arr.splice(i, 1);
    }
  }
  return arr;
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
  if (isArray(obj)) {
    for (i in obj) {
      list = list.concat(findValues(obj[i], key));
    }
    return list;
  }
  if (obj[key]) {
    list.push(obj[key]);
  }

  if (typeof obj === "object" && obj !== null) {
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
 * Get map config from client
 */
function mwGetConfigServices(_, res) {
  return sendJSON(res, settings.services);
}

/**
 * Get geoserver from client
 */
function mwGetConfigGeoServer(_, res) {
  return sendJSON(res, settings.geoserver_public);
}

/**
 * Delay
 */
function wait(duration) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ _timeout: duration }), duration);
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
  opt = {
    onError: console.error,
    onSuccess: console.log,
    timeoutMs: 1 * 60 * 1000,
    ...opt,
  };
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
    opt = {
      intervalMs: 1 * 60 * 60 * 1000,
      before: false,
      ...opt,
    };
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
  const hasFallback = cbTimeout instanceof Function;
  const out = [];
  for (const cb of cbs) {
    let res = await Promise.race([cb(), asyncDelay(timeoutMs)]);
    /**
     * Reject if timeouted and apply fallback cb (cbTimeout)
     */
    if (res?._timeout) {
      if (hasFallback) {
        res = await cbTimeout(cb);
      } else {
        throw Error(`Timeout reached for ${cb.name} (${timeoutMs})`);
      }
    }
    out.push({ cb: cb, res: res });
  }

  return out;
}

/**
 * Set default headers
 */
function mwSetHeaders(_, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header("Access-Control-Expose-Headers", "Mapx-Content-Length");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
}

/**
 * Parse JSON from file
 * @param {String} file Filepath
 * @param {String} base base, ex. import.meta.url
 * @return {Promise<Object>}
 */
async function readJSON(file, base) {
  const url = new URL(file, base);
  const data = await readFile(url);
  return JSON.parse(data);
}

/**
 * Helper function to format JSON data with indentation.
 * @param {Object} obj - The object to format.
 * @returns {string} The formatted JSON string.
 */
function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

/**
 * Helper function to capitalize strings.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalize(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Print meaningfull time step
 * @param {Number} time Starting time
 */
function timeStep(start) {
  return Math.round((Date.now() - start) * 1000) / 1000;
}

/**
 * Sorts an object by its keys.
 *
 * @param {Object} obj - The object to be sorted.
 * @returns {Object} - A new object with keys sorted in ascending order.
 */
function sortObjectByKeys(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = obj[key];
  }
  return sortedObj;
}

/**
 * Exports
 */
export {
  sortObjectByKeys,
  deleteOldFiles,
  clearDownload,
  clone,
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
  uid,
  readTxt,
  readTemplate,
  stop,
  asyncDelay,
  wait,
  once,
  onceInterval,
  withTimeLimit,
  readJSON,
  formatJSON,
  capitalize,
  timeStep,
  escapeLiteral,
  sanitizeData,
  /**
   * Middleware
   */
  mwGetConfigServices,
  mwGetConfigGeoServer,
  mwSetHeaders,
  /** probably not used **/
  ip,
};
