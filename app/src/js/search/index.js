import { FlashCircle } from "./../icon_flash";
import { modal, modalConfirm } from "./../mx_helper_modal.js";
import { storyRead } from "./../story_map/index.js";
import { viewToMetaModal } from "./../mx_helper_map_view_metadata.js";
import { getDictItem } from "./../language";
import { EventSimple } from "./../event_simple";
import { modalMarkdown } from "./../modal_markdown/index.js";
import { viewsListAddSingle } from "./../mx_helper_map_view_ui.js";
import {
  el,
  elSpanTranslate,
  elButtonIcon,
  elToggle,
} from "../el_mapx/index.js";
import { prefGet, prefSet } from "./../user_pref";
import { isDate } from "./../is_test/index.js";
import { moduleLoad } from "./../modules_loader_async";
import pDebounce from "p-debounce";

import {
  zoomToViewId,
  getView,
  getViewRemote,
  viewAdd,
  viewRemove,
  getViewsListOpen,
  hasViewLocal,
  viewLink,
} from "./../map_helpers/index.js";
import {
  isView,
  isStory,
  isArray,
  isBoolean,
  isStringRange,
  isEmpty,
} from "./../is_test/index.js";

import { def } from "./default.js";

class Search extends EventSimple {
  constructor(opt) {
    super();
    const s = this;
    s.setOpt(opt);
    s.update = pDebounce(s.update, 200).bind(s);
    s._handle_infinite_scroll = pDebounce(s._handle_infinite_scroll, 200).bind(
      s
    );
    return s;
  }

  async initCheck() {
    const s = this;
    if (s._init) {
      return;
    }
    s._init = true;
    s._filters = {};
    s._facets = {};
    s._infinite_page = 0;

    /**
     * Dynamic import
     */
    s._nouislider = await moduleLoad("nouislider");
    s._MeiliSearch = (await import("meilisearch")).MeiliSearch;
    s._flatpickr = (await import("flatpickr")).default;
    s._flatpickr_langs = await import("./flatpickr_locales");
    s._elContainer = document.querySelector(s.opt("container"));
    s._meili = new s._MeiliSearch({
      host: `${s.opt("protocol")}${s.opt("host")}:${s.opt("port")}`,
      apiKey: s.opt("key") || null,
    });
    await import("./style.less");
    await import("./style_flatpickr.less");

    /**
     * Build ui
     */
    await s.build();
    await s.setLanguage({ reset: false });
    await s.update();
    s.fire("ready");
    return s;
  }

  opt(k) {
    return this._opt[k];
  }

  setOpt(opt) {
    const s = this;
    if (!s._opt) {
      s._opt = def;
    }
    Object.assign(s._opt, opt);
    s.fire("options_update", opt);
  }

  get isReady() {
    return !!this._init;
  }

  get facets() {
    return this._facets;
  }

  set facets(facets) {
    return (this._facets = facets);
  }

  showApiConfig() {
    const s = this;
    if (s._elModalShowApiConfig) {
      return;
    }
    const url = `${s.opt("protocol")}${s.opt("host")}:${s.opt("port")}`;
    const language = s.opt("language");
    const elConfig = el("div", [
      el("label", getDictItem("search_api_key")),
      el("pre", s.opt("key")),
      el("label", getDictItem("search_api_host")),
      el("pre", url),
      el("label", getDictItem("search_api_request_examples")),
      el(
        "details",
        { open: true },
        el("summary", "curl"),
        el(
          "pre",
          `curl '${url}/indexes/views_${language}/search' \\\n` +
            `-H 'X-Meili-API-Key: ${s.opt("key")}' \\\n` +
            `--data-raw '{"q":"water"}' \\\n` +
            `--compressed;\n`
        )
      ),
    ]);
    s._elModalShowApiConfig = modal({
      title: getDictItem("search_show_api_config"),
      content: elConfig,
      addBackground: true,
      onClose: () => {
        delete s._elModalShowApiConfig;
      },
    });
  }

  async setLanguage(opt) {
    const s = this;

    opt = Object.assign({}, { reset: true, language: "en" }, opt);
    if (opt.language) {
      s.setOpt({ language: opt.language });
    }
    if (!s.isReady) {
      return;
    }
    await s.setIndex();
    await s.setLocaleFlatpickr();
    if (opt.reset) {
      s.reset();
    }
    /*
     * Misc ui language
     */

    const msgNoViews = await getDictItem("search_results_empty");
    s._elResults.setAttribute("msg_no_views", msgNoViews);
  }

  async setLocaleFlatpickr(lang) {
    const s = this;
    if (!lang) {
      lang = s.opt("language");
    }
    if (!s._flatpickr_langs) {
      return;
    }

    /**
     * The module returns key with full language name.. e.g. "Russian".
     * instead of language code.
     * -> `locs.default[lang]` as workaround ?
     */
    let locFun = s._flatpickr_langs[lang];
    if (!locFun) {
      locFun = s._flatpickr_langs["en"];
    }
    const locs = await locFun();
    let loc = s._flatpickr.l10ns.default;

    if (locs) {
      const locLang = locs.default[lang];
      if (locLang) {
        loc = locLang;
      }
    }
    if (loc) {
      s._flatpickr.localize(loc);
    }
    if (s._flatpickr_filters) {
      for (let f of s._flatpickr_filters) {
        f.set("locale", lang);
      }
    }
  }

  async setIndex(id) {
    const s = this;
    if (!id) {
      id = s.template(s.opt("index_template"));
    }
    s.setOpt({ index: id });
    if (!s._meili) {
      return;
    }
    s._index = await s._meili.getIndex(id);
  }

  async build() {
    const s = this;
    if (s._built) {
      return;
    }
    s._built = true;

    /**
     * Results
     */
    s._elResults = el("div", { class: ["search--results"] });
    s._elResults.addEventListener("scroll", s._handle_infinite_scroll);

    /**
     * Pagination
     * MeiliSearch nbHits issue : no pagination possible, see #711
     */
    if (0) {
      s._elPagination = el("div", { class: ["search--pagination"] });
    }

    /**
     * Filters and facet
     */
    s._elFiltersFacets = el("div", { class: "search--filter-facets" });
    s._elFiltersDate = el("div", { class: "search--filter-dates" });
    s._elFiltersDateGroup = el("details", [
      el("summary", elSpanTranslate("search_filter_date_details")),
      s._elFiltersDate,
    ]);
    s._elFiltersYearsRange = el("div", {
      class: ["search--filter-years", "mx-slider-container"],
    });
    s._elFilters = el(
      "div",
      {
        class: ["search--filters", "search--hidden"],
      },
      el("div", { class: "search--filters-items" }, [
        s._elFiltersYearsRange,
        s._elFiltersFacets,
        s._elFiltersDateGroup,
      ])
    );

    /**
     * Stats
     */
    s._elStatHits = el("span", {
      class: ["search--stats-item"],
    });
    s._elStats = el(
      "div",
      {
        class: ["search--stats"],
      },
      s._elStatHits
    );

    /**
     * Search header
     */
    s._elInputs = await s._build_input({
      key_label: "search_title",
      key_placeholder: "search_placeholder",
    });

    /**
     * Search complete
     */

    s._elSearch = el(
      "div",
      {
        class: ["search--container"],
        on: ["click", s._handle_click.bind(s)],
      },
      s._elInputs,
      s._elFilters,
      s._elResults,
      //s._elPagination,
      s._elStats
    );

    s._elContainer.appendChild(s._elSearch);

    /**
     * Filters
     */
    await s._build_filter_date();
    await s._build_filter_years_range();
  }

  _update_facets(distrib) {
    const s = this;
    const attrKeys = s.opt("keywords").map((k) => k.type);

    for (let attr of attrKeys) {
      /**
       * source_keyword, source_keywords_m49, view_type
       */
      const tags = distrib[attr];
      for (let tag in tags) {
        if (tag) {
          const k = `${attr}:${tag}`;
          /**
           * Label or key, e.g. vt, environment, global
           */
          const count = tags[tag];
          const facet = s.facets[k];
          if (facet) {
            facet.count = count;
          }
        }
      }
    }
  }

  _build_facets(distrib) {
    const s = this;
    if (!distrib) {
      console.warn("No facet distribution");
      return el("span", "");
    }
    s.facets = {};
    const attrKeys = s.opt("keywords").map((k) => k.type);
    const frag = new DocumentFragment();

    for (let attr of attrKeys) {
      const aConf = s.opt("keywords").find((k) => k.type == attr);
      const subgroups = aConf.subgroups;
      /**
       * source_keyword, source_keywords_m49, view_type
       */
      const { elFacetGroup, elFacetItems } = build_facets_group(attr, {
        details: true,
        open: !frag.firstElementChild,
        addSortBtn: true,
      });
      frag.appendChild(elFacetGroup);

      /**
       * Create sub group
       */

      if (subgroups) {
        elFacetItems.className = "search--filter-facets-sub-items";
        for (let g of subgroups) {
          const { elFacetGroup: elFg, elFacetItems: elFi } = build_facets_group(
            g.key,
            { details: false, addSortBtn: false }
          );
          elFacetItems.appendChild(elFg);
          g._elSubFacetItems = elFi;
        }
      }

      const values = distrib[attr];
      /**
       * Values format :
       * {
       *   "landmines":12,
       *   "3w": 1,
       *   "abt 11": 6,
       *   "abt" 12": 1,
       *   "accessibility": 1,
       *   "activities": 1,
       *   "administrative": 1
       *   <...>
       * }
       */

      for (let value in values) {
        /**
         * Value type is string, e.g. :
         * "landmines"
         */
        if (value) {
          const k = `${attr}:${value}`;
          const fc = new Facet({
            count: values[value],
            label: value,
            group: attr,
            checked: false,
            id: k,
          });
          s.facets[k] = fc;
          if (!subgroups) {
            elFacetItems.appendChild(fc.el);
            continue;
          }
          for (let g of subgroups) {
            const isMatch = value.match(g.match);
            const isExclude = value.match(g.exclude);
            if (isMatch && !isExclude) {
              g._elSubFacetItems.appendChild(fc.el);
            }
          }
        }
      }
    }

    function build_facets_group(key, opt) {
      opt = Object.assign(
        {},
        { details: true, open: false, addSortBtn: false },
        opt
      );

      const elFacetItems = el("div", {
        class: "search--filter-facets-items",
      });

      const elOrderChange = !opt.addSortBtn
        ? null
        : elToggle({
            containerClass: "search--filter-facets-sort-items",
            iconActive: "sort-alpha-asc",
            iconDefault: "sort-numeric-desc",
            on: {
              change: (e) => {
                const isAlpha = e.target.checked;
                const facets = s.getFacetsArray();
                const facetsGroup = facets.filter((f) => f.group === key);
                const facetsSorted = facetsGroup.sort((a, b) => {
                  if (isAlpha) {
                    // text asc
                    return b.text.localeCompare(a.text);
                  }
                  // num desc
                  return a.count - b.count;
                });

                let n = 0;
                for (const f of facetsSorted) {
                  if (s._opt.sort.keysAlwaysTop.includes(f.label)) {
                    f.order = -1e4;
                  } else {
                    f.order = 1 - n++;
                  }
                }
              },
            },
          });

      const elFacetGroup = el(
        opt.details ? "details" : "div",
        {
          class: "search--filter-facets-group",
        },
        [
          el(
            opt.details ? "summary" : "span",
            {
              class: "search--filter-group-title",
            },
            elSpanTranslate(`search_${key}`)
          ),
          el("div", [elFacetItems, elOrderChange]),
        ]
      );
      if (opt.details && opt.open) {
        elFacetGroup.setAttribute("open", true);
      }
      return { elFacetItems, elFacetGroup };
    }

    return frag;
  }

  async _build_facets_or_update(distrib) {
    const s = this;
    if (isEmpty(s.facets)) {
      const fragFacet = s._build_facets(distrib);
      s._elFiltersFacets.replaceChildren(fragFacet);
    } else {
      s._update_facets(distrib);
    }
  }

  async _build_filter_years_range() {
    const s = this;
    /**
     * Year slider container and labels
     */
    const yMin = s.opt("dates").year_min;
    const yMax = s.opt("dates").year_max;

    const elSliderYear = el("div");
    const elSliderYearInputMin = el("span", {
      class: "search--filter-years-value",
    });
    const elSliderYearTitle = elSpanTranslate("search_year_composite_range");

    const elSliderYearInputMax = el("span", {
      class: "search--filter-years-value",
    });

    const elSliderYearRowTop = el(
      "div",
      {
        class: "search--filter-years-row",
      },
      [elSliderYearInputMin, elSliderYearTitle, elSliderYearInputMax]
    );
    const elSliderYearRowBottom = el(
      "div",
      {
        class: "search--filter-years-row",
      },
      [el("span", `${yMin}`), el("span", `${yMax}`)]
    );

    s._elFiltersYearsRange.appendChild(elSliderYearRowTop);
    s._elFiltersYearsRange.appendChild(elSliderYear);
    s._elFiltersYearsRange.appendChild(elSliderYearRowBottom);

    /**
     * Slider
     */
    s._year_slider = s._nouislider.create(elSliderYear, {
      range: { min: yMin, max: yMax },
      step: 1,
      start: [yMin, yMax],
      connect: true,
      behaviour: "drag",
      tooltips: false,
    });
    /**
     * - drag produce end event
     * - update produce set event
     * -> unable to have a smart way of handling fast changes
     * -> using 'update' for all
     */
    s._year_slider.on("update", update);
    /**
     * Update filters
     */
    async function update(d) {
      const start = parseInt(d[0]);
      const end = parseInt(d[1]);
      const attrStart = "range_start_at_year";
      const attrEnd = "range_end_at_year";
      /**
       * Strict
       * :) [--|___-|--]
       * :( [-_|___-|--]
       * const strFilter = `${attrStart} >= ${start} AND ${attrEnd} <= ${end}`;
       *
       * Partial
       * :) [--|___-|--]
       * :) [-_|___-|--]
       * :) [--|---_|__]
       * :( [__|----|--]
       */
      const strFilter = `${attrStart} <= ${end} AND ${attrEnd} >= ${start}`;
      elSliderYearInputMin.dataset.year = start;
      elSliderYearInputMax.dataset.year = end;
      s.setFilter("range_years", strFilter);
      await s.update();
    }
  }
  /**
   * Build filter date for each item in options > attributes > date
   * connect flatpickr and add to UI
   */
  async _build_filter_date() {
    const s = this;
    const attrDate = s.opt("attributes").date;
    const attrDateRange = s.opt("attributes").date_range;
    s._flatpickr_filters = [];
    const attrDateItems = attrDate.map((attr) => {
      return { attr, range: false };
    });
    attrDateItems.push(
      ...attrDateRange.map((attr) => {
        return { attr, range: true };
      })
    );
    const txtPlaceholder = await getDictItem("search_filter_date_placeholder");
    for (let item of attrDateItems) {
      /**
       * Layout
       */
      const elFilterDate = el("input", {
        type: "text",
        class: "search--filter-date-input",
        dataset: {
          lang_key: "source_filter_date_placeholder",
          lang_type: "placeholder",
        },
        placeholder: txtPlaceholder,
        id: Math.random().toString(32),
      });
      const elFilterDateLabel = el(
        "label",
        {
          class: "search--filter-date-label",
          for: elFilterDate.id,
        },
        elSpanTranslate(`search_filter_${item.attr}`)
      );
      const elFilterContainer = el(
        "div",
        { class: "search--filter-date-item" },
        [elFilterDateLabel, elFilterDate]
      );
      s._elFiltersDate.appendChild(elFilterContainer);
      /**
       * Date picker
       */
      const fpickr = s._flatpickr(elFilterDate, {
        mode: item.range ? "range" : "single",
        allowInput: true,
        onChange: async (e) => {
          let strFilter = "";
          const isDateA = isDate(e[0]);
          const isDateB = isDate(e[1]);
          if (item.range && isDateA && isDateB) {
            strFilter = `${item.attr} >= ${(e[0] * 1) / 1000}`;
            strFilter = `${strFilter} AND ${item.attr}<=${(e[1] * 1) / 1000}`;
          }
          if (!item.range && isDateA) {
            const isStart = item.attr.includes("_start_");
            strFilter = `${item.attr}${isStart ? ">" : "<"}=${
              (e[0] * 1) / 1000
            }`;
          }
          s.setFilter(item.attr, strFilter);
          await s.update();
        },
      });
      s._flatpickr_filters.push(fpickr);
    }
  }
  /**
   * Input builder
   * @param {Options} opt Options
   * @param {String} opt.key_placeholder translation key for the placeholder
   */
  async _build_input(opt) {
    const s = this;
    const id = Math.random().toString(32);
    opt = Object.assign({}, { key_placeholder: null }, opt);
    s._elInput = el("input", {
      class: "search--input",
      id: id,
      type: "text",
      dataset: {
        lang_key: opt.key_placeholder,
        lang_type: "placeholder",
      },
      placeholder: await getDictItem(opt.key_placeholder),
      on: {
        input: async () => {
          await s.update();
        },
      },
    });

    s._elFilterFlag = el("span", {
      class: ["search--flag"],
    });

    s._elBtnClear = elButtonIcon("search_clear_query", {
      icon: "fa-undo",
      mode: "icon",
      classes: [],
      dataset: { action: "search_clear" },
    });

    s._elBtnToggleFilters = elButtonIcon("search_filters", {
      icon: "fa-bars",
      mode: "icon",
      classes: [],
      dataset: { action: "toggle_filters" },
      content: s._elFilterFlag,
    });

    s._elBtnHelp = elButtonIcon("search_help_ui", {
      icon: "fa-question",
      mode: "icon",
      classes: [],
      dataset: { action: "show_help" },
    });

    const elButtons = el(
      "div",
      {
        class: "btn-group",
      },
      [s._elBtnHelp, s._elBtnClear, s._elBtnToggleFilters]
    );

    s._elInputContainer = el(
      "div",
      {
        class: "search--input-container",
      },
      [s._elInput, elButtons]
    );
    return s._elInputContainer;
  }
  getFacetsArray() {
    const s = this;
    const out = [];
    if (!s.facets) {
      return out;
    }
    for (let n in s.facets) {
      out.push(s.facets[n]);
    }
    // slower ? return Object.values(s._facets);
    return out;
  }

  /**
   * Clear filters
   */
  clear() {
    const s = this;
    if (!s._built) {
      return;
    }
    s._elInput.value = "";
    const facets = s.getFacetsArray();
    for (let facet of facets) {
      if (facet.checked) {
        facet.checked = false;
      }
    }
    const dates = s._flatpickr_filters;
    for (let date of dates) {
      date.clear();
    }
    const yMin = s.opt("dates").year_min;
    const yMax = s.opt("dates").year_max;
    s._year_slider.set([yMin, yMax]);
  }
  /**
   * Reset filters
   */
  async reset() {
    const s = this;
    if (!s._built) {
      return;
    }
    s._elInput.value = "";
    const facets = s.getFacetsArray();
    for (let facet of facets) {
      facet.destroy();
    }
    s.facets = {};
    const dates = s._flatpickr_filters;
    for (let date of dates) {
      date.clear();
    }
    await s.update();
  }

  async _handle_infinite_scroll() {
    const s = this;
    if (s._infinite_scroll_updating || s._infinite_scroll_last) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = s._elResults;
    try {
      if (clientHeight + scrollTop >= scrollHeight - 5) {
        const msgLoading = await getDictItem("search_results_loading");
        s._elResults.setAttribute("msg_loading", msgLoading);
        s._infinite_page++;
        s._infinite_scroll_updating = true;
        const results = await s.update({
          append: true,
          page: s._infinite_page,
        });
        if (results && results.hits.length === 0) {
          s._infinite_scroll_last = true;
          const msgNoMore = await getDictItem("search_results_end_of");
          s._elResults.setAttribute("msg_loading", msgNoMore);
        } else {
          s._elResults.setAttribute("msg_loading", "");
        }
      }
    } catch (e) {
      console.warn(e);
    }
    s._infinite_scroll_updating = false;
  }

  async _handle_click(e) {
    const s = this;
    const ds = e.target?.dataset || {};
    const action = ds.action;
    try {
      switch (action) {
        case "search_year_set_min":
          {
            const values = s._year_slider.get();
            const change = parseInt(values[0]) !== parseInt(ds.year);
            values[0] = change ? ds.year : s.opt("dates").year_min;
            s._year_slider.set(values);
          }
          break;
        case "search_year_set_max":
          {
            const values = s._year_slider.get();
            const change = parseInt(values[1]) !== parseInt(ds.year);
            values[1] = change ? ds.year : s.opt("dates").year_max;
            s._year_slider.set(values);
          }
          break;
        case "toggle_filters":
          {
            s._elFilters.classList.toggle("search--hidden");
            s.vFeedback(e);
          }
          break;
        case "show_help":
          {
            modalMarkdown({
              title: getDictItem("btn_help"),
              wiki: "Search-tool-UI",
            });
          }
          break;
        case "update_facet_filter":
          await s.update();
          if (0) {
            /**
             * Avoid scrollIntoView as this
             * produce a lot of layout shift.
             * See also Facet > set count
             */

            e.target.scrollIntoView({
              block: "center",
              inline: "nearest",
              behaviour: "smooth",
            });
          }
          break;
        case "search_clear":
          {
            s.vFeedback(e);
            s.clear();
          }
          break;
        case "search_set_page":
          {
            s.vFeedback(e);
            await s.update({
              page: ds.page,
            });
          }
          break;
        case "search_keyword_toggle":
          {
            const keyword = ds.keyword;
            const type = ds.type;
            const facet = s.facets[`${type}:${keyword}`];
            if (facet) {
              facet.checked = !facet.checked;
              await s.update();
            }
          }
          break;
        case "search_view_link":
          {
            s.vFeedback(e);
            const idView = ds.id_view;
            const link = viewLink(idView, { useStatic: true });
            window.open(link, "_newtab");
          }
          break;
        case "search_view_toggle":
          {
            s.vFeedback(e);
            const idView = ds.id_view;
            const viewIsLocal = hasViewLocal(idView);
            const view = viewIsLocal
              ? getView(idView)
              : await getViewRemote(idView);
            const viewIsValid = isView(view);

            if (!viewIsValid) {
              console.warn("View not valid");
            }
            const viewIsStory = isStory(view);
            if (!viewIsLocal) {
              /**
               * Handle external view
               * - Add viewList item
               * - Show message about what's happening
               * - Save preferences
               */

              view._temp = true;
              await viewsListAddSingle(view, { open: false, render: true });
              const showNotify = await prefGet(
                "pref_show_notify_add_view_temp"
              );
              if (showNotify === null || showNotify === true) {
                const keepShowing = await modalConfirm({
                  title: getDictItem("search_view_added_temporarily_title"),
                  content: getDictItem("search_view_added_temporarily"),
                  cancel: getDictItem(
                    "search_view_added_temporarily_ok_no_more"
                  ),
                  confirm: getDictItem("search_view_added_temporarily_ok"),
                });
                await prefSet("pref_show_notify_add_view_temp", keepShowing);
              }
            }
            /*
             * Check if it's open
             * - Add or remove view
             */
            const viewIsOpen = getViewsListOpen().includes(idView);

            if (viewIsOpen) {
              await viewRemove(view);
            } else {
              await viewAdd(view);
              /**
               * All views exept story : zoom
               */
              if (!viewIsStory) {
                await zoomToViewId(idView);
                return;
              }
              /**
               * Story handling
               */
              const confirmed = await modalConfirm({
                title: elSpanTranslate("search_story_auto_play_confirm_title"),
                content: elSpanTranslate("search_story_auto_play_confirm"),
              });
              if (!confirmed) {
                return;
              }
              storyRead({
                view: view,
              });
            }
          }
          break;
        case "search_show_view_meta":
          {
            const idView = ds.id_view;
            s.vFeedback(e);
            await viewToMetaModal(idView);
          }
          break;
        default:
          null;
      }
    } catch (e) {
      console.warn("Search action handler failed ", e);
    }
  }
  vFeedback(event) {
    new FlashCircle({
      x: event.clientX,
      y: event.clientY,
    });
  }
  _build_result_list(hits) {
    const s = this;
    const frag = new DocumentFragment();
    const confKeywords = s.opt("keywords");
    const sliderYears = s._year_slider.get().map((v) => parseInt(v * 1));
    for (let v of hits) {
      /**
       * Add keywords buttons
       */
      const elKeywords = el("div", { class: ["search--button-group"] });
      for (let k of confKeywords) {
        let keywords = v[k.type];
        if (keywords) {
          if (!isArray(keywords)) {
            keywords = [keywords];
          }
          for (let keyword of keywords) {
            if (isStringRange(keyword, 2)) {
              const facetEnabled = s.hasFilterFacet(k.type, keyword);
              const clEnabled = facetEnabled ? "enabled" : "disabled";
              const elKeyword = el(
                "div",
                {
                  class: [
                    "search--button-keyword",
                    `search--button-keyword-${clEnabled}`,
                  ],
                  dataset: {
                    action: "search_keyword_toggle",
                    keyword: keyword,
                    type: k.type,
                  },
                },
                [
                  el("i", {
                    class: ["fa", k.icon],
                  }),
                  elSpanTranslate(keyword),
                ]
              );
              elKeywords.appendChild(elKeyword);
            }
          }
        }
      }
      /**
       * Add years keyword
       */
      const emphaseYearStart = sliderYears.includes(v.range_start_at_year);
      const emphaseYearEnd = sliderYears.includes(v.range_end_at_year);
      const elYears = el("div", { class: ["search--button-group"] }, [
        el(
          "div",
          {
            class: [
              "search--button-keyword",
              emphaseYearStart ? `search--button-keyword-enabled` : null,
            ],
            dataset: {
              action: "search_year_set_min",
              year: v.range_start_at_year,
            },
          },
          [
            el("i", {
              class: ["fa", "fa-hourglass-start"],
            }),
            el("span", `${v.range_start_at_year}`),
          ]
        ),
        el(
          "div",
          {
            class: [
              "search--button-keyword",
              emphaseYearEnd ? `search--button-keyword-enabled` : null,
            ],
            dataset: {
              action: "search_year_set_max",
              year: v.range_end_at_year,
            },
          },
          [
            el("i", {
              class: ["fa", "fa-hourglass-end"],
            }),
            el("span", `${v.range_end_at_year}`),
          ]
        ),
      ]);
      /**
       * Add actions
       */
      const elButtonsBar = el(
        "div",
        { class: ["search--button-group", "search--button-group-right"] },
        [
          el(
            "div",
            {
              class: ["search--button-keyword"],
              dataset: { action: "search_view_link", id_view: v.view_id },
            },
            [
              el("i", {
                class: ["fa", "fa-external-link"],
              }),
              elSpanTranslate("search_view_link"),
            ]
          ),
          el(
            "div",
            {
              class: ["search--button-keyword"],
              dataset: { action: "search_show_view_meta", id_view: v.view_id },
            },
            [
              el("i", {
                class: ["fa", "fa-info-circle"],
              }),
              elSpanTranslate("search_show_view_meta"),
            ]
          ),
          el(
            "div",
            {
              class: ["search--button-keyword"],
              dataset: { action: "search_view_toggle", id_view: v.view_id },
            },
            [
              el("i", {
                class: ["fa", "fa-toggle-off"],
              }),
              elSpanTranslate("search_view_toggle"),
            ]
          ),
        ]
      );
      frag.appendChild(
        el(
          "div",
          { class: ["search--results-item"] },
          el(
            "div",
            { class: "search--item-title" },
            el("span", s.formatCroppedText(v._formatted.view_title))
          ),
          el(
            "p",
            {
              class: ["search--item-info"],
            },
            [
              { key: "view_abstract", id: "view_id", type: "view" },
              { key: "source_title", id: "source_id", type: "source" },
              { key: "source_abstract", id: null, type: null },
              { key: "project_title", id: "project_id", type: "project" },
            ].map((row) => {
              return el(
                "span",
                {
                  class: ["search--item-info-snipet", "hint--top"],
                  dataset: {
                    lang_key: `search_${row.key}`,
                    lang_type: "tooltip",
                  },
                },
                s.formatCroppedText(v._formatted[row.key])
              );
            })
          ),
          elButtonsBar,
          elKeywords,
          elYears
        )
      );
    }
    return frag;
  }
  destroy() {
    const s = this;
    s._elSearch.remove();
    s.ac.destroy();
  }
  /**
   * Split text on n words using details element.
   * @param {String} str string
   * @param {Integer} max Number of words to use
   * @return {String} If max number of word reached,string with <details>+<summary>
   */

  cutext(str, max) {
    max = max || 50;
    // NOTE: Can split html div. but description should not contain html.
    const wrds = (str || "").split(/\b/);
    const strShow = wrds.filter((w, i) => i <= max).join("");
    const strHide = wrds.filter((w, i) => i > max).join("");
    if (strHide.length === 0) {
      return el("span", str);
    }
    const elSummary = el("summary", strShow);
    const elHide = el("span", strHide);
    return el(
      "details",
      {
        class: ["search--cutext"],
      },
      elSummary,
      elHide
    );
  }
  /**
   * Format cropped text: add ellipsis when needed
   * @param {String} str Croped tring to format
   * @return {String} str String formated like '...on mercury analysis' or 'A mercury analysis...' ;
   */

  formatCroppedText(str) {
    if (!isStringRange(str, 1)) {
      return "";
    }
    if (isStringRange(str, 1, 20)) {
      return str + " ";
    }
    if (str[0] !== str[0].toUpperCase()) {
      str = `…${str}`;
    }
    if (![".", "!", "?", ")"].includes(str[str.length - 1])) {
      str = `${str}…`;
    }
    return str;
  }
  getFilters(op) {
    op = op || "AND";
    const s = this;
    const filters = [];
    const inputFilters = s._filters;
    for (const id in inputFilters) {
      const filter = inputFilters[id];
      if (filter) {
        filters.push(filter);
      }
    }
    return filters.join(` ${op} `) || null;
  }
  setFilter(id, value) {
    const s = this;
    s._filters[id] = value;
  }
  getFiltersFacets(op) {
    const s = this;
    op = op || "AND";
    const inner = [];
    const outer = [];
    if (!s.facets) {
      return;
    }
    const keys = Object.keys(s.facets);
    for (let key of keys) {
      const facet = s.facets[key];
      if (facet.checked) {
        if (op === "AND") {
          inner.push(key);
        } else {
          outer.push(key);
        }
      }
    }
    if (outer.length) {
      inner.push(outer);
    }
    if (inner.length) {
      return inner;
    }
    return;
  }
  /**
   * Check if keyword/tag has enabled facet
   * @param {String} attr Attribute (eg. keyword type)
   * @param {String} tag Keyword/tag
   * @return {Boolean}
   */
  hasFilterFacet(attr, tag) {
    const s = this;
    let out = false;
    const id = `${attr}:${tag}`;
    const facets = s.getFacetsArray();
    for (let f of facets) {
      if (!out) {
        out = f.checked && f.id === id;
      }
    }
    return out;
  }
  hasFilter() {
    const s = this;
    const ff = s.getFiltersFacets();
    return !!ff && !!ff.length;
  }
  hasFilterDateSlider() {
    const s = this;
    const yMin = s.opt("dates").year_min;
    const yMax = s.opt("dates").year_max;
    const yrs = s._year_slider.get().map((v) => parseInt(v * 1));
    return !yrs.includes(yMin) || !yrs.includes(yMax);
  }
  hasFilterDateInput() {
    const s = this;
    const dates = s._flatpickr_filters;
    let out = false;
    for (let date of dates) {
      const isRange = date.config.mode === "range";
      const sel = date.selectedDates || [];
      const valid = isRange ? sel.length === 2 : sel.length === 1;
      out = out || valid;
    }
    return out;
  }
  hasFilterText() {
    const s = this;
    return s._elInput.value.length > 0;
  }
  _update_flag_auto() {
    const s = this;
    const hasFilter =
      s.hasFilter() || s.hasFilterDateInput() || s.hasFilterDateSlider();
    const hasFilterText = s.hasFilterText();

    if (hasFilter) {
      s._elFilterFlag.classList.add("active");
    } else {
      s._elFilterFlag.classList.remove("active");
    }

    if (hasFilter || hasFilterText) {
      s._elBtnClear.removeAttribute("disabled");
    } else {
      s._elBtnClear.setAttribute("disabled", true);
    }
  }

  /**
   * Update the results
   * @param {Object} opt Options.
   * @param {Integer} opt.page Page number - saved in pagination.
   */
  async update(opt) {
    const s = this;
    const options = Object.assign(
      { page: 0, append: false, page_stat: false },
      opt
    );
    if (options.append === false) {
      /**
       * Reset infinite counter if non-append mode
       */

      s._infinite_page = 0;
      s._infinite_scroll_last = false;
    }
    await s.initCheck();
    s._timer_update_cancel = performance.now();
    try {
      const timer = s._timer_update_cancel;
      const attr = s.opt("attributes");
      const hPage = s.opt("hitsPerPage");
      const attrKeys = s.opt("keywords").map((k) => k.type);
      const strFilters = s.getFilters();
      const facetFilters = s.getFiltersFacets();

      const results = await s.search({
        q: s._elInput.value,
        offset: options.page * hPage,
        limit: hPage,
        filters: strFilters,
        facetFilters: facetFilters,
        attributesToRetrieve: attr.retrieve,
        attributesToHighlight: attr.text,
        attributesToCrop: attr.text,
        facetsDistribution: attrKeys,
        matches: false,
      });
      /**
       * Search is not cancellable, but if the timer
       * has changed, another request is on its way.
       * -> Do not render the old one, cancel.
       */
      if (s._timer_update_cancel !== timer) {
        return;
      }
      /**
       * Resulting list append/replace
       */

      const fragItems = s._build_result_list(results.hits);
      if (options.append) {
        s._elResults.appendChild(fragItems);
      } else {
        s._elResults.replaceChildren(fragItems);
        s._elResults.scrollTop = 0;
      }
      if (options.page_stat) {
        /**
         * -> page_stat should be always false, for now, because
         * MeiliSearch nbHits issue : no pagination possible, see #711
         */
        const elPaginationItems = s._build_pagination_items(results);
        s._elPagination.replaceChildren(elPaginationItems);
        await s._update_stats_pagination(results);
      } else {
        if (!options.append) {
          /**
           * Only display stats if append is false, as append implies
           * offset, and offset + filter = meiliSearch wrong nbHits.
           */
          await s._update_stats_simple(results);
        }
      }

      /**
       * Update filter flag (red dot)
       */
      s._update_flag_auto();

      /**
       * Facets are built on the very first "placeholder" search, when all
       * items are returned, then, subsequent results only update facets.
       */
      s._build_facets_or_update(results.facetsDistribution);

      /**
       * Reset item toggle: new result could have displayed views that
       * are already on the map
       */
      s._update_toggles_icons();

      /**
       * Return full results object
       */
      return results;
    } catch (e) {
      console.warn("Issue while searching", e);
    }
  }

  /**
   * Update open/close tag
   * Note: this is also linked with 'view_ui_close/open' from mx.events
   */
  _update_toggles_icons() {
    const s = this;
    if (!s._elResults) {
      return;
    }
    const idViewsOpen = getViewsListOpen();
    const elsToggle = s._elResults.querySelectorAll(
      '[data-action="search_view_toggle"]'
    );
    for (let elT of elsToggle) {
      const idView = elT.dataset.id_view;
      const isOpen = idViewsOpen.includes(idView);
      const elIcon = elT.querySelector("i");
      if (isOpen) {
        elIcon.classList.replace("fa-toggle-off", "fa-toggle-on");
      } else {
        elIcon.classList.replace("fa-toggle-on", "fa-toggle-off");
      }
    }
  }

  //toggleEnable

  /**
   * Search on current index, with default params.
   * @param {Object} opt Options for index.search
   * @return {Object} Search result
   */
  async search(opt) {
    const s = this;
    const search = Object.assign(
      {},
      {
        q: "",
        offset: 0,
        limit: 20,
        filters: null,
        facetFilters: null,
        facetsDistribution: null,
        attributesToRetrieve: ["*"],
        attributesToCrop: null,
        cropLength: 60,
        attributesToHighlight: null,
        matches: false,
      },
      opt
    );
    const res = await s._index.search(search.q, search);

    return res;
  }
  /**
   * Update stats pagition
   */
  async _update_stats_pagination(results) {
    const s = this;
    const nPage = Math.ceil(results.nbHits / results.limit);
    const cPage = Math.ceil(
      nPage - (results.nbHits - results.offset) / results.limit
    );
    const strTime = `${results.processingTimeMs}`;
    const strNbHit = `${results.nbHits}`;
    const tmpl = await getDictItem("search_results_stats_pagination");
    const txt = s.template(tmpl, { strNbHit, strTime, cPage, nPage });
    s._elStatHits.setAttribute("stat", txt);
  }

  /**
   * Update stats simple
   */
  async _update_stats_simple(results) {
    const s = this;
    const strTime = `${results.processingTimeMs}`;
    const strNbHit = `${results.nbHits}`;
    const tmpl = await getDictItem("search_results_stats_simple");
    const txt = s.template(tmpl, { strNbHit, strTime });
    s._elStatHits.setAttribute("stat", txt);
  }
  /**
   * Pagination builder
   */
  _build_pagination_items(results) {
    const elItems = el("div", { class: ["search--pagination-items"] });
    const nPage = Math.ceil(results.nbHits / results.limit);
    const cPage =
      Math.ceil(nPage - (results.nbHits - results.offset) / results.limit) - 1;
    let type = "";
    let fillerPos = [];
    /*
     * Pagination layout
     */
    if (nPage <= 10) {
      /**
       * oooooooXoo
       */
      type = "all";
    } else if (cPage < 4) {
      /**
       * ooXoo ooo
       */
      type = "5_3";
      fillerPos.push(6);
    } else if (cPage > nPage - 4) {
      /**
       * ooo oXooo
       */
      type = "3_5";
      fillerPos.push(4);
    } else {
      /**
       * ooo oXo ooo
       */
      type = "3_5_3";
      fillerPos.push(...[3, nPage - 4]);
    }
    /**
     * Populate pagination
     */
    for (let i = 0; i < nPage; i++) {
      let add = false;
      switch (type) {
        case "all":
          add = true;
          break;
        case "3_5_3":
          if (
            i < 3 ||
            i === cPage - 2 ||
            i === cPage - 1 ||
            i === cPage ||
            i === cPage + 1 ||
            i === cPage + 2 ||
            i > nPage - 4
          ) {
            add = true;
          }
          break;
        case "5_3":
          if (i < 5 || i > nPage - 4) {
            add = true;
          }
          break;
        case "3_5":
          if (i < 3 || i > nPage - 6) {
            add = true;
          }
          break;
        default:
      }
      /**
       * Add filler if needed
       */
      if (fillerPos.includes(i)) {
        const elFiller = el("span", {
          class: ["search--pagination-item-filler"],
        });
        elItems.appendChild(elFiller);
      }
      if (add) {
        /**
         * Build item
         */
        let elItem;
        const elItemContainer = el(
          "span",
          {
            class: ["search--pagination-item-container"],
            dataset: {
              action: "search_set_page",
              page: i,
            },
          },
          (elItem = el("span", {
            class: ["search--pagination-item"],
            dataset: { page: i + 1 },
          }))
        );
        /**
         * The item is the current page
         */
        if (i === cPage) {
          elItem.classList.add("active");
          elItem.setAttribute("disabled", true);
        }
        /**
         * Add the item
         */

        elItems.appendChild(elItemContainer);
      }
    }
    return elItems;
  }
  /**
   * Simple template parser
   * @param {String} template string
   * @param {Object} data Object with key : value pair
   * @return {String} template with replaced values
   */
  template(str, data) {
    const s = this;
    if (!data) {
      data = s._opt;
    }
    return str.replace(/{{([^{}]+)}}/g, (matched, key) => {
      return data[key];
    });
  }
}
class Facet {
  constructor(opt) {
    const fc = this;
    fc._opt = Object.assign(
      {},
      {
        count: 0,
        label: null,
        id: null,
        group: null,
        checked: false,
        order: 0,
        enable: true,
      },
      opt
    );
    fc.init();
  }
  init() {
    const fc = this;
    if (fc._init) {
      return;
    }
    fc.build();
    fc._init = true;
  }
  destroy() {
    const fc = this;
    fc._elTag.remove();
  }
  build() {
    const fc = this;
    fc._elCheckbox = el("input", {
      class: "search--filter-facet-item-input",
      type: "checkbox",
      dataset: {
        action: "update_facet_filter",
      },
      id: Math.random().toString(32),
    });
    const elLabelContent = elSpanTranslate(fc._opt.label);
    fc._elLabel = el(
      "label",
      { class: "search--filter-facet-item-label", for: fc._elCheckbox.id },
      elLabelContent
    );
    fc._elCount = el("span", {
      count: fc._opt.count,
      class: "search--filter-facet-item-count",
    });
    fc._elTag = el(
      "div",
      {
        class: "search--filter-facet-item",
      },
      [fc._elCheckbox, fc._elLabel, fc._elCount]
    );
    fc.order = -fc._opt.count;
  }
  set order(pos) {
    this._elTag.style.order = pos;
  }
  get id() {
    return this._opt.id;
  }
  get group() {
    return this._opt.group;
  }
  get el() {
    return this._elTag;
  }
  get checked() {
    return this._elCheckbox.checked === true;
  }
  set checked(enable) {
    this._elCheckbox.checked = enable;
  }
  get enable() {
    return this._opt.enable;
  }
  set enable(value) {
    const fc = this;
    if (!isBoolean(value)) {
      value = true;
    }
    if (value === fc.enable) {
      return;
    }
    fc._opt.enable = value;
    if (value) {
      fc._elTag.classList.remove("disabled");
    } else {
      fc._elTag.classList.add("disabled");
    }
  }
  get order() {
    return this._opt.order;
  }
  get label() {
    return this._opt.label;
  }

  get text() {
    return this._elLabel.innerText || this.label;
  }

  /**
   * Set facet position
   * @param {number} pos Numeric position
   */
  set order(pos) {
    const fc = this;
    if (pos === fc.order) {
      return;
    }
    fc._opt.order = pos;
    fc._elTag.style.order = pos;
  }
  get count() {
    return this._opt.count;
  }
  set count(c) {
    const fc = this;
    if (c === fc.count) {
      return;
    }
    fc._opt.count = c;
    fc._elCount.setAttribute("count", c);
    fc.enable = !!c;
    /*
     * Avoid reordening, as this produce
     * a lot of layout shifts. The facet even disapears.
     * scrollIntoView could help, but in > 2 columns, shift
     * could be also horizontal. It does not work well in nested
     * scrollable items. See handle_click > update_facet_filter.
     */
    if (0) {
      fc.order = 1000 - c;
    }
  }
}
export { Search };
