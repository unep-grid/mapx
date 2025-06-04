import { modal, modalConfirm } from "../mx_helper_modal.js";
import { EventSimple } from "../event_simple/index.js";
import { el, elButtonFa, elSelect, tt } from "../el_mapx";
import { bindAll } from "../bind_class_methods/index.js";
import {
  isElement,
  makeSafeName,
  isNotEmpty,
  isEmpty,
  isFunction,
} from "../is_test/index.js";
import { downloadJSON } from "../download";
import {
  fileSelectorJSON,
  itemFlashCancel,
  itemFlashWarning,
  patchObject,
} from "../mx_helper_misc";
import { TextFilter } from "../text_filter_simple";
import chroma from "chroma-js";
import { onNextFrame, waitFrameAsync } from "../animation_frame/index.js";
import { fontFamilies, fonts } from "./fonts.js";
import { jedInit } from "../json_editor"; // Import jedInit
import { settings } from "../mx.js";
import { getDictItem } from "../mx_helpers.js";
import { SelectAuto } from "../select_auto";

export class ThemeModal extends EventSimple {
  constructor(opt) {
    super();
    bindAll(this);
    const tm = this;

    const { theme, onClose } = opt;

    // theme manager instance
    tm._theme = theme;
    tm._on_close = onClose;
  }

  async init() {
    return this.buildModal();
  }

  async buildModal() {
    const tm = this;

    // Modal content container
    tm._el_content = el("div", { class: "mx-theme--manager-modal" }); // Add modal class

    // Modal buttons
    tm._el_button_close = elButtonFa("btn_close", {
      icon: "times",
      action: tm.close,
    });

    // Action buttons
    tm._el_button_import = elButtonFa("mx_theme_import_button", {
      icon: "cloud-upload",
      action: tm.importTheme,
      title: tt("mx_theme_import_button"),
    });
    tm._el_button_export = elButtonFa("mx_theme_export_button", {
      icon: "cloud-download",
      action: tm.exportTheme,
      title: tt("mx_theme_export_button"),
    });
    tm._el_button_save = elButtonFa("mx_theme_save_button", {
      icon: "save",
      action: tm.upsertTheme,
      title: tt("mx_theme_save_button"),
    });
    tm._el_button_delete = elButtonFa("mx_theme_delete_button", {
      icon: "trash",
      action: tm.deleteTheme,
      title: tt("mx_theme_delete_button"),
    });

    const elModalButtons = [
      tm._el_button_close,
      tm._el_button_import,
      tm._el_button_export,
      tm._el_button_save,
      tm._el_button_delete,
    ];

    // Create modal
    tm._modal = modal({
      id: "theme_manager",
      content: tm._el_content,
      title: tt("mx_theme_manager_title"),
      buttons: elModalButtons,
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: false,
      onClose: tm.close,
      style: {
        position: "absolute",
        width: "80%",
        height: "100%",
      },
      styleContent: {
        padding: "0px",
      },
    });

    await tm.buildContent();
  }

  /**
   * Check if a theme is a local/built-in theme
   * @param {string} idTheme - Theme ID to check
   * @returns {boolean} - True if theme is local/built-in
   */
  isLocalTheme(idTheme) {
    return this._theme.isExistingIdLocal(idTheme);
  }

  /**
   * Update button states based on current theme and user roles
   */
  async updateButtonStates() {
    const tm = this;
    const currentTheme = tm._theme.theme();
    const isLocal = tm.isLocalTheme(currentTheme.id);
    const hasPublisherRole = settings.user.roles?.publisher === true;

    tm._el_button_save.setAttribute("disabled", "disabled");
    tm._el_button_delete.setAttribute("disabled", "disabled");

    if (hasPublisherRole) {
      tm._el_button_save.removeAttribute("disabled");
      if (!isLocal) {
        tm._el_button_delete.removeAttribute("disabled");
      }
    }
  }

  async buildSelect() {
    const tm = this;
    const exists = tm._auto_select instanceof SelectAuto;
    const idTheme = tm._theme.id();

    /**
     * Update
     */
    if (exists) {
      tm._auto_select.update();
      tm._auto_select.value = idTheme;
      return;
    }

    /**
     * Create
     */
    tm._auto_select = new SelectAuto(tm._el_theme_select, {
      onChange: async (value) => {
        await tm.setThemeId(value);
      },
      placeholder: await getDictItem("mx_theme_manager_select_placeholder"),
    });

    await tm._auto_select.init();
    tm._auto_select.value = idTheme;
  }

  async buildContent() {
    const tm = this;

    tm._el_theme_select_container = el("div", {
      class: "mx-theme--manager-modal-header",
    });
    tm._el_theme_select = el("select", {
      id: "theme_select",
      dataset: { type: "themes" },
    });

    tm._el_theme_select_container.appendChild(tm._el_theme_select);

    tm._el_properties_container = el("div", {
      class: "mx-theme--manager-modal-properties",
    });

    tm._el_inputs_container = el("div", {
      class: "mx-theme--inputs-container",
      style: {
        maxHeight: "400px",
        overflowY: "auto",
      },
    });
    tm._el_inputs_container.addEventListener("input", tm.updateFromInput);

    tm._el_filter_input = el("input", {
      type: "text",
      class: ["form-control", "mx-theme--manager-filter"],
      placeholder: tt("mx_theme_manager_filter_placeholder"),
    });

    tm._el_tools_bar = el("div", { class: "mx-theme--manager-bar" }, [
      tm._el_filter_input,
    ]);

    tm._el_content.appendChild(tm._el_theme_select_container);
    tm._el_content.appendChild(tm._el_properties_container);
    tm._el_content.appendChild(tm._el_tools_bar);
    tm._el_content.appendChild(tm._el_inputs_container);

    tm._filter = new TextFilter({
      modeFlex: true,
      selector: ".mx-theme--inputs",
      elInput: tm._el_filter_input,
      elContent: tm._el_inputs_container,
      timeout: 10,
    });

    await tm.update();
  }

  async buildProperties() {
    const tm = this;
    const theme = tm._theme.theme();

    tm._el_properties_container.replaceChildren();

    // Create metadata items as label-value pairs for CSS Grid
    const metadataItems = [
      {
        key: "mx_theme_manager_id",
        value: theme.id,
      },
      {
        key: "mx_theme_manager_description",
        value: theme.description?.en || "",
      },
      {
        key: "mx_theme_manager_creator",
        value: theme.creator || "1",
      },
      {
        key: "mx_theme_manager_last_editor",
        value: theme.last_editor || "1",
      },
      {
        key: "mx_theme_manager_date_modified",
        value: theme.date_modified || new Date().toISOString(),
      },
    ];

    // Build grid items
    metadataItems.forEach((item) => {
      // Create label
      const elLabel = el(
        "label",
        {
          class: "mx-theme--property-label",
        },
        tt(item.key),
      );

      // Create value
      const elValue = el(
        "div",
        {
          class: ["mx-theme--property-value", item.class],
        },
        item.value,
      );

      // Append both to container (CSS Grid will handle positioning)
      tm._el_properties_container.appendChild(elLabel);
      tm._el_properties_container.appendChild(elValue);
    });
  }

  /**
   * Initialize JSON Editor for theme metadata in a separate modal
   * @param {string} operation - The operation type (create, update, export)
   * @param {Object} startValues - Initial values for the editor
   * @returns {Promise<Object|null>} - Metadata object or null if cancelled
   */
  async showMetadataEditorModal(operation, startValues = {}) {
    const tm = this;

    // Create container for JSON Editor
    const elMetadataEditor = el("div", {
      class: "mx-theme--metadata-editor",
    });
    const elErrors = el("div", {
      class: "mx-error-container",
    });

    const elContainer = el("div", [elErrors, elMetadataEditor]);

    // Get current theme for default values
    const theme = tm._theme.theme();

    const def = {
      id: theme.id,
      description: theme.description || { en: "" },
      label: theme.label || { en: "" },
      dark: theme.dark || false,
      tree: theme.tree || false,
      water: theme.water || false,
    };

    // Prepare metadata with defaults from current theme
    const metadata = patchObject(def, startValues);

    const idThemes = await tm._theme.getAllIds();
    const schemaMeta = await tm._theme.getSchema(false);

    // Initialize JSON Editor with custom validators
    const editor = await jedInit({
      id: "theme_meta",
      schema: schemaMeta,
      target: elMetadataEditor,
      startVal: metadata,
      options: {
        disable_properties: true,
        disable_collapse: true,
        disable_edit_json: true,
        required_by_default: true,
        use_default_values: true,
        show_errors: "always",
        no_additional_properties: true,
        prompt_before_delete: false,
        custom_validators: [
          (_, value, path) => {
            const errors = [];
            if (path === "root.id") {
              const issue = validateId(value, idThemes);
              if (issue) {
                errors.push({
                  path: path,
                  message: `Invalid id: ${issue}`,
                });
              }
            }
            return errors;
          },
        ],
      },
    });

    // Get appropriate title and button text based on operation
    let title, confirmText;
    switch (operation) {
      case "new":
        title = tt("mx_theme_new_button");
        confirmText = tt("btn_new");
        break;
      case "save":
        title = tt("mx_theme_save_button");
        confirmText = tt("btn_save");
        break;
      case "export":
        title = tt("mx_theme_export_button");
        confirmText = tt("btn_export");
        break;
      case "import":
        title = tt("mx_theme_import_button");
        confirmText = tt("btn_import");
        break;
      default:
        title = tt("mx_theme_edit_metadata");
        confirmText = tt("btn_ok");
    }
    // Show modal with JSON Editor
    const data = await modalConfirm({
      title: title,
      content: elContainer,
      confirm: confirmText,
      cancel: tt("btn_cancel"),
      addBackground: true,
      cbData: () => {
        return Object.assign({}, editor.getValue());
      },
      cbValidate: (elBtnConfirm) => {
        editor.on("change", () => {
          const errors = editor.validate();
          updateErrors(errors);
          if (isNotEmpty(errors)) {
            elBtnConfirm.setAttribute("disabled", "disabled");
          } else {
            elBtnConfirm.removeAttribute("disabled");
          }
        });
      },
    });

    return data;

    /**
     *
     * local validate helpers
     * @note : can't be async... using local copy of all id. Not ideal.
     *         server side validation with ajv allow async validator, not
     *         json-editor
     * @returns string Invalid message
     */
    function validateId(id, idThemes) {
      const loc = tm._theme.isExistingIdLocal(id);

      if (loc && operation !== "export") {
        return "Reserved id";
      }

      if (operation === "import" || operation === "new" || metadata.id !== id) {
        const exists = idThemes.includes(id);
        if (exists) {
          return "Aldready exists";
        }
      }
    }
    /**
     * Update sticky errors
     */
    function updateErrors(errors) {
      const elErrorsList = tm.buildErrors(errors);
      elErrors.replaceChildren(elErrorsList);
    }
  }

  buildErrors(errors) {
    return el(
      "ul",
      {
        class: ["list-group", "mx-error-list-container"],
      },
      errors.map((error) => {
        return el("li", { class: ["list-group-item", "mx-error-item"] }, [
          el("span", `${error.message} (${error.path})`),
        ]);
      }),
    );
  }

  async buildColorsItems() {
    return new Promise((resolve, reject) => {
      try {
        const tm = this;
        const colors = tm._theme.colors();
        const elInputsContainer = tm._el_inputs_container;
        const elFrag = new DocumentFragment();
        if (!isElement(elInputsContainer)) {
          return resolve(false);
        }
        elInputsContainer.replaceChildren();
        tm._inputs = []; // Clear previous inputs

        for (const cid in colors) {
          const elInputGrp = tm.buildInputGroup(cid);
          elFrag.appendChild(elInputGrp);
        }

        onNextFrame(() => {
          elInputsContainer.replaceChildren(elFrag);
          tm._filter.update();
          return resolve(true);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  buildInputGroup(cid) {
    const tm = this;
    const colors = tm._theme.colors();
    const inputType = ["checkbox", "color", "range"];
    const conf = colors[cid];
    const color = chroma(conf.color);
    const visible = conf.visibility === "visible";
    const isTextMap = tm._theme._opt.fonts_enabled.map.includes(cid);
    const isTextCss = tm._theme._opt.fonts_enabled.css.includes(cid);

    const elLabel = el(
      "label",
      {
        class: ["mx-theme--color-label", "hint--right"],
        dataset: { lang_key: cid },
        "aria-label": cid,
      },
      tt(cid),
    );

    /**
     * Color, checkbox, range
     */
    const elInputTable = el(
      "table",
      {
        class: ["mx-theme--items"],
      },
      inputType.map((type) => {
        const id = `${cid}_inputs_${type}`;
        const isRange = type === "range";
        const isCheck = type === "checkbox";

        /**
         * input
         */
        const config = {
          id: id,
          type: type,
          dataset: {
            action: "update",
            param: isRange ? "alpha" : isCheck ? "visibility" : "hex",
            id: cid,
          },
        };

        if (isRange) {
          config.min = 0;
          config.max = 1;
          config.step = 0.01;
        } else {
          config.style = { maxWidth: "60px" };
        }

        const elInput = el("input", config);

        elInput.value = isRange
          ? color.alpha()
          : isCheck
            ? true
            : color.hex("rgb");

        if (isCheck) {
          elInput.checked = visible;
        }

        tm._inputs.push(elInput);

        /**
         * Label
         */
        const elLabel = el(
          "div",
          {
            for: id,
            "aria-label": cid,
          },
          tt(`mx_theme_input_${type}`), // Use translation key
        );

        /**
         * Column
         */
        const elRow = el(
          "tr",
          {
            id: `${cid}_inputs_wrap_${type}`,
          },
          el("td", elLabel),
          el("td", elInput),
        );

        return elRow;
      }),
    );

    /**
     * Font selector
     */
    if (isTextCss) {
      const elFontFamilies = fontFamilies.map((n) => {
        const elOption = el("option", n);
        if (n === conf.font) {
          elOption.setAttribute("selected", "selected");
        }
        return elOption;
      });

      const elSelectFont = elSelect(`${cid}_font`, {
        keyLabel: "mx_theme_input_font_family", // Use translation key
        items: elFontFamilies,
        asRow: true,
        value: conf.font,
      });
      const elInput = elSelectFont.querySelector("select");
      elInputTable.appendChild(elSelectFont);
      elInput.dataset.param = "font";
      elInput.dataset.id = cid;
      tm._inputs.push(elInput);
    }

    if (isTextMap) {
      const elFonts = fonts.map((n) => {
        const elOption = el("option", n);
        if (n === conf.font) {
          elOption.setAttribute("selected", "selected");
        }
        return elOption;
      });

      const elSelectFontMap = elSelect(`${cid}_font`, {
        keyLabel: "mx_theme_input_font", // Use translation key
        items: elFonts,
        asRow: true,
        value: conf.font,
      });

      const elInput = elSelectFontMap.querySelector("select");
      elInput.dataset.param = "font";
      elInput.dataset.id = cid;
      elInputTable.appendChild(elSelectFontMap);
      tm._inputs.push(elInput);
    }

    return el(
      "div",
      {
        id: cid,
        class: ["mx-theme--inputs"],
      },
      elLabel,
      elInputTable,
    );
  }

  async updateFromInput() {
    try {
      const tm = this;
      await waitFrameAsync();
      const colors = tm.getColorsFromInputs();
      await tm._theme.setColors(colors);
    } catch (e) {
      console.error("Update from input", e);
    }
  }

  getColorsFromInputs() {
    const tm = this;
    const out = {};
    for (const input of tm._inputs) {
      const cid = input.dataset.id;
      const isCheck = input.type === "checkbox";
      const value = isCheck ? input.checked : input.value;
      const param = input.dataset.param;
      if (!out[cid]) {
        out[cid] = {};
      }
      out[cid][param] = value;
    }

    /**
     * Build color
     */
    for (const cid in out) {
      try {
        const hex = out[cid].hex;
        const alpha = out[cid].alpha * 1;
        const font = out[cid].font;
        out[cid] = {
          visibility: out[cid].visibility === true ? "visible" : "none",
          color: chroma(hex).alpha(alpha).css(),
        };
        if (font) {
          out[cid].font = font;
        }
      } catch (e) {
        console.error("Colors from input error", e);
      }
    }
    return out;
  }

  async setThemeId(idTheme) {
    const tm = this;
    await tm._theme.set(idTheme);
  }

  /**
   * Update UI after a theme change change
   */
  async update() {
    const tm = this;
    await tm.buildSelect();
    await tm.buildProperties();
    await tm.buildColorsItems();
    await tm.updateButtonStates();
  }

  /**
   * Unified save method - handles both create and update based on theme ID existence
   */
  async upsertTheme() {
    const tm = this;
    const currentTheme = tm._theme.theme();

    const metadata = await tm.showMetadataEditorModal("save", currentTheme);

    if (!metadata) {
      itemFlashCancel();
      return;
    }

    const theme = Object.assign({}, metadata, {
      colors: tm.getColorsFromInputs(),
    });

    await tm._theme.save(theme);
  }

  async deleteTheme() {
    const tm = this;
    const currentTheme = tm._theme.theme();
    await tm._theme.deleteTheme(currentTheme);
  }

  async importTheme() {
    const tm = this;
    try {
      // Select JSON file to import
      const data = await fileSelectorJSON({ multiple: false });
      if (isEmpty(data)) {
        return;
      }

      // Assuming the imported file contains a single theme object
      const importedTheme = tm.cleanKeys(data[0]);
      await tm._theme.stopIfInvalid(importedTheme, false, true);
      const metadata = await tm.showMetadataEditorModal(
        "import",
        importedTheme,
      );

      if (!metadata) {
        itemFlashCancel();
        return;
      }

      const theme = Object.assign({}, importedTheme, metadata);
      await tm._theme.save(theme);
    } catch (e) {
      itemFlashWarning();
      console.error("Failed to import theme:", e);
    }
  }

  /**
   * Workaround where keys in themes do not match current system, or
   * when also containing metadata like $div, $order, etc..
   */
  cleanKeys(theme) {
    const out = {};
    const keys = [
      "id",
      "label",
      "description",
      "creator",
      "last_editor",
      "date_modified",
      "dark",
      "tree",
      "water",
      "colors",
    ];
    for (const key of keys) {
      out[key] = theme[key];
    }
    return out;
  }

  async exportTheme() {
    try {
      const tm = this;
      const currentTheme = tm._theme.theme();

      // Show metadata editor modal for exporting
      const metadata = await tm.showMetadataEditorModal("export");

      if (!metadata) return; // User cancelled

      // Create theme object with metadata and current colors
      const theme = Object.assign({}, currentTheme, metadata, {
        colors: tm.getColorsFromInputs(),
      });

      // Validate the theme object before export
      await tm._theme.stopIfInvalid(theme, false, true);
      const outTheme = tm.cleanKeys(theme);
      await downloadJSON(outTheme, `${makeSafeName(theme.id)}.json`);
    } catch (e) {
      itemFlashWarning();
      console.error("Failed to export theme:", e);
    }
  }

  getCurrentThemeFromModal() {
    const tm = this;
    const theme = Object.assign({}, tm._theme.theme()); // Start with the currently selected theme metadata

    // Get colors from color/font inputs
    const colors = tm.getColorsFromInputs();
    if (isNotEmpty(colors)) {
      theme.colors = colors;
    }

    return theme;
  }

  /**
   * Close modal and cleanup resources
   */
  close() {
    const tm = this;
    if (tm._closed) {
      return;
    }
    // Destroy EventSimple instance
    tm.destroy();

    // Clean up SelectAuto instance
    if (tm._auto_select) {
      tm._auto_select.destroy();
      tm._auto_select = null;
    }

    // Clean up TextFilter instance
    if (tm._filter) {
      tm._filter.destroy();
      tm._filter = null;
    }

    // Remove event listeners
    if (tm._el_inputs_container) {
      tm._el_inputs_container.removeEventListener("input", tm.updateFromInput);
    }

    // Clear input references
    if (tm._inputs) {
      tm._inputs.length = 0;
      tm._inputs = null;
    }

    // Clear DOM element references
    tm._el_content = null;
    tm._el_theme_select = null;
    tm._el_theme_select_container = null;
    tm._el_properties_container = null;
    tm._el_inputs_container = null;
    tm._el_filter_input = null;
    tm._el_tools_bar = null;

    // Call onClose callback
    if (isFunction(tm._on_close)) {
      tm._on_close();
    }

    tm._closed = true;
    tm._modal.close();
    tm.fire("closed");
  }
}
