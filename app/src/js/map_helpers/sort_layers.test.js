import { describe, expect, it } from "vitest";
import { sortLayers } from "./sort_layers.js";

describe("sortLayers", () => {
  it("sorts layers without crashing when metadata is missing", () => {
    const layers = [
      { id: "with-position", metadata: { position: 2, priority: 0 } },
      { id: "without-metadata" },
      { id: "with-priority", metadata: { priority: 1 } },
      { id: "with-negative-position", metadata: { position: -1, priority: 0 } },
    ];

    expect(() => sortLayers(layers)).not.toThrow();
    expect(layers.map((layer) => layer.id)).toEqual([
      "with-negative-position",
      "without-metadata",
      "with-priority",
      "with-position",
    ]);
  });
});
