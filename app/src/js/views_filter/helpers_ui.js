/**
 * Helpers
 */
import { el } from "../el_mapx";
import { getDictItem } from "../language";
export function elTitleKey(key) {
  const dict_key = `vf_group_${key}`;
  return el(
    "span",
    {
      class: "vf-checkbox-group-title",
      dataset: { lang_key: dict_key },
    },
    getDictItem(dict_key),
  );
}

export function elGroup() {
  return el("div", {
    class: ["vf-checkbox-group"],
  });
}

export function elEmpty() {
  return el(
    "div",
    {
      class: ["vf-checkbox-empty"],
      dataset: { lang_key: "view_filter_no_items" },
    },
    getDictItem("view_filter_no_items"),
  );
}
