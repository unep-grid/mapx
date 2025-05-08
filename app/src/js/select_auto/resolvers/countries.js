import { el, elSpanTranslate } from "../../el_mapx";
import { getLanguagesAll } from "../../language";
const langs = getLanguagesAll();

export const config = {
  valueField: "id",
  searchField: ["id", ...langs],
  allowEmptyOption: true,
  options: null,
  create: false,
  closeAfterSelect: true,
  sortField: { field: "en" },
  preload: "focus",
  dropdownParent: "body",
  maxItems: 10,
  maxOptions: 300,
  plugins: ["remove_button"],
  load: null,
  onInitialize: async function () {
    const tom = this;
    tom._update = update.bind(tom);
    await tom._update();
  },
  render: {
    option: (data, escape) => {
      const id = escape(data.id);
      return el(
        "div",
        {
          class: "mx-flex-space-between",
        },
        el("label", elSpanTranslate(id)),
        el("small", { class: ["text-muted", "space-around"] }, `${id}`),
      );
    },
    item: (data, escape) => {
      const id = escape(data.id);
      return el(
        "div",
        // remove button will be added here
        el(
          "div",
          {
            class: "mx-flex-space-between",
          },
          [
            el("span", elSpanTranslate(id)),
            el("span", { class: ["text-muted", "space-around"] }, ` ${id}`),
          ],
        ),
      );
    },
  },
};

async function update() {
  const tom = this;
  try {
    const placeholder_wait = "Wait...";
    const placeholder_ready = "Select...";

    tom.disable();
    tom.control_input.placeholder = placeholder_wait;

    const { default: countries } = await import(
      "./../../../data/dict/dict_countries.json"
    );

    tom.enable();
    tom.control_input.placeholder = placeholder_ready;
    tom.settings.placeholder = placeholder_ready;
    tom.addOptions(countries);
    tom.refreshOptions(false);
  } catch (e) {
    console.error(e);
  }
}
