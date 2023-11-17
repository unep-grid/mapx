import { el, elSpanTranslate as st } from "./../el_mapx";

export function buildForm(upl) {
  const opt = upl._opt;

  const elMsgContainer = el("div");

  const elFormEpsg = el(
    "div",
    {
      class: "form-group",
    },
    el("label", { for: "upl_epsg_code" }, st("upl_select_epsg_code")),
    el("select", {
      id: "upl_epsg_code",
      name: "epsgCode",
      dataset: { type: "epsg" },
    })
  );

  const elFormTitle = el(
    "div",
    {
      class: "form-group",
    },
    el("label", { for: "upl_title" }, st("upl_title")),
    el(
      "input",
      {
        on: [
          "input",
          () => {
            console.log("validation");
          },
        ],
        class: "form-control",
        name: "title",
        id: "upl_title",
        type: "text",
      },
      opt.title
    )
  );

  const elInputFile = el("input", {
    on: {
      change: upl.handleFormFileInput,
    },
    class: "upl--hidden",
    type: "file",
  });

  const elFormFileDragDrop = el(
    "div",
    {
      class: ["form-group", "upl--form-drag-drop"],
      on: {
        dragenter: upl.handleDragEnter,
        drop: upl.handleDrop,
        click: upl.handleClick,
      },
    },
    st("upl_browse_or_drop")
  );

  const elForm = el(
    "form",
    { name: "dl_form", id: "dl_modal", on: ["change", md.update] },
    [elFormTitle, elFormEpsg, elFormFileDragDrop, elMsgContainer, elInputFile]
  );

  return {
    elForm,
    elFormEpsg,
    elFormTitle,
    elFormFileDragDrop,
    elInputFile,
    elMsgContainer,
  };
}
