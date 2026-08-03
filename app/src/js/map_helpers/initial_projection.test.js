import { describe, expect, it } from "vitest";
import { withInitialProjection } from "./initial_projection.js";

describe("initial projection", () => {
  it("selects globe through the style without mutating the input", () => {
    const style = { version: 8, sources: {}, layers: [] };

    const result = withInitialProjection(style, true);

    expect(result).not.toBe(style);
    expect(result.projection).toEqual({ type: "globe" });
    expect(style).not.toHaveProperty("projection");
  });

  it("selects Mercator when globe mode is disabled", () => {
    const result = withInitialProjection(
      { version: 8, sources: {}, layers: [] },
      false,
    );

    expect(result.projection).toEqual({ type: "mercator" });
  });

  it("leaves a polar camera unchanged when preparing globe map options", () => {
    const center = [54.924, 83.309];
    const mapOptions = {
      center,
      zoom: 2.292,
      style: withInitialProjection(
        { version: 8, sources: {}, layers: [] },
        true,
      ),
    };

    expect(mapOptions).toMatchObject({
      center: [54.924, 83.309],
      zoom: 2.292,
      style: { projection: { type: "globe" } },
    });
  });
});
