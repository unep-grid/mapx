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
    local: ["fa", "fa-laptop"],
    session: ["fa", "fa-clock-o"],
  };
  console.log("storage", storage);

  return iconMap[normalizedStorage] || ["fa", "fa-question-circle"]; // fallback icon
}

/**
 * Generate CSS linear gradient from theme colors
 * @param {Object} themeData - Theme object with colors property
 * @returns {string} CSS linear gradient string
 */
function generateThemeGradient(themeData) {
  if (!themeData.colors) {
    return "linear-gradient(90deg, #ccc, #999)"; // fallback gradient
  }

  const colors = Object.values(themeData.colors)
    .map((c) => c.color)
    .filter(
      (color) => color && color !== "transparent" && color !== "rgba(0,0,0,0)",
    );

  if (colors.length === 0) {
    return "linear-gradient(90deg, #ccc, #999)"; // fallback gradient
  }

  return `linear-gradient(90deg, ${colors.join(", ")})`;
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
      const gradientStyle = generateThemeGradient(data);

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
        el("div", {
          style: {
            height: "3px",
            width: "100%",
            background: gradientStyle,
            border: "1px solid var(--mx_ui_border, #ddd)",
            borderRadius: "2px",
            marginTop: "2px",
          },
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
