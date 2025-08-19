import { getArrayStat } from "../array_stat";
import { isEmpty } from "../is_test";
import { isNumeric } from "../is_test";
import type { LegendClasses, AggregatorFunction } from "./types";
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
  value: number,
  colorScale: chroma.Scale,
  colorNa: string,
): string {
  try {
    if (!isNumeric(value) || isEmpty(value)) {
      return colorNa;
    }
    return colorScale(value).hex();
  } catch {
    return colorNa;
  }
}

/**
 * Gets color for value 
 */
export function getColorFromClassesLinear(
  value: number,
  legendClasses: LegendClasses,
  colorNa: string,
): string {
  
  if (!isNumeric(value) || isEmpty(value)) {
    return colorNa;
  }

  for (const classInfo of legendClasses) {
    const inLowerBound = classInfo.isFirst 
      ? value >= classInfo.lowerBound 
      : value > classInfo.lowerBound;
    const inUpperBound = value <= classInfo.upperBound;
    
    if (inLowerBound && inUpperBound) {
      return classInfo.color;
    }
  }
  
  return colorNa;
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
    const middle = (lowerBound + upperBound) / 2;
    const color = getColorForValue(middle, colorScale, colorNa);
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

export const aggregators: Record<string, AggregatorFunction> = {
  none: (vals: any[]) => {
    if (vals.length === 1) return vals[0];
    if (vals.length > 1) {
      console.warn(
        `No aggregator set. Expected single value, got ${vals.length}. Using first.`,
      );
      return vals[0];
    }
    return null;
  },
  first: (vals: any[]) => vals[0] ?? null,
  last: (vals: any[]) => vals.at(-1) ?? null,
  sum: (vals: number[]) => vals.reduce((a, b) => a + b, 0),
  max: (vals: number[]) => Math.max(...vals),
  min: (vals: number[]) => Math.min(...vals),
  median: (vals: number[]) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  mode: (vals: any[]) => {
    const counts = vals.reduce((acc: Record<string, number>, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    return (
      Object.entries(counts).reduce((a, [v, c]) => (c > a[1] ? [v, c] : a), [
        null,
        0,
      ] as any) as any
    )[0];
  },
};

export const operators = new Map<string, (a: any, b: any) => boolean>([
  ["==", (a, b) => a == b],
  ["!=", (a, b) => a != b],
  [">", (a, b) => a > b],
  [">=", (a, b) => a >= b],
  ["<", (a, b) => a < b],
  ["<=", (a, b) => a <= b],
]);
