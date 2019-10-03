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

exports.info = function(req, res, next) {
  const xForwardedFor = (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    ''
  ).replace(/:\d+$/, '');
  var ip = xForwardedFor || req.connection.remoteAddress;
  if (ip.includes('::ffff:')) {
    ip = ip.split(':').reverse()[0];
  }
  const geo = geoip.lookup(ip);
  const out = Object.assign({ip: ip}, outDefault, geo);

  utils.sendJSON(res, out);
  next();
};
