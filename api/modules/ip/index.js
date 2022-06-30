import { isJson } from "@fxi/mx_valid";
import { pgRead, redisGet, redisSet } from "#mapx/db";
import { sendJSON } from "#mapx/helpers";
import { updateGeoIpTable } from "./update.js";
import os from "os";

const outDefault = {
  country: "",
  country_name: "",
  ip_node : os.networkInterfaces().eth0[0].address
};

function getGeoIP(req, res, next) {
  sendJSON(res, req.ipGeo);
  next();
}

async function setGeoIP(req, _, next) {
  try {
    const xForwardedFor =
      req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "";
    const ip = xForwardedFor || req.connection.remoteAddress;
    const ipGeo = await getGeoInfo(ip);
    const out = {
      ip,
      ...outDefault,
      ...ipGeo,
    };
    req.ipGeo = out;
    // error "stream is not readable", probably calling this mw before it's ready.
    next();
  } catch (e) {
    console.error('setGeoIp:',e);
  }
}

async function getGeoInfo(ip) {
  const rkey = `geo_ip@${ip}`;
  const out = {
    ip: ip,
    country_name: null,
    country: null,
    source: null,
  };

  const cache = await redisGet(rkey);

  if (cache && isJson(cache)) {
    const dataCache = JSON.parse(cache);
    dataCache.source = "redis";
  }

  const q = {
    text: `
  SELECT 
    country_name,
    country_iso_code AS country 
  FROM mx_ip 
  WHERE $1::inet << network
  LIMIT 1
    `,
    values: [ip],
  };

  try {
    const res = await pgRead.query(q);
    if (res.rowCount > 0) {
      const dat = res.rows[0];
      Object.assign(out, dat);
      out.source = "db";
      if (out.country) {
        await redisSet(rkey, JSON.stringify(out));
      }
    }
  } catch (e) {
    console.error('getGeoInfo:',e);
  }
  return out;
}

const mwSet = [setGeoIP];
const mwGet = [setGeoIP, getGeoIP];

export { mwSet, mwGet, updateGeoIpTable };

export default { mwSet, mwGet, updateGeoIpTable };
