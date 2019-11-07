const path = require('path');
const zlib = require('zlib');
const settings = require.main.require('./settings');
/**
 * Conversion of array of column names to pg columns
 */
function toPgColumn(arr) {
  return '"' + arr.join('","') + '"';
}
exports.toPgColumn = toPgColumn;

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

exports.getDistinct = getDistinct;

/**
 * Simple template parsing
 */
function parseTemplate(template, data) {
  return template.replace(/{{([^{}]+)}}/g, function(matched, key) {
    return data[key];
  });
}
exports.parseTemplate = parseTemplate;

/**
 * Send string for result message
 * @param {Object} obj object to be converted in string for messages
 */
exports.toRes = toRes;
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
  res.setHeader('Cache-Control', 'max-age=43200, s-maxage=300');
  if (opt.etag) {
    res.setHeader('Etag', opt.etag);
  }
  if (opt.end) {
    res.send(data);
  } else {
    res.write(data);
  }
}
exports.sendJSON = sendJSON;

/**
 * Simple send error wrapper
 * @param {Object} res Result object
 * @param {Error} error Error object
 * @return null
 */
exports.sendError = function(res, error) {
  res.send(
    toRes({
      type: 'error',
      msg: error.message
    })
  );
};

/**
 * Simple boolean converter.
 * @param {*} value Value to convert
 * @param {Boolean} def Default value
 * @return {Boolean}
 */
exports.toBoolean = function(value, def) {
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
};

/**
 * Random string composer : such as mx_mb9oa_6qmem_pkq9q_ajyer
 */
exports.randomString = function(prefix, nRep, nChar, toLower, toUpper) {
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
};

/*
 * Read text sync
 */
exports.readTxt = function(p) {
  var fs = require('fs');
  p = path.resolve(p);
  return fs.readFileSync(p, (endoding = 'UTF-8'));
};

/*
 * Get user ip
 */
exports.ip = {
  get: function(req, res) {
    res.send(req.ip);
  }
};

/**
 * Attributes to pg col
 */
exports.attrToPgCol = function(attribute, attributes) {
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
};

/**
 * Convert js array [1,2,3] to pg array ('1','2','5');
 *
 * @param {Array} arr Array to convert
 * @param {Any} def Default value, in case of empty array.
 */
exports.arrayToPgArray = function(arr, def) {
  if (typeof arr === 'string') {
    arr = [arr];
  }
  arr = arr || [];
  if (arr.length === 0) {
    return def || "('')";
  } else {
    return "('" + arr.join("','") + "')";
  }
};

/**
 * Send json as zip in res with proper header
 * @param {Object} data to send
 * @return {Promise} Promise object with zip buffer
 */
exports.dataToJsonZip = dataToJsonZip;
function dataToJsonZip(data) {
  const buffer = new Buffer(JSON.stringify(data), 'utf-8');
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
exports.stop = stop;

/**
 * Validator test an input against an array of rules
 * @param {Array} validateRules Array of rules with a structure like :
 * [{
 *  id : '<id>',
 *  test : function(value){if(!value)(stop("Test failed"))}
 * }]
 * @return {Function} a validation functio taking two argument : id and value.
 */
function validator(validateRules) {
  return function validate(id, value) {
    let out = value;
    validateRules.forEach((r) => {
      if (r.key === id) {
        out = r.test(value);
      }
    });
    return out;
  };
}
exports.validator = validator;

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
exports.asArray = asArray;

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
exports.findValues = findValues;

/**
 * Get config from client
 */
exports.config = {
  map: {
    get: (req, res) => {
      return sendJSON(res, settings.map);
    }
  }
};

/*
 * Export methods
 */

exports.ip = require('./getIpInfo.js');
exports.view = require('./getView.js');
exports.views = require('./getViewsByProject.js');
exports.viewsPublic = require('./getViewsPublic.js');
exports.source = require('./getSource.js');
exports.mirror = require('./getMirrorRequest.js');
exports.sourceMetadata = require('./getSourceMetadata.js');
exports.sourceTableAttribute = require('./getSourceTableAttribute.js');
exports.viewMetadata = require('./getViewMetadata.js');
exports.sourceOverlap = require('./getOverlap.js');
exports.sourceValidityGeom = require('./getSourceValidityGeom.js');
exports.image = require('./uploadImage.js');
exports.vector = require('./uploadVector.js');
exports.mail = require('./mail.js');
exports.query = require('./query.js');
exports.db = require('./db.js');
