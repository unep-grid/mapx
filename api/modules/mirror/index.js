const fetch = require('node-fetch');
const {sendError} = require('@mapx/helpers');
const rateLimit = require("express-rate-limit");
const mwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 2000
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
