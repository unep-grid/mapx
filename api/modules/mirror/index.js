import fetch from 'node-fetch';
import {sendError} from '#mapx/helpers';
import {settings} from '#root/settings';
import rateLimit from 'express-rate-limit';
const mwLimiter = rateLimit({
  windowMs: settings.mirror.rateWindowMinutes * 60 * 1000,
  max: settings.mirror.rateLimit
});
/**
 * Request handler / middleware
 */
const mwGet = [mwLimiter, mwMirror];

export default {mwGet};

async function mwMirror(req, res) {
  const {url} = req.query;
  try {
    const r = await fetch(url);
    return r.body.pipe(res);
  } catch (e) {
    return sendError(res, e, 500);
  }
}
