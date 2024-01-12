import { modalPrompt } from "./../mx_helper_modal.js";
import { getDictItem } from "./../language";
import { isSourceId } from "./../is_test/index.js";
import { clone } from "../mx_helper_misc.js";

const resolver_default = {
  types: ["tabular", "vector", "join"],
  disable_large: false,
  disable_missing: true,
  update_on_init: true,
  add_global: false,
  readable: true,
  editable: false,
};

export async function modalSelectSource(opt) {
  const loader_config = Object.assign({}, clone(resolver_default), clone(opt));

  const res = await modalPrompt({
    title: getDictItem("edit_table_modal_select_title"),
    label: getDictItem("edit_table_modal_select_label"),
    onInput: (value, elBtnConfirm) => {
      if (isSourceId(value)) {
        elBtnConfirm.classList.remove("disabled");
      } else {
        elBtnConfirm.classList.add("disabled");
      }
    },
    selectAutoOptions: {
      type: "sources_list",
      config: {
        loader_config,
      },
    },
  });
  return res;
}
