import { LegendUI } from "./legend_ui.ts";
import type { BuildLegendOptions } from "./types.ts";

/**
 * Build a legend input following the same pattern as buildRangeSlider and buildTomSelectInput
 * @param options - Configuration options
 * @param options.elWrapper - Container element for the legend
 * @param options.config - Legend configuration
 * @param options.config.colorScale - Chroma color scale object
 * @param options.config.colorNa - Color for NA/missing values
 * @param options.onBuilt - Callback when legend is built (receives legend instance)
 * @param options.onUpdate - Callback when legend class is toggled (receives classIndex, isVisible, allVisibleClasses)
 * @param options.data - Aggregated data array
 * @returns The legend instance
 */
export function buildLegendInput(options: BuildLegendOptions): LegendUI {
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const { colorScale, colorNa, joinType } = config;

  // Add legend-specific styling to wrapper
  elWrapper.classList.add("mx-legend-container");

  // Create the legend instance
  const legend = new LegendUI(elWrapper, {
    colorScale,
    colorNa,
    data,
    joinType,
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
