import { getView } from "../map_helpers/index.js";
import { LegendVt } from "./legend_vt.js";
/**
 * Updates the state of a view's legend with the provided values.
 *
 * @param {Object} view - The view object containing the legend instance.
 * @param {Array} values - An array of values to set the legend's state.
 * @returns {void|Error} Returns nothing if successful or an error if there's no LegendVt instance.
 */
export function setViewLegendState(view, values) {
  view = getView(view);
  if (!(view._legend instanceof LegendVt)) {
    throw new Error("The provided view does not have a LegendVt instance.");
  }
  const lvt = view._legend;
  return lvt.setCheckedByValue(values);
}

/**
 * Retrieves the current state (checked values) of a view's legend.
 *
 * @param {Object} view - The view object containing the legend instance.
 * @returns {Array|Error} An array of the currently checked values in the legend, or an error if there's no LegendVt instance.
 */
export function getViewLegendState(view) {
  view = getView(view);
  if (!(view._legend instanceof LegendVt)) {
    throw new Error("The provided view does not have a LegendVt instance.");
  }
  const lvt = view._legend;
  return lvt.getCheckedValues();
}


 /**
   * Retrieves the values from the rules.
   *
   * For numeric rules, the method returns an array of range arrays ([from, to]),
   * otherwise, it just returns an array of values.
   *
   * @returns {Array} An array of checked values. For numeric rules, each entry is an array of format [from, to].
   *
   * @example
   * // Non-numeric rules
   * getViewLegendValues(); // e.g. ["value1", "value2", ...]
   *
   * // Numeric rules
   * getViewLegendValues(); // e.g. [[0, 10], [10, 20], ...]
   */
export function getViewLegendValues(view) {
  view = getView(view);
  if (!(view._legend instanceof LegendVt)) {
    throw new Error("The provided view does not have a LegendVt instance.");
  }
  const lvt = view._legend;
  return lvt.getValues();
}



