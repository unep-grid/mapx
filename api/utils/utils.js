const path = require('path');
const zlib = require('zlib');

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
 * Simple json to zip to res
 * @param {Object} re Result object
 * @param {Object} data Data stringifiable to JSON
 */
exports.sendJSON = function(res, data, end, asZip) {
  end = end === true || false;

  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (!asZip) {
    if (end) {
      res.json(data);
    } else {
      res.write(data);
    }
  } else {
    dataToJsonZip(data)
      .then((zip) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');

        //* Note : Content-length is not correct in the reader used in fetchProgress.
        //res.setHeader('Content-Length', zip.length);

        if (end) {
          res.send(zip);
        } else {
          res.write(zip);
        }
      })
      .catch((e) => {
        res.status('500');
        res.send(e);
      });
  }
};

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

/*
 * Export methods
 */
exports.view = require('./getView.js');
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
