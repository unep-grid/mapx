// @ts-check
import { RasterUrlConfigurator } from "./raster_url_configurator.js";

const installedRoots = new WeakSet();

/**
 * Connect the legacy raster-view form to the browser-owned configurator.
 * Shiny keeps owning the native inputs and receives their normal DOM events.
 *
 * @param {{root: HTMLElement}} options
 */
export function installRasterUrlShinyBridge({ root }) {
  if (!root?.ownerDocument || installedRoots.has(root)) {
    return;
  }
  installedRoots.add(root);
  const configurator = new RasterUrlConfigurator({ root });

  root.addEventListener("click", (event) => {
    const ElementClass = root.ownerDocument.defaultView?.Element;
    if (!ElementClass || !(event.target instanceof ElementClass)) {
      return;
    }
    const button = event.target.closest("[data-raster-url-configure]");
    if (!button || !root.contains(button)) {
      return;
    }
    const editor = /** @type {HTMLElement|null} */ (
      button.closest("[data-raster-url-editor]")
    );
    if (!editor) {
      return;
    }
    openEditor({ configurator, editor }).catch(console.error);
  });
}

/**
 * @param {{configurator: RasterUrlConfigurator, editor: HTMLElement}} options
 */
async function openEditor({ configurator, editor }) {
  const refs = formRefs(editor);
  if (!refs || !editor.dataset.rasterUrlView) {
    return;
  }
  await configurator.show({
    idView: editor.dataset.rasterUrlView,
    mode: "draft",
    config: {
      tiles: refs.tiles.value,
      legend: refs.legend.value,
      tileSize: Number(refs.tileSize.value) || 512,
      useMirror: refs.useMirror.checked,
    },
    onApplied: (_health, config) => {
      setInputValue(refs.tiles, config.tiles);
      setInputValue(refs.legend, config.legend);
      setInputValue(refs.tileSize, String(config.tileSize));
      setInputValue(refs.useMirror, Boolean(config.useMirror));
    },
  });
}

/** @param {HTMLElement} editor */
function formRefs(editor) {
  const tiles = /** @type {HTMLTextAreaElement|null} */ (
    editor.querySelector("#textRasterTileUrl")
  );
  const legend = /** @type {HTMLTextAreaElement|null} */ (
    editor.querySelector("#textRasterTileLegend")
  );
  const tileSize = /** @type {HTMLSelectElement|null} */ (
    editor.querySelector("#selectRasterTileSize")
  );
  const useMirror = /** @type {HTMLInputElement|null} */ (
    editor.querySelector("#checkRasterTileUseMirror")
  );
  if (!tiles || !legend || !tileSize || !useMirror) {
    return null;
  }
  return { tiles, legend, tileSize, useMirror };
}

/**
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} input
 * @param {string|boolean} value
 */
function setInputValue(input, value) {
  const InputClass = input.ownerDocument.defaultView?.HTMLInputElement;
  if (InputClass && input instanceof InputClass && input.type === "checkbox") {
    input.checked = Boolean(value);
  } else {
    input.value = String(value);
  }
  const EventClass = input.ownerDocument.defaultView?.Event;
  if (EventClass) {
    input.dispatchEvent(new EventClass("change", { bubbles: true }));
  }
}
