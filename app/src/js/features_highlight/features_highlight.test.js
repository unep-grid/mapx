import { describe, expect, it, vi } from "vitest";
import { Highlighter } from "./features_highlight.js";

vi.mock("../mx_helper_misc", () => ({
  clone: (obj) => (obj === undefined ? obj : structuredClone(obj)),
  patchObject: (source, patch) => ({
    ...(source === undefined ? {} : structuredClone(source)),
    ...(patch === undefined ? {} : structuredClone(patch)),
  }),
}));

function createMap(features) {
  return {
    addLayer: vi.fn(),
    getLayer: vi.fn(() => null),
    getStyle: vi.fn(() => ({
      layers: [
        {
          id: "MX-TEST",
          source: "source-test",
          type: "fill",
        },
      ],
    })),
    queryRenderedFeatures: vi.fn(() => features),
  };
}

describe("Highlighter", () => {
  it("uses feature ids when matched features have no gid", () => {
    const map = createMap([
      {
        id: "feature-1",
        properties: {},
      },
    ]);
    const highlighter = new Highlighter();

    highlighter._map = map;
    highlighter.setState({
      filters: [{ id: "MX-TEST", filter: ["all"] }],
    });

    const filters = map.addLayer.mock.calls.map(([layer]) => layer.filter);

    expect(filters).toHaveLength(2);
    expect(filters).toEqual([
      ["match", ["to-string", ["id"]], ["feature-1"], true, false],
      ["match", ["to-string", ["id"]], ["feature-1"], true, false],
    ]);
    expect(JSON.stringify(filters)).not.toContain("undefined");
  });

  it("uses a safe empty filter when matched features have no identity", () => {
    const map = createMap([
      {
        properties: {},
      },
    ]);
    const highlighter = new Highlighter();

    highlighter._map = map;
    highlighter.setState({
      filters: [{ id: "MX-TEST", filter: ["all"] }],
    });

    const filters = map.addLayer.mock.calls.map(([layer]) => layer.filter);

    expect(filters).toEqual([
      ["==", ["literal", 1], 0],
      ["==", ["literal", 1], 0],
    ]);
  });
});
