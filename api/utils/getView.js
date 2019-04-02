/**
 * Helpers
 */
//const clientPgWrite = require.main.require("./db").pgWrite;
const clientPgRead = require.main.require('./db').pgRead;
const clientRedis = require.main.require('./db').redis;
const utils = require('./utils.js');
const template = require('../templates');
const crypto = require('crypto');
const zlib = require('zlib');
//const expire = 3600 * 24 * 30 * 2;
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');
//const GeoJSONWrapper = vtpbf.GeoJSONWrapper;
/**
 * Get full view data
 */
exports.get = function(req, res) {
  var buffer;
  var out = {};
  var id = req.params.id;
  var sql = '';

  if (!id) {
    throw new Error('No id');
  }

  sql = utils.parseTemplate(template.viewFull, {
    idView: id
  });

  if (!sql) {
    return utils.sendError(res, {message: 'no valid query'});
  }

  clientPgRead
    .query(sql)
    .then(function(result) {
      if (result && result.rowCount == 0) {
        return res.sendStatus(404);
      }

      out = result.rows[0];
      buffer = new Buffer(JSON.stringify(out), 'utf-8');
      zlib.gzip(buffer, function(err, zOut) {
        if (err) {
          return utils.sendError(res, err);
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');

        res.send(zOut);
      });

    })
    .catch(function(err) {
      return utils.sendError(res, err);
    });
};

/**
 * Get confit tiles query
 */
exports.getTile = function(req, res) {
  var hash;
  var data = {idView: req.query.view};
  var sqlViewInfo = utils.parseTemplate(template.viewData, data);

  return clientPgRead
    .query(sqlViewInfo)
    .then(function(result) {
      /*
       * Get view data. Keys ;
       * layer
       * attribute
       * attributes
       * mask (optional)
       */
      data = result.rows[0];
      data.geom = 'geom';
      data.zoom = req.params.z * 1;
      data.zoomColumn = parseZoom(req.params.z * 1);
      data.x = req.params.x * 1;
      data.y = req.params.y * 1;
      data.date = req.query.date;
      data.view = req.query.view;
      data.attributes = utils.attrToPgCol(data.attribute, data.attributes);

      if (!data.layer || data.layer === Object) {
        sendTileEmpty(res);
        return;
      }

      hash = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');

      //sql = utils.parseTemplate(sql,data);

      return getTile(res, hash, data);
    })
    .catch(function(err) {

      return res.status(500).send({error:err.message});
      return res.status(500).send(err);
    });
};

/**
 * Set the zoom. Match zoom 0,5,10,15 or 20 to get the right geom column
 * @param {String|Number} Zoom level
 */
function parseZoom(z) {
  z = z * 1;
  return z < 0 ? (z = 0) : z > 20 ? (z = 20) : (z = Math.floor(z / 5) * 5);
}

function getTile(res, hash, data) {
  clientRedis.get(hash, function(err, zTile64) {
    if (err) {
      console.log(err);
    }
    if (!err && zTile64) {
      sendTileZip(res, Buffer(zTile64, 'base64'));
    } else {
      getTilePg(res, hash, data);
    }
  });
}

function getTilePg(res, hash, data) {
  let query = {};
  let str = '';

  if (data.mask && typeof data.mask === 'string') {
    str = template.geojsonTileOverlap;
  } else {
    str = template.geojsonTile;
  }

  query = utils.parseTemplate(str, data);

  clientPgRead.query(query).then(function(out) {
    rowsToGeoJSON(out.rows, out.types)
      .then(function(geojson) {
        return geojsonToPbf(geojson, data);
      })
      .then(function(buffer) {
        if (buffer && buffer.length) {
          setRedis(hash, buffer, function(zBuffer) {
            sendTileZip(res, zBuffer);
          });
        } else {
          sendTileEmpty(res);
        }
      })
      .catch(function(err) {
        return sendTileError(res, err);
      });
  });
}

function setRedis(hash, buffer, cb) {
  zlib.gzip(buffer, function(err, zTile) {
    if (err) {
      throw new Error(err);
    }
    clientRedis.set(hash, zTile.toString('base64'), function(err) {
      if (err) {
        throw new Error(err);
      }
    });
    cb(zTile);
  });
}

function sendTileZip(res, zBuffer) {
  res.setHeader('Content-Type', 'application/x-protobuf');
  res.setHeader('Content-Encoding', 'gzip');
  res.status(200).send(zBuffer);
}

function sendTileEmpty(res) {
  res.status(204).send('');
}

function sendTileError(res, err) {
  res.status(500).send(JSON.stringify(err));
}

function rowsToGeoJSON(rows) {
  return new Promise(function(resolve) {
    var features = rows.map(function(r) {
      var properties = {};
      for (var attribute in r) {
        if (attribute !== 'geom') {
          if (r[attribute] instanceof Date) {
            r[attribute] = r[attribute] * 1;
          }
          if (r[attribute] === null) {
            r[attribute] = '';
          }
          properties[attribute] = r[attribute];
        }
      }
      return {
        type: 'Feature',
        geometry: JSON.parse(r.geom),
        properties: properties
      };
    });
    var geojson = {
      type: 'FeatureCollection',
      features: features
    };
    resolve(geojson);
  });
}

function geojsonToPbf(geojson, data) {
  return new Promise(function(resolve) {
    var pbfOptions = {};
    var tileIndex = geojsonvt(geojson, {
      maxZoom: data.zoom + 1,
      indexMaxZoom: data.zoom - 1,
      tolerence: 2000 / (512 * Math.pow(data.zoom, 2))
    });
    var tile = tileIndex.getTile(data.zoom, data.x, data.y);
    if (!tile) {
      resolve(null);
    }
    pbfOptions[data.view] = tile;
    var buff = vtpbf.fromGeojsonVt(pbfOptions, {version: 2});
    resolve(buff);
  });
}
