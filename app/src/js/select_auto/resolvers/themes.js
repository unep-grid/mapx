import { el } from "../../el_mapx";
import { theme } from "../../init_theme";

/**
 * Get FontAwesome icon classes for theme storage type
 * @param {string} storage - Storage type (base, db, local, session, save_db, save_local, save_session)
 * @returns {Array} FontAwesome class array
 */
function getStorageIcon(storage) {
  // Normalize storage key by removing 'save_' prefix if present
  const normalizedStorage = storage?.replace(/^save_/, '') || '';

  const iconMap = {
    base: ["fa", "fa-globe"],
    db: ["fa", "fa-database"],
    local: ["fa", "fa-laptop"],
    session: ["fa", "fa-clock-o"],
  };

  return iconMap[normalizedStorage] || ["fa", "fa-question-circle"]; // fallback icon
}

export const config = {
  valueField: "id",
  searchField: ["label", "description", "id"],
  allowEmptyOption: false,
  options: null,
  maxItems: 1,
  create: false,
  dropdownParent: "body",
  preload: "focus",
  load: null,
  onInitialize: function () {
    // Use the countries.js pattern
    const tom = this;
    tom._update = update.bind(tom);
    tom._update();
  },
  render: {
    option: (data, escape) => {
      const storageIconClasses = getStorageIcon(data._storage);
      return el(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "8px" } },
        el("i", {
          class: [...storageIconClasses, "fa-sm"],
          style: {  minWidth: "16px" },
        }),
        el(
          "div",
          { style: { flex: 1 } },
          el("h4", { style: { margin: 0 } }, escape(data.label.en)),
          el("small", `${escape(data.description.en)}`),
        ),
      );
    },
    item: (data, escape) => {
      const storageIconClasses = getStorageIcon(data._storage);
      return el(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "6px" } },
        el("i", {
          class: [...storageIconClasses, "fa-sm"],
          style: { },
        }),
        el("span", escape(data.label.en)),
      );
    },
  },
  // internal config
  loader_config: {},
};

function update() {
  const tom = this;
  try {
    const placeholder_wait = "Loading themes...";
    const placeholder_ready = "Select theme...";

    // Provide UI feedback during loading
    tom.disable();
    tom.control_input.placeholder = placeholder_wait;
    const {} = this.settings.loader_config;
    const themes = theme.list();
    const id = theme.id();

    // Update UI after loading
    tom.control_input.placeholder = placeholder_ready;
    tom.settings.placeholder = placeholder_ready;

    // Add options directly
    tom.clearOptions();
    tom.addOptions(themes);
    tom.setValue(id);
    tom.enable();
  } catch (e) {
    console.error(e);
    tom.enable(); // Make sure to re-enable even if there's an error
  }
}
