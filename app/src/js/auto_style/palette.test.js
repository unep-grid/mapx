import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE,
  getPaletteColors,
  resolvePaletteName,
} from "./palette.js";

describe("auto style palette helpers", () => {
  it("uses the default palette when no palette is configured", () => {
    expect(resolvePaletteName()).toBe(DEFAULT_PALETTE);
    expect(resolvePaletteName(null)).toBe(DEFAULT_PALETTE);
  });

  it("uses the default palette when the configured palette is unknown", () => {
    expect(resolvePaletteName("unknown_palette")).toBe(DEFAULT_PALETTE);
  });

  it("preserves a valid configured palette", () => {
    expect(resolvePaletteName("Blues")).toBe("Blues");
  });

  it("returns cloned colors for the resolved palette", () => {
    const colors = getPaletteColors("unknown_palette");

    expect(colors).toEqual(getPaletteColors(DEFAULT_PALETTE));
    expect(colors).not.toBe(getPaletteColors(DEFAULT_PALETTE));
  });
});
