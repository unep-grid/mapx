import { el } from "../../el_mapx";
import { wsGetSourcesListEdit } from "../../source";

const def = {
  max_rows: 1e5,
  max_cols: 200,
  disable_missing: true,
};

export const config = {
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
  maxItems: 1,
  onChange: function () {
    const tom = this;
    tom.blur();
  },
  loaderData: {
    // select distinct type from mx_sources
    types: ["vector", "raster", "tabular"],
  },
  load: async function (_, callback) {
    const tom = this;
    try {
      if (tom.loading > 1) {
        callback();
        return;
      }
      const types = config.loaderData.types;
      const res = await wsGetSourcesListEdit({ types: types });
      const data = res.list || [];
      for (const row of data) {
        if (!row.exists) {
          if (def.disable_missing) {
            row.disabled = true;
          }
        } else {
          if (row.ncol > def.max_cols || row.nrow > def.max_rows) {
            row.disabled = true;
          }
        }
      }
      callback(data);
      tom.settings.load = null;
    } catch (e) {
      console.error(e);
      callback();
    }
  },
  render: {
    option: formater,
    item: formater,
  },
};

function formater(data, escape) {
  const warnRow = data.nrow > def.max_rows ? ` ⚠️ ` : "";
  const warnCol = data.ncol > def.max_cols ? ` ⚠️ ` : "";
  const nCol = escape(data.ncol) + warnCol;
  const nRow = escape(data.nrow) + warnRow;
  const type = escape(data.type);
  const title = escape(data.title);
  const abstr = escape(data.abstract.substr(0, 100));
  const date = escape(data.date_modified);
  const views = data?.views || [];
  const dateUi = new Date(date).toLocaleDateString();

  return el(
    "div",
    {
      class: ["hint--bottom"],
      "aria-label": abstr,
    },
    el(
      "div",
      el("span", { style: { display: "block" } }, title),
      el(
        "span",
        { class: ["text-muted", "space-around"] },
        `${dateUi} ${type} ${nRow} x ${nCol}`
      )
    ),
    el(
      "ul",
      { class: "text-muted" },
      views.map((v) => el("li", escape(v)))
    )
  );
}
