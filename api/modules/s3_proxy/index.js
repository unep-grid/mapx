import { sendError } from "#mapx/helpers";
import { settings } from "#root/settings";
import rateLimit from "express-rate-limit";
import {
  assertAllowedPath,
  parseAllowedPrefixes,
  proxyRequest,
  resolveProxyUrl,
  sanitizeProxyPath,
  toHttpError,
} from "../mirror/proxy.js";

const S3_PUBLIC_AUTHORIZATION = "AWS all_users:";

const mwLimiter = rateLimit({
  windowMs: settings.mirror.rateWindowMinutes * 60 * 1000,
  max: settings.mirror.rateLimit,
});

const mwGet = [mwLimiter, mwS3Proxy];
const mwHead = [mwLimiter, mwS3Proxy];

export { mwGet, mwHead };
export default { mwGet, mwHead };

async function mwS3Proxy(req, res) {
  try {
    const path = sanitizeProxyPath(req.params[0]);
    const allowedPrefixes = parseAllowedPrefixes(
      settings.s3_proxy.allowedPrefixes,
    );

    assertAllowedPath(path, allowedPrefixes);

    await proxyRequest(req, res, {
      url: resolveProxyUrl(settings.s3_proxy.baseUrl, path, req.query),
      requestHeaders: {
        authorization: S3_PUBLIC_AUTHORIZATION,
      },
    });
  } catch (e) {
    // Streaming already started — headers are sent, can't send an error response.
    // Happens when the client cancels mid-stream (MapLibre tile abort on rapid zoom).
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }
    const error = toHttpError(e, 502);
    return sendError(res, error, error.statusCode);
  }
}
