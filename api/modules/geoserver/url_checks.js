import fetch from "node-fetch";

const CHECK_NAME = "mapx-style-svg";
const CHECK_DESCRIPTION =
  "Allow MapX S3 proxy SVG icons used by SLD ExternalGraphic";
const URL_CHECK_CLASS = "org.geoserver.security.urlchecks.RegexURLCheck";

async function ensureGeoserverUrlChecks(options = {}) {
  const settingsIn = options.settings || (await getDefaultSettings());
  const fetchIn = options.fetch || fetch;
  const notify = options.notify;

  const check = buildManagedUrlCheck(settingsIn);
  const checks = await getUrlChecks(settingsIn, fetchIn);
  const currentListItem = checks.find((item) => item.name === CHECK_NAME);
  const current = currentListItem
    ? await getUrlCheck(settingsIn, fetchIn, CHECK_NAME)
    : null;

  if (!current) {
    await saveUrlCheck(settingsIn, fetchIn, "POST", "urlchecks.json", check);
    await verifyUrlCheck(settingsIn, fetchIn, check);
    await notify?.({
      message: `GeoServer URL check created: ${CHECK_NAME}`,
      action: "created",
    });
    return { action: "created", check };
  }

  if (!urlCheckMatches(current, check)) {
    await saveUrlCheck(
      settingsIn,
      fetchIn,
      "PUT",
      `urlchecks/${encodeURIComponent(CHECK_NAME)}.json`,
      check,
    );
    await verifyUrlCheck(settingsIn, fetchIn, check);
    await notify?.({
      message: `GeoServer URL check updated: ${CHECK_NAME}`,
      action: "updated",
    });
    return { action: "updated", check };
  }

  await notify?.({
    message: `GeoServer URL check already configured: ${CHECK_NAME}`,
    action: "unchanged",
  });
  return { action: "unchanged", check };
}

async function getDefaultSettings() {
  const module = await import("#root/settings");
  return module.settings;
}

function buildManagedUrlCheck(settingsIn) {
  const regex =
    settingsIn?.geoserver?.urlcheck_style_svg_regex ||
    deriveStyleSvgRegex(getStyleSvgBaseUrls(settingsIn));

  return {
    name: CHECK_NAME,
    description: CHECK_DESCRIPTION,
    enabled: true,
    regex,
  };
}

function getStyleSvgBaseUrls(settingsIn) {
  const urls = [
    ...parseBaseUrlList(settingsIn?.geoserver?.urlcheck_style_svg_base_urls),
    ...getApiPublicBaseUrls(settingsIn),
    settingsIn?.s3_proxy?.baseUrl,
  ];

  return [...new Set(urls.map(normalizeBaseUrl).filter(Boolean))];
}

function parseBaseUrlList(value) {
  if (Array.isArray(value)) {
    return value;
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
        return parsed;
      }
    } catch {
      // Fall back to comma-separated parsing below.
    }
  }

  return rawValue.split(",");
}

function getApiPublicBaseUrls(settingsIn) {
  const api = settingsIn?.api || {};
  const host = api.host_public;
  const port = api.port_public;

  if (!host) {
    return [];
  }

  const bases = [
    buildBaseUrl("http:", host, port),
    buildBaseUrl("https:", host, port),
  ];

  if (/\.mapx\.localhost$/i.test(host)) {
    bases.push(
      buildBaseUrl("http:", "api.mapx.localhost", port),
      buildBaseUrl("http:", "apidev.mapx.localhost", port),
      buildBaseUrl("http:", "localhost", port),
      buildBaseUrl("http:", "0.0.0.0", port),
    );
  }

  return bases;
}

function buildBaseUrl(protocol, host, port) {
  const portString = port ? `:${port}` : "";
  return `${protocol}//${host}${portString}`;
}

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") {
    return;
  }

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    return;
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function deriveStyleSvgRegex(baseUrls) {
  const urls = Array.isArray(baseUrls) ? baseUrls : [baseUrls];
  const normalizedUrls = [
    ...new Set(urls.map(normalizeBaseUrl).filter(Boolean)),
  ];

  if (normalizedUrls.length === 0) {
    throw new Error(
      "At least one GeoServer URL check SVG base URL is required",
    );
  }

  const bases = normalizedUrls.map(escapeRegex).join("|");
  return `^(?:${bases})/s3/style/v[0-9]+/svg/[^?#]+\\.svg(\\?.*)?$`;
}

function escapeRegex(value) {
  return `${value}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getUrlChecks(settingsIn, fetchIn) {
  const payload = await requestJson(settingsIn, fetchIn, "urlchecks.json");
  return normalizeUrlChecks(payload?.urlChecks);
}

async function getUrlCheck(settingsIn, fetchIn, name) {
  const payload = await requestJson(
    settingsIn,
    fetchIn,
    `urlchecks/${encodeURIComponent(name)}.json`,
  );
  return normalizeUrlCheck(payload);
}

function normalizeUrlChecks(urlChecks) {
  if (!urlChecks || urlChecks === "") {
    return [];
  }

  const value = urlChecks.urlCheck;

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function verifyUrlCheck(settingsIn, fetchIn, expected) {
  const actual = await getUrlCheck(settingsIn, fetchIn, CHECK_NAME);

  if (!urlCheckMatches(actual, expected)) {
    throw new Error(`GeoServer URL check verification failed: ${CHECK_NAME}`);
  }
}

function normalizeUrlCheck(payload) {
  return payload?.regexUrlCheck || payload?.urlCheck || payload;
}

function urlCheckMatches(actual, expected) {
  return (
    actual?.name === expected.name &&
    actual?.description === expected.description &&
    isEnabled(actual?.enabled) === expected.enabled &&
    getRegex(actual) === expected.regex
  );
}

function getRegex(check) {
  return check?.regex ?? check?.regexExpression;
}

function isEnabled(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return `${value}`.toLowerCase() === "true";
}

async function requestJson(settingsIn, fetchIn, path) {
  const response = await fetchIn(buildRestUrl(settingsIn, path), {
    method: "GET",
    headers: buildHeaders(settingsIn),
  });

  if (!response.ok) {
    throw new Error(
      `GeoServer URL checks request failed: GET ${path} ${
        response.status
      } ${await readResponseText(response)}`,
    );
  }

  return response.json();
}

async function saveUrlCheck(settingsIn, fetchIn, method, path, check) {
  const jsonResponse = await fetchIn(buildRestUrl(settingsIn, path), {
    method,
    headers: buildHeaders(settingsIn, {
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ urlCheck: buildUrlCheckJson(check) }),
  });

  if (jsonResponse.ok) {
    return;
  }

  const jsonError = await readResponseText(jsonResponse);
  const xmlResponse = await fetchIn(buildRestUrl(settingsIn, path), {
    method,
    headers: buildHeaders(settingsIn, {
      Accept: "application/json",
      "Content-Type": "application/xml",
    }),
    body: buildUrlCheckXml(check),
  });

  if (xmlResponse.ok) {
    return;
  }

  throw new Error(
    `GeoServer URL checks request failed: ${method} ${path} JSON ${
      jsonResponse.status
    } ${jsonError}; XML ${xmlResponse.status} ${await readResponseText(
      xmlResponse,
    )}`,
  );
}

function buildHeaders(settingsIn, headers = {}) {
  const user = settingsIn?.geoserver?.user;
  const password = settingsIn?.geoserver?.password;

  if (!user || !password) {
    throw new Error("GeoServer credentials are required for URL checks");
  }

  return {
    ...headers,
    Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString(
      "base64",
    )}`,
  };
}

function buildRestUrl(settingsIn, path) {
  const root = settingsIn?.geoserver?.url;

  if (!root) {
    throw new Error("GEOSERVER_URL is required for URL checks");
  }

  return `${root.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function buildUrlCheckJson(check) {
  return {
    "@class": URL_CHECK_CLASS,
    ...check,
  };
}

function buildUrlCheckXml(check) {
  return `<urlCheck class="${URL_CHECK_CLASS}">
  <name>${escapeXml(check.name)}</name>
  <description>${escapeXml(check.description)}</description>
  <enabled>${check.enabled}</enabled>
  <regex>${escapeXml(check.regex)}</regex>
</urlCheck>`;
}

function escapeXml(value) {
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function readResponseText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export {
  ensureGeoserverUrlChecks,
  buildManagedUrlCheck,
  buildRestUrl,
  buildUrlCheckJson,
  deriveStyleSvgRegex,
  getRegex,
  getStyleSvgBaseUrls,
  getUrlCheck,
  normalizeUrlCheck,
  normalizeUrlChecks,
  URL_CHECK_CLASS,
  urlCheckMatches,
};
