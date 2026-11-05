import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  views: {},
  getViewMapboxLayers: vi.fn(),
}));

vi.mock("./index.js", () => ({ getView: (id) => mocks.views[id] }));
vi.mock("./../mirror_util", () => ({ mirrorUrlCreate: (url) => url }));
vi.mock("./../style_vt/view_to_mb_layers.js", () => ({
  getViewMapboxLayers: mocks.getViewMapboxLayers,
}));
vi.mock("./../language/index.js", () => ({
  checkLanguage: () => "en",
  getLabelFromObjectPath: ({ obj }) => obj?.data?.style?.titleLegend?.en,
}));

import { getViewLegendJson } from "./legend_json.js";

const LEGEND =
  "https://giri.unepgrid.ch/geoserver/wms?SERVICE=WMS&REQUEST=GetLegendGraphic&LAYER=ingeniar%3APGA_250y&FORMAT=image%2Fpng";

const PROJECT = "MX-CDC-CTV-4PZ-VQD-OZ3";

function addView(view) {
  view.id = `MX-${view.id.padEnd(5, "0")}-AAAAA-BBBBB`;
  view.project = PROJECT;
  mocks.views[view.id] = view;
  return view.id;
}

function rtView(id, source) {
  return addView({ id, type: "rt", data: { source } });
}

function vtView(id) {
  return addView({
    id,
    type: "vt",
    data: {
      geometry: { type: "polygon" },
      attribute: { name: "pop", type: "number" },
      style: { titleLegend: { en: "Population" } },
    },
  });
}

function mockFetch(impl) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.views = {};
  mocks.getViewMapboxLayers.mockReset();
});

describe("getViewLegendJson raster", () => {
  it("returns the GeoServer JSON legend", async () => {
    const legend = {
      Legend: [{ layerName: "PGA_250y", rules: [{ symbolizers: [] }] }],
    };
    const fetchMock = mockFetch(async () => ({
      ok: true,
      json: async () => legend,
    }));
    const idView = rtView("rt1", { legend: LEGEND });
    const out = await getViewLegendJson({ view: idView });
    expect(out).toEqual({
      idView,
      type: "rt",
      provider: "geoserver",
      supported: true,
      data: legend,
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("format")).toBe("application/json");
  });

  it("reports missing and unsupported legends without fetching", async () => {
    const fetchMock = mockFetch(async () => ({}));
    const a = await getViewLegendJson({ view: rtView("rt2", {}) });
    const b = await getViewLegendJson({
      view: rtView("rt3", { legend: "https://x.test/legend.png" }),
    });
    expect(a).toMatchObject({ supported: false, reason: "no_legend" });
    expect(b).toMatchObject({
      supported: false,
      provider: null,
      reason: "unsupported_provider",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports network, HTTP and response errors", async () => {
    const idView = rtView("rt4", { legend: LEGEND });

    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await getViewLegendJson({ view: idView })).toMatchObject({
      reason: "fetch_failed",
    });

    mockFetch(async () => ({ ok: false }));
    expect(await getViewLegendJson({ view: idView })).toMatchObject({
      reason: "fetch_failed",
    });

    mockFetch(async () => ({
      ok: true,
      json: async () => JSON.parse("<xml/>"),
    }));
    expect(await getViewLegendJson({ view: idView })).toMatchObject({
      reason: "invalid_response",
    });

    mockFetch(async () => ({ ok: true, json: async () => ({ a: 1 }) }));
    expect(await getViewLegendJson({ view: idView })).toMatchObject({
      reason: "invalid_response",
    });
  });
});

describe("getViewLegendJson vector", () => {
  it("returns MapX legend rules, deduplicated", async () => {
    mocks.getViewMapboxLayers.mockResolvedValue({
      config: { useStyleCustom: false },
      rules: [
        {
          value: 0,
          value_to: 10,
          label_en: "Low",
          label_fr: "Bas",
          color: "#f00",
          opacity: 0.5,
          size: 2,
          sprite: "none",
          filter: ["all"],
        },
        { value: 0, value_to: 10, color: "#f00", sprite: "hatch" },
        { value: 10, value_to: null, color: "#0f0", add_border: true },
      ],
    });
    const out = await getViewLegendJson({ view: vtView("vt1") });
    expect(out.provider).toBe("mapx");
    expect(out.supported).toBe(true);
    expect(out.data.title).toBe("Population");
    expect(out.data.geometry).toBe("polygon");
    expect(out.data.attribute).toEqual({ name: "pop", type: "number" });
    expect(out.data.rules).toEqual([
      {
        value: 0,
        value_to: 10,
        label: "Low",
        labels: { en: "Low", fr: "Bas" },
        color: "#f00",
        opacity: 0.5,
        size: 2,
        sprite: "hatch",
        color_border: null,
      },
      {
        value: 10,
        value_to: null,
        label: 10,
        labels: {},
        color: "#0f0",
        opacity: 1,
        size: null,
        sprite: null,
        color_border: null,
      },
    ]);
  });

  it("reports custom styles as unsupported", async () => {
    mocks.getViewMapboxLayers.mockResolvedValue({
      config: { useStyleCustom: true },
      rules: [],
    });
    const out = await getViewLegendJson({ view: vtView("vt2") });
    expect(out).toMatchObject({ supported: false, reason: "custom_style" });
  });
});

describe("getViewLegendJson other views", () => {
  it("rejects unknown views and reports other types", async () => {
    await expect(getViewLegendJson({ view: "missing" })).rejects.toThrow(
      /not found/,
    );
    const idView = addView({ id: "cc1", type: "cc", data: { methods: "x" } });
    expect(await getViewLegendJson({ view: idView })).toMatchObject({
      supported: false,
      reason: "unsupported_view_type",
    });
  });
});
