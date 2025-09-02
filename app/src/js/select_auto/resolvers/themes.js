import chroma from "chroma-js";
import { el } from "../../el_mapx";
import { theme } from "../../init_theme";

/**
 * Get FontAwesome icon classes for theme storage type
 * @param {string} storage - Storage type (base, db, local, session, save_db, save_local, save_session)
 * @returns {Array} FontAwesome class array
 */
function getStorageIcon(storage) {
  // Normalize storage key by removing 'save_' prefix if present
  const normalizedStorage = storage?.replace(/^save_/, "") || "";

  const iconMap = {
    base: ["fa", "fa-globe"],
    db: ["fa", "fa-database"],
    db_exernal: ["fa", "fa-external-link-square"],
    local: ["fa", "fa-laptop"],
    session: ["fa", "fa-clock-o"],
  };

  return iconMap[normalizedStorage] || ["fa", "fa-question-circle"]; // fallback icon
}

/**
 * Get theme mode icon (dark/light)
 * @param {boolean} isDark - Whether theme is dark mode
 * @returns {Array} FontAwesome class array
 */
function getThemeModeIcon(isDark) {
  return isDark ? ["fa", "fa-moon-o"] : ["fa", "fa-sun-o"];
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return "";
  }
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
      const themeModeIconClasses = getThemeModeIcon(data.dark);
      const colors = theme.colorsArray(data);

      return el(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "20px",
          },
        },
        // Header row with storage icon, title, and mode indicator
        el(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          el("i", {
            class: [...storageIconClasses, "fa-sm"],
            style: { minWidth: "16px" },
          }),
          el(
            "span",
            {
              style: {
                fontWeight: "bold",
                flex: 1,
                fontSize: "14px",
              },
            },
            escape(data.label?.en || data.id),
          ),
          el("i", {
            class: [...themeModeIconClasses, "fa-xs"],
            style: {
              opacity: 0.7,
              minWidth: "12px",
            },
          }),
        ),
        // Description and metadata row
        el(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "var(--mx_ui_text_faded, #666)",
              lineHeight: "1.3",
            },
          },
          [
            // Left: Description
            el(
              "span",
              {
                style: {
                  flex: "1",
                  marginRight: "8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              escape(data.description?.en || ""),
            ),

            // Center: Creator
            el(
              "span",
              {
                style: {
                  whiteSpace: "nowrap",
                  marginRight: "8px",
                },
              },
              data.creator ? `By: ${escape(data.creator)}` : "",
            ),

            // Right: Date
            el(
              "span",
              {
                style: {
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  opacity: "0.8",
                },
              },
              formatDate(data.date_modified),
            ),
          ].filter((child) => child.textContent || child.innerText), // Filter out empty elements
        ),
        // Color gradient bar
        el("color-swatches", {
          height: "10px",
          width: "100%",
          borderRadius: "5px",
          marginTop: "2px",
          colors: JSON.stringify(colors),
        }),
      );
    },
    item: (data, escape) => {
      const storageIconClasses = getStorageIcon(data._storage);
      const themeModeIconClasses = getThemeModeIcon(data.dark);

      return el(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "6px" } },
        el("i", {
          class: [...storageIconClasses, "fa-sm"],
          style: { minWidth: "16px" },
        }),
        el("span", { style: { flex: 1 } }, escape(data.label?.en || data.id)),
        el("i", {
          class: [...themeModeIconClasses, "fa-xs"],
          style: {
            opacity: 0.7,
            minWidth: "12px",
          },
        }),
      );
    },
  },
  // internal config
  loader_config: {
    types: ["local", "db", "session", "db_exernal", "base"],
  },
};

function update() {
  const tom = this;
  try {
    const { types } = tom.settings.loader_config;

    const placeholder_wait = "Loading themes...";
    const placeholder_ready = "Select theme...";

    tom.disable();
    tom.control_input.placeholder = placeholder_wait;
    const id = theme.id();
    const themes = theme.listByStorageTypes(types);

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
