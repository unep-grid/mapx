const fetch = require('node-fetch');
const {sendError} = require('@mapx/helpers');
const settings = require('@root/settings');
const rateLimit = require("express-rate-limit");
const mwLimiter = rateLimit({
  windowMs: settings.mirror.rateWindowMinutes * 60 * 1000,
  max: settings.mirror.rateLimit
});
/**
 * Request handler / middleware
 */

module.exports.mwGet = [mwLimiter, mwMirror];

async function mwMirror(req, res) {
  const url = req.query.url;
  try {
    const r = await fetch(url);
    return r.body.pipe(res);
  } catch (e) {
    return sendError(res, e, 500 );
  }
}
