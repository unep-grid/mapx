import chroma from "chroma-js";
import { getApiUrl } from "../api_routes";
import { el } from "../el_mapx";
import { moduleLoad } from "../modules_loader_async";
import { isElement, isNotEmpty } from "../is_test";

export class DynamicJoin {
  constructor(map) {
    window._dj = this;
    this._map = map;
    this._options = {};
    this._rawTable = [];
    this._subsetTable = [];
    this._aggTable = [];
    this._colorScale = null;
    this._staticFilters = [];
    this._aggregateBy = [];
    this._dynamicFilters = [];
    this._filterControls = {};
    this._currentFilters = {};
    this._elLegendContainer = null;
    this._visibleLegendClasses = new Set();
    this._onRender = null;
    this._onMapClick = null;
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
  async init(opts) {
    this._options = {
      palette: "OrRd",
      stat: "quantile",
      classes: 5,
      color_na: "#ccc",
      aggregateFn: "none",
      staticFilters: [],
      aggregateBy: [],
      dynamicFilters: [],
      ...opts,
    };

    const {
      idSourceGeom,
      idSourceData,
      dataUrl,
      fieldJoinOn,
      aggregateField,
      aggregateBy,
      staticFilters,
      dynamicFilters,
      onRender,
      onMapClick,
      elSelectContainer,
      elLegendContainer,
    } = this._options;

    this._aggregateField = aggregateField;
    this._fieldJoinData = fieldJoinOn[1];
    this._fieldJoinGeom = fieldJoinOn[0];
    this._idSourceGeom = idSourceGeom;
    this._sourceLayer = idSourceGeom;
    this._idSourceData = idSourceData;
    this._staticFilters = staticFilters || [];
    this._aggregateBy = aggregateBy || [];
    this._dynamicFilters = dynamicFilters || [];
    this._onRender = onRender;
    this._onMapClick = onMapClick;
    this._elLegendContainer = elLegendContainer;

    // initialize current filters for all dynamic filter inputs
    for (const input of this._dynamicFilters) {
      this._currentFilters[input.name] = input.default || null;
    }

    this._idLayer = `${idSourceGeom}-dynamic-join`;
    this._idSource = `${idSourceGeom}-dynamic-join-src`;
    this._data_url = dataUrl;

    // load raw data
    await this._loadData();

    // build filter UI if inputs are configured
    if (isNotEmpty(this._dynamicFilters)) {
      if (isElement(elSelectContainer)) {
        await this._buildFilterUI(elSelectContainer);
      }
    }

    // prepare aggregated values
    this._prepareData();
    this._computeColorScale();

    // Build legend and add layer
    this._addLayer();
    this._applyStyle();
    this._buildLegendUI();

    // setup map click handler if callback provided
    if (this._onMapClick) {
      this._setupMapClickHandler();
    }

    // trigger onRender callback
    if (this._onRender) {
      this._onRender(this._aggTable, this._currentFilters, this._options);
    }
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
      const isActive = false; // Start inactive, selection set is empty

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
      const isNaActive = false; // Start inactive
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

  // --- End Legend UI Methods ---

  // remove existing filter UI and control instances
  _destroyFilterUI() {
    const elSelectContainer = this._options.elSelectContainer;
    if (!elSelectContainer) return;

    for (const control of Object.values(this._filterControls)) {
      if (control.destroy) {
        control.destroy(); // TomSelect and noUiSlider both have destroy method
      }
    }
    this._filterControls = {};
    this._currentFilters = {};
    elSelectContainer.innerHTML = "";
  }

  // helper to refresh styling and legend after filter change
  _refresh() {
    this._prepareData();
    this._computeColorScale();
    // Rebuild legend which also resets visibility state and applies style
    this._buildLegendUI();

    // trigger onRender callback
    if (this._onRender) {
      this._onRender(this._aggTable, this._currentFilters, this._options);
    }
  }

  // load your attribute table; include all necessary fields
  async _loadData() {
    let url;

    if (this._data_url) {
      url = this._data_url;
    } else {
      // request data including all necessary fields
      const attrs = [
        this._fieldJoinData,
        this._aggregateField,
        ...this._staticFilters.map((filter) => filter.field),
        ...this._aggregateBy,
        ...this._dynamicFilters.map((input) => input.name),
      ];
      // remove duplicates
      const uniqueAttrs = [...new Set(attrs)];
      url = new URL(getApiUrl("getSourceTableAttribute"));
      url.searchParams.set("id", this._idSourceData);
      url.searchParams.set("attributes", uniqueAttrs);
    }
    const resp = await fetch(url);
    const json = await resp.json();

    this._rawTable = Array.isArray(json.data) ? json.data : [];
  }

  _applyStaticFilters() {
    const operators = new Map([
      ["==", (a, b) => a == b],
      ["!=", (a, b) => a != b],
      [">", (a, b) => a > b],
      [">=", (a, b) => a >= b],
      ["<", (a, b) => a < b],
      ["<=", (a, b) => a <= b],
    ]);
    const filteredData = (this._rawTable || []).filter((row) =>
      this._staticFilters.every(({ field, operator, value }) => {
        const operatorFn = operators.get(operator);
        return operatorFn ? operatorFn(row[field], value) : true;
      }),
    );
    this._subsetTable.length = 0;
    this._subsetTable.push(...filteredData);
  }

  // build filter inputs based on dynamicFilters configuration
  async _buildFilterUI(elSelectContainer) {
    // clear any existing filter UI
    this._destroyFilterUI();

    const elWrapper = el("div", {
      style: {
        padding: "15px",
      },
    });
    elSelectContainer.appendChild(elWrapper);

    for (const inputConfig of this._dynamicFilters) {
      const { name, type, default: defaultValue } = inputConfig;

      if (type === "dropdown") {
        await this._buildDropdownInput(elWrapper, inputConfig);
      } else if (type === "range-slider") {
        await this._buildRangeSliderInput(elWrapper, inputConfig);
      }
    }
  }

  // build dropdown input using TomSelect
  async _buildDropdownInput(elWrapper, config) {
    const TomSelect = await moduleLoad("tom-select");
    const { name, default: defaultValue } = config;

    // compute distinct values and counts
    const counts = {};
    for (const row of this._rawTable) {
      const v = row[name];
      if (v != null) {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const options = Object.entries(counts)
      .map(([value, count]) => ({ value, text: `${value} (${count})` }))
      .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));

    // create input element
    const id = `dj_select_${name}`;
    const elInput = el("select", { id });
    const elLabel = el("label", { for: id }, name);
    elWrapper.appendChild(elLabel);
    elWrapper.appendChild(elInput);

    // initialize TomSelect on input
    const ts = new TomSelect(elInput, {
      options,
      create: false,
      allowEmptyOption: true,
      dropdownParent: "body",
      closeAfterSelect: true,
      placeholder: `Filter by ${name}`,
      onChange: (val) => {
        this._currentFilters[name] = val || null;
        this._refresh();
      },
    });

    // set default value if provided
    if (defaultValue) {
      ts.setValue(defaultValue);
    }

    this._filterControls[name] = ts;
  }

  // build range slider input using noUiSlider
  async _buildRangeSliderInput(elWrapper, config) {
    const noUiSlider = await moduleLoad("nouislider");
    const { name, default: defaultValue, min, max, step, mode } = config;

    // auto-detect min/max if not provided
    let actualMin = min;
    let actualMax = max;
    if (min === "auto" || max === "auto") {
      const values = this._rawTable
        .map((row) => row[name])
        .filter((v) => v != null && !isNaN(v))
        .map((v) => Number(v));

      if (min === "auto") actualMin = Math.min(...values);
      if (max === "auto") actualMax = Math.max(...values);
    }

    // create slider container
    const id = `dj_slider_${name}`;
    const elLabel = el("label", { for: id }, name);
    const elSlider = el("div", {
      id,
      style: {
        margin: "10px 0",
        height: "10px",
      },
    });
    const elValues = el("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px",
        color: "#666",
        marginTop: "5px",
      },
    });

    elWrapper.classList.add("mx-slider-container");
    elWrapper.appendChild(elLabel);
    elWrapper.appendChild(elSlider);
    elWrapper.appendChild(elValues);

    // create slider
    const slider = noUiSlider.create(elSlider, {
      range: { min: actualMin, max: actualMax },
      step: step || 1,
      start: defaultValue || [actualMin, actualMax],
      connect: true,
      behaviour: "drag",
      tooltips: false,
      format:
        mode === "integer"
          ? {
              to: (value) => Math.round(value),
              from: (value) => Math.round(value),
            }
          : undefined,
    });

    // update display values
    const updateValues = (values) => {
      const [min, max] = values.map((v) =>
        mode === "integer" ? Math.round(v) : parseFloat(v).toFixed(2),
      );
      elValues.innerHTML = `<span>${min}</span><span>${max}</span>`;
    };

    // set up event handlers
    slider.on("update", (values) => {
      updateValues(values);
      const range = values.map((v) =>
        mode === "integer" ? Math.round(parseFloat(v)) : parseFloat(v),
      );
      this._currentFilters[name] = range;
      this._refresh();
    });

    // initial display
    updateValues(slider.get());

    this._filterControls[name] = slider;
  }

  // prepare data for styling: apply staticFilters, then group by aggregateBy and aggregate
  _prepareData() {
    // Step 1: Apply staticFilters (static filtering)
    let filteredData = [...this._subsetTable];

    // Step 2: Apply dynamic filter inputs
    filteredData = filteredData.filter((row) => {
      for (const inputConfig of this._dynamicFilters) {
        const { name, type } = inputConfig;
        const filterValue = this._currentFilters[name];

        if (filterValue == null) continue; // no filter applied

        if (type === "dropdown") {
          if (row[name] !== filterValue) {
            return false;
          }
        } else if (type === "range-slider") {
          const [min, max] = filterValue;
          const value = Number(row[name]);
          if (value < min || value > max) {
            return false;
          }
        }
      }
      return true;
    });

    // Step 3: Group by aggregateBy fields and join key
    const groups = {};

    for (const row of filteredData) {
      // Create composite key from aggregateBy fields + join field
      const groupKey =
        this._aggregateBy.length > 0
          ? this._aggregateBy.map((field) => row[field]).join("|")
          : "default";

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

    // Step 4: Apply aggregation with enhanced 'none' handling
    const agg = (vals) => {
      const { aggregateFn } = this._options;

      switch (aggregateFn) {
        case "none":
          if (vals.length === 1) {
            return vals[0]; // Perfect - single value
          } else if (vals.length > 1) {
            console.warn(
              `DynamicJoin: Expected single value but got ${vals.length} values. Using first value. Consider refining your filters.`,
            );
            return vals[0];
          } else {
            return null; // No values
          }

        case "first":
          return vals.length > 0 ? vals[0] : null;

        case "last":
          return vals.length > 0 ? vals[vals.length - 1] : null;

        case "sum":
          return vals.reduce((a, b) => a + b, 0);

        case "max":
          return Math.max(...vals);

        case "min":
          return Math.min(...vals);

        case "median":
          const sortedVals = vals.toSorted((a, b) => a - b);
          const mid = Math.floor(sortedVals.length / 2);
          return sortedVals.length % 2 === 0
            ? (sortedVals[mid - 1] + sortedVals[mid]) / 2
            : sortedVals[mid];

        case "mode":
          const counts = vals.reduce((c, v) => {
            c[v] = (c[v] || 0) + 1;
            return c;
          }, {});
          const modeValue = Object.entries(counts).reduce(
            (a, [v, c]) => (c > a[1] ? [v, c] : a),
            [null, 0],
          )[0];
          // Convert back to number if it's a numeric string
          return isNaN(modeValue) ? modeValue : Number(modeValue);

        default:
          console.warn(
            `DynamicJoin: Unknown aggregation function '${aggregateFn}'. Using 'none'.`,
          );
          return vals.length > 0 ? vals[0] : null;
      }
    };

    // Step 5: Create final aggregated table - consolidate by join key to ensure uniqueness
    const finalGroups = {};

    Object.values(groups).forEach((group) => {
      const joinKey = group.joinKey;
      if (!finalGroups[joinKey]) {
        finalGroups[joinKey] = [];
      }
      finalGroups[joinKey].push(...group.values);
    });

    this._aggTable = Object.entries(finalGroups).map(([joinKey, values]) => ({
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
    this._map.on("click", this._idLayer, this._onMapClick);
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
      this._applyStaticFilters()

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
