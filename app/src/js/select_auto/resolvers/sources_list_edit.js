import { el } from "../../el_mapx";
import { wsGetSourcesListEdit } from "../../source";

export const config = {
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
          if (config.disable_missing) {
            row.disabled = true;
          }
        } else {
          if (
            config.disable_large &&
            (row.ncol > config.max_cols || row.nrow > config.max_rows)
          ) {
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
      { class: "well", style: { margin: "5px" } },
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
          ]
        ),
        el("span", { style: { display: "block" } }, title)
      ),
      el(
        "ul",
        { class: "text-muted" },
        views.map((v) => el("li", escape(v)))
      )
    )
  );
}
