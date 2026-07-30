// @ts-check
import "./index.js";

const installedRoots = new WeakSet();

/**
 * Thin compatibility bridge. Picker behavior remains independent from Shiny;
 * this adapter only forwards typed component changes to the legacy input name.
 *
 * @param {{
 *   root: HTMLElement,
 *   shiny: {
 *     setInputValue?: (id: string, value: unknown, options?: object) => void,
 *     onInputChange?: (id: string, value: unknown) => void
 *   }
 * }} options
 */
export function installSourcePickerShinyBridge({ root, shiny }) {
  if (
    !root ||
    (!shiny?.setInputValue && !shiny?.onInputChange) ||
    installedRoots.has(root)
  ) {
    return;
  }
  installedRoots.add(root);
  root.addEventListener("mx-source-picker-change", (event) => {
    const picker = event.target;
    const inputId = picker?.dataset?.shinyInput;
    if (!inputId) return;
    const ownExclusionInput = picker.dataset.excludeSourceInput;
    if (ownExclusionInput) {
      const sourcePicker = [...root.querySelectorAll("mx-source-picker")].find(
        (candidate) => candidate.dataset.shinyInput === ownExclusionInput,
      );
      if (picker.setExcludedIds(arrayValue(sourcePicker?.value))) return;
    }
    if (shiny.setInputValue) {
      shiny.setInputValue(inputId, event.detail.value, { priority: "event" });
    } else {
      shiny.onInputChange(inputId, event.detail.value);
    }
    for (const dependent of root.querySelectorAll("mx-source-picker")) {
      if (dependent.dataset.excludeSourceInput === inputId) {
        dependent.setExcludedIds(arrayValue(event.detail.value));
      }
    }
  });
}

function arrayValue(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}
