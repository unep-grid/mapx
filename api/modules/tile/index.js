/**
 * Helpers
 */
const {redisGet, redisSet, pgRead} = require('@mapx/db');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const db = require('@mapx/db-utils');
const crypto = require('crypto');
const util = require('util');
const zlib = require('zlib');
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');
const gzip = util.promisify(zlib.gzip);

module.exports = {mwGet};
/**
 * Get tile
 */
async function mwGet(req, res) {
  try {
    const data = {idView: req.query.view};
    const sqlViewInfo = helpers.parseTemplate(
      template.getViewSourceAndAttributes,
      data
    );
    const resultView = await pgRead.query(sqlViewInfo);

    if (resultView.rowCount !== 1) {
      throw new Error('Error fetching view source and attribute');
    }

    const viewSrcConfig = resultView.rows[0];

    /*
     * viewSrcAttr attributes:
     * layer
     * attribute
     * attributes
     * mask (optional)
     */
    Object.assign(data, viewSrcConfig);
    data.geom = 'geom';
    data.zoom = req.params.z * 1;
    data.x = req.params.x * 1;
    data.y = req.params.y * 1;
    data.view = req.query.view;
    data.attributes = helpers.attrToPgCol(data.attribute, data.attributes);

    if (!data.layer || data.layer === Object) {
      sendTileEmpty(res);
      return;
    }

    data.sourceTimestamp = await db.getSourceLastTimestamp(data.layer);

    if (data.mask) {
      data.maskTimestamp = await db.getSourceLastTimestamp(data.mask);
    }

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');

    return getTile(res, hash, data);
  } catch (e) {
    return sendTileError(res, e);
  }
}

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

    const qs = helpers.parseTemplate(str, data);
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
