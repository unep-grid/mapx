import { modalDialog } from "./../mx_helper_modal.js";
import { isPromise, isUrl } from "./../is_test";
import { elButtonFa } from "../el_mapx";
import { settings } from "../settings";

const def = {
  url: null,
  txt: null,
  wiki: null,
  content: "",
};

function wikiUrl(id) {
  return `${settings.links.repositoryWiki}${id}`;
}
function wikiUrlRaw(id) {
  return `${settings.links.repositoryWikiRaw}${id}.md`;
}

export async function modalMarkdown(options) {
  const opt = Object.assign({}, def, options);

  if (opt.wiki) {
    opt.url = wikiUrlRaw(opt.wiki);
    opt.buttons = [
      elButtonFa("btn_open_wiki", {
        icon: "external-link",
        action: () => {
          window.open(wikiUrl(opt.wiki), "_blank");
        },
      }),
    ];
    opt.minWidth = "800px";
  }

  if (isUrl(opt.url)) {
    const r = await fetch(opt.url);
    opt.txt = await r.text();
  }

  if (isPromise(opt.txt)) {
    opt.txt = await opt.txt;
  }

  if (opt.txt?.default) {
    opt.txt = opt.txt.default;
  }

  if (opt.txt) {
    const showdown = await import("showdown");
    const converter = new showdown.Converter();
    converter.setFlavor("github");
    opt.content = converter.makeHtml(opt.txt);
  }

  await modalDialog(opt);
}
