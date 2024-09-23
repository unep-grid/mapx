import { modalDialog } from "./../mx_helper_modal.js";
import { isUrl } from "./../is_test";
import { el, elButtonFa } from "../el_mapx";
import { settings } from "../settings";
import { isEmpty, isNotEmpty } from "../is_test/index.js";
import { theme } from "../init_theme.js";

const def = {
  url: null,
  link_id: null,
  doc_id: null,
  title: null,
  id_scroll: null,
};

export async function modalIframe(options) {
  const opt = Object.assign({}, def, options);

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

  // Set title
  if (isEmpty(opt.title)) {
    opt.title = opt.doc_id ? "Documentation" : "External site";
  }

  const elIframe = el("iframe", {
    width: 200,
    height: 200,
    src: url,
    frameborder: 0,
  });

  const opt_modal = {
    addBackground: false,
    title: opt.title,
    styleContent: {
      padding: 0,
      minHeight : '800px'
    },
    onResize: resize,
    buttons: [
      elButtonFa("btn_open_link", {
        icon: "external-link",
        action: () => {
          let currentUrl = url.toString();
          try {
            currentUrl = elIframe.contentWindow.location.href;
          } catch (e) {
            console.warn("Current url can't be used. Fallback to default.", e);
          }
          window.open(currentUrl, "_blank");
        },
      }),
    ],
    content: elIframe,
    ...opt.opt_modal,
  };

  await modalDialog(opt_modal);

  function resize() {
    const elParent = elIframe.parentElement;
    const rect = elParent.getBoundingClientRect();
    elIframe.width = rect.width ;
    elIframe.height = rect.height ;
  }
}
