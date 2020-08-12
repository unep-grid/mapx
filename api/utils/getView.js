/**
 * Helpers
 */
const {redisGet, redisSet, pgRead} = require.main.require('./db');
const utils = require('./utils.js');
const util = require('util');
const template = require('../templates');
const crypto = require('crypto');
const zlib = require('zlib');
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');
const db = require('./db.js');
const gzip = util.promisify(zlib.gzip);

/**
 * Get full view data
 */
exports.get = async function(req, res) {
  try {
    const id = req.params.id;

    if (!id) {
      throw new Error('No id');
    }

    const sql = utils.parseTemplate(template.getViewFull, {
      idView: id
    });

    if (!sql) {
      throw new Error('Invalid query');
    }

    const result = await pgRead.query(sql);

    if (result && result.rowCount === 0) {
      return res.sendStatus(204);
    } else {
      const out = result.rows[0];
      return utils.sendJSON(res, out || {});
    }
  } catch (e) {
    return utils.sendError(res, e);
  }
};

/**
 * Get confit tiles query
 */
exports.getTile = async function(req, res) {
  try {
    const data = {idView: req.query.view};
    const sqlViewInfo = utils.parseTemplate(
      template.getViewSourceAndAttributes,
      data
    );
    const resultView = await pgRead.query(sqlViewInfo);

    if (resultView.rowCount !== 1) {
      throw new Error('Error fetching view source and attribute');
    }

    const viewSrcAttr = resultView.rows[0];
    /*
     * viewSrcAttr attributes:
     * layer
     * attribute
     * attributes
     * mask (optional)
     */
    Object.assign(data, viewSrcAttr);
    data.geom = 'geom';
    data.zoom = req.params.z * 1;
    data.x = req.params.x * 1;
    data.y = req.params.y * 1;
    data.view = req.query.view;
    data.attributes = utils.attrToPgCol(data.attribute, data.attributes);

    if (!data.layer || data.layer === Object) {
      sendTileEmpty(res);
      return;
    }

    const timestamp = await db.getSourceLastTimestamp(data.layer);

    const hash = crypto
      .createHash('md5')
      .update(timestamp + data.attributes + data.layer + data.view + data.x + data.y + data.zoom)
      .digest('hex');

    return getTile(res, hash, data);
  } catch (e) {
    return sendTileError(res, e);
  }
};

async function getTile(res, hash, data) {
  try {
    const zTileB64 = await redisGet(hash);

    if (zTileB64) {
      return sendTileZip(res, Buffer(zTileB64, 'base64'));
    }

    return getTilePg(res, hash, data);
  } catch (e) {
    return sendTileError(res, e);
  }
}

async function getTilePg(res, hash, data) {
  try {
    let str = '';

    if (data.mask && typeof data.mask === 'string') {
      str = template.getGeojsonTileOverlap;
    } else {
      str = template.getGeojsonTile;
    }

    const qs = utils.parseTemplate(str, data);
    const out = await pgRead.query(qs);

    if (out.rowCount > 0) {
      const geojson = await rowsToGeoJSON(out.rows, out.types);
      const buffer = await geojsonToPbf(geojson, data);
      const zBuffer = await gzip(buffer);
      sendTileZip(res, zBuffer);
      redisSet(hash, zBuffer.toString('base64'));
    } else {
      sendTileEmpty(res);
    }
  } catch (e) {
    return sendTileError(res, e);
  }
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
  res.status(500).send(err.message);
}

async function rowsToGeoJSON(rows) {
  const features = rows.map((r) => {
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

  return {
    type: 'FeatureCollection',
    features: features
  };
}

async function geojsonToPbf(geojson, data) {
  const pbfOptions = {};
  const tileIndex = geojsonvt(geojson, {
    maxZoom: data.zoom + 1,
    indexMaxZoom: data.zoom - 1,
    tolerence: 2000 / (512 * Math.pow(data.zoom, 2))
  });
  const tile = tileIndex.getTile(data.zoom, data.x, data.y);
  if (!tile) {
    return null;
  }
  pbfOptions[data.view] = tile;
  return vtpbf.fromGeojsonVt(pbfOptions, {version: 2});
}
