import chroma from "chroma-js";

export function createColorFingerprint(themeObject, options = {}) {
  const {
    maxColors = 12,
    direction = "125deg",
    stripWidth = "8.33%", // 100% / 12 colors
    includeAlpha = false,
    prioritizeCategories = [
      "background",
      "text",
      "water",
      "vegetation",
      "road",
      "building",
    ],
  } = options;

  // Extract colors from theme object
  const colors = themeObject.colors || {};

  // Categorize colors based on their names
  const categorizedColors = {
    background: [],
    text: [],
    water: [],
    vegetation: [],
    road: [],
    building: [],
    ui: [],
    map: [],
    other: [],
  };

  // Sort colors into categories
  Object.entries(colors).forEach(([key, colorData]) => {
    if (!colorData.color || colorData.visibility === "hidden") return;

    const colorValue = colorData.color;
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("background")) {
      categorizedColors.background.push(colorValue);
    } else if (lowerKey.includes("text")) {
      categorizedColors.text.push(colorValue);
    } else if (lowerKey.includes("water") || lowerKey.includes("bathymetry")) {
      categorizedColors.water.push(colorValue);
    } else if (lowerKey.includes("vegetation") || lowerKey.includes("tree")) {
      categorizedColors.vegetation.push(colorValue);
    } else if (lowerKey.includes("road") || lowerKey.includes("rail")) {
      categorizedColors.road.push(colorValue);
    } else if (lowerKey.includes("building")) {
      categorizedColors.building.push(colorValue);
    } else if (lowerKey.includes("ui_")) {
      categorizedColors.ui.push(colorValue);
    } else if (lowerKey.includes("map_")) {
      categorizedColors.map.push(colorValue);
    } else {
      categorizedColors.other.push(colorValue);
    }
  });

  // Function to get representative color from category
  function getRepresentativeColor(colorArray) {
    if (colorArray.length === 0) return null;
    // Convert to chroma colors and filter out transparent ones if needed
    const chromaColors = colorArray
      .map((color) => {
        try {
          const chromaColor = chroma(color);
          return includeAlpha || chromaColor.alpha() > 0.1 ? chromaColor : null;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    if (chromaColors.length === 0) return null;

    // Return the most saturated color, or first if similar saturation
    return chromaColors.reduce((prev, curr) =>
      curr.get("hsl.s") > prev.get("hsl.s") ? curr : prev,
    );
  }

  // Collect representative colors in priority order
  const selectedColors = [];

  prioritizeCategories.forEach((category) => {
    const repColor = getRepresentativeColor(categorizedColors[category]);
    if (repColor && selectedColors.length < maxColors) {
      selectedColors.push(repColor.hex());
    }
  });

  // Fill remaining slots with other colors
  Object.keys(categorizedColors).forEach((category) => {
    if (!prioritizeCategories.includes(category)) {
      const repColor = getRepresentativeColor(categorizedColors[category]);
      if (repColor && selectedColors.length < maxColors) {
        selectedColors.push(repColor.hex());
      }
    }
  });

  // If we still need more colors, add individual colors from largest categories
  if (selectedColors.length < maxColors) {
    const allColors = Object.values(categorizedColors)
      .flat()
      .map((color) => {
        try {
          return chroma(color);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .filter((color) => includeAlpha || color.alpha() > 0.1);

    // Sort by saturation and lightness for visual interest
    allColors.sort((a, b) => {
      const aScore =
        a.get("hsl.s") * 0.7 + (1 - Math.abs(a.get("hsl.l") - 0.5)) * 0.3;
      const bScore =
        b.get("hsl.s") * 0.7 + (1 - Math.abs(b.get("hsl.l") - 0.5)) * 0.3;
      return bScore - aScore;
    });

    allColors.forEach((color) => {
      if (selectedColors.length < maxColors) {
        const hexColor = color.hex();
        if (!selectedColors.includes(hexColor)) {
          selectedColors.push(hexColor);
        }
      }
    });
  }

  // Ensure we have at least some colors
  if (selectedColors.length === 0) {
    selectedColors.push("#666666"); // fallback
  }

  // Create CSS gradient
  return createGradientCSS(selectedColors, direction, stripWidth);
}

function createGradientCSS(colors, direction, stripWidth) {
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

function extractDominantColors(themeObject, maxColors) {
  const colors = themeObject.colors || {};
  const validColors = [];

  Object.values(colors).forEach((colorData) => {
    if (colorData.color && colorData.visibility !== "hidden") {
      try {
        const chromaColor = chroma(colorData.color);
        if (chromaColor.alpha() > 0.1) {
          validColors.push(chromaColor);
        }
      } catch (e) {
        // Skip invalid colors
      }
    }
  });

  // Sort by visual prominence (saturation + adjusted lightness)
  validColors.sort((a, b) => {
    const aScore =
      a.get("hsl.s") * 0.6 + (1 - Math.abs(a.get("hsl.l") - 0.5)) * 0.4;
    const bScore =
      b.get("hsl.s") * 0.6 + (1 - Math.abs(b.get("hsl.l") - 0.5)) * 0.4;
    return bScore - aScore;
  });

  return validColors.slice(0, maxColors).map((color) => color.hex());
}
