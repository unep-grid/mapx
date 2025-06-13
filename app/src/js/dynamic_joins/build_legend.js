import { LegendUI } from "./legend_ui.js";

/**
 * Build a legend input following the same pattern as buildRangeSlider and buildTomSelectInput
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.elWrapper - Container element for the legend
 * @param {Object} options.config - Legend configuration
 * @param {Object} options.config.colorScale - Chroma color scale object
 * @param {string} options.config.color_na - Color for NA/missing values
 * @param {Function} options.onBuilt - Callback when legend is built (receives legend instance)
 * @param {Function} options.onUpdate - Callback when legend class is toggled (receives classIndex, isVisible, allVisibleClasses)
 * @param {Array} options.data - Aggregated data array
 * @returns {LegendUI} The legend instance
 */
export function buildLegendInput(options = {}) {
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const { colorScale, color_na } = config;

  // Add legend-specific styling to wrapper
  elWrapper.classList.add("mx-legend-container");

  // Create the legend instance
  const legend = new LegendUI(elWrapper, {
    colorScale,
    color_na,
    data,
    onToggle: (classIndex, isVisible, allVisibleClasses) => {
      if (onUpdate) {
        onUpdate(classIndex, isVisible, allVisibleClasses);
      }
    },
  });

  // Notify that the legend has been built
  if (onBuilt) {
    onBuilt(legend);
  }

  return legend;
}
