import { el } from "../../el_mapx";
import { isSourceId } from "../../is_test";
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
  preload: true, // propbably not wanted for columns...
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
  onInitialize: function () {
    this.reset = reset.bind(this);
  },
  render: {
    option: formater,
    item: formater,
  },
};

async function reset() {
  const tom = this;
  try {
    const { settings } = tom;
    const { id_source, ignore_attr } = settings.loaderData;
    tom.clearOptions();
    const res = await wsGetSourcesListColumns({ id_source, ignore_attr });
    const { columns } = res;
    tom.addOptions(columns);
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
