/**
 * Helpers
 */
import { redisGet, redisSet, pgRead } from "#mapx/db";
import { parseTemplate, attrToPgCol, asArray } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { getSourceLastTimestamp } from "#mapx/db-utils";
import { getParamsValidator } from "#mapx/route_validation";
import crypto from "crypto";
import util from "util";
import zlib from "zlib";
import geojsonvt from "geojson-vt";
import vtpbf from "vt-pbf";
const isString = (a) => typeof a === "string";
const gzip = util.promisify(zlib.gzip);

/**
* Dev flags 
*/ 
const USE_CACHE = true;
const POSTGIS_TILES = true;

/**
 * Get tile
 */
const validateParamsHandlerText = getParamsValidator({
  required: ["view"],
  expected: ["timestamp"],
});

export const mwGet = [validateParamsHandlerText, handlerTile];

export default { mwGet };

export async function handlerTile(req, res) {
  try {
    const data = { idView: req.query.view };
    const sqlViewInfo = parseTemplate(
      templates.getViewSourceAndAttributes,
      data
    );
    const resultView = await pgRead.query(sqlViewInfo);

    if (resultView.rowCount !== 1) {
      throw Error("Error fetching view source and attribute");
    }

    const [viewSrcConfig] = resultView.rows;

    /*
     * viewSrcAttr attributes:
     * layer
     * attribute
     * attributes
     * mask (optional)
     */
    Object.assign(data, viewSrcConfig);


    data.geom = "geom";
    data.zoom = req.params.z * 1;
    data.x = req.params.x * 1;
    data.y = req.params.y * 1;
    data.view = req.query.view;
    data.attributes = asArray(data.attributes);
    data.attributes_pg = attrToPgCol([
      data.attribute,
      ...data.attributes,
      "gid",
    ]);

    if (!data.layer || data.layer === Object) {
      sendTileEmpty(res);
      return;
    }

    data.sourceTimestamp = await getSourceLastTimestamp(data.layer);

    if (data.mask) {
      data.maskTimestamp = await getSourceLastTimestamp(data.mask);
    }

    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(data))
      .digest("hex");

    return getTile(res, hash, data);
  } catch (e) {
    return sendTileError(res, e);
  }
}

async function getTile(res, hash, data) {
  try {
    if (USE_CACHE) {
      const zTileB64 = await redisGet(hash);
      if (zTileB64) {
        return sendTileZip(res, Buffer.from(zTileB64, "base64"));
      }
    }

    return getTilePg(res, hash, data);
  } catch (e) {
    return sendTileError(res, e);
  }
}

async function getTilePg(res, hash, data) {
  try {
    let str;
    let buffer;
  //  const start = Date.now();
    if (POSTGIS_TILES) {
      str = templates.getMvt;
    } else if (data.mask && isString(data.mask)) {
      str = templates.getGeojsonTileOverlap;
    } else {
      str = templates.getGeojsonTile;
    }
    const qs = parseTemplate(str, data);
    const out = await pgRead.query(qs);

    if (out.rowCount > 0) {
      if (POSTGIS_TILES) {
        buffer = out.rows[0].mvt;
      } else {
        const geojson = rowsToGeoJSON(out.rows);
        buffer = geojsonToPbf(geojson, data);
      }

      if (buffer.length === 0) {
        return sendTileEmpty(res);
      }

      const zBuffer = await gzip(buffer);
      sendTileZip(res, zBuffer);
      if (USE_CACHE) {
        redisSet(hash, zBuffer.toString("base64"));
      }


      return;
    } else {
      return sendTileEmpty(res);
    }
  } catch (e) {
    console.error(e);
    return sendTileError(res, e);
  }
}

function sendTileZip(res, zBuffer) {
  res.setHeader("Content-Type", "application/x-protobuf");
  res.setHeader("Content-Encoding", "gzip");
  res.status(200).send(zBuffer);
}

function sendTileEmpty(res) {
  res.status(204).send("");
}

function sendTileError(res, err) {
  res.status(500).send(err.message);
}

function rowsToGeoJSON(rows) {
  const features = rows.map((r) => {
    var properties = {};
    for (var attribute in r) {
      if (attribute !== "geom") {
        if (r[attribute] instanceof Date) {
          r[attribute] *= 1;
        }
        if (r[attribute] === null) {
          r[attribute] = "";
        }
        properties[attribute] = r[attribute];
      }
    }
    return {
      type: "Feature",
      geometry: JSON.parse(r.geom),
      properties: properties,
    };
  });

  return {
    type: "FeatureCollection",
    features: features,
  };
}

function geojsonToPbf(geojson, data) {
  const pbfOptions = {};
  const tileIndex = geojsonvt(geojson, {
    maxZoom: data.zoom + 1,
    indexMaxZoom: data.zoom - 1,
    tolerence: 2000 / (512 * data.zoom ** 2),
  });
  const tile = tileIndex.getTile(data.zoom, data.x, data.y);
  if (!tile) {
    return null;
  }
  pbfOptions[data.view] = tile;
  return vtpbf.fromGeojsonVt(pbfOptions, { version: 2 });
}
