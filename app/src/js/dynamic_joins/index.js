import chroma from "chroma-js";
import { getApiUrl } from "../api_routes";
import { el } from "../el_mapx";
import { moduleLoad } from "../modules_loader_async";
import { isElement, isNotEmpty } from "../is_test";
import { clone } from "../mx_helper_misc";
import { buildRangeSlider } from "./build_slider";
import { isUrl } from "../is_test";
import {isArray} from "../is_test";

const default_state = {
  _options: { ...default_options },
  _rawTable: [],
  _subsetTable: [],
  _aggTable: [],
  _colorScale: null,
  _staticFilters: [],
  _aggregateBy: [],
  _dynamicFilters: [],
  _filterControls: {},
  _currentFilters: {},
  _elLegendContainer: null,
  _visibleLegendClasses: new Set(),
  _onRender: null,
  _onMapClick: null,
  _idLayer: null,
  _idSource: null,
  _data_url: null,
};

const default_options = {
  elSelectContainer: null,
  elLegendContainer: null,
  idSourceGeom: null,
  idSourceData: null,
  dataUrl: null,

  palette: "OrRd",
  stat: "quantile",
  color_na: "#ccc",
  aggregateFn: "max",

  staticFilters: [],
  dynamicFilters: [],
  fieldJoinOn: [],
  onRender: console.log,
  onMapClick: console.log,
};

export class DynamicJoin {
  constructor(map) {
    window._dj = this;
    this._map = map;
    this.resetStateAndOptions();
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

    for (const item of this._dynamicFilters) {
      this._currentFilters[item.name] = item.default || null;
    }

    const { idSourceGeom } = this.options;

    this._idLayer = `${idSourceGeom}-dynamic-join`;
    this._idSource = `${idSourceGeom}-dynamic-join-src`;
    this._addLayer();

    await this._loadData();
    await this._buildFilterUI();

    this._setupMapClickHandler();
  }

  async _refresh() {
    await this._aggregateData();
    this._computeColorScale();
    this._buildLegendUI();
    this._applyStyle();
    if (this._onRender) {
      this._onRender(this._aggTable, this._currentFilters, this._options);
    }
  }

  resetStateAndOptions() {
    for (const key of Object.keys(default_state)) {
      this[key] = clone(default_state[key]);
    }
  }

  setOptions(opts = {}) {
    this.resetStateAndOptions();
    for (const key of Object.keys(default_options)) {
      if (isNotEmpty(opts[key])) {
        this._options[key] = opts[key];
      }
    }
  }
  get options() {
    return this._options;
  }

  // --- Legend UI Methods ---

  _destroyLegendUI() {
    if (isElement(this._elLegendContainer)) {
      this._elLegendContainer.innerHTML = "";
    }
    // Clear the set of visible classes when destroying
    this._visibleLegendClasses.clear();
  }

  _buildLegendUI() {
    // Check prerequisites within the method as it doesn't take arguments
    if (!isElement(this._elLegendContainer) || !this._colorScale) {
      console.warn("Cannot build legend: Missing container or color scale.");
      this._destroyLegendUI(); // Ensure cleanup even if prerequisites fail later
      return;
    }

    this._destroyLegendUI(); // Clear previous legend and visibility state

    const classes = this._colorScale.classes();
    const colors = this._colorScale.colors(classes.length);

    // Helper to format numbers nicely
    const formatNumber = (num) => {
      if (num === undefined || num === null) return "N/A";
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
    };

    // --- Visibility Set starts empty (cleared in _destroyLegendUI) ---
    const hasNaClass =
      this._options.color_na &&
      this._aggTable.some((row) => !this._colorScale(row.value));

    // Add items for each class break
    classes.forEach((limit, i) => {
      // Determine bounds
      const lowerBound = i === 0 ? -Infinity : classes[i - 1];
      const upperBound = limit;
      const color = colors[i];

      const labelText = `${formatNumber(lowerBound)} - ${formatNumber(
        upperBound,
      )}`;

      const elItem = el(
        "div",
        {
          class: `legend-item legend-class-${i}`, // No active class initially
          style: {
            cursor: "pointer",
            marginBottom: "5px",
            display: "flex",
            alignItems: "center",
            opacity: "0.7", // Start slightly dimmed / inactive style
          },
          "data-legend-class-index": i, // Store index for toggling
        },
        [
          el("span", {
            style: {
              display: "inline-block",
              width: "15px",
              height: "15px",
              backgroundColor: color,
              marginRight: "5px",
              border: "1px solid #555",
            },
          }),
          el("span", {}, labelText),
        ],
      );

      elItem.addEventListener("click", () =>
        this._toggleLegendClassSelection(i, elItem),
      );
      this._elLegendContainer.appendChild(elItem);
    });

    // Add NA item if applicable
    if (hasNaClass) {
      const naIdentifier = "na";
      const elNaItem = el(
        "div",
        {
          class: `legend-item legend-na`, // No active class initially
          style: {
            cursor: "pointer", // Make NA clickable
            marginBottom: "5px",
            display: "flex",
            alignItems: "center",
            opacity: "0.7", // Start slightly dimmed / inactive style
          },
          "data-legend-class-index": naIdentifier, // Store 'na' identifier
        },
        [
          el("span", {
            style: {
              display: "inline-block",
              width: "15px",
              height: "15px",
              backgroundColor: this._options.color_na,
              marginRight: "5px",
              border: "1px solid #555",
            },
          }),
          el("span", {}, "N/A"),
        ],
      );
      elNaItem.addEventListener("click", () =>
        this._toggleLegendClassSelection(naIdentifier, elNaItem),
      );
      this._elLegendContainer.appendChild(elNaItem);
    }
    // Initial style application reflects the default state (all visible as Set is empty)
    this._applyStyle();
  }

  _toggleLegendClassSelection(classIdentifier, element) {
    const wasVisible = this._visibleLegendClasses.has(classIdentifier);

    if (wasVisible) {
      this._visibleLegendClasses.delete(classIdentifier);
      element.classList.remove("legend-item-active");
      element.style.opacity = "0.7"; // Inactive style
    } else {
      this._visibleLegendClasses.add(classIdentifier);
      element.classList.add("legend-item-active");
      element.style.opacity = "1"; // Active style
    }

    console.log(
      `Toggled selection for class ${classIdentifier}. Selected classes:`,
      this._visibleLegendClasses,
    );
    this._applyStyle(); // Re-apply map style with the updated visibility set
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
      this._staticFilters.every(({ field, operator, value }) => {
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

    for (const config of this._dynamicFilters) {
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
    await buildTomSelect({
      data: this._aggTable,
      container: elWrapper,
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
      data: this._aggTable,
      container: elWrapper,
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
    return this._dynamicFilters.every(({ name, type }) => {
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
    const agg = aggregators[this._options.aggregateFn] || aggregators.none;
    const filteredData = this._subsetTable.filter(this._filterRow);
    const groups = {};
    const finalGroups = {};

    for (const row of filteredData) {
      const groupKey =
        this._aggregateBy.map((field) => row[field] ?? "").join("|") ||
        "default";

      const joinKey = row[this._fieldJoinData];
      const compositeKey = `${joinKey}::${groupKey}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          joinKey,
          groupKey,
          values: [],
        };
      }
      groups[compositeKey].values.push(row[this._aggregateField]);
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
      this._options.stat,
      this._options.classes,
    );
    this._colorScale = chroma.scale(this._options.palette).classes(limits);
  }

  _addLayer() {
    const hasSource = this._map.getSource(this._idSource);
    const hasLayer = this._map.getLayer(this._idLayer);

    if (!hasSource) {
      const urls = this._sourceUrlTiles(this._idSourceGeom);
      this._map.addSource(this._idSource, {
        type: "vector",
        tiles: urls,
      });
    }

    if (!hasLayer) {
      this._map.addLayer({
        id: this._idLayer,
        type: "fill",
        source: this._idSource,
        "source-layer": this._sourceLayer,
        paint: {
          "fill-color": this._options.color_na,
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
        this._options.color_na || "#ccc",
      );
      this._map.setPaintProperty(this._idLayer, "fill-opacity", 0.6);
      return;
    }

    const transparentColor = "rgba(0, 0, 0, 0)";
    const classes = this._colorScale.classes();
    const fillColorExpr = ["match", ["get", this._fieldJoinGeom]];
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
            ? this._options.color_na
            : this._colorScale(value)?.hex();
        // Handle case where color scale might return undefined/null even for valid class
        if (!color) color = this._options.color_na; // Fallback to NA color if scale fails
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
    if (this._onMapClick) {
      this._map.on("click", this._idLayer, this._onMapClick);
    }
  }

  _sourceUrlTiles(idSource) {
    const urlBase = getApiUrl("getTile");
    // URL API escapes {x}/{y}/{z}, use concat
    const url = [
      `${urlBase}?idSource=${idSource}`,
      `attributes=${"gid"},${this._fieldJoinGeom}`,
      `timestamp=${Date.now()}`,
    ].join("&");
    return [url, url];
  }

  destroy() {
    this._destroyFilterUI(); // Destroy filters
    this._destroyLegendUI(); // Destroy legend

    // remove map click handler
    if (this._onMapClick) {
      this._map.off("click", this._idLayer, this._onMapClick);
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

  /**
   * Update styling, optionally re-fetching data if the source changes.
   * @param {Object} newOpts – any of the same keys you passed into init()
   */
  async update(newOpts = {}) {
    // merge provided opts
    this._options = { ...this._options, ...newOpts };
    // normalize filter fields
    const { staticFilters, elSelectContainer } = this._options;
    this._staticFilters = staticFilters;
    // reset new filters
    for (const field of this._staticFilters) {
      if (!(field in this._currentFilters)) {
        this._currentFilters[field] = null;
      }
    }
    // if data source changed, reload data and rebuild filter UI
    if (newOpts.idSourceData || newOpts.dataUrl) {
      this._idSourceData = this._options.idSourceData;
      this._data_url = this._options.dataUrl;
      await this._loadData();

      if (this._dynamicFilters.length > 0 && elSelectContainer) {
        this._destroyFilterUI();
        await this._buildFilterUI(elSelectContainer);
      }
    }
    // if filter fields changed, rebuild filter UI
    else if (newOpts.dynamicFilters) {
      if (this._dynamicFilters.length > 0 && elSelectContainer) {
        this._destroyFilterUI();
        await this._buildFilterUI(elSelectContainer);
      }
    }
    // Rebuild legend if relevant options changed or container changed
    if (
      newOpts.palette ||
      newOpts.stat ||
      newOpts.classes ||
      newOpts.elLegendContainer
    ) {
      this._elLegendContainer = this._options.elLegendContainer; // Update container ref
      if (isElement(this._elLegendContainer)) {
        // Data needs to be prepped and scale computed before building legend
        this._prepareData();
        this._computeColorScale();
        this._buildLegendUI();
      } else {
        this._destroyLegendUI(); // Remove legend if container is gone
      }
    }

    // reapply data styling and potentially rebuild legend if filters changed
    this._refresh();
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
