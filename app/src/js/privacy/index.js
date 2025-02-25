import { el, elSpanTranslate } from "../el_mapx/index.js";
import { shake } from "../elshake/index.js";
import { isTrue } from "../is_test/index.js";
import { events } from "../mx";
import { modalPrompt } from "../mx_helper_modal.js";
import { prefGet, prefSet } from "../user_pref";
import { settings } from "../settings";

const ID_PRIVACY = "pref_privacy_001";
const DISABLED = true;

window.addEventListener("load", () => {
  events.once({
    type: ["mapx_ready"],
    idGroup: "privacy_test",
    callback: privacy_test,
  });
});

export async function privacy_test(force = false) {
  const prefGdpr = await prefGet(ID_PRIVACY);
  const ignore = DISABLED || (prefGdpr && isTrue(prefGdpr.accepted));

  if (ignore && !force) {
    return;
  }
  const { links } = settings;
  const doc = links.doc_base;
  const tou = doc + links.doc_terms_of_use;
  const priv = doc + links.doc_privacy;
  const t_opt = { data: { privacy_link: priv, tou_link: tou } };

  const res = await modalPrompt({
    title: elSpanTranslate("privacy_notice_title"),
    inputOptions: {
      type: "checkbox",
      class: "",
    },
    content: el("p", elSpanTranslate("privacy_notice_html")),
    label: elSpanTranslate("privacy_consent", t_opt),
    onInput: (consent, button) => {
      button.disabled = !consent;
    },
    removeCancelButton: true,
  });

  if (!res) {
    await shake(document.body);
    return await privacy_test();
  }

  const pref = {
    date: new Date().toISOString(),
    accepted: res,
  };

  await prefSet(ID_PRIVACY, pref);
}
