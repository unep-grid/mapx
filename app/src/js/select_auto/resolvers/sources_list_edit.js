import { el } from "../../el_mapx";
import { wsGetSourcesListEdit } from "../../source";

export const config = {
  plugins: {
    remove_button: {
      title: "Remove",
    },
  },
  max_rows: 1e5,
  max_cols: 200,
  disable_missing: true,
  disable_large: true,
  valueField: "id",
  searchField: ["id", "title", "abstract", "views", "type"],
  allowEmptyOption: false,
  options: null,
  create: false,
  preload: true,
  placeholder: "Select source...",
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
  loaderData: {
    // select distinct type from mx_sources
    types: ["vector", "raster", "tabular", "join"],
  },
  onInitialize: function () {
    this.reset = reset.bind(this);
    this.reset();
  },
  render: {
    option: formaterOptions,
    item: formaterItem,
  },
};

async function reset() {
  const tom = this;
  try {
    const { types } = tom.settings.loaderData;
    const res = await wsGetSourcesListEdit({ types: types });
    const data = res.list || [];
    for (const item of data) {
      if (!item.exists && config.disable_missing) {
        item.disabled = true;
      } else {
        const maxCol = item.ncol > config.max_cols;
        const maxRow = item.nrow > config.max_rows;
        if (config.disable_large && (maxCol || maxRow)) {
          item.disabled = true;
        }
      }
    }
    tom.addOptions(data);
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
  const warnRow = data.nrow > config.max_rows ? ` ⚠️ ` : "";
  const warnCol = data.ncol > config.max_cols ? ` ⚠️ ` : "";
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
