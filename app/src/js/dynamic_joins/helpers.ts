import type { LegendClasses } from "./types";
/**
 * Shared helpers for dynamic joins - color scale and legend utilities
 * These functions ensure consistency between map styling and legend rendering
 */

/**
 * Determines which class index a value belongs to based on chroma scale classes
 * This is the core logic used by both map styling and legend rendering
 */
export function getClassIndex(
  value: any,
  colorScale: chroma.Scale,
): number | string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "na";
  }

  const classes = (colorScale as any).classes();
  const numValue = Number(value);

  for (let i = 0; i < classes.length; i++) {
    const lowerBound = i === 0 ? -Infinity : classes[i - 1];
    const upperBound = classes[i];

    if (numValue > lowerBound && numValue <= upperBound) {
      return i;
    }
  }

  // If value doesn't fit in any class, treat as NA
  return "na";
}

/**
 * Gets the appropriate color for a value using the color scale
 * Handles NA values with fallback color
 */
export function getColorForValue(
  values: number[],
  colorScale: chroma.Scale,
  colorNa: string,
): string {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) {
    return colorNa;
  }

  // sort and pick median
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  try {
    return colorScale(median).hex();
  } catch {
    return colorNa;
  }
}

/**
 * Gets legend class information from a chroma scale
 * Returns array of class info with bounds and colors
 */
export function getLegendClasses(
  colorScale: chroma.Scale,
  colorNa: string,
): LegendClasses {
  const classes = (colorScale as any).classes();
  //colorScale.domain() -> 12, 26
  // colorScale.classes() ->
  // [12, 14.8, 17.6, 20.4, 23.2, 26]

  const out: any[] = [];

  for (let i = 0; i < classes.length - 1; i++) {
    const isFirst = i === 0;
    const lowerBound = classes[i];
    const upperBound = classes[i + 1];
    const color = getColorForValue(
      [lowerBound, upperBound],
      colorScale,
      colorNa,
    );
    const label = formatIntervalLabel(lowerBound, upperBound, isFirst);
    out.push({
      index: i,
      lowerBound,
      upperBound,
      color,
      label,
      isFirst,
    });
  }

  return out;
}

/**
 * Formats interval notation label
 */
function formatIntervalLabel(
  lower: number,
  upper: number,
  isFirstBin: boolean,
) {
  const leftBracket = isFirstBin ? "[" : "(";
  const lowerStr = parseFloat(lower.toFixed(2)).toString();
  const upperStr = parseFloat(upper.toFixed(2)).toString();
  return `${leftBracket}${lowerStr}, ${upperStr}]`;
}
