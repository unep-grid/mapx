import { modalPrompt } from "./../mx_helper_modal.js";
import { getDictItem } from "./../language";
import { isSourceId } from "./../is_test/index.js";

const def = {
  loaderData: {
    types: ["tabular", "vector"],
  },
  disable_large: false,
  disable_missing: true,
};

export async function modalSelectSource(opt) {
  const config = Object.assign({}, def, opt);

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
      type: "sources_list_edit",
      config: config,
    },
  });
  return res;
}