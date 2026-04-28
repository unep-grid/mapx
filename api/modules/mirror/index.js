import { sendError } from "#mapx/helpers";
import { settings } from "#root/settings";
import { isNotEmpty } from "@fxi/mx_valid";
import rateLimit from "express-rate-limit";
import { normalizeExternalUrl, proxyRequest, toHttpError } from "./proxy.js";

const mwLimiter = rateLimit({
  windowMs: settings.mirror.rateWindowMinutes * 60 * 1000,
  max: settings.mirror.rateLimit,
});

/**
 * Request handler / middleware
 */
const mwGet = [mwLimiter, mwMirror];
const mwHead = [mwLimiter, mwMirror];

export default { mwGet, mwHead };

async function mwMirror(req, res) {
  try {
    const { contentType, url } = req.query;
    const responseHeaders = {};

    if (isNotEmpty(contentType)) {
      responseHeaders["content-type"] = contentType;
    }

    await proxyRequest(req, res, {
      url: normalizeExternalUrl(url),
      responseHeaders,
    });
  } catch (e) {
    const error = toHttpError(e, 502);
    return sendError(res, error, error.statusCode);
  }
}
