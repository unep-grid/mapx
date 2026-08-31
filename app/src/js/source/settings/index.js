// @ts-check
import "./component.js";
import { getDictItem } from "../../language/index.js";
import { getMapxWindowManager } from "../../window/index.js";
import { pickSources } from "../picker/index.js";
import { settings } from "../../settings/index.js";

const WINDOW_KEY = "source-settings";

/** Open the source picker followed by the modern source-settings window. */
export async function openSourceSettings({ root = document.body } = {}) {
  const language = settings.language || "en";
  const result = await pickSources({
    root,
    multiple: false,
    acceptedTypes: ["vector", "tabular", "join"],
    requiredCapabilities: [],
    accessMode: "editable",
    language,
    label: await getDictItem("source_select_layer", language),
  });
  if (!result?.value || Array.isArray(result.value)) return null;

  const manager = getMapxWindowManager(root);
  const component = /** @type {import("./component.js").MxSourceSettingsElement} */ (
    manager.el("mx-source-settings")
  );
  component.applicationRoot = root;
  component.idSource = result.value;
  const [labelSave, labelDelete, labelClose] = await getDictItem(
    ["btn_update", "btn_delete", "btn_close"],
    language,
  );
  const save = manager.el(
    "button",
    {
      type: "button",
      class: ["btn", "btn-primary"],
      "data-lang_key": "btn_update",
      disabled: true,
      on: { click: () => component.save() },
    },
    labelSave,
  );
  const remove = manager.el(
    "button",
    {
      type: "button",
      class: ["btn", "btn-default", "source-settings-window__delete"],
      "data-lang_key": "btn_delete",
      disabled: true,
      on: { click: () => component.remove() },
    },
    labelDelete,
  );
  let window;
  const close = manager.el(
    "button",
    {
      type: "button",
      class: ["btn", "btn-default"],
      "data-lang_key": "btn_close",
      on: { click: () => window?.close("close") },
    },
    labelClose,
  );
  const status = manager.el("span", {
    class: "source-settings-window__status",
    role: "status",
    "aria-live": "polite",
  });
  component.actionElements = { save, remove };
  component.statusElement = status;
  const title = manager.el(
    "span",
    { "data-lang_key": "source_edit_settings" },
    await getDictItem("source_edit_settings", language),
  );
  window = manager.open({
    key: WINDOW_KEY,
    replace: true,
    modal: true,
    title,
    content: component,
    footerStart: remove,
    footerEnd: [close, save],
    status,
    draggable: true,
    resizable: true,
    collapsible: true,
    snappable: true,
    closeable: true,
    geometry: {
      width: "min(780px, calc(100vw - 32px))",
      height: "min(680px, calc(100vh - 64px))",
      minHeight: 440,
      maxHeight: "calc(100vh - 32px)",
    },
  });
  window.classList.add("source-settings-window");
  component.window = window;
  return window;
}
