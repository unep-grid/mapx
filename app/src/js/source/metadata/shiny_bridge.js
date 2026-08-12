// @ts-check

/**
 * Open the legacy source metadata editor through its existing Shiny input.
 * This is the only compatibility boundary required by the metadata panel.
 *
 * @param {{
 *   idSource: string,
 *   shiny?: {setInputValue?: (id: string, value: unknown, options?: object) => void}
 * }} options
 * @returns {boolean}
 */
export function openSourceMetadataEditorForShiny({
  idSource,
  shiny = globalThis.Shiny,
}) {
  if (!idSource || !shiny?.setInputValue) return false;
  shiny.setInputValue(
    "selectSourceLayerForMeta",
    { idSource, update: Date.now() },
    { priority: "event" },
  );
  return true;
}
