import { el } from "../../el_mapx";
import { wsGetSourcesListColumns } from "../../source";

export const config = {
  plugins: {
    remove_button: {
      title: "Remove",
    },
  },
  valueField: "column_name",
  searchField: ["column_name", "column_type"],
  allowEmptyOption: true,
  options: null,
  create: false,
  preload: false, // propbably not wanted for columns...
  placeholder: "Select columns...",
  sortField: [
    { field: "column_name", weight: 2 },
    { field: "column_type", weight: 1 },
  ],
  dropdownParent: "body",
  maxOptions: null,
  maxItems: 1,
  onChange: function () {
    const tom = this;
    tom.blur();
  },
  loaderData: {
    id_source: null,
    ignore_attr: ["geom", "gid", "_mx_valid"],
    value_field: "id_source",
  },
  onInitialize: async function () {
    const tom = this;
    tom._update = update.bind(tom);
  },
  render: {
    option: formater,
    item: formater,
  },
};

async function update() {
  const tom = this;
  try {
    const { settings } = tom;
    const { id_source, ignore_attr } = settings.loaderData;
    tom.clear();
    tom.clearOptions();
    const res = await wsGetSourcesListColumns({ id_source, ignore_attr });
    const { columns } = res;
    tom.addOptions(columns);
    tom.refreshOptions(false);
    console.log("columns updated");
  } catch (e) {
    console.error(e);
  }
}

function formater(data, escape) {
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
      el("span", escape(data.column_name)),
      el("span", { class: "text-muted" }, escape(data.column_type)),
    ),
  ]);
}
