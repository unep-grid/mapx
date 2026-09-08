import fetch from "node-fetch";
import {
  RequestFilteringHttpAgent,
  RequestFilteringHttpsAgent,
} from "request-filtering-agent";

const DEFAULT_TIMEOUT_MS = 8 * 1000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/**
 * data.source.tiles URLs are set by view editors, not admins, and are
 * fetched unattended by the daily routine across every project — an SSRF
 * risk (e.g. a URL pointing at a cloud metadata endpoint). These agents
 * block connections to private/reserved/meta IP addresses at the
 * connection layer — covering literal IPs, DNS-resolved hostnames, *and*
 * redirect targets (node-fetch reuses the same agent for each hop), which
 * a one-off upfront URL check cannot.
 */
const httpAgent = new RequestFilteringHttpAgent({
  keepAlive: true,
  maxSockets: 64,
});
const httpsAgent = new RequestFilteringHttpsAgent({
  keepAlive: true,
  maxSockets: 64,
});

const IMAGE_SIGNATURES = [
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

const SVG_DISALLOWED =
  /<!doctype\b|<script\b|\bon[a-z][\w-]*\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|javascript:|data:|file:|\/\/)|url\s*\(\s*["']?(?:https?:|javascript:|data:|file:|\/\/)/i;

export function matchesImageSignature(buffer) {
  return IMAGE_SIGNATURES.some((sig) =>
    sig.bytes.every((byte, i) => buffer[i] === byte),
  );
}

/**
 * SVG is deliberately checked as text: it must be an image/svg+xml response,
 * contain an SVG root, and not include executable or external references.
 */
export function matchesSafeSvg(buffer, contentType) {
  if (!/image\/svg\+xml/i.test(contentType || "")) {
    return false;
  }
  const text = buffer.toString("utf8", 0, MAX_RESPONSE_BYTES);
  return /<svg(?:\s|>)/i.test(text) && !SVG_DISALLOWED.test(text);
}

/** @returns {URL | null} the parsed URL if it's http(s), null otherwise */
function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a (already placeholder-substituted) tile/WMS URL and check that it
 * returns a valid image. A 200 response with an XML ServiceExceptionReport
 * (mislabeled or not) is reported invalid, not valid.
 * @param {String} url
 * @param {Object} [opt]
 * @param {Number} [opt.timeoutMs]
 * @returns {Promise<Object>} { valid, http_status, content_type, detail, tested_url }
 */
export async function checkUrl(url, opt = {}) {
  const timeoutMs = opt.timeoutMs || DEFAULT_TIMEOUT_MS;

  const parsedUrl = parseHttpUrl(url);
  if (!parsedUrl) {
    return { valid: false, detail: "invalid_url", tested_url: url };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      agent: parsedUrl.protocol === "https:" ? httpsAgent : httpAgent,
      headers: { accept: "image/*" },
    });

    const http_status = res.status;
    const content_type = res.headers.get("content-type") || null;

    if (!res.ok) {
      return {
        valid: false,
        http_status,
        content_type,
        detail: "http_error",
        tested_url: url,
      };
    }

    const contentLength = Number(res.headers.get("content-length"));
    if (contentLength > MAX_RESPONSE_BYTES) {
      return {
        valid: false,
        http_status,
        content_type,
        detail: "response_too_large",
        tested_url: url,
      };
    }

    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of res.body) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        controller.abort();
        return {
          valid: false,
          http_status,
          content_type,
          detail: "response_too_large",
          tested_url: url,
        };
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (
      !matchesImageSignature(buffer) &&
      !matchesSafeSvg(buffer, content_type)
    ) {
      const detail =
        content_type && /xml|text/.test(content_type)
          ? "service_exception"
          : "invalid_image_signature";
      return {
        valid: false,
        http_status,
        content_type,
        detail,
        tested_url: url,
      };
    }

    return {
      valid: true,
      http_status,
      content_type,
      detail: null,
      tested_url: url,
    };
  } catch (e) {
    const detail =
      e?.name === "AbortError"
        ? "timeout"
        : isBlockedByFilter(e)
          ? "blocked_private_address"
          : "fetch_error";
    return { valid: false, detail, tested_url: url };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * request-filtering-agent throws a plain Error (no distinct name/code) with
 * a message like "DNS lookup 169.254.169.254(...) is not allowed. Because,
 * It is private IP address." node-fetch wraps it in a FetchError but keeps
 * the original message as a substring.
 */
function isBlockedByFilter(error) {
  return (
    typeof error?.message === "string" &&
    error.message.includes("is not allowed")
  );
}
