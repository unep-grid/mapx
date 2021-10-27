const fetch = require('node-fetch');
const {sendError} = require('@mapx/helpers');
const rateLimit = require("express-rate-limit");
const mwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000
});
/**
 * Request handler / middleware
 */

module.exports.mwGet = [mwLimiter, mwMirror];

async function mwMirror(req, res) {
  try {
    const url = req.query.url;
    const r = await fetch(url);
    r.body.pipe(res);
  } catch (e) {
    return sendError(res, e);
  }
}
