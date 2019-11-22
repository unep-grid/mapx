const geoip = require('geoip-lite');
const utils = require('./utils.js');

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

exports.get = [setGeoIP, getGeoIP];
exports.set = setGeoIP;

function getGeoIP(req, res, next) {
  utils.sendJSON(res, req.ipGeo);
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
