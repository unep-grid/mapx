import { events, settings } from "./../mx.js";

import { moduleLoad } from "./../modules_loader_async";
import {
  isView,
  isArray,
  isString,
  isEmpty,
  isNotEmpty,
} from "./../is_test_mapx/index.js";

import { date, path, debounce } from "./../mx_helper_misc.js";
import { getMap, getView, getViewEl, getLayerByPrefix } from "./index.js";
import { getViewSourceSummary } from "./../mx_helper_source_summary";
/**
 * Filter current view and store rules
 * @param {Object} o Options
 * @param {String} o.idView View id
 * @param {Array} o.filter Array of filter
 * @param {String} o.add_event_id Additional event id to fire
 * @param {String} o.type Type of filter : style, legend, time, text or numeric
 */
export function viewSetFilter(o) {
  o = o || {};
  const map = getMap();
  const view = getView(o.idView);
  const idView = view.id;
  const filterView = view._getFilters();
  const filter = o.filter;
  const type = o.type ? o.type : "default";
  const layers = getLayerByPrefix({ prefix: idView });
  const hasFilter = isArray(filter) && filter.length > 1;
  const filterNew = [];

  events.fire({
    type: "view_filter",
    data: {
      idView: idView,
      filter: filter,
    },
  });

  if (o.add_event_id) {
    events.fire({
      type: o.add_event_id,
      data: {
        idView: idView,
        filter: filter,
      },
    });
  }

  /**
   * Add filter to filter type e.g. {legend:["all"],...} -> {legend:["all",["==","value","a"],...}
   * ... or reset to default null
   */
  filterView[type] = hasFilter ? filter : ["all"];

  /**
   * Filter object to filter array
   */
  for (let t in filterView) {
    const f = filterView[t];
    if (f) {
      filterNew.push(f);
    }
  }

  if (layers.length > 0) {
    map.once("idle", (e) => {
      events.fire({
        type: "view_filtered",
        data: {
          idView: idView,
          filter: filterView,
        },
      });
    });
  }

  /**
   * Apply filters to each layer, in top of base filters
   */
  for (const layer of layers) {
    const filterOrig = path(layer, "metadata.filter", []);
    const filterFinal = [];
    if (isEmpty(filterOrig)) {
      filterFinal.push("all", ...filterNew);
    } else {
      filterFinal.push(...filterOrig, ...filterNew);
    }

    map.setFilter(layer.id, filterFinal);
  }
}

/**
 * Set view's layers opacity
 * @param {Object} o Options
 * @param {String} o.idView View id
 * @param {Array} o.opacity
 */
export function viewSetOpacity(o) {
  try {
    o = o || {};
    const view = getView(o.idView);
    const idView = view.id;
    const opacity = isEmpty(o.opacity) ? o.value : o.opacity;
    const idMap = view._idMap ? view._idMap : settings.map.id;
    const map = getMap(idMap);
    const layers = getLayerByPrefix({
      map: map,
      prefix: idView,
    });

    view._opacity = opacity;

    for (const layer of layers) {
      const type = layer.type === "symbol" ? "icon" : layer.type;
      const property = type + "-opacity";
      map.setPaintProperty(layer.id, property, opacity);
    }
  } catch (e) {
    console.error(e);
  }
}
/**
 * Get view layers opacity
 * @param {Object} opt Options
 * @param {String} opt.idView View id
 * @return {Number} Opacity
 */
export function viewGetOpacityValue(opt) {
  opt = opt || {};
  const view = getView(opt.idView);
  return isEmpty(view._opacity) ? 1 : view._opacity;
}

/**
 * Get filters
 */
export function viewGetFilters(opt) {
  const view = getView(opt.idView);
  return view._filters || {};
}
export function viewGetFiltersType(opt) {
  const view = getView(opt.idView);
  return view._filters[opt.type];
}

/**
 * Add filtering system to views
 *
 * @param {String|Object} idView id or View to update
 * @return {Promise}
 */
export function viewFiltersInit(idView) {
  const view = getView(idView);
  if (!isView(view)) {
    return;
  }
  /**
   * Add methods
   */
  view._filters = {
    style: ["all"],
    legend: ["all"],
    time: ["all"],
    text: ["all"],
    numeric: ["all"],
    custom_style: ["all"],
    popup_filter: ["all"],
  };
  view._setFilter = (opt) => viewSetFilter({ ...opt, idView });
  view._getFilters = (opt) => viewGetFilters({ ...opt, idView });
  view._getFiltersType = (type) => viewGetFiltersType({ type, idView });

  /**
   * Opacity
   */
  view._setOpacity = (opt) => viewSetOpacity({ ...opt, idView });
  view._getOpacity = (opt) => viewGetOpacityValue({ ...opt, idView });

  /**
   * Filters
   */
  view._setTimeFilter = (opt) => viewSetTimeFilter({ ...opt, idView });
  view._setNumericFilter = (opt) => viewSetNumericFilter({ ...opt, idView });
  view._setTextFilter = (opt) => viewSetTextFilter({ ...opt, idView });

  view._getTimeFilter = () => view._getFiltersType("time");
  view._getNumericFilter = () => view._getFiltersType("numeric");
  view._getTextFilter = () => view._getFiltersType("text");
}

/**
 * Sets a text filter on a specific view.
 *
 * This function creates a text filter based on the provided options
 * and sets this filter to the specific view identified by its ID.
 *
 * @param {Object} opt - The options for the text filter.
 * @param {string} opt.idView - The ID of the view to which the filter is to be applied.
 * @param {string} opt.attribute - The attribute key to which the filter should be applied.
 * @param {Array.<string>} opt.values - Array of values to match in the filter.
 *
 * @throws {Error} If the view cannot be found with the provided ID.
 *
 * @returns {array} filter
 */
export function viewSetTextFilter(opt) {
  let { attribute, values, idView } = opt;
  if (isEmpty(attribute)) {
    attribute = view?.data?.attribute?.name;
  }
  if (isString(values)) {
    values = [values];
  }
  const view = getView(idView);
  const filter = ["any"];
  for (const value of values) {
    if (value === settings.valuesMap.null) {
      filter.push(["!has", attribute]);
    } else {
      filter.push(["==", ["get", attribute], value]);
    }
  }
  view._setFilter({
    filter: filter,
    type: "text",
  });
  view._filter_text_values = values;
  return view._filter_text_values;
}

export function viewGetTextFilter(opt) {
  const view = getView(opt.idView);
  return view._getTextFilter();
}

export function viewGetTextFilterValues(opt) {
  const view = getView(opt.idView);
  return view._filter_text_values;
}
/**
 * Helper for text filter search box
 * @param {Array} Summary table
 * @returns {Array} an array of object with value and label
 */
function summaryToChoices(summary) {
  const table = path(summary, "attribute_stat.table", []);
  return table.map((r) => {
    return {
      value: r.value,
      label: `${r.value} (${r.count})`,
    };
  });
}

/**
 * Sets a numeric filter on a specific view.
 *
 * This function creates a numeric filter based on the provided options
 * and sets this filter to the specific view identified by its ID.
 *
 * @param {Object} opt - The options for the numeric filter.
 * @param {string} opt.idView - The ID of the view to which the filter is to be applied.
 * @param {number} opt.from - The 'from' numeric limit for the filter.
 * @param {number} opt.to - The 'to' numeric limit for the filter.
 * @param {string} opt.attribute - The attribute key to which the filter should be applied.
 *
 * @throws {Error} If the view cannot be found with the provided ID.
 *
 * @returns {array} filter
 */
export function viewSetNumericFilter(opt) {
  let { attribute } = opt;
  const { idView, from, to } = opt;
  const view = getView(idView);

  if (isEmpty(attribute)) {
    attribute = view?.data?.attribute?.name;
  }

  const filter = [
    "any",
    [
      "all",
      ["has", attribute],
      [
        "any",
        ["!=", ["typeof", ["get", attribute]], "number"],
        [
          "all",
          ["<=", ["get", attribute], to * 1],
          [">=", ["get", attribute], from * 1],
        ],
      ],
    ],
  ];

  if (isArray(view._null_filter)) {
    /**
     * Values should be filtered except for null values,
     * always visible when using the slider filter
     */
    filter.push(view._null_filter);
  }

  view._setFilter({
    filter: filter,
    type: "numeric",
  });

  view._filter_numeric_values = [from, to];
  return view._filter_numeric_values;
}

export function viewGetNumericFilter(opt) {
  const view = getView(opt.idView);
  return view._getNumericFilter();
}
export function viewGetNumericFilterValues(opt) {
  const view = getView(opt.idView);
  return view._filter_numeric_values;
}

/**
 * Create and set time filtering on a view
 *
 * This function creates a time filter based on the provided options
 * and sets this filter to the specific view identified by its ID.
 *
 * @param {Object} opt - The options for the time filter.
 * @param {boolean} opt.hasT0 - Flag indicating if the 'from' timestamp exists.
 * @param {boolean} opt.hasT1 - Flag indicating if the 'to' timestamp exists.
 * @param {number} opt.from - The 'from' timestamp for the filter in milliseconds.
 * @param {number} opt.to - The 'to' timestamp for the filter in milliseconds.
 * @param {string|number} opt.idView - The ID of the view to which the filter is to be applied.
 *
 * @throws {Error} If the view cannot be found with the provided ID.
 *
 * @returns {array} values
 */
export function viewSetTimeFilter(opt) {
  const { hasT0, hasT1, from, to, idView } = opt || {};
  const view = getView(idView);

  const filterAll = ["all"];

  const filter = [
    "any",
    ["==", ["typeof", ["get", "mx_t0"]], "string"],
    ["==", ["typeof", ["get", "mx_t1"]], "string"],
  ];

  if (hasT0 && hasT1) {
    filterAll.push(
      ...[
        ["<=", ["get", "mx_t0"], to / 1000],
        [">=", ["get", "mx_t1"], from / 1000],
      ],
    );
  } else if (hasT0) {
    filterAll.push(
      ...[
        [">=", ["get", "mx_t0"], from / 1000],
        ["<=", ["get", "mx_t0"], to / 1000],
      ],
    );
  }
  filter.push(filterAll);

  view._setFilter({
    filter: filter,
    type: "time",
  });

  view._filter_time_values = [from, to];
  return view._filter_time_values;
}
export function viewGetTimeFilter(opt) {
  const view = getView(opt.idView);
  return view._getTimeFilter();
}
export function viewGetTimeFilterValues(opt) {
  const view = getView(opt.idView);
  return view._filter_time_values;
}

/**
 * Create sliders
 */

/**

 * Add sliders and searchbox
 * @param {String|Object} id id or View to update
 */
export async function viewFilterToolsInit(id, opt) {
  opt = Object.assign({}, { clear: false }, opt);
  try {
    const view = getView(id);
    if (!isView(view)) {
      return;
    }
    const idMap = settings.map.id;
    if (view._filters_tools) {
      return;
    }
    view._filters_tools = {};

    /**
     * Add interactive modules
     */
    const proms = [];
    proms.push(makeSearchBox({ view: view, idMap: idMap }));
    proms.push(makeTransparencySlider({ view: view, idMap: idMap }));
    proms.push(makeNumericSlider({ view: view, idMap: idMap }));
    proms.push(makeTimeSlider({ view: view, idMap: idMap }));

    await Promise.all(proms);
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Create and listen to time sliders
 */
export async function makeTimeSlider(o) {
  const view = o.view;
  const elView = getViewEl(view);
  let el;
  if (elView) {
    el = elView.querySelector('[data-range_time_for="' + view.id + '"]');
    if (!el) {
      return;
    }
  }
  const oldSlider = view._filters_tools.timeSlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const summary = await getViewSourceSummary(view);
  const extent = path(summary, "extent_time", {});
  const attributes = path(summary, "attributes", []);

  /*
   * Create a time slider for each time enabled view
   */
  /* from slider to num */
  const fFrom = function (x) {
    return x;
  };
  /* num to slider */
  const fTo = function (x) {
    return Math.round(x);
  };

  if (isEmpty(extent.min) || isEmpty(extent.max)) {
    return;
  }

  const start = [];

  const hasT0 = attributes.indexOf("mx_t0") > -1;
  const hasT1 = attributes.indexOf("mx_t1") > -1;
  let min = extent.min * 1000;
  let max = extent.max * 1000;

  if (min === max) {
    min = min - 1;
    max = max + 1;
  }

  const range = {
    min: min,
    max: max,
  };

  start.push(min);
  start.push(max);

  const noUiSlider = await moduleLoad("nouislider");

  const slider = noUiSlider.create(el, {
    range: range,
    step: 24 * 60 * 60 * 1000,
    start: start,
    connect: true,
    behaviour: "drag",
    tooltips: false,
    format: {
      to: fTo,
      from: fFrom,
    },
  });

  /**
   * Save slider in the view and view ref in target
   */
  slider._view = view;
  slider._elDMin = el.parentElement.querySelector(".mx-slider-dyn-min");
  slider._elDMax = el.parentElement.querySelector(".mx-slider-dyn-max");
  slider._elMin = el.parentElement.querySelector(".mx-slider-range-min");
  slider._elMax = el.parentElement.querySelector(".mx-slider-range-max");

  slider._elMin.innerText = date(range.min);
  slider._elMax.innerText = date(range.max);

  view._filters_tools.timeSlider = slider;

  slider.on(
    "update",
    debounce((t) => {
      const view = slider._view;
      const elDMax = slider._elDMax;
      const elDMin = slider._elDMin;
      /* Update text values*/
      if (isNotEmpty(t[0])) {
        elDMin.innerHTML = date(t[0]);
      }
      if (isNotEmpty(t[1])) {
        elDMax.innerHTML = " – " + date(t[1]);
      }

      view._setTimeFilter({ from: t[0], to: t[1], hasT0, hasT1 });
    }, 100),
  );
}

/**
 * Create and listen to numeric sliders
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {String} o.idMap Map id
 */
export async function makeNumericSlider(o) {
  const view = o.view;

  const el = document.querySelector(
    "[data-range_numeric_for='" + view.id + "']",
  );

  if (!el) {
    return;
  }

  const oldSlider = view._filters_tools.numericSlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const summary = await getViewSourceSummary(view);

  let min = path(summary, "attribute_stat.min", 0);
  let max = path(summary, "attribute_stat.max", min);

  if (view && min !== null && max !== null) {
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }

    const range = {
      min: min,
      max: max,
    };
    const noUiSlider = await moduleLoad("nouislider");

    const slider = noUiSlider.create(el, {
      range: range,
      step: (min + max) / 1000,
      start: [min, max],
      connect: true,
      behaviour: "drag",
      tooltips: false,
    });

    slider._view = view;
    slider._elMin = el.parentElement.querySelector(".mx-slider-range-min");
    slider._elMax = el.parentElement.querySelector(".mx-slider-range-max");
    slider._elDMax = el.parentElement.querySelector(".mx-slider-dyn-max");
    slider._elDMin = el.parentElement.querySelector(".mx-slider-dyn-min");

    /**
     * update min / max range
     */
    slider._elMin.innerText = range.min;
    slider._elMax.innerText = range.max;

    /*
     * Save the slider in the view
     */
    view._filters_tools.numericSlider = slider;

    /*
     *
     */
    slider.on(
      "update",
      debounce((n) => {
        const view = slider._view;
        const elDMin = slider._elDMin;
        const elDMax = slider._elDMax;
        const attribute = path(view, "data.attribute.name", "");

        /* Update text values*/
        if (n[0]) {
          elDMin.innerHTML = n[0];
        }
        if (n[1]) {
          elDMax.innerHTML = " – " + n[1];
        }
        view._setNumericFilter({ from: n[0], to: n[1], attribute });
      }, 100),
    );
  }
}
/**
 * Create and listen to transparency sliders
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {String} o.idMap Map id
 */
export async function makeTransparencySlider(o) {
  const view = o.view;
  const el = document.querySelector(
    "[data-transparency_for='" + view.id + "']",
  );

  if (!el) {
    return;
  }

  const noUiSlider = await moduleLoad("nouislider");
  const oldSlider = view._filters_tools.transparencySlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const slider = noUiSlider.create(el, {
    range: { min: 0, max: 100 },
    step: 1,
    start: 0,
    tooltips: false,
  });

  slider._view = view;

  /*
   * Save the slider in the view
   */
  view._filters_tools.transparencySlider = slider;

  /*
   *
   */
  slider.on(
    "update",
    debounce((n, h) => {
      const view = slider._view;
      const opacity = 1 - n[h] * 0.01;
      view._setOpacity({ opacity: opacity });
    }, 10),
  );
}

export async function makeSearchBox(o) {
  const view = o.view;
  const el = document.querySelector(`[data-search_box_for='${view.id}']`);

  if (!el) {
    return;
  }

  const TomSelect = await moduleLoad("tom-select");
  const summary = await getViewSourceSummary(view);
  const attribute = path(view, "data.attribute.name");
  const choices = summaryToChoices(summary);

  const searchBox = new TomSelect(el, {
    dropdownParent: "body",
    placeholder: "Search",
    choices: choices,
    valueField: "value",
    labelField: "label",
    searchField: ["label"],
    options: choices,
    onChange: () => {
      view._setTextFilter({
        values: searchBox.getValue(),
        attribute: attribute,
      });
    },
  });

  /**
   * Keep references to tom select instance
   */
  searchBox.view = view;
  view._filters_tools.searchBox = searchBox;

  return searchBox;
}
