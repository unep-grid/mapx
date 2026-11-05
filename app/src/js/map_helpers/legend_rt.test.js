import { describe, expect, it, vi } from "vitest";

vi.mock("./../mirror_util", () => ({
  mirrorUrlCreate: (url) =>
    `https://api.test/get/mirror?url=${encodeURIComponent(url)}`,
}));

import { getViewRtLegendUrl, rtLegendUrlToJson } from "./legend_rt.js";

const LEGEND =
  "https://giri.unepgrid.ch/geoserver/wms?SERVICE=WMS&REQUEST=GetLegendGraphic&LAYER=ingeniar%3APGA_250y&STYLE=pga&FORMAT=image%2Fpng";

describe("rtLegendUrlToJson", () => {
  it("requests JSON and keeps layer and style", () => {
    const url = new URL(rtLegendUrlToJson(LEGEND));
    expect(url.searchParams.get("format")).toBe("application/json");
    expect(url.searchParams.has("FORMAT")).toBe(false);
    expect(url.searchParams.get("LAYER")).toBe("ingeniar:PGA_250y");
    expect(url.searchParams.get("STYLE")).toBe("pga");
  });

  it("accepts any parameter case and a missing format", () => {
    const url = rtLegendUrlToJson(
      "https://x.test/wms?request=getlegendgraphic&layer=a",
    );
    expect(new URL(url).searchParams.get("format")).toBe("application/json");
  });

  it("rejects non GetLegendGraphic URLs", () => {
    expect(rtLegendUrlToJson("https://x.test/legend.png")).toBe(null);
    expect(
      rtLegendUrlToJson(
        "https://x.test/arcgis/rest/services/a/MapServer/legend?f=json",
      ),
    ).toBe(null);
    expect(rtLegendUrlToJson("not a url")).toBe(null);
    expect(rtLegendUrlToJson(null)).toBe(null);
  });
});

describe("getViewRtLegendUrl", () => {
  const view = (source) => ({ data: { source } });

  it("returns the stored legend URL", () => {
    expect(getViewRtLegendUrl(view({ legend: LEGEND }))).toBe(LEGEND);
    expect(getViewRtLegendUrl(view({}))).toBe(null);
  });

  it("converts to JSON before mirroring", () => {
    const url = new URL(
      getViewRtLegendUrl(view({ legend: LEGEND, useMirror: true }), {
        json: true,
      }),
    );
    const target = new URL(url.searchParams.get("url"));
    expect(target.searchParams.get("format")).toBe("application/json");
  });

  it("returns null when the JSON legend is not available", () => {
    expect(
      getViewRtLegendUrl(view({ legend: "https://x.test/legend.png" }), {
        json: true,
      }),
    ).toBe(null);
  });
});
