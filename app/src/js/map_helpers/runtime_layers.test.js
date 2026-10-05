import { describe, expect, it } from "vitest";
import {
  getRuntimeLayersByPrefix,
  getViewSourcesFromLayers,
} from "./runtime_layers.js";

describe("getRuntimeLayersByPrefix", () => {
  it("returns custom layers that exist in runtime order but not serialized style", () => {
    const customLayer = {
      id: "MX-CUSTOM",
      type: "custom",
      metadata: { idView: "MX-CUSTOM" },
    };
    const map = {
      getStyle: () => ({
        layers: [
          { id: "background" },
          { id: "MX-STYLE", metadata: { idView: "MX-STYLE" } },
        ],
      }),
      getLayersOrder: () => ["background", "MX-CUSTOM", "MX-STYLE"],
      getLayer: (id) => (id === "MX-CUSTOM" ? customLayer : undefined),
    };

    const layers = getRuntimeLayersByPrefix({ map, prefix: /^MX-/ });

    expect(layers.map((layer) => layer.id)).toEqual(["MX-CUSTOM", "MX-STYLE"]);
    expect(layers[0]).toBe(customLayer);
  });

  it("falls back to serialized style layers when runtime order is unavailable", () => {
    const map = {
      getStyle: () => ({
        layers: [{ id: "background" }, { id: "MX-STYLE" }],
      }),
      getLayer: () => undefined,
    };

    expect(
      getRuntimeLayersByPrefix({ map, prefix: "MX-" }).map((layer) => layer.id),
    ).toEqual(["MX-STYLE"]);
  });
});

describe("getViewSourcesFromLayers", () => {
  const sources = {
    "MX-CC-SRC-a": { type: "vector" },
    "MX-CC-SRC-b": { type: "geojson" },
    "MX-VT-SRC": { type: "vector" },
    basemap: { type: "vector" },
  };
  const map = {
    getStyle: () => ({
      sources,
      layers: [
        { id: "background" },
        { id: "water", source: "basemap" },
        { id: "MX-CC@a", source: "MX-CC-SRC-a" },
        { id: "MX-CC@b", source: "MX-CC-SRC-b" },
        { id: "MX-CC@b-outline", source: "MX-CC-SRC-b" },
        { id: "MX-VT@0", source: "MX-VT-SRC" },
        { id: "MX-CC@missing", source: "removed" },
      ],
    }),
  };

  it("returns each source used by the view layers once", () => {
    expect(getViewSourcesFromLayers({ map, idView: "MX-CC" })).toEqual({
      "MX-CC-SRC-a": sources["MX-CC-SRC-a"],
      "MX-CC-SRC-b": sources["MX-CC-SRC-b"],
    });
  });

  it("does not require the source id to share the view id prefix", () => {
    const mapOther = {
      getStyle: () => ({
        sources: { mx_abc: { type: "vector" } },
        layers: [{ id: "MX-CC@a", source: "mx_abc" }],
      }),
    };
    expect(
      Object.keys(getViewSourcesFromLayers({ map: mapOther, idView: "MX-CC" })),
    ).toEqual(["mx_abc"]);
  });

  it("returns an empty object without map or view id", () => {
    expect(getViewSourcesFromLayers({ idView: "MX-CC" })).toEqual({});
    expect(getViewSourcesFromLayers({ map })).toEqual({});
  });
});
