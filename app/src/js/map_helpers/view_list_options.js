import { el } from "./../el_mapx/index.js";
import { path } from "./../mx_helper_misc.js";
import { checkLanguage } from "./../language";

/**
 * Create view list options element
 * @param {Object} view View object
 * @returns {HTMLElement} View list options element
 */
export function elViewListOption(view) {
  const langAbstract = checkLanguage({ obj: view, path: "data.abstract" });
  const abstract = path(view, "data.abstract." + langAbstract);

  return el("div", [
    // Legend container (only if view type is not 'sm')
    view.type !== "sm" &&
      el("div", {
        class: "mx-view-legend-container",
        id: `view_legend_container_${view.id}`,
      }),

    // Description container
    el("div", { class: "mx-view-item-desc-container" }, [
      abstract &&
        el(
          "p",
          {
            class: "mx-view-item-desc",
            id: `view_text_${view.id}`,
          },
          abstract,
        ),
    ]),

    // Controls container
    el("div", {
      id: `view_contols_container_${view.id}`,
    }),

    // Filters container
    el("div", {
      id: `view_filters_container_${view.id}`,
    }),
  ]);
}
