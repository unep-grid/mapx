import { modal, modalConfirm, modalPrompt } from "../mx_helper_modal.js";
import { EventSimple } from "../event_simple/index.js";
import { moduleLoad } from "../modules_loader_async/index.js"; // Import moduleLoad
import { el, elButtonFa, elSelect, tt } from "../el_mapx";
import { bindAll } from "../bind_class_methods/index.js";
import {
  isElement,
  makeSafeName,
  isNotEmpty,
  isEmpty,
} from "../is_test/index.js";
import { downloadJSON } from "../download";
import { fileSelectorJSON } from "../mx_helper_misc";
import { validate } from "./validator.js";
import { TextFilter } from "../text_filter_simple";
import chroma from "chroma-js";
import { onNextFrame, waitFrameAsync } from "../animation_frame/index.js";
import { fontFamilies, fonts } from "./fonts.js";
import { default as schemaMeta } from "./schema_meta.json"; // Import the new schema
import { jedInit } from "../json_editor"; // Import jedInit
import { settings } from "../mx.js";

export class ThemeModal extends EventSimple {
  constructor(opt) {
    super();
    bindAll(this);
    const tm = this;

    const { theme } = opt;

    tm._theme = theme;

    // Build the internal content of the modal
    tm.buildModal().catch(console.error);
  }

  async buildModal() {
    // Make buildContent async
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
      action: tm.updateTheme, // Use updateTheme for saving changes to existing
      title: tt("mx_theme_save_button"),
    });
    tm._el_button_create = elButtonFa("mx_theme_create_button", {
      icon: "plus",
      action: tm.createTheme, // Use createTheme for saving as new
      title: tt("mx_theme_create_button"),
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
      tm._el_button_create,
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

    // Build the internal content of the modal
    await tm.buildContent(); // Await buildContent
  }

  async buildContent() {
    // Make buildContent async
    const tm = this;

    // Theme selection dropdown
    tm._el_theme_select_container = el("div", {
      class: "mx-theme--manager-modal-header",
    }); // Add header class
    tm._el_theme_select = el("select", { id: "theme_select" });
    tm._el_theme_select_container.appendChild(tm._el_theme_select);

    // Load Tom Select asynchronously
    try {
      const TomSelect = await moduleLoad("tom-select");

      // Initialize Tom Select with options
      tm._tom_select = new TomSelect(tm._el_theme_select, {
        placeholder: tt("mx_theme_manager_select_placeholder"), // Use translation key
        options: Object.entries(tm._theme.getAll()).map(([id, theme]) => ({
          value: id,
          text: theme.label?.en || id, // Use label if available, fallback to ID
        })),
        items: [tm._theme.id()],
        create: false,
        sortField: { field: "text", direction: "asc" },
        onChange: (value) => tm.selectTheme(value),
      });
    } catch (e) {
      console.error("Failed to load Tom Select:", e);
      // Fallback to regular select
      tm._el_theme_select = elSelect("theme_select", {
        items: Object.keys(tm._theme.getAll()).map((id) =>
          el("option", { value: id }, id),
        ),
        onChange: (event) => tm.selectTheme(event.target.value),
      });
      tm._el_theme_select_container.replaceChildren(tm._el_theme_select);
    }

    // Container for theme properties (id, description, author, modes)
    tm._el_properties_container = el("div", {
      class: "mx-theme--manager-modal-properties",
    }); // Add properties class
    tm.buildPropertiesInputs();

    // Container for color and font inputs
    tm._el_inputs_container = el("div", {
      class: "mx-theme--inputs-container", // Add inputs container class
      style: {
        maxHeight: "400px",
        overflowY: "auto",
      },
    });
    tm._el_inputs_container.addEventListener("input", tm.updateFromInput);

    // Filter input for color/font inputs
    tm._el_filter_input = el("input", {
      type: "text",
      class: ["form-control", "mx-theme--manager-filter"],
      placeholder: tt("mx_theme_manager_filter_placeholder"), // Use translation key
    });

    // Tools bar (filter input)
    tm._el_tools_bar = el("div", { class: "mx-theme--manager-bar" }, [
      // Use bar class
      tm._el_filter_input,
    ]);

    // Append elements to the modal content
    tm._el_content.appendChild(tm._el_theme_select_container); // Append container
    tm._el_content.appendChild(tm._el_properties_container);
    tm._el_content.appendChild(tm._el_tools_bar);
    tm._el_content.appendChild(tm._el_inputs_container);

    // Filter helper
    tm._filter = new TextFilter({
      modeFlex: true,
      selector: ".mx-theme--inputs",
      elInput: tm._el_filter_input,
      elContent: tm._el_inputs_container,
      timeout: 10,
    });

    await tm.buildInputs(); // Call buildInputs here
  }

  buildPropertiesInputs() {
    const tm = this;
    const theme = tm._theme.theme();
    tm._el_properties_container.replaceChildren();

    // Display Theme ID
    tm._el_display_id = el("div", { class: "form-group" }, [
      el("label", {}, tt("mx_theme_manager_id")), // Use translation key
      el("div", { class: "form-control-static" }, theme.id),
    ]);
    tm._el_properties_container.appendChild(tm._el_display_id);

    // Display Description
    tm._el_display_description = el("div", { class: "form-group" }, [
      el("label", {}, tt("mx_theme_manager_description")), // Use translation key
      el("div", { class: "form-control-static" }, theme.description?.en || ""),
    ]);
    tm._el_properties_container.appendChild(tm._el_display_description);

    // Display Author
    tm._el_display_author = el("div", { class: "form-group" }, [
      el("label", {}, tt("mx_theme_manager_author")), // Use translation key
      el("div", { class: "form-control-static" }, theme.author || ""),
    ]);
    tm._el_properties_container.appendChild(tm._el_display_author);

    // Display Modes (dark, tree, water)

    function check(v) {
      if (v) {
        return el("i", { class: ["fa", "fa-check-circle"] });
      } else {
        return el("i", { class: ["fa", "fa-circle-thin"] });
      }
    }

    tm._el_display_modes = el("div", { class: "form-group" }, [
      el("label", {}, "Modes"), // Consider adding a translation key for "Modes"
      el(
        "div",
        {
          class: "form-control-static",
          style: { display: "flex", flexDirection: "column" },
        },
        [
          el("span", [tt("mx_theme_manager_dark"), check(theme.dark)]),
          el("span", [tt("mx_theme_manager_tree"), check(theme.tree)]),
          el("span", [tt("mx_theme_manager_water"), check(theme.water)]),
        ],
      ),
    ]);
    tm._el_properties_container.appendChild(tm._el_display_modes);

    // Display Public and Base flags if they exist
    if (theme.hasOwnProperty("public") || theme.hasOwnProperty("base")) {
      tm._el_display_flags = el("div", { class: "form-group" }, [
        el("label", {}, "Flags"), // Consider adding a translation key for "Flags"
        el(
          "div",
          { class: "form-control-static" },
          [
            theme.public ? tt("mx_theme_manager_public") || "Public" : "",
            theme.base ? tt("mx_theme_manager_base") || "Base" : "",
          ]
            .filter(Boolean)
            .join(", "),
        ),
      ]);
      tm._el_properties_container.appendChild(tm._el_display_flags);
    }
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

    // Get current theme for default values
    const theme = tm._theme.theme();

    // Prepare metadata with defaults from current theme
    const metadata = Object.assign(
      {
        id: theme.id,
        description: theme.description || { en: "" },
        label: theme.label || { en: "" },
        author: theme.author || "",
        dark: theme.dark || false,
        tree: theme.tree || false,
        water: theme.water || false,
        base: theme.base || false,
        public: theme.public || false,
      },
      startValues,
    );

    // Initialize JSON Editor
    const editor = await jedInit({
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
        show_errors: "interaction",
      },
    });

    // Disable ID field for existing themes (except when exporting)
    if (operation !== "create" && operation !== "export") {
      const idField = editor.getEditor("root.id");
      if (idField) {
        idField.disable();
      }
    }

    // Get appropriate title and button text based on operation
    let title, confirmText;
    switch (operation) {
      case "create":
        title = tt("mx_theme_create_button");
        confirmText = tt("btn_create");
        break;
      case "update":
        title = tt("mx_theme_save_button");
        confirmText = tt("btn_save");
        break;
      case "export":
        title = tt("mx_theme_export_button");
        confirmText = tt("btn_export");
        break;
      default:
        title = tt("mx_theme_edit_metadata");
        confirmText = tt("btn_ok");
    }
    // Show modal with JSON Editor
    const data = await modalConfirm({
      title: title,
      content: elMetadataEditor,
      confirm: confirmText,
      cancel: tt("btn_cancel"),
      addBackground: true,
      cbData: () => {
        return Object.assign({}, editor.getValue());
      },
    });

    return data;
  }

  async buildInputs() {
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
      await tm._theme.setColors(colors); // Update the main Theme instance
    } catch (e) {
      console.warn("Update from input", e);
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
    }
    return out;
  }

  // updateFromProperties method removed as it's been replaced by the JSON Editor approach

  async selectTheme(themeId) {
    const tm = this;
    await tm._theme.set(themeId, {
      sound: true,
      save: true,
      save_url: true,
      update_buttons: true,
    });
    tm.buildPropertiesInputs(); // Rebuild properties inputs for the new theme
    await tm.buildInputs(); // Rebuild color/font inputs for the new theme
  }

  // buildCompleteTheme method removed as it's been replaced by direct metadata handling in each operation

  async createTheme() {
    try {
      const tm = this;

      // Show metadata editor modal for creating a new theme
      const metadata = await tm.showMetadataEditorModal("create", {
        // Default empty values for a new theme
        id: `theme_${makeSafeName(Date.now().toString())}`,
        description: { en: "" },
        label: { en: "" },
        author: settings.user.email,
        dark: false,
        tree: false,
        water: false,
        base: false,
        public: false,
      });

      if (!metadata) return; // User cancelled

      // Create theme object with metadata and current colors
      const theme = Object.assign({}, metadata, {
        colors: tm.getColorsFromInputs(),
      });

      // Validate the new theme object
      const isValid = await validate(theme);
      if (!isValid) {
        throw new Error(`New theme is not valid`);
      }

      // Send create request to backend
      const response = await tm._theme._s.create(theme);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log("Theme created successfully:", response.success);
      // Refresh the theme list and select the new theme
      
      await tm._theme.registerThemes(Object.keys(tm._theme.getAll()));
      tm.updateThemeSelectOptions();
      await tm.selectTheme(theme.id);
    } catch (e) {
      console.error("Failed to create theme:", e);
      // Provide user feedback about the error
    }
  }

  async updateTheme() {
    try {
      const tm = this;
      const currentTheme = tm._theme.theme();

      // Show metadata editor modal for updating the current theme
      const metadata = await tm.showMetadataEditorModal("update");

      if (!metadata) return; // User cancelled

      // Create theme object with metadata and current colors
      const theme = Object.assign({}, currentTheme, metadata, {
        colors: tm.getColorsFromInputs(),
      });

      // Validate the updated theme object
      const isValid = await validate(theme);
      if (!isValid) {
        throw new Error(`Updated theme is not valid`);
      }

      // Send update request to backend
      const response = await tm._theme._s.update(theme);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log("Theme updated successfully:", response.success);
      // Refresh the theme list and select the updated theme
      await tm._theme.registerThemes(Object.keys(tm._theme.getAll()));
      tm.updateThemeSelectOptions();
      await tm.selectTheme(theme.id);

      // Update the read-only properties display
      tm.buildPropertiesInputs();
    } catch (e) {
      console.error("Failed to update theme:", e);
      // Provide user feedback about the error
    }
  }

  async deleteTheme() {
    try {
      const tm = this;
      const currentTheme = tm._theme.theme();

      // Confirm deletion with the user
      const confirmed = await modalConfirm({
        title: tt("mx_theme_delete_button"), // Use delete button translation for title
        content: `Are you sure you want to delete theme "${currentTheme.id}"?`, // TODO: Use translation key for confirmation message
        confirm: tt("btn_delete"), // Assuming "btn_delete" is a translation key for a delete button
        cancel: tt("btn_cancel"), // Assuming "btn_cancel" is a translation key for a cancel button
      });

      if (!confirmed) {
        return; // User cancelled deletion
      }

      // Send delete request to backend
      const response = await tm._theme._s.delete(currentTheme.id);

      if (response.error) {
        throw new Error(response.error);
      }

      console.log("Theme deleted successfully:", response.success);
      // Refresh the theme list and select a default theme (e.g., the default light theme)
      await tm._theme.registerThemes(Object.keys(tm._theme.getAll())); // Assuming this refreshes the list
      tm.updateThemeSelectOptions();
      await tm.selectTheme(tm._theme._opt.id_default); // Select the default theme after deletion
    } catch (e) {
      console.error("Failed to delete theme:", e);
      // Provide user feedback about the error
    }
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
      const importedTheme = data[0];

      // Validate the imported theme
      const ok = await validate(importedTheme);
      if (!ok) {
        throw new Error("Invalid theme format");
      }

      // Extract metadata from imported theme for the editor
      const startValues = {
        id: importedTheme.id,
        description: importedTheme.description || { en: "" },
        label: importedTheme.label || { en: "" },
        author: importedTheme.author || "",
        dark: importedTheme.dark || false,
        tree: importedTheme.tree || false,
        water: importedTheme.water || false,
        base: importedTheme.base || false,
        public: importedTheme.public || false,
      };

      // Show metadata editor modal for importing
      const metadata = await tm.showMetadataEditorModal("import", startValues);

      if (!metadata) return; // User cancelled

      // Create final theme object with updated metadata and original colors
      const finalTheme = Object.assign({}, importedTheme, metadata);

      // Add the imported theme to the main Theme instance's themes list
      tm._theme.getAll()[finalTheme.id] = finalTheme;

      // Update the theme selection dropdown
      tm.updateThemeSelectOptions();

      // Select the imported theme
      await tm.selectTheme(finalTheme.id);
    } catch (e) {
      console.error("Failed to import theme:", e);
      // Provide user feedback about the error
    }
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
      const isValid = await validate(theme);
      if (!isValid) {
        throw new Error(`Theme to export is not valid`);
      }

      await downloadJSON(theme, `${makeSafeName(theme.id)}.json`);
    } catch (e) {
      console.error("Failed to export theme:", e);
      // Provide user feedback about the error
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

  updateThemeSelectOptions() {
    const tm = this;
    const currentThemeId = tm._theme.id();
    const themes = tm._theme.getAll();
    const themeIds = Object.keys(themes);

    if (tm._tom_select) {
      // Clear existing options
      tm._tom_select.clear();
      tm._tom_select.clearOptions();

      // Add new options
      themeIds.forEach((id) => {
        const theme = themes[id];
        tm._tom_select.addOption({ 
          value: id, 
          text: theme.label?.en || id // Use label if available, fallback to ID
        });
      });

      // Select current theme
      tm._tom_select.setValue(currentThemeId);
    } else {
      // Fallback for regular select
      tm._el_theme_select.replaceChildren(
        ...themeIds.map((id) => {
          const theme = themes[id];
          return el("option", { value: id }, theme.label?.en || id);
        }),
      );
      tm._el_theme_select.value = currentThemeId;
    }
  }

  async reset() {
    const tm = this;
    // Reset modal state and UI
    tm.updateThemeSelectOptions();
    tm.buildPropertiesInputs();
    await tm.buildInputs();
    tm.fire("reset");
  }

  close() {
    const tm = this;
    if (tm._closed) {
      return;
    }
    tm._closed = true;
    tm._modal.close();
    tm.fire("closed");
    tm.destroy(); //events
    // Clean up any references if necessary
  }

  // Old promptForMeta and buildTheme methods removed as they've been replaced by the JSON Editor approach
}
