import { beforeEach, describe, expect, it, vi } from "vitest";
import { settings } from "../settings";
import { MapScaler } from "./index.js";

function createMap(layers, loaded = true) {
  const map = {
    layers,
    isStyleLoaded: vi.fn(() => loaded),
    on: vi.fn(),
    off: vi.fn(),
    getStyle: vi.fn(() => ({ layers: map.layers })),
    setLayoutProperty: vi.fn((id, property, value) => {
      const layer = map.layers.find((item) => item.id === id);
      layer.layout[property] = value;
    }),
  };
  return map;
}

describe("MapScaler", () => {
  beforeEach(() => {
    settings.scale_text = 1;
    settings.scale_icon = 1;
  });

  it("scales numeric text and icon sizes and updates settings", () => {
    const map = createMap([
      { id: "label", layout: { "text-size": 10 } },
      { id: "marker", layout: { "icon-size": 0.5 } },
    ]);
    const scaler = new MapScaler(map);

    scaler.update(2);

    expect(map.setLayoutProperty).toHaveBeenCalledWith("label", "text-size", [
      "*",
      10,
      2,
    ]);
    expect(map.setLayoutProperty).toHaveBeenCalledWith("marker", "icon-size", [
      "*",
      0.5,
      2,
    ]);
    expect(settings.scale_text).toBe(2);
    expect(settings.scale_icon).toBe(2);
  });

  it("scales zoom interpolate outputs without wrapping the camera expression", () => {
    const baseExpr = ["interpolate", ["linear"], ["zoom"], 1, 10, 18, 20];
    const map = createMap([
      { id: "label", layout: { "text-size": baseExpr } },
    ]);
    const scaler = new MapScaler(map);

    scaler.text(2);
    scaler.text(0.5);

    expect(map.layers[0].layout["text-size"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      1,
      ["*", 10, 0.5],
      18,
      ["*", 20, 0.5],
    ]);
  });

  it("scales zoom step outputs without wrapping the camera expression", () => {
    const map = createMap([
      {
        id: "marker",
        layout: { "icon-size": ["step", ["zoom"], 0.2, 8, 0.5, 12, 1] },
      },
    ]);
    const scaler = new MapScaler(map);

    scaler.icon(2);

    expect(map.layers[0].layout["icon-size"]).toEqual([
      "step",
      ["zoom"],
      ["*", 0.2, 2],
      8,
      ["*", 0.5, 2],
      12,
      ["*", 1, 2],
    ]);
  });

  it("updates legacy nested MapX scale expressions without wrapping the parent", () => {
    const expr = [
      "interpolate",
      ["linear"],
      ["zoom"],
      1,
      ["*", 10, 1],
      18,
      ["*", 20, 1],
    ];
    const map = createMap([{ id: "label", layout: { "text-size": expr } }]);
    const scaler = new MapScaler(map);

    scaler.text(3);

    expect(map.layers[0].layout["text-size"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      1,
      ["*", 10, 3],
      18,
      ["*", 20, 3],
    ]);
  });

  it("updates only the requested setting", () => {
    const map = createMap([{ id: "label", layout: { "text-size": 10 } }]);
    const scaler = new MapScaler(map);

    scaler.text(1.5);
    expect(settings.scale_text).toBe(1.5);
    expect(settings.scale_icon).toBe(1);

    scaler.icon(0.75);
    expect(settings.scale_text).toBe(1.5);
    expect(settings.scale_icon).toBe(0.75);
  });

  it("ignores nullish scale values", () => {
    const map = createMap([{ id: "label", layout: { "text-size": 10 } }]);
    const scaler = new MapScaler(map);

    scaler.update(null);

    expect(map.setLayoutProperty).not.toHaveBeenCalled();
    expect(settings.scale_text).toBe(1);
    expect(settings.scale_icon).toBe(1);
  });

  it("requires an array of scale types", () => {
    const map = createMap([{ id: "label", layout: { "text-size": 10 } }]);
    const scaler = new MapScaler(map);

    expect(() => scaler.update(2, "text")).toThrow(
      "scale method requires type",
    );
  });

  it("removes its idle listener on destroy", () => {
    const map = createMap([]);
    const scaler = new MapScaler(map);

    scaler.destroy();

    expect(map.off).toHaveBeenCalledWith("idle", scaler.render);
  });
});
