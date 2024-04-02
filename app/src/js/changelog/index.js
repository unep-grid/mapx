import { modalSimple } from "./../mx_helper_modal.js";
import { TextFilter } from "./../text_filter_simple";
import { el } from "./../el/src";
import { markdownToHtml } from "./../markdown";

export async function changeLogHtml() {
  /* don't include CHANGELOG in pre cache / workbox */
  const { default: txt } = await import("../../../../CHANGELOG.md");
  return markdownToHtml(txt);
}

export async function modalChangelog() {
  const htmlLog = await changeLogHtml();
  const elContent = el("div", htmlLog);
  const elContainer = el("div");
  const elInput = el("input", {
    type: "text",
    class: ["form-control"],
    placeholder: "Search",
  });

  modalSimple({
    title: "Changelog",
    content: elContainer,
    addBackground: true,
    onClose: clear,
  });

  const textFilter = new TextFilter({
    elInput: elInput,
    elContent: elContent,
    elContainer: elContainer,
  });


  function clear() {
    textFilter?.destroy();
  }
}
