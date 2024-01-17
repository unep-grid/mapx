import { el } from "../../el_mapx";
import { wsGetSourcesList } from "../../source";
export const config = {
  /*
   * TomSelect
   */
  plugins: {
    remove_button: {
      title: "Remove",
    },
  },
  valueField: "id",
  searchField: ["id", "title", "abstract", "views", "type"],
  allowEmptyOption: false,
  options: null,
  create: false,
  placeholder: null,
  sortField: [
    { field: "title", weight: 2 },
    { field: "date_modified", weight: 1 },
    { field: "disabled", weight: 0.001 },
  ],
  dropdownParent: "body",
  maxOptions: null, // unlimited number of options ⚠️ should be paginated
  maxItems: 1,
  onChange: function () {
    const tom = this;
    tom.blur();
  },
  preload: false,
  load: null,
  onInitialize: async function () {
    const tom = this;
    const { update_on_init } = tom.settings.loader_config;
    tom._update = update.bind(tom);
    if (update_on_init) {
      await tom._update();
    }
  },
  render: {
    option: formaterOptions,
    item: formaterItem,
  },
  /*
   * Resolver config
   */
  loader_config: {
    types: ["vector", "raster", "tabular", "join"],
    max_rows: 1e5,
    max_cols: 200,
    disable_missing: true,
    disable_large: true,
    update_on_init: false,
    readable: false,
    editable: false,
    add_global: false,
    addional_items: [], // e.g. already configured id, to avoid missing
    placeholder_wait: "Please wait...",
    placeholder_ready: "Select source...",
  },
};

async function update() {
  const tom = this;
  try {
    const conf = Object.assign(
      {},
      config.loader_config,
      tom.settings.loader_config,
    );
    const {
      types,
      editable,
      readable,
      add_global,
      addional_items,
      max_rows,
      max_cols,
      disable_large,
      disable_missing,
      placeholder_wait,
      placeholder_ready,
    } = conf;

    tom.disable();
    tom.control_input.placeholder = placeholder_wait;

    const { list } = await wsGetSourcesList({
      types,
      editable,
      readable,
      addional_items,
      add_global,
    });
    const items = list || [];
    for (const item of items) {
      const { exists, ncol, nrow } = item;
      const missing = disable_missing && !exists;
      const big = disable_large && (ncol > max_cols || nrow > max_rows);
      item.disabled = missing || big;
    }
    tom.control_input.placeholder = placeholder_ready;
    tom.settings.placeholder = placeholder_ready;
    tom.enable();
    tom.addOptions(items);
    tom.refreshOptions(false);
  } catch (e) {
    console.error(e);
  }
}

function formaterItem(data, escape) {
  const type = escape(data.type);
  const title = escape(data.title);

  return el("div", [
    el(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        },
      },
      [el("span", title), el("span", { class: "text-muted" }, `${type}`)],
    ),
  ]);
}

function formaterOptions(data, escape) {
  const tom = this;
  const { max_cols, max_rows } = tom.settings.loader_config;
  const warnRow = data.nrow > max_rows ? ` ⚠️ ` : "";
  const warnCol = data.ncol > max_cols ? ` ⚠️ ` : "";
  const nCol = warnCol + escape(data.ncol);
  const nRow = warnRow + escape(data.nrow);
  const type = escape(data.type);
  const title = escape(data.title);
  const abstr = escape(data.abstract.substr(0, 100));
  const date = escape(data.date_modified);
  const views = data?.views || [];
  const dateObject = new Date(date);
  const time = dateObject.toLocaleTimeString();
  const dateUi = dateObject.toLocaleDateString();

  return el(
    "div",
    {
      class: ["hint--bottom"],
      "aria-label": abstr,
    },
    el(
      "div",
      {
        style: {
          margin: "5px",
          padding: "10px",
        },
      },
      el(
        "div",
        el(
          "div",
          {
            class: ["text-muted"],
            style: {
              display: "flex",
              justifyContent: "space-between",
            },
          },
          [
            el("span", `${nRow} x ${nCol}`),
            el("span", `${type}`),
            el("span", `${dateUi} – ${time}`),
          ],
        ),
        el("span", { style: { display: "block" } }, title),
      ),
      el(
        "ul",
        { class: "text-muted" },
        views.map((v) => el("li", escape(v))),
      ),
    ),
  );
}
