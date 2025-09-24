import { isJson, isEmpty } from "@fxi/mx_valid";
import { pgRead, redisGet, redisSet } from "#mapx/db";
import { sendJSON } from "#mapx/helpers";
import { updateGeoIpTable } from "./update.js";
const outDefault = {
  country: "",
  country_name: "",
};

export { updateGeoIpTable };

function getGeoIP(req, res) {
  sendJSON(res, req._ip_geo, { end: true });
}

async function setGeoIP(req, _, next) {
  try {
    const ip = getRealIp(
      req.headers,
      req.socket?.remoteAddress || req.connection?.remoteAddress,
    );
    const ipGeo = await getGeoInfo(ip);

    req._ip_geo = {
      ip,
      ...outDefault,
      ...ipGeo,
    };
    next();
  } catch (e) {
    console.error("setGeoIp:", e);
    next(e);
  }
}

export function getRealIp(headers, def = "0.0.0.0") {
  const ipHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    "x-cluster-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of ipHeaders) {
    const raw = headers[header];
    if (!raw) continue;

    // x-forwarded-for can be a list: client, proxy1, proxy2
    const first = raw.split(",")[0].trim();

    // Strip IPv6 IPv4-mapped prefix ::ffff:
    const normalized = first.startsWith("::ffff:") ? first.slice(7) : first;
    return normalized;
  }

  return def;
}

export async function getGeoInfo(ip) {
  const rkey = `geo_ip@${ip}`;
  const out = {
    ip: ip,
    country_name: null,
    country: null,
    source: null,
  };

  try {
    const cache = await redisGet(rkey);

    if (!isEmpty(cache) && isJson(cache)) {
      const outCache = JSON.parse(cache);
      outCache.source = "redis";
      return outCache;
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

    const res = await pgRead.query(q);
    if (res.rowCount > 0) {
      const dat = res.rows[0];
      Object.assign(out, dat);
      out.source = "db";
    }

    const noCountry = isEmpty(out.country);

    await redisSet(rkey, JSON.stringify(out), {
      // set expiration date: one day or no limit
      EX: noCountry ? 60 * 60 * 24 : undefined,
    });
  } catch (e) {
    console.error("getGeoInfo:", e);
  }
  return out;
}

export const mwSet = [setGeoIP];
export const mwGet = [setGeoIP, getGeoIP];
