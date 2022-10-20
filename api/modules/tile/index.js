/**
 * Helpers
 */
import { redisGet, redisSet, pgRead } from "#mapx/db";
import { parseTemplate, attrToPgCol, asArray } from "#mapx/helpers";
import { isSourceId } from "@fxi/mx_valid";
import { templates } from "#mapx/template";
import { getSourceLastTimestamp, isPointLikeGeom } from "#mapx/db-utils";
import { getParamsValidator } from "#mapx/route_validation";
import crypto from "crypto";
import util from "util";
import zlib from "zlib";
import geojsonvt from "geojson-vt";
import vtpbf from "vt-pbf";
const gzip = util.promisify(zlib.gzip);

/**
 * Get tile
 */
const validateParamsHandlerText = getParamsValidator({
  required: ["view"],
  expected: ["timestamp", "skipCache", "usePostgisTiles"],
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
    data.useMask = isSourceId(data?.mask);
    data.usePostgisTiles = req.query.usePostgisTiles && !data.useMask;
    data.useCache = !req.query.skipCache;
    data.view = req.query.view;
    data.zoom = req.params.z * 1;
    data.x = req.params.x * 1;
    data.y = req.params.y * 1;
    data.attributes = asArray(data.attributes);
    data.attributes_pg = attrToPgCol([
      data.attribute,
      ...data.attributes,
      "gid",
    ]);

    if (!isSourceId(data?.layer)) {
      sendTileEmpty(res);
      return;
    }

    data.sourceTimestamp = await getSourceLastTimestamp(data.layer);

    if (data.useMask) {
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
    if (data.useCache) {
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
    const useAsMvt = data.usePostgisTiles;
    const useMask = data.useMask;
    // Geometry test could be included in request, as CTE block. 
    // - per object based test – outside a deticated CTE – is probably expensive
    // - isPointLikeGeom only works if there is only one type of geom per layer
    data.isPointGeom = await isPointLikeGeom(data.layer);
   
    if (useAsMvt) {
      str = templates.getMvt;
    } else {
      if (useMask) {
        str = templates.getGeojsonTileOverlap;
      } else {
        str = templates.getGeojsonTile;
      }
    }


    const qs = parseTemplate(str, data);
    const out = await pgRead.query(qs);

    if (out.rowCount > 0) {
      if (useAsMvt) {
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
      if (data.useCache) {
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
