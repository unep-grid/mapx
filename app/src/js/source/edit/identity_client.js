import { EditChannel } from "./channel.js";
import { modalConfirm, modalDialog } from "../../mx_helper_modal.js";
import { getDictItem, getDictTemplate } from "../../language/index.js";

export async function ensureEditableSourceIdentity(idTable) {
  const status = await EditChannel.getStatus(idTable);
  if (!status?.identity || status.identity.valid) {
    return true;
  }
  const repair = await modalConfirm({
    title: getDictItem("edit_table_identity_repair_title"),
    content: getDictTemplate("edit_table_identity_repair_content", {
      issues: status.identity.issues.join(", "),
    }),
    confirm: getDictItem("edit_table_identity_repair_confirm"),
    cancel: getDictItem("btn_cancel"),
  });
  if (!repair) {
    return false;
  }
  const result = await EditChannel.repairIdentity(idTable);
  if (!result?.success) {
    await modalDialog({
      title: getDictItem("edit_table_identity_repair_failed_title"),
      content:
        result?.error ||
        (await getDictItem("edit_table_identity_repair_failed_content")),
    });
    return false;
  }
  return true;
}
