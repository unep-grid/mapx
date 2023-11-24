import { el, elSpanTranslate as tt } from "../../el_mapx";
const elFieldsBase = el(
  "fieldset",
  { class: "sjm-group" },
  el("label", { for: "base_id_source" }, tt("sjm_source_a")),
  el("select", {
    id: "base_id_source",
    name: "base_id_source",
    class: "form-control",
  }),
  el("label", { for: "base_columns" }, "Columns A"),
  el("select", {
    class: "form-control",
    id: "base_columns",
    name: "base_columns",
    multiple: true,
  }),
  el("label", { for: "base_prefix" }, "Prefix A"),
  el("input", {
    id: "base_prefix",
    type: "text",
    name: "base_prefix",
    class: "form-control",
    readonly: true,
    value: "_a",
  }),
);

const elFieldsJoin = el(
  "fieldset",
  { class: "sjm-group sjm-join", "data-join-index": "0" },
  el("label", { for: "join_0_type" }, "Join Type"),
  el("select", {
    id: "join_0_type",
    name: "join_0_type",
    class: "form-control",
  }),
  el("label", { for: "join_0_id_source" }, "Source B"),
  el("select", {
    id: "join_0_id_source",
    name: "join_0_id_source",
    class: "form-control",
  }),
  el("label", { for: "join_0_columns" }, "Columns B"),
  el("select", {
    id: "join_0_columns",
    name: "join_0_columns",
    multiple: true,
    class: "form-control",
  }),
  el("label", { for: "join_0_prefix" }, "Prefix B"),
  el("input", {
    id: "join_0_prefix",
    type: "text",
    name: "join_0_prefix",
    readonly: true,
    value: "_b",
    class: "form-control",
  }),
  el("label", { for: "join_0_column_join" }, "Column Join"),
  el("select", {
    id: "join_0_column_join",
    name: "join_0_column_join",
    class: "form-control",
  }),
  el("label", { for: "join_0_column_base" }, "Column Base"),
  el("select", {
    id: "join_0_column_base",
    name: "join_0_column_base",
    class: "form-control",
  }),
);
export const elForm = el("form", [elFieldsBase, elFieldsJoin]);
