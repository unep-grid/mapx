import { describe, expect, it } from "vitest";
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
} from "./url_checks.js";

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
    expect(
      deriveStyleSvgRegex([
        "http://api.mapx.localhost:8880",
        "https://api.mapx.localhost:8880",
        "http://apidev.mapx.localhost:8880",
        "http://localhost:8880",
        "http://0.0.0.0:8880",
        "https://mapx.unepgrid.s3.unige.ch/mapx",
      ]),
    ).toBe(matchingRegex);
  });

  it("escapes regex metacharacters in the configured base URL", () => {
    const regex = deriveStyleSvgRegex("https://cdn.example.com/mapx.assets");

    expect(regex).toBe(
      "^(?:https://cdn\\.example\\.com/mapx\\.assets)/s3/style/v[0-9]+/svg/[^?#]+\\.svg(\\?.*)?$",
    );
  });

  it("builds URL check bases from API public settings, local dev aliases, and S3 upstream", () => {
    expect(getStyleSvgBaseUrls(baseSettings)).toEqual([
      "http://api.mapx.localhost:8880",
      "https://api.mapx.localhost:8880",
      "http://apidev.mapx.localhost:8880",
      "http://localhost:8880",
      "http://0.0.0.0:8880",
      "https://mapx.unepgrid.s3.unige.ch/mapx",
    ]);
  });

  it("includes explicit extra URL check bases from comma-separated settings", () => {
    expect(
      getStyleSvgBaseUrls({
        ...baseSettings,
        geoserver: {
          ...baseSettings.geoserver,
          urlcheck_style_svg_base_urls:
            "https://api.example.org, http://custom.mapx.localhost:8880",
        },
      }).slice(0, 2),
    ).toEqual(["https://api.example.org", "http://custom.mapx.localhost:8880"]);
  });

  it("preserves an explicit URL check regex exactly", () => {
    const check = buildManagedUrlCheck({
      ...baseSettings,
      geoserver: {
        ...baseSettings.geoserver,
        urlcheck_style_svg_regex: "^https://example\\.org/icons/.+$",
      },
    });

    expect(check.regex).toBe("^https://example\\.org/icons/.+$");
  });

  it("allows SVG URLs with query parameters", () => {
    const regex = new RegExp(buildManagedUrlCheck(baseSettings).regex);

    expect(
      regex.test(
        "http://apidev.mapx.localhost:8880/s3/style/v1/svg/maki-campsite-11.svg?fill=%23f6f609",
      ),
    ).toBe(true);
  });

  it("treats empty GeoServer urlChecks responses as an empty list", () => {
    expect(normalizeUrlChecks("")).toEqual([]);
    expect(normalizeUrlChecks({})).toEqual([]);
  });

  it("normalizes a single GeoServer URL check response object", () => {
    expect(normalizeUrlChecks({ urlCheck: matchingCheck })).toEqual([
      matchingCheck,
    ]);
  });

  it("normalizes GeoServer concrete regex URL check detail responses", () => {
    expect(normalizeUrlCheck({ regexUrlCheck: matchingCheck })).toEqual(
      matchingCheck,
    );
    expect(normalizeUrlCheck({ urlCheck: matchingCheck })).toEqual(
      matchingCheck,
    );
    expect(normalizeUrlCheck(matchingCheck)).toEqual(matchingCheck);
  });

  it("builds REST URLs relative to a GEOSERVER_URL ending in /rest", () => {
    expect(buildRestUrl(baseSettings, "urlchecks.json")).toBe(
      "http://geoserver:8080/geoserver/rest/urlchecks.json",
    );
  });

  it("adds GeoServer concrete class metadata to JSON write payloads", () => {
    expect(buildUrlCheckJson(matchingCheck)).toEqual({
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

    expect(result.action).toBe("created");
    expect(fetch.calls[1].options.method).toBe("POST");
    expect(JSON.parse(fetch.calls[1].options.body)).toEqual({
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

    expect(result.action).toBe("updated");
    expect(fetch.calls[2].options.method).toBe("PUT");
    expect(fetch.calls[2].url).toBe(
      "http://geoserver:8080/geoserver/rest/urlchecks/mapx-style-svg.json",
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

    expect(result.action).toBe("updated");
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

    expect(result.action).toBe("unchanged");
    expect(fetch.calls.length).toBe(2);
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

    expect(result.action).toBe("unchanged");
    expect(fetch.calls.length).toBe(2);
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

    expect(result.action).toBe("updated");
    expect(fetch.calls[1].url).toBe(sparseListItem().href);
    expect(fetch.calls[2].options.method).toBe("PUT");
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

    expect(result.action).toBe("created");
    expect(fetch.calls[2].options.headers["Content-Type"]).toBe(
      "application/xml",
    );
    expect(fetch.calls[2].options.body).toMatch(
      /<urlCheck class="org\.geoserver\.security\.urlchecks\.RegexURLCheck">/,
    );
    expect(fetch.calls[2].options.body).toMatch(/http:\/\/apidev\\\.mapx/);
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

    await expect(
      ensureGeoserverUrlChecks({
        settings: baseSettings,
        fetch,
      }),
    ).rejects.toThrow(/verification failed/);
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
