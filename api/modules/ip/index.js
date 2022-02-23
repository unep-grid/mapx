import {pgRead} from '#mapx/db';
import {sendJSON} from '#mapx/helpers';
import {updateGeoIpTable} from './update.js';

const outDefault = {
  country: '',
  country_name: ''
};

function getGeoIP(req, res, next) {
  sendJSON(res, req.ipGeo);
  next();
}

async function setGeoIP(req, _, next) {
  const xForwardedFor =
    req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '';
  const ip = xForwardedFor || req.connection.remoteAddress;
  const ipGeo = await getGeoInfo(ip);
  const out = {
    ip: ip,
    ...outDefault,
    ...ipGeo
  };
  req.ipGeo = out;
  next();
}

async function getGeoInfo(ip) {
  const def = {
    country_name: null,
    country: null
  };

  const q = {
    text: `
  SELECT 
    country_name,
    country_iso_code AS country 
  FROM mx_ip 
  WHERE $1::inet << network
  LIMIT 1
    `,
    values: [ip]
  };

  try {
    const res = await pgRead.query(q);
    if (res.rowCount === 1) {
      const [dat] = res.rows;
      return {
        ...def,
        ...dat
      };
    } else {
      return def;
    }
  } catch {
    return def;
  }
}

const mwSet = [setGeoIP];
const mwGet = [setGeoIP, getGeoIP];

export {mwSet, mwGet, updateGeoIpTable};

export default {mwSet, mwGet, updateGeoIpTable};
