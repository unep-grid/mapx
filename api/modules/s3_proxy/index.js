import { settings } from "#root/settings";
import {
  assertAllowedPath,
  handleProxyError,
  parseAllowedPrefixes,
  proxyRequest,
  resolveProxyUrl,
  sanitizeProxyPath,
} from "../mirror/proxy.js";

const S3_PUBLIC_AUTHORIZATION = "AWS all_users:";

const _allowedPrefixes = parseAllowedPrefixes(settings.s3_proxy.allowedPrefixes);

const mwGet = [mwS3Proxy];
const mwHead = [mwS3Proxy];

export { mwGet, mwHead };
export default { mwGet, mwHead };

async function mwS3Proxy(req, res) {
  try {
    const path = sanitizeProxyPath(req.params[0]);
    assertAllowedPath(path, _allowedPrefixes);

    await proxyRequest(req, res, {
      url: resolveProxyUrl(settings.s3_proxy.baseUrl, path, req.query),
      requestHeaders: {
        authorization: S3_PUBLIC_AUTHORIZATION,
      },
    });
  } catch (e) {
    return handleProxyError(res, e, { context: "S3 proxy" });
  }
}
