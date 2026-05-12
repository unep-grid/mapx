import { el, elWait } from "../el_mapx";
import { getViewAuto } from "../map_helpers";
import { modal } from "../mx_helper_modal";
import { isView } from "../is_test_mapx";
import {
  getViewStats,
  ViewStats,
  viewStatsToUi,
} from "../view_stats";

export { getViewStats, ViewStats, viewStatsToUi };

/**
 * Display view stats in a modal panel.
 * @param {Object|String} idView View or view id
 */
export async function viewToStatsModal(idView) {
  const view = await getViewAuto(idView);

  if (!isView(view)) {
    return modal({
      content: "View not found",
    });
  }

  const elContent = el("div", elWait("Please wait..."));
  const elTitleModal = el("span", {
    dataset: { lang_key: "meta_view_modal_title" },
  });

  const elModal = modal({
    title: elTitleModal,
    content: elContent,
    addBackground: true,
    style: {
      width: "min(1040px, 96vw)",
    },
  });

  await viewStatsToUi(view.id, elContent);

  return elModal;
}
