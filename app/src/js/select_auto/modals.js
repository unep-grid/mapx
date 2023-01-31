import { modalPrompt } from "./../mx_helper_modal.js";
import { getDictItem } from "./../language";
import { isSourceId } from "./../is_test/index.js";

export async function modalSelectSource() {
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
      config: {
        loaderData: {
          types: ["tabular", "vector"],
        },
      },
    },
  });
  return res;
}
