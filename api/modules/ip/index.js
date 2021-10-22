//const geoip = require('geoip-lite');
const helpers = require('@mapx/helpers');
const {pgRead} = require('@mapx/db');

const {updateGeoIpTable} = require('./update.js');

const outDefault = {
  country: '',
  country_name: ''
};

function getGeoIP(req, res, next) {
  helpers.sendJSON(res, req.ipGeo);
  next();
}

async function setGeoIP(req, res, next) {
  const xForwardedFor = (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    ''
  );
  const ip = xForwardedFor || req.connection.remoteAddress;
  const ipGeo = await getGeoInfo(ip);
  const out = Object.assign({ip: ip}, outDefault, ipGeo);
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
      const dat = res.rows[0];
      return Object.assign({}, def, dat);
    } else {
      return def;
    }
  } catch (e) {
    return def;
  }
}

module.exports.mwGet = [setGeoIP, getGeoIP];
module.exports.mwSet = [setGeoIP];
module.exports.updateGeoIpTable = updateGeoIpTable;
