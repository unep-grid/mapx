/* global describe, it */

import assert from "node:assert/strict";
import {
  URL_CHECK_CLASS,
  buildManagedUrlCheck,
  buildRestUrl,
  buildUrlCheckJson,
  deriveStyleSvgRegex,
  ensureGeoserverUrlChecks,
  getStyleSvgBaseUrls,
  normalizeUrlCheck,
  normalizeUrlChecks,
} from "../modules/geoserver/url_checks.js";

const baseSettings = {
  api: {
    host_public: "api.mapx.localhost",
    port_public: "8880",
  },
  geoserver: {
    password: "letmein",
    user: "admin",
    url: "http://geoserver:8080/geoserver/rest",
    urlcheck_style_svg_base_urls: "",
    urlcheck_style_svg_regex: "",
  },
  s3_proxy: {
    baseUrl: "https://mapx.unepgrid.s3.unige.ch/mapx",
  },
};

const matchingRegex =
  "^(?:http://api\\.mapx\\.localhost:8880|https://api\\.mapx\\.localhost:8880|http://apidev\\.mapx\\.localhost:8880|http://localhost:8880|http://0\\.0\\.0\\.0:8880|https://mapx\\.unepgrid\\.s3\\.unige\\.ch/mapx)/s3/style/v[0-9]+/svg/[^?#]+\\.svg(\\?.*)?$";

const matchingCheck = {
  name: "mapx-style-svg",
  description: "Allow MapX S3 proxy SVG icons used by SLD ExternalGraphic",
  enabled: true,
  regex: matchingRegex,
};

describe("GeoServer URL checks", () => {
  it("derives the expected local regex from configured URL bases", () => {
    assert.equal(
      deriveStyleSvgRegex([
        "http://api.mapx.localhost:8880",
        "https://api.mapx.localhost:8880",
        "http://apidev.mapx.localhost:8880",
        "http://localhost:8880",
        "http://0.0.0.0:8880",
        "https://mapx.unepgrid.s3.unige.ch/mapx",
      ]),
      matchingRegex
    );
  });

  it("escapes regex metacharacters in the configured base URL", () => {
    const regex = deriveStyleSvgRegex("https://cdn.example.com/mapx.assets");

    assert.equal(
      regex,
      "^(?:https://cdn\\.example\\.com/mapx\\.assets)/s3/style/v[0-9]+/svg/[^?#]+\\.svg(\\?.*)?$"
    );
  });

  it("builds URL check bases from API public settings, local dev aliases, and S3 upstream", () => {
    assert.deepEqual(getStyleSvgBaseUrls(baseSettings), [
      "http://api.mapx.localhost:8880",
      "https://api.mapx.localhost:8880",
      "http://apidev.mapx.localhost:8880",
      "http://localhost:8880",
      "http://0.0.0.0:8880",
      "https://mapx.unepgrid.s3.unige.ch/mapx",
    ]);
  });

  it("includes explicit extra URL check bases from comma-separated settings", () => {
    assert.deepEqual(
      getStyleSvgBaseUrls({
        ...baseSettings,
        geoserver: {
          ...baseSettings.geoserver,
          urlcheck_style_svg_base_urls:
            "https://api.example.org, http://custom.mapx.localhost:8880",
        },
      }).slice(0, 2),
      ["https://api.example.org", "http://custom.mapx.localhost:8880"]
    );
  });

  it("preserves an explicit URL check regex exactly", () => {
    const check = buildManagedUrlCheck({
      ...baseSettings,
      geoserver: {
        ...baseSettings.geoserver,
        urlcheck_style_svg_regex: "^https://example\\.org/icons/.+$",
      },
    });

    assert.equal(check.regex, "^https://example\\.org/icons/.+$");
  });

  it("allows SVG URLs with query parameters", () => {
    const regex = new RegExp(buildManagedUrlCheck(baseSettings).regex);

    assert.equal(
      regex.test(
        "http://apidev.mapx.localhost:8880/s3/style/v1/svg/maki-campsite-11.svg?fill=%23f6f609"
      ),
      true
    );
  });

  it("treats empty GeoServer urlChecks responses as an empty list", () => {
    assert.deepEqual(normalizeUrlChecks(""), []);
    assert.deepEqual(normalizeUrlChecks({}), []);
  });

  it("normalizes a single GeoServer URL check response object", () => {
    assert.deepEqual(normalizeUrlChecks({ urlCheck: matchingCheck }), [
      matchingCheck,
    ]);
  });

  it("normalizes GeoServer concrete regex URL check detail responses", () => {
    assert.deepEqual(normalizeUrlCheck({ regexUrlCheck: matchingCheck }), matchingCheck);
    assert.deepEqual(normalizeUrlCheck({ urlCheck: matchingCheck }), matchingCheck);
    assert.deepEqual(normalizeUrlCheck(matchingCheck), matchingCheck);
  });

  it("builds REST URLs relative to a GEOSERVER_URL ending in /rest", () => {
    assert.equal(
      buildRestUrl(baseSettings, "urlchecks.json"),
      "http://geoserver:8080/geoserver/rest/urlchecks.json"
    );
  });

  it("adds GeoServer concrete class metadata to JSON write payloads", () => {
    assert.deepEqual(buildUrlCheckJson(matchingCheck), {
      "@class": URL_CHECK_CLASS,
      ...matchingCheck,
    });
  });

  it("creates the managed check when missing", async () => {
    const fetch = createMockFetch([
      jsonResponse({ urlChecks: "" }),
      emptyResponse(201),
      jsonResponse({ urlCheck: matchingCheck }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "created");
    assert.equal(fetch.calls[1].options.method, "POST");
    assert.deepEqual(JSON.parse(fetch.calls[1].options.body), {
      urlCheck: {
        "@class": URL_CHECK_CLASS,
        ...matchingCheck,
      },
    });
  });

  it("updates the managed check when disabled", async () => {
    const staleCheck = {
      ...matchingCheck,
      enabled: false,
    };
    const fetch = createMockFetch([
      jsonResponse({
        urlChecks: {
          urlCheck: sparseListItem(),
        },
      }),
      jsonResponse({ regexUrlCheck: staleCheck }),
      emptyResponse(200),
      jsonResponse({ regexUrlCheck: matchingCheck }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "updated");
    assert.equal(fetch.calls[2].options.method, "PUT");
    assert.equal(
      fetch.calls[2].url,
      "http://geoserver:8080/geoserver/rest/urlchecks/mapx-style-svg.json"
    );
  });

  it("updates the managed check when description or regex is stale", async () => {
    const staleCheck = {
      ...matchingCheck,
      description: "Old description",
      regexExpression: "^https://old\\.example/.+$",
    };
    delete staleCheck.regex;

    const fetch = createMockFetch([
      jsonResponse({
        urlChecks: {
          urlCheck: sparseListItem(),
        },
      }),
      jsonResponse({ regexUrlCheck: staleCheck }),
      emptyResponse(200),
      jsonResponse({ regexUrlCheck: matchingCheck }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "updated");
  });

  it("no-ops when the managed check already matches", async () => {
    const fetch = createMockFetch([
      jsonResponse({
        urlChecks: {
          urlCheck: sparseListItem(),
        },
      }),
      jsonResponse({
        regexUrlCheck: {
          "@class": URL_CHECK_CLASS,
          ...matchingCheck,
        },
      }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "unchanged");
    assert.equal(fetch.calls.length, 2);
  });

  it("no-ops when GeoServer returns XML-style class metadata", async () => {
    const fetch = createMockFetch([
      jsonResponse({
        urlChecks: {
          urlCheck: sparseListItem(),
        },
      }),
      jsonResponse({
        regexUrlCheck: {
          class: URL_CHECK_CLASS,
          ...matchingCheck,
        },
      }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "unchanged");
    assert.equal(fetch.calls.length, 2);
  });

  it("updates when sparse list item exists but detail response is stale", async () => {
    const fetch = createMockFetch([
      jsonResponse({
        urlChecks: {
          urlCheck: sparseListItem(),
        },
      }),
      jsonResponse({
        regexUrlCheck: {
          ...matchingCheck,
          regex: "^https://old\\.example/.+$",
        },
      }),
      emptyResponse(200),
      jsonResponse({ regexUrlCheck: matchingCheck }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "updated");
    assert.equal(fetch.calls[1].url, sparseListItem().href);
    assert.equal(fetch.calls[2].options.method, "PUT");
  });

  it("falls back to XML if GeoServer rejects the JSON write payload", async () => {
    const fetch = createMockFetch([
      jsonResponse({ urlChecks: "" }),
      textResponse("Unsupported media type", 415),
      emptyResponse(201),
      jsonResponse({ urlCheck: matchingCheck }),
    ]);

    const result = await ensureGeoserverUrlChecks({
      settings: baseSettings,
      fetch,
    });

    assert.equal(result.action, "created");
    assert.equal(fetch.calls[2].options.headers["Content-Type"], "application/xml");
    assert.match(
      fetch.calls[2].options.body,
      /<urlCheck class="org\.geoserver\.security\.urlchecks\.RegexURLCheck">/
    );
    assert.match(fetch.calls[2].options.body, /http:\/\/apidev\\\.mapx/);
  });

  it("throws when persisted verification does not match after create or update", async () => {
    const fetch = createMockFetch([
      jsonResponse({ urlChecks: "" }),
      emptyResponse(201),
      jsonResponse({
        urlCheck: {
          ...matchingCheck,
          regex: "^https://unexpected\\.example/.+$",
        },
      }),
    ]);

    await assert.rejects(
      ensureGeoserverUrlChecks({
        settings: baseSettings,
        fetch,
      }),
      /verification failed/
    );
  });
});

function createMockFetch(responses) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push({ url, options });

    const response = responses.shift();
    if (!response) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    return response;
  };

  fetch.calls = calls;
  return fetch;
}

function sparseListItem() {
  return {
    name: "mapx-style-svg",
    href: "http://geoserver:8080/geoserver/rest/urlchecks/mapx-style-svg.json",
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function emptyResponse(status = 200) {
  return textResponse("", status);
}

function textResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return {};
    },
    async text() {
      return body;
    },
  };
}
