import chroma from "chroma-js";

export const DEFAULT_PALETTE = "purd";

export function resolvePaletteName(palette) {
  if (chroma.brewer[palette]) {
    return palette;
  }
  return DEFAULT_PALETTE;
}

export function getPaletteColors(palette) {
  return chroma.brewer[resolvePaletteName(palette)].map((c) => c);
}
