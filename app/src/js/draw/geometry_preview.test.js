import { describe, expect, it, vi } from "vitest";

import { GeometryPreview } from "./geometry_preview.js";

function createMap() {
  const sources = new Map();
  const layers = new Map();
  return {
    sources,
    layers,
    getSource: vi.fn((id) => sources.get(id)),
    addSource: vi.fn((id, source) => {
      sources.set(id, {
        ...source,
        setData: vi.fn((data) => {
          sources.get(id).data = data;
        }),
      });
    }),
    removeSource: vi.fn((id) => sources.delete(id)),
    getLayer: vi.fn((id) => layers.get(id)),
    addLayer: vi.fn((layer) => layers.set(layer.id, layer)),
    removeLayer: vi.fn((id) => layers.delete(id)),
  };
}

describe("draw geometry preview", () => {
  it("renders a GeoJSON feature independently from project views", () => {
    const map = createMap();
    const preview = new GeometryPreview();
    const data = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [6.1, 46.2] },
    };

    preview.show(map, data);

    expect(map.addSource).toHaveBeenCalledWith("mx-draw-geometry-preview", {
      type: "geojson",
      data,
    });
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect(map.layers.get("mx-draw-geometry-preview-point")).toMatchObject({
      type: "circle",
      source: "mx-draw-geometry-preview",
    });
  });

  it("replaces data without duplicating the source or layers", () => {
    const map = createMap();
    const preview = new GeometryPreview();
    const first = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    };
    const next = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 3],
        ],
      },
    };
    preview.show(map, first);
    const source = map.sources.get("mx-draw-geometry-preview");

    preview.show(map, next);

    expect(source.setData).toHaveBeenCalledWith(next);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(3);
  });

  it("removes every layer before removing the source", () => {
    const map = createMap();
    const preview = new GeometryPreview();
    preview.show(map, {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [] },
    });

    preview.clear(map);

    expect(map.removeLayer).toHaveBeenCalledTimes(3);
    expect(map.removeSource).toHaveBeenCalledWith("mx-draw-geometry-preview");
    expect(map.layers.size).toBe(0);
    expect(map.sources.size).toBe(0);
  });

  it("does not let a previous owner clear a newer preview", () => {
    const map = createMap();
    const preview = new GeometryPreview();
    const ownerA = Symbol("editor-a");
    const ownerB = Symbol("editor-b");
    const data = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    };
    preview.show(map, data, ownerA);
    preview.show(map, data, ownerB);

    expect(preview.clear(map, ownerA)).toBe(false);
    expect(map.removeSource).not.toHaveBeenCalled();
    expect(preview.clear(map, ownerB)).toBe(true);
    expect(map.removeSource).toHaveBeenCalledWith("mx-draw-geometry-preview");
  });
});
