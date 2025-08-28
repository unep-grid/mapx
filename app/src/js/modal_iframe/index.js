import { modalDialog } from "./../mx_helper_modal.js";
import { isUrl } from "./../is_test";
import { el, elButtonFa } from "../el_mapx";
import { settings } from "../settings";
import { isEmpty, isNotEmpty } from "../is_test/index.js";
import { theme } from "../init_theme.js";
import { makeId } from "../mx_helper_misc.js";

const def = {
  title: null,
  url: null,
  link_id: null,
  doc_id: null,
  id_scroll: null,
};

export async function modalIframe(options) {
  const opt = Object.assign({}, def, options);

  const id = makeId();

  // Determine the base URL
  let baseUrl = opt.url;
  if (isNotEmpty(opt.doc_id)) {
    baseUrl = settings.links["doc_base"] + settings.links[opt.doc_id];
  } else if (opt.link_id) {
    baseUrl = settings.links[opt.link_id];
  }

  if (!isUrl(baseUrl)) {
    throw new Error("Invalid URL configuration");
  }

  // Create URL object
  const url = new URL(baseUrl);

  // Apply modifications
  if (opt.doc_id) {
    url.searchParams.set("theme", theme.isDark() ? "dark" : "light");
  }
  if (opt.id_scroll) {
    url.hash = opt.id_scroll;
  }

  opt.url = url;

  // Set title
  if (isEmpty(opt.title)) {
    opt.title = opt.doc_id ? "Documentation" : "External site";
  }

  const elIframe = el("iframe", {
    width: "200",
    height: "200",
    src: url.toString(),
    frameborder: 0,
    on: ["load", init],
  });

  const opt_modal = {
    addBackground: false,
    alwaysPinned: true,
    title: opt.title,
    styleContent: {
      padding: 0,
      minHeight: "800px",
    },
    onResize: resize,
    onClose: clear,
    buttons: [
      elButtonFa("btn_open_link", {
        icon: "external-link",
        action: () => {
          // opt.url should have been updated by the message handler
          window.open(opt.url, "_blank");
        },
      }),
    ],
    content: elIframe,
    ...opt.opt_modal,
  };

  return await modalDialog(opt_modal);

  function init() {
    window.addEventListener("message", handleMessage);
    initPost();
    updateTheme();
    theme.on("set_colors", updateTheme);
  }

  function initPost() {
    // Send an "init" message to the iframe with the id
    elIframe.contentWindow.postMessage(
      {
        type: "init",
        id: id,
      },
      "*",
    );
  }

  function updateTheme() {
    elIframe.contentWindow.postMessage(
      {
        id: id,
        type: "set_theme",
        theme: theme.isDark() ? "dark" : "light",
      },
      "*",
    );
  }

  function handleMessage(event) {
    const data = event.data;
    // Ensure the message is from the iframe we are interacting with
    if (data?.id !== id) {
      return;
    }

    switch (data.type) {
      case "url_changed":
        opt.url = data.url;
        break;
      default:
        console.warn(`Unhandled message`, data);
    }
  }

  function resize() {
    const elParent = elIframe.parentElement;
    const rect = elParent.getBoundingClientRect();
    elIframe.style.width = `${rect.width}px`;
    elIframe.style.height = `${rect.height}px`;
  }

  function clear() {
    window.removeEventListener("message", handleMessage);
    theme.off("set_colors", updateTheme);
  }
}
