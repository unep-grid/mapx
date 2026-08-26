import { describe, expect, it, vi } from "vitest";
import {
  queryRenderedViewFeatures,
  zoomToRenderedViewFeatures,
  zoomToWorld,
} from "./rendered_features_zoom.js";

function createMap(features = []) {
  return {
    getStyle: vi.fn(() => ({
      layers: [
        { id: "background" },
        { id: "country-label" },
        { id: "MX-FIRST@fill" },
        { id: "MX-FIRST@line" },
        { id: "MX-SECOND@circle" },
      ],
    })),
    queryRenderedFeatures: vi.fn(() => features),
    flyTo: vi.fn(),
  };
}

describe("rendered features zoom", () => {
  it("queries only the layers of a requested view", () => {
    const features = [{ id: 1 }];
    const map = createMap(features);

    expect(queryRenderedViewFeatures({ map, idView: "MX-FIRST" })).toBe(
      features,
    );
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({
      layers: ["MX-FIRST@fill", "MX-FIRST@line"],
    });
  });

  it("uses the configured composite layer separator", () => {
    const map = createMap();
    map.getStyle.mockReturnValue({
      layers: [{ id: "MX-FIRST::fill" }, { id: "MX-FIRST@legacy" }],
    });

    queryRenderedViewFeatures({
      map,
      idView: "MX-FIRST",
      layerSeparator: "::",
    });

    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({
      layers: ["MX-FIRST::fill"],
    });
  });

  it("queries all MapX view layers and excludes theme layers by default", () => {
    const map = createMap();

    queryRenderedViewFeatures({ map });

    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({
      layers: ["MX-FIRST@fill", "MX-FIRST@line", "MX-SECOND@circle"],
    });
  });

  it("does not query the map when no matching layer exists", () => {
    const map = createMap();

    expect(queryRenderedViewFeatures({ map, idView: "MX-UNKNOWN" })).toEqual(
      [],
    );
    expect(map.queryRenderedFeatures).not.toHaveBeenCalled();
  });

  it("fits the bounds of rendered features", async () => {
    const features = [{ id: 1 }];
    const map = createMap(features);
    const bounds = { west: 1, south: 2, east: 3, north: 4 };
    const createBounds = vi.fn(async () => bounds);
    const fitBounds = vi.fn(() => true);
    const zoomToViewExtent = vi.fn();

    await expect(
      zoomToRenderedViewFeatures({
        map,
        idView: "MX-FIRST",
        createBounds,
        fitBounds,
        zoomToViewExtent,
      }),
    ).resolves.toBe(true);
    expect(createBounds).toHaveBeenCalledWith(features);
    expect(fitBounds).toHaveBeenCalledWith(bounds);
    expect(zoomToViewExtent).not.toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("uses the full view extent when a requested view has no rendered feature", async () => {
    const map = createMap();
    const zoomToViewExtent = vi.fn(async () => true);

    await expect(
      zoomToRenderedViewFeatures({
        map,
        idView: "MX-FIRST",
        createBounds: vi.fn(),
        fitBounds: vi.fn(),
        zoomToViewExtent,
      }),
    ).resolves.toBe(true);
    expect(zoomToViewExtent).toHaveBeenCalledOnce();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("returns false when the requested view extent cannot be resolved", async () => {
    const map = createMap();

    await expect(
      zoomToRenderedViewFeatures({
        map,
        idView: "MX-FIRST",
        createBounds: vi.fn(),
        fitBounds: vi.fn(),
        zoomToViewExtent: vi.fn(async () => undefined),
      }),
    ).resolves.toBe(false);
  });

  it("returns to the world when no MapX feature is rendered globally", async () => {
    const map = createMap();

    await expect(
      zoomToRenderedViewFeatures({
        map,
        createBounds: vi.fn(),
        fitBounds: vi.fn(),
        zoomToViewExtent: vi.fn(),
      }),
    ).resolves.toBe(true);
    expect(map.flyTo).toHaveBeenCalledWith({ center: [0, 0], zoom: 0 });
  });

  it("returns to the world without changing map constraints", () => {
    const map = createMap();

    expect(zoomToWorld(map)).toBe(true);
    expect(map.flyTo).toHaveBeenCalledWith({ center: [0, 0], zoom: 0 });
  });
});
