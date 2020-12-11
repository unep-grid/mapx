const geoip = require('geoip-lite');
const helpers = require('@mapx/helpers');

const outDefault = {
  range: [],
  country: '',
  region: '',
  eu: '',
  timezone: '',
  city: '',
  ll: [],
  metro: '',
  area: ''
};

function getGeoIP(req, res, next) {
  helpers.sendJSON(res, req.ipGeo);
  next();
}

function setGeoIP(req, res, next) {
  const xForwardedFor = (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    ''
  ).replace(/:\d+$/, '');
  let ip = xForwardedFor || req.connection.remoteAddress;
  if (ip.includes('::ffff:')) {
    ip = ip.split(':').reverse()[0];
  }
  const ipGeo = geoip.lookup(ip);
  const out = Object.assign({ip: ip}, outDefault, ipGeo);
  req.ipGeo = out;
  next();
}
module.exports.mwGet = [setGeoIP, getGeoIP];
module.exports.mwSet = [setGeoIP];


