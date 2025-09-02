import chroma from "chroma-js";
import { isNotEmpty } from "../is_test";

export function createColorFingerprint(theme) {
  const colors = Object.values(theme.colors)
    .map((c) => c.color)
    .filter(isNotEmpty);
  return createGradientCSS(colors, "125deg");
}

function createGradientCSS(colors, direction) {
  const gradientStops = [];
  const stepSize = 100 / colors.length;

  colors.forEach((color, index) => {
    const start = index * stepSize;
    const end = (index + 1) * stepSize;

    gradientStops.push(`${color} ${start}%`);
    gradientStops.push(`${color} ${end}%`);
  });

  return `linear-gradient(${direction}, ${gradientStops.join(", ")})`;
}
