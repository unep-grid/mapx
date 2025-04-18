import { el } from "./../el_mapx/index.js";
import { path, hasIndex } from "./../mx_helper_misc.js";

const typesSearch = [
  "string",
  "array",
  "ARRAY",
  "character varying",
  "boolean",
  "timestamp*",
];
const typesNumeric = ["number", "double precision", "integer", "bigint"];

/**
 * Create view list filters element
 * @param {Object} view View object
 * @returns {HTMLElement} View list filters element
 */
export function elViewListFilters(view) {
  // Type checks
  const isVt = view.type === "vt";
  const isGj = view.type === "gj";
  const isVtWithAttr = isVt && path(view, "data.attribute.name");
  const dataType = path(view, "data.attribute.type");
  const isVtGjWithString = (isVt || isGj) && typesSearch.includes(dataType);
  const isVtGjWithNumber = (isVt || isGj) && typesNumeric.includes(dataType);
  const vtProps = isVtWithAttr ? path(view, "data.attribute.names", []) : [];
  const isVtTemporal = hasIndex(vtProps, "mx_t0");

  return el(
    "div",
    {
      id: `mx-settings-tool-${view.id}`,
      class: "mx-hide",
    },
    [
      // Wait message
      el("div", {
        class: "mx-settings-tool-wait",
        "data-lang_key": "stat_load_please_wait",
        innerText: "Please wait..",
      }),

      // Content container
      el(
        "div",
        {
          class: ["mx-settings-tool-content", "mx-hide"],
        },
        [
          // String filter
          (isVt || isGj) &&
            isVtGjWithString && [
              el("label", {
                for: `view_filter_by_values_${view.id}`,
                "data-lang_key": "view_filter_by_values",
              }),
              el("select", {
                id: `view_filter_by_values_${view.id}`,
                "data-search_box_for": view.id,
                class: "mx-search-box",
                multiple: "TRUE",
              }),
            ],

          // Numeric filter
          (isVt || isGj) &&
            isVtGjWithNumber &&
            el("div", { class: "mx-slider-container" }, [
              el("div", { class: "mx-slider-header" }, [
                el("label", {
                  class: "mx-slider-title",
                  "data-lang_key": "btn_opt_numeric",
                  "data-lang_type": "text",
                }),
                el("div", { class: "mx-slider-dyn" }, [
                  el("span", { class: "mx-slider-dyn-min" }, "0"),
                  el("span", { class: "mx-slider-dyn-max" }, "0"),
                ]),
              ]),
              el("div", {
                class: ["mx-slider", "mx-slider-numeric"],
                "data-range_numeric_for": view.id,
              }),
              el("div", { class: "mx-slider-range" }, [
                el("span", { class: "mx-slider-range-min" }, "0"),
                el("span", { class: "mx-slider-range-max" }, "0"),
              ]),
            ]),

          // Time filter
          isVtTemporal &&
            el("div", { class: "mx-slider-container" }, [
              el("div", { class: "mx-slider-header" }, [
                el("label", {
                  class: "mx-slider-title",
                  "data-lang_key": "btn_opt_date",
                  "data-lang_type": "text",
                }),
                el("div", { class: "mx-slider-dyn" }, [
                  el("span", { class: "mx-slider-dyn-min" }),
                  el("span", { class: "mx-slider-dyn-max" }),
                ]),
              ]),
              el("div", {
                class: ["mx-slider", "mx-slider-date"],
                "data-range_time_for": view.id,
              }),
              el("div", { class: "mx-slider-range" }, [
                el("span", { class: "mx-slider-range-min" }, "0"),
                el("span", { class: "mx-slider-range-max" }, "0"),
              ]),
            ]),

          // Transparency slider (always shown)
          el("div", { class: "mx-slider-container" }, [
            el("div", { class: "mx-slider-header" }, [
              el("label", {
                class: "mx-slider-title",
                "data-lang_key": "btn_opt_transparency",
                "data-lang_type": "text",
              }),
            ]),
            el("div", {
              class: ["mx-slider", "mx-slider-numeric"],
              "data-transparency_for": view.id,
            }),
            el("div", { class: "mx-slider-range" }, [
              el("span", { class: "mx-slider-range-min" }, "0%"),
              el("span", { class: "mx-slider-range-max" }, "100%"),
            ]),
          ]),
        ],
      ),
    ],
  );
}
