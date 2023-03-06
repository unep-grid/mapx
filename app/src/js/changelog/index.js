import { modalSimple } from "./../mx_helper_modal.js";
import { TextFilter } from "./../text_filter_simple";
import { el } from "./../el/src";

export async function changeLogHtml() {
  const showdown = await import("showdown");
  /* don't include CHANGELOG in pre cache / workbox */
  const { default: txt } = await import("../../../../CHANGELOG.md");
  const converter = new showdown.Converter();
  const html = converter.makeHtml(txt);
  return html;
}

export async function modalChangelog() {
  const elLog = await changeLogHtml();
  const elContainer = el("div");
  const textFilter = new TextFilter({
    elContent: elLog,
    elContainer: elContainer,
  });
  modalSimple({
    title: "Changelog",
    content: elContainer,
    addBackground: true,
    onClose: () => {
      textFilter.destroy();
    },
  });
}
