/**
 * Shared helpers for dynamic joins - color scale and legend utilities
 * These functions ensure consistency between map styling and legend rendering
 */

import { isNumeric } from "../is_test";

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
  value: any,
  colorScale: chroma.Scale,
  colorNa: string,
): string {
  if (!isNumeric(value)) {
    return colorNa;
  }
  try {
    const color = colorScale(value);
    return color ? (color as any).hex() : colorNa;
  } catch {
    return colorNa;
  }
}

/**
 * Formats numbers consistently for legend display
 */
export function formatLegendNumber(num: number): string {
  if (!isNumeric(num)) {
    return "N/A";
  }

  if (num === -Infinity) {
    return "−∞";
  }

  if (num === Infinity) {
    return "∞";
  }

  return num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Gets legend class information from a chroma scale
 * Returns array of class info with bounds and colors
 */
export function getLegendClasses(
  colorScale: chroma.Scale,
  colorNa: string,
): Array<{
  index: number;
  lowerBound: number;
  upperBound: number;
  color: string;
  label: string;
}> {
  const classes = (colorScale as any).classes();

  // e.g. (6) [12, 14.8, 17.6, 20.4, 23.2, 26]

  return classes.map((upperBound: number, i: number) => {
    const lowerBound = i === 0 ? -Infinity : classes[i - 1];

    // Get color by using a representative value from the middle of the range e.g. 5,10 -> ~7
    const representativeValue =
      lowerBound === -Infinity ? upperBound - 1 : (lowerBound + upperBound) / 2;

    const color = getColorForValue(representativeValue, colorScale, colorNa);
    const upperLabel = formatLegendNumber(upperBound);
    const lowerLabel = formatLegendNumber(lowerBound);

    // For the first class, show "≤ upperBound" instead of "−∞ - upperBound"
    const label = i === 0 ? `≤ ${upperLabel}` : `${lowerLabel} - ${upperLabel}`;

    return {
      index: i,
      lowerBound,
      upperBound,
      color,
      label,
    };
  });
}
