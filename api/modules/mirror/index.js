import fetch from "node-fetch";
import { sendError } from "#mapx/helpers";
import { settings } from "#root/settings";
import { isUrl, isNotEmpty } from "@fxi/mx_valid";
import rateLimit from "express-rate-limit";
const mwLimiter = rateLimit({
  windowMs: settings.mirror.rateWindowMinutes * 60 * 1000,
  max: settings.mirror.rateLimit,
});
/**
 * Request handler / middleware
 */
const mwGet = [mwLimiter, mwMirror];

export default { mwGet };

async function mwMirror(req, res) {
  try {
    const { contentType, url } = req.query;
    if (!isUrl(url)) {
      throw new Error("Invalid URL");
    }

    const response = await fetch(url, {
      method: req.method,
    });

    const headersToTransfer = [
      "content-type",
      "content-length",
      "content-encoding",
      "cache-control",
      "last-modified",
      "etag",
      "accept-ranges",
      "vary",
      "expires",
      "transfer-encoding",
    ];

    for (const header of headersToTransfer) {
      if (response.headers.has(header)) {
        res.setHeader(header, response.headers.get(header));
      }
    }

    if (isNotEmpty(contentType)) {
      res.setHeader("Content-type", contentType);
    }

    return response.body.pipe(res);
  } catch (e) {
    return sendError(res, e, 500);
  }
}
