import chroma from "chroma-js";
import { el } from "../el_mapx";
import { isElement, isNotEmpty } from "../is_test";
import { clone } from "../mx_helper_misc";
import { buildRangeSlider } from "./build_slider";
import { buildLegendInput } from "./build_legend";
import { isUrl } from "../is_test";
import { isArray } from "../is_test";
import {bindAll} from "../bind_class_methods";

const default_options = {
  elSelectContainer: null,
  elLegendContainer: null,
  idSourceGeom: null,
  idSourceData: null,
  sourceLayer: null,
  dataUrl: null,
  tilesUrl: null,

  palette: "OrRd",
  stat: "quantile",
  classes: 5,
  color_na: "#ccc",
  aggregateFn: "max",
  aggregateBy: [],
  aggregateField: null,

  staticFilters: [],
  dynamicFilters: [],
  fieldJoinOn: [],
  onRender: console.log,
  onMapClick: console.log,
};

const default_state = {
  _options: {},
  _rawTable: [],
  _subsetTable: [],
  _aggTable: [],
  _colorScale: null,
  _filterControls: {},
  _currentFilters: {},
  _visibleLegendClasses: new Set(),
  _idLayer: null,
  _idSource: null,
};

export class DynamicJoin {
  constructor(map) {
    window._dj = this;
    bindAll(this);
    this._map = map;
    this.resetState();
    this.resetOptions();
  }

  /**
   * Initialize and render your data-driven layer.
   *
   * @param {Object} opts
   * @param {string|Array} opts.palette         – chroma scale name or array of colors
   * @param {string} opts.idSourceGeom         – your vector source id
   * @param {string} opts.sourceLayer          – the 'source-layer' within that vector source
   * @param {string} opts.idSourceData         – your attribute table id
   * @param {string} opts.dataUrl              – direct download link
   * @param {Array} opts.tilesUrl              – tile urls
   * @param {Array}  opts.fieldJoinOn          – [ dataField, featureProperty ]
   * @param {string} [opts.stat='quantile']    – 'quantile', 'equal', 'kmeans', etc.
   * @param {number} [opts.classes=5]          – number of classes/breaks
   * @param {string} [opts.color_na='#ccc']    – fallback color for missing joins
   * @param {Array<string>} [opts.staticFilters]  – array of field names for static filtering
   * @param {Array<string>} [opts.aggregateBy] – array of field names for grouping + aggregation
   * @param {string} [opts.aggregateField]     – value field to aggregate
   * @param {string} [opts.aggregateFn='none'] – 'none', 'first', 'last', 'sum', 'median', 'max', 'min', or 'mode'
   * @param {Array} [opts.dynamicFilters]      – array of input configurations
   * @param {Function} [opts.onRender]         – callback after data processing
   * @param {Function} [opts.onMapClick]       – callback on map feature click
   * @param {HTMLElement} [opts.elSelectContainer]     – DOM element to append filter UI
   * @param {HTMLElement} [opts.elLegendContainer]     – DOM element to append the legend
   */
  async init(opts = {}) {
    this.setOptions(opts);

    for (const item of this.options.dynamicFilters) {
      this._currentFilters[item.name] = item.default || null;
    }

    const { idSourceGeom } = this.options;

    this._idLayer = `${idSourceGeom}-dynamic-join`;
    this._idSource = `${idSourceGeom}-dynamic-join-src`;
    this._addLayer();

    await this._loadData();
    await this._buildFilterUI();
    await this._refresh();
    this._setupMapClickHandler();

  }

  async _refresh() {
    await this._aggregateData();
    this._computeColorScale();
    this._buildLegendUI();
    this._applyStyle();
    if (this.options.onRender) {
      this.options.onRender(this._aggTable, this._currentFilters, this.options);
    }
  }

  resetState() {
    for (const key of Object.keys(default_state)) {
      this[key] = clone(default_state[key]);
    }
  }
  resetOptions() {
    this._options = clone(default_options);
  }

  setOptions(opts = {}) {
    const keys = Object.keys(default_options);
    for (const key of keys) {
      if (isNotEmpty(opts[key]) || isElement(opts[key])) {
        this._options[key] = opts[key];
      }
    }
  }
  get options() {
    return this._options;
  }

  // --- Legend UI Methods ---

  _destroyLegendUI() {
    if (this._filterControls.legend && this._filterControls.legend.destroy) {
      this._filterControls.legend.destroy();
      delete this._filterControls.legend;
    }
    // Clear the set of visible classes when destroying
    this._visibleLegendClasses.clear();
  }

  async _buildLegendUI() {
    // Check prerequisites within the method as it doesn't take arguments
    if (!isElement(this.options.elLegendContainer) || !this._colorScale) {
      console.warn("Cannot build legend: Missing container or color scale.");
      this._destroyLegendUI(); // Ensure cleanup even if prerequisites fail later
      return;
    }

    this._destroyLegendUI(); // Clear previous legend and visibility state

    await buildLegendInput({
      elWrapper: this.options.elLegendContainer,
      config: {
        colorScale: this._colorScale,
        color_na: this.options.color_na,
      },
      data: this._aggTable,
      onBuilt: (legend) => {
        this._filterControls.legend = legend;
      },
      onUpdate: (classIndex, isVisible, allVisibleClasses) => {
        this._visibleLegendClasses = allVisibleClasses;
        this._applyStyle();
      },
    });
  }

  _destroyFilterUI() {
    const { elSelectContainer } = this.options;

    for (const control of Object.values(this._filterControls)) {
      if (control.destroy) {
        control.destroy(); // TomSelect and noUiSlider both have destroy method
      }
    }
    this._filterControls = {};
    this._currentFilters = {};
    elSelectContainer.innerHTML = "";
  }

  // load your attribute table; include all necessary fields
  async _loadData() {
    const { dataUrl } = this.options;
    if (!isUrl(dataUrl)) {
      throw new Error("Missing valid URL");
    }
    const resp = await fetch(dataUrl);
    const json = await resp.json();
    this._rawTable = isArray(json.data) ? json.data : [];
    this._applyStaticFilters();
  }

  _applyStaticFilters() {
    const filteredData = (this._rawTable || []).filter((row) =>
      this.options.staticFilters.every(({ field, operator, value }) => {
        const operatorFn = operators.get(operator);
        return operatorFn ? operatorFn(row[field], value) : true;
      }),
    );
    this._subsetTable.length = 0;
    this._subsetTable.push(...filteredData);
  }

  async _buildFilterUI() {
    const { elSelectContainer } = this.options;

    if (!elSelectContainer) {
      console.warn("missing filter container");
      return;
    }

    this._destroyFilterUI();

    const elWrapper = el("div", {
      style: {
        padding: "15px",
      },
    });
    elSelectContainer.appendChild(elWrapper);

    for (const config of this.options.dynamicFilters) {
      const { type } = config;
      switch (type) {
        case "dropdown":
          await this._buildDropdownInput(elWrapper, config);
          break;
        case "range-slider":
          await this._buildRangeSliderInput(elWrapper, config);
          break;
        default:
          console.warn(`Unsupported filter type: ${type}`);
          break;
      }
    }
  }

  // build dropdown input using TomSelect
  async _buildDropdownInput(elWrapper, config) {
    const { buildTomSelectInput } = await import("./build_tom_select");
    await buildTomSelectInput({
      elWrapper,
      data: this._aggTable,
      config: config,
      onBuilt: (ts, name) => {
        this._filterControls[name] = ts;
      },
      onUpdate: (value, name) => {
        this._currentFilters[name] = value;
        this._refresh();
      },
    });
  }

  // build range slider input using noUiSlider
  async _buildRangeSliderInput(elWrapper, config) {
    await buildRangeSlider({
      elWrapper,
      data: this._aggTable,
      config: config,
      onBuilt: (slider, name) => {
        this._filterControls[name] = slider;
      },
      onUpdate: (range, name) => {
        this._currentFilters[name] = range;
        this._refresh();
      },
    });
  }

  _filterRow(row) {
    return this.options.dynamicFilters.every(({ name, type }) => {
      const filterValue = this._currentFilters[name];
      const value = row[name];

      if (filterValue == null) {
        return true;
      }

      switch (type) {
        case "dropdown":
          return value === filterValue;
        case "range-slider":
          const [min, max] = filterValue;
          const numericValue = Number(value);
          return numericValue >= min && numericValue <= max;
        default:
          return true;
      }
    });
  }

  async _aggregateData() {
    const agg = aggregators[this.options.aggregateFn] || aggregators.none;
    const filteredData = this._subsetTable.filter(this._filterRow);
    const groups = {};
    const finalGroups = {};

    for (const row of filteredData) {
      const groupKey =
        this.options.aggregateBy.map((field) => row[field] ?? "").join("|") ||
        "default";

      const joinKey = row[this.options.fieldJoinOn[0]];
      const compositeKey = `${joinKey}::${groupKey}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          joinKey,
          groupKey,
          values: [],
        };
      }
      groups[compositeKey].values.push(row[this.options.aggregateField]);
    }

    for (const group of Object.values(groups)) {
      const joinKey = group.joinKey;
      if (!finalGroups[joinKey]) {
        finalGroups[joinKey] = [];
      }
      finalGroups[joinKey].push(...group.values);
    }

    const groupsEntries = Object.entries(finalGroups);

    this._aggTable = groupsEntries.map(([joinKey, values]) => ({
      key: joinKey,
      value: agg(values),
    }));
  }

  // use chroma.limits + .scale().classes() to get a color function
  _computeColorScale() {
    const values = this._aggTable.map((r) => r.value);
    const limits = chroma.limits(
      values,
      this.options.stat,
      this.options.classes,
    );
    this._colorScale = chroma.scale(this.options.palette).classes(limits);
  }

  _addLayer() {
    const hasSource = this._map.getSource(this._idSource);
    const hasLayer = this._map.getLayer(this._idLayer);

    if (!hasSource) {
      this._map.addSource(this._idSource, {
        type: "vector",
        tiles: this.options.tilesUrl,
      });
    }

    if (!hasLayer) {
      this._map.addLayer({
        id: this._idLayer,
        type: "fill",
        source: this._idSource,
        "source-layer": this.options.sourceLayer,
        paint: {
          "fill-color": this.options.color_na,
          "fill-opacity": 0.6,
          "fill-outline-color": "#333",
        },
      });
    }
  }

  // apply the dynamic style, considering the toggled legend classes
  _applyStyle() {
    if (!this._map.getLayer(this._idLayer)) {
      console.warn(
        "Attempted to apply style to non-existent layer:",
        this._idLayer,
      );
      return;
    }
    if (!this._colorScale) {
      console.warn("Cannot apply style: Missing color scale.");
      // Set a default fallback color if scale is missing
      this._map.setPaintProperty(
        this._idLayer,
        "fill-color",
        this.options.color_na || "#ccc",
      );
      this._map.setPaintProperty(this._idLayer, "fill-opacity", 0.6);
      return;
    }

    const transparentColor = "rgba(0, 0, 0, 0)";
    const classes = this._colorScale.classes();
    const fillColorExpr = ["match", ["get", this.options.fieldJoinOn[1]]];
    const showAll = this._visibleLegendClasses.size === 0; // Check if selection set is empty

    // Helper to find class index for a value
    const getClassIndex = (value) => {
      if (value === null || value === undefined) return "na"; // Handle null/undefined as NA case
      for (let i = 0; i < classes.length; i++) {
        const lowerBound = i === 0 ? -Infinity : classes[i - 1];
        // Upper bound is inclusive in chroma's classes definition
        if (value > lowerBound && value <= classes[i]) {
          return i;
        }
      }
      // If value is above the last upper bound, it might belong to the last class conceptually
      // or it might be an outlier. Check if it maps to a color.
      // If scale doesn't provide a color, treat as NA.
      // Use optional chaining on _colorScale just in case it's null/undefined despite earlier check
      return this._colorScale?.(value) ? classes.length - 1 : "na";
    };

    this._aggTable.forEach((row) => {
      const value = row.value;
      const classIdentifier = getClassIndex(value); // Get index (0, 1, ...) or 'na'
      const isSelected = this._visibleLegendClasses.has(classIdentifier);

      let color;
      if (showAll || isSelected) {
        // If showing all OR this class is selected, get original color
        color =
          classIdentifier === "na"
            ? this.options.color_na
            : this._colorScale(value)?.hex();
        // Handle case where color scale might return undefined/null even for valid class
        if (!color) color = this.options.color_na; // Fallback to NA color if scale fails
      } else {
        // If not showing all AND this class is not selected, make transparent
        color = transparentColor;
      }

      fillColorExpr.push(row.key, color);
    });

    // Final fallback for features not in the aggTable
    // Make them transparent as their class visibility cannot be determined
    fillColorExpr.push(transparentColor);

    if (fillColorExpr.length < 4) {
      this._map.setPaintProperty(this._idLayer, "fill-color", transparentColor);
    } else {
      this._map.setPaintProperty(this._idLayer, "fill-color", fillColorExpr);
    }

    // Apply the calculated fill color expression
    // Set a consistent opacity for the layer
    this._map.setPaintProperty(this._idLayer, "fill-opacity", 0.7); // Consistent opacity
  }

  _setupMapClickHandler() {
    if (this.options.onMapClick) {
      this._map.on("click", this._idLayer, this.options.onMapClick);
    }
  }

  destroy() {
    this._destroyFilterUI(); // Destroy filters
    this._destroyLegendUI(); // Destroy legend

    // remove map click handler
    if (this.options.onMapClick) {
      this._map.off("click", this._idLayer, this.options.onMapClick);
    }

    return this._removeLayer(); // Remove map layer/source
  }

  _removeLayer() {
    const hasSource = this._map.getSource(this._idSource);
    const hasLayer = this._map.getLayer(this._idLayer);

    if (hasLayer) {
      this._map.removeLayer(this._idLayer);
    }
    if (hasSource) {
      this._map.removeSource(this._idSource);
    }
  }
}

const aggregators = {
  none: (vals) => {
    if (vals.length === 1) return vals[0];
    if (vals.length > 1) {
      console.warn(`Expected single value, got ${vals.length}. Using first.`);
      return vals[0];
    }
    return null;
  },
  first: (vals) => vals[0] ?? null,
  last: (vals) => vals.at(-1) ?? null,
  sum: (vals) => vals.reduce((a, b) => a + b, 0),
  max: (vals) => Math.max(...vals),
  min: (vals) => Math.min(...vals),
  median: (vals) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  mode: (vals) => {
    const counts = vals.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).reduce(
      (a, [v, c]) => (c > a[1] ? [v, c] : a),
      [null, 0],
    )[0];
  },
};

const operators = new Map([
  ["==", (a, b) => a == b],
  ["!=", (a, b) => a != b],
  [">", (a, b) => a > b],
  [">=", (a, b) => a >= b],
  ["<", (a, b) => a < b],
  ["<=", (a, b) => a <= b],
]);
