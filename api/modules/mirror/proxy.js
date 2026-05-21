import fetch from "node-fetch";
import http from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { sendError } from "#mapx/helpers";

const _httpAgent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const _httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 256 });

function getAgent(url) {
  return url.startsWith("https:") ? _httpsAgent : _httpAgent;
}

const REQUEST_HEADERS_TO_FORWARD = [
  "accept",
  "accept-language",
  "accept-encoding",
  "range",
  "if-none-match",
  "if-modified-since",
  "if-match",
  "if-range",
  "if-unmodified-since",
];

const RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "content-length",
  "content-encoding",
  "content-range",
  "content-disposition",
  "cache-control",
  "last-modified",
  "etag",
  "accept-ranges",
  "vary",
  "expires",
];

export class HttpError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function toHttpError(error, defaultStatusCode = 500) {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError(error?.message || "Proxy request failed", defaultStatusCode);
}

export function handleProxyError(res, error, options = {}) {
  const { context = "Proxy", defaultStatusCode = 502 } = options;

  if (res.headersSent) {
    if (!isExpectedStreamClose(error)) {
      console.error(`${context} error after response started`, error);
    }
    if (!res.writableEnded) {
      res.end();
    }
    return;
  }

  const httpError = toHttpError(error, defaultStatusCode);
  return sendError(res, httpError, httpError.statusCode);
}

function isExpectedStreamClose(error) {
  return error?.code === "ERR_STREAM_PREMATURE_CLOSE";
}

export function normalizeExternalUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new HttpError("Invalid URL", 400);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError("Invalid URL", 400);
  }

  return url.toString();
}

export function sanitizeProxyPath(value) {
  const path = `${value || ""}`.trim().replace(/^\/+/, "");
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    throw new HttpError("Invalid path", 400);
  }

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new HttpError("Invalid path", 400);
  }

  return segments.join("/");
}

export function parseAllowedPrefixes(value) {
  if (Array.isArray(value)) {
    return value.map(normalizePrefix).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const rawValue = value.trim();

  if (!rawValue) {
    return [];
  }

  if (rawValue.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizePrefix).filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated parsing below.
    }
  }

  return rawValue.split(",").map(normalizePrefix).filter(Boolean);
}

export function assertAllowedPath(path, allowedPrefixes = []) {
  if (allowedPrefixes.length === 0) {
    return;
  }

  const isAllowed = allowedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!isAllowed) {
    throw new HttpError("Path not allowed", 403);
  }
}

export function resolveProxyUrl(baseUrl, path, query = {}) {
  if (!baseUrl) {
    throw new HttpError("S3 proxy is not configured", 500);
  }

  let url;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new HttpError("S3 proxy is not configured", 500);
  }

  url.pathname = joinUrlPath(url.pathname, path);
  url.search = "";

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, `${item}`);
      }
      continue;
    }

    url.searchParams.append(key, `${value}`);
  }

  return url.toString();
}

export async function proxyRequest(req, res, options) {
  const {
    url,
    method = req.method,
    requestHeaders = {},
    responseHeaders = {},
  } = options;

  const response = await fetch(url, {
    method,
    headers: buildUpstreamHeaders(req, requestHeaders),
    compress: false,
    agent: getAgent(url),
  });

  res.status(response.status);
  setResponseHeaders(res, response, responseHeaders);

  if (req.method === "HEAD" || response.body === null) {
    res.end();
    return;
  }

  await pipeline(response.body, res);
}

function buildUpstreamHeaders(req, overrideHeaders) {
  const headers = {};

  for (const header of REQUEST_HEADERS_TO_FORWARD) {
    const value = req.get(header);
    if (value) {
      headers[header] = value;
    }
  }

  for (const [header, value] of Object.entries(overrideHeaders || {})) {
    if (value !== undefined && value !== null && value !== "") {
      headers[header] = value;
    }
  }

  return headers;
}

function setResponseHeaders(res, response, overrideHeaders) {
  for (const header of RESPONSE_HEADERS_TO_FORWARD) {
    const value = response.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  }

  for (const [header, value] of Object.entries(overrideHeaders || {})) {
    if (value !== undefined && value !== null && value !== "") {
      res.setHeader(header, value);
    }
  }
}

function normalizePrefix(value) {
  return `${value || ""}`.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function joinUrlPath(basePath, path) {
  const normalizedBasePath = `${basePath || "/"}`.replace(/\/+$/, "");
  const normalizedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBasePath}/${normalizedPath}`;
}
