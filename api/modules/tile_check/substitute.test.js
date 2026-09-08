import { describe, expect, it } from "vitest";
import { buildTestUrl, DEFAULT_X, DEFAULT_Y, DEFAULT_Z } from "./substitute.js";

describe("buildTestUrl", () => {
  it("returns null for a non-string template", () => {
    expect(buildTestUrl(undefined)).toBe(null);
    expect(buildTestUrl(null)).toBe(null);
    expect(buildTestUrl("")).toBe(null);
  });

  it("leaves a URL without placeholders untouched", () => {
    const url = "https://example.com/tiles/fixed.png";
    expect(buildTestUrl(url)).toBe(url);
  });

  it("substitutes {z}/{x}/{y} with the default tile when no bounds are given", () => {
    const url = buildTestUrl("https://example.com/{z}/{x}/{y}.png");
    expect(url).toBe(
      `https://example.com/${DEFAULT_Z}/${DEFAULT_X}/${DEFAULT_Y}.png`,
    );
  });

  it("substitutes {-y} with the TMS-flipped y", () => {
    const url = buildTestUrl("https://example.com/{z}/{x}/{-y}.png");
    const flipped = Math.pow(2, DEFAULT_Z) - 1 - DEFAULT_Y;
    expect(url).toBe(
      `https://example.com/${DEFAULT_Z}/${DEFAULT_X}/${flipped}.png`,
    );
  });

  it("substitutes {quadkey}", () => {
    const url = buildTestUrl("https://example.com/tile/{quadkey}.png");
    expect(url).toMatch(/^https:\/\/example\.com\/tile\/[0-3]+\.png$/);
  });

  it("substitutes {bbox-epsg-3857} with 4 comma-separated numbers", () => {
    const url = buildTestUrl(
      "https://geoserver/wms?bbox={bbox-epsg-3857}&format=image/png",
    );
    const bbox = url.match(/bbox=([^&]+)/)[1];
    const parts = bbox.split(",").map(Number);
    expect(parts).toHaveLength(4);
    expect(parts.every((n) => Number.isFinite(n))).toBe(true);
    expect(parts[0]).toBeLessThan(parts[2]);
    expect(parts[1]).toBeLessThan(parts[3]);
  });

  it("derives a tile from view bounds when provided", () => {
    const globalDefault = buildTestUrl("https://example.com/{z}/{x}/{y}.png");
    const fromBounds = buildTestUrl("https://example.com/{z}/{x}/{y}.png", {
      bounds: [10, 40, 20, 50],
    });
    expect(fromBounds).not.toBe(globalDefault);
  });

  it("ignores malformed bounds and falls back to the default tile", () => {
    const url = buildTestUrl("https://example.com/{z}/{x}/{y}.png", {
      bounds: [1, 2, 3],
    });
    expect(url).toBe(
      `https://example.com/${DEFAULT_Z}/${DEFAULT_X}/${DEFAULT_Y}.png`,
    );
  });
});
