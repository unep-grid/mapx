import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ui.js", () => ({ wmsBuildQueryUi: vi.fn() }));
vi.mock("./../settings", () => ({
  settings: { useCache: true, maxByteFetch: 1e6, maxTimeCache: 1e3 },
}));
vi.mock("./../mirror_util", () => ({ mirrorUrlCreate: (url) => url }));
vi.mock("../mx_helper_misc", () => ({
  path: (obj, p, def) =>
    p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) ?? def,
}));
vi.mock("../url_utils", () => ({
  objToParams: (obj) => new URLSearchParams(obj).toString(),
}));
vi.mock("../modules_loader_async", () => ({ moduleLoad: vi.fn() }));
vi.mock("../mx_helper_fetch_progress", () => ({ fetchProgress_xhr: vi.fn() }));
vi.mock("../map_helpers/utils", () => ({
  pointBboxToWms: vi.fn(async () => "-40.63,-7.29,-40.62,-7.28"),
}));
vi.mock("./../minicache", () => ({
  miniCacheSet: vi.fn(),
  miniCacheGet: vi.fn(async () => ({
    Capability: {
      Request: { GetFeatureInfo: { Format: ["application/json"] } },
      Exception: ["XML", "application/vnd.ogc.se_xml"],
      Layer: { Layer: [{ Name: "ingeniar:PGA_250y", queryable: true }] },
    },
  })),
}));

import { wmsQuery } from "./index.js";

const URL_BASE = "https://giri.unepgrid.ch/geoserver/ows";

function mockFeatureInfo(properties) {
  const fetchMock = vi.fn(async () => ({
    json: async () => ({
      features: properties.map((p) => ({ properties: p })),
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function query(opt) {
  return wmsQuery({
    bbox: [
      [0, 0],
      [9, 9],
    ],
    layers: "ingeniar:PGA_250y",
    styles: "",
    url: URL_BASE,
    ...opt,
  });
}

describe("wmsQuery", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requests GeoServer no-data exclusion", async () => {
    const fetchMock = mockFeatureInfo([{ GRAY_INDEX: 214.24 }]);
    await query();
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("request")).toBe("GetFeatureInfo");
    expect(url.searchParams.get("exclude_nodata_result")).toBe("true");
  });

  it("preserves null no-data samples and genuine zero", async () => {
    mockFeatureInfo([{ GRAY_INDEX: null }, { GRAY_INDEX: 0 }]);
    expect(await query()).toEqual([{ GRAY_INDEX: null }, { GRAY_INDEX: 0 }]);
  });

  it("keeps null samples in object mode", async () => {
    mockFeatureInfo([{ GRAY_INDEX: null }]);
    expect(await query({ asObject: true })).toEqual({ GRAY_INDEX: [null] });
  });
});
