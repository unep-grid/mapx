import { describe, expect, it } from "vitest";
import { getRuntimeLayersByPrefix } from "./runtime_layers.js";

describe("getRuntimeLayersByPrefix", () => {
  it("returns custom layers that exist in runtime order but not serialized style", () => {
    const customLayer = {
      id: "MX-CUSTOM",
      type: "custom",
      metadata: { idView: "MX-CUSTOM" },
    };
    const map = {
      getStyle: () => ({
        layers: [{ id: "background" }, { id: "MX-STYLE", metadata: { idView: "MX-STYLE" } }],
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

    expect(getRuntimeLayersByPrefix({ map, prefix: "MX-" }).map((layer) => layer.id)).toEqual([
      "MX-STYLE",
    ]);
  });
});
