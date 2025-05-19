import { el } from "../../el_mapx";
import { theme } from "../../init_theme";

export const config = {
  valueField: "id",
  searchField: ["label", "description", "id"],
  allowEmptyOption: false,
  options: null,
  maxItems : 1,
  create: false,
  dropdownParent: "body",
  preload: "focus",
  load: null, // Remove the load callback approach
  onInitialize: async function () {
    // Use the countries.js pattern
    const tom = this;
    tom._update = update.bind(tom);
    await tom._update();
  },
  render: {
    option: (data, escape) => {
      return el(
        "div",
        el("h4", escape(data.label.en)),
        el("small", `${escape(data.description.en)}}`),
      );
    },
    item: (data, escape) => {
      return el(
        "div",
        el("span", escape(data.label.en)),
        el(
          "span",
          { class: ["text-muted", "space-around"] },
          `${data.description.en}`,
        ),
      );
    },
  },
};

async function update() {
  const tom = this;
  try {
    const placeholder_wait = "Loading themes...";
    const placeholder_ready = "Select theme...";

    // Provide UI feedback during loading
    tom.disable();
    tom.control_input.placeholder = placeholder_wait;

    // Get themes data
    const themes = theme.list();

    // Update UI after loading
    tom.enable();
    tom.control_input.placeholder = placeholder_ready;
    tom.settings.placeholder = placeholder_ready;

    // Add options directly
    tom.addOptions(themes);
    tom.refreshOptions(false);
  } catch (e) {
    console.error(e);
    tom.enable(); // Make sure to re-enable even if there's an error
  }
}
