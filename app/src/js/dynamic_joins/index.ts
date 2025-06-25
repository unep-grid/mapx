import chroma from "chroma-js";
import type {
  StaticFilter,
  DynamicFilter,
  PaintConfig,
  DynamicJoinOptions,
  DynamicJoinState,
  AggregatedTableEntry,
  FilterControl,
  CompiledFilter,
  AggregatorFunction,
  MapInstance,
} from "./types";
import { el } from "../el_mapx";
import { isElement, isNotEmpty, isEmpty, isUrl, isArray } from "../is_test";
import { clone, debounce, makeId } from "../mx_helper_misc.js";
import { buildSlider } from "./build_slider.ts";
import { buildLegendInput } from "./build_legend.ts";
import { bindAll } from "../bind_class_methods";
import { settings } from "../settings";
import { generate_series } from "./generate_series.ts";
import { waitTimeoutAsync } from "../animation_frame";
import { buildTomSelectInput } from "./build_tom_select.ts";

const default_options: DynamicJoinOptions = {
  elSelectContainer: null,
  elLegendContainer: null,
  idSourceGeom: null,
  idSourceData: null,
  sourceLayer: null,
  dataUrl: null,
  data: [],
  tilesUrl: null,

  palette: "OrRd",
  stat: "q",
  classes: 5,
  color_na: "#ccc",
  aggregateFn: "max",
  layer_prefix: "MX-DJ",
  field: null,
  fieldJoinData: null,
  fieldJoinGeom: null,
  type: "fill",
  paint: {
    circle: {},
    fill: {
      "fill-color": "#000",
      "fill-opacity": 0.6,
      "fill-outline-color": "#333",
    },
    line: {},
  },
  staticFilters: [],
  dynamicFilters: [],

  onTableAggregated: () => {},
  onTableReady: () => {},
  onTableFiltered: () => {},
  onMapClick: () => {},
};

const default_state: DynamicJoinState = {
  _options: {} as DynamicJoinOptions,
  _table_raw: [],
  _table_filtered: [],
  _table_base: [],
  _aggregated_lookup: new Map(),
  _color_scale: null,
  _filters_controls: {},
  _current_filters: {},
  _visible_legend_classes: new Set(),
  _id_layer: null,
  _id_source: null,
};

export class DynamicJoin {
  private _map: MapInstance;
  private _options: DynamicJoinOptions;
  private _table_raw: any[];
  private _table_filtered: any[];
  private _table_base: any[];
  private _aggregated_lookup: Map<string, any>;
  private _color_scale: chroma.Scale | null;
  private _filters_controls: Record<string, FilterControl>;
  private _current_filters: Record<string, any>;
  private _visible_legend_classes: Set<number | string>;
  private _id_layer: string | null;
  private _id_source: string | null;
  private _id_source_layer: string | null;

  constructor(map: MapInstance) {
    (window as any)._dj = this;
    this._map = map;
    this.resetState();
    bindAll(this);
    this.resetOptions();
    this.refresh = debounce(this.refresh, 200, false);
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
   * @param {string}  opts.fieldJoinGeom       – join field for the geom matching the data
   * @param {string}  opts.fieldJoinData       – join field matching geom id

   * @param {string} [opts.stat='quantile']    – 'quantile', 'equal', 'kmeans', etc.
   * @param {number} [opts.classes=5]          – number of classes/breaks
   * @param {string} [opts.color_na='#ccc']    – fallback color for missing joins
   * @param {Array<string>} [opts.staticFilters]  – array of field names for static filtering
   * @param {string} [opts.field]     – value field -> aggregate
   * @param {string} [opts.aggregateFn='none'] – 'none', 'first', 'last', 'sum', 'median', 'max', 'min', or 'mode'
   * @param {Array} [opts.dynamicFilters]      – array of input configurations
   * @param {Function} [opts.onTableAggregated]         – callback after data aggregated
   * @param {Function} [opts.onTableReady]         – callback after data is filtered with static filters
   * @param {Function} [opts.onTableFiltered]         – callback after data is filtered with dynamic filters
   * @param {Function} [opts.onMapClick]       – callback on map feature click
   * @param {HTMLElement} [opts.elSelectContainer]     – DOM element to append filter UI
   * @param {HTMLElement} [opts.elLegendContainer]     – DOM element to append the legend
   */
  async init(opts: Partial<DynamicJoinOptions> = {}): Promise<void> {
    this.setOptions(opts);

    // Validate required options
    const { idSourceGeom, dataUrl, data, fieldJoinData, fieldJoinGeom } =
      this.options;
    if (!idSourceGeom) {
      throw new Error("Missing required option: idSourceGeom");
    }
    if (!isUrl(dataUrl) && isEmpty(data)) {
      throw new Error("Missing required option: dataUrl or data");
    }
    if (isEmpty(fieldJoinData) || isEmpty(fieldJoinGeom)) {
      throw new Error(
        "Both join id should be set: fieldJoinData, fieldJoinGeom",
      );
    }

    for (const item of this.options.dynamicFilters) {
      this._current_filters[item.name] = item.default || null;
    }

    const id = crypto.randomUUID();
    this._id_layer = `${this.options.layer_prefix}-${id}`;
    this._id_source = `${this._id_layer}-src`;
    this._id_source_layer = this.options.sourceLayer;

    this._add_layer();
    this._setup_map_event();

    await this._update_table_base();
    await this._build_filter_ui();
    this.refresh();
  }

  refresh(): void {
    this._update_table_filtered();
    this._update_table_aggregated();
    this._update_color_scale();
    this._build_legend_ui();
    this._apply_style();
  }

  resetState(): void {
    for (const key of Object.keys(default_state)) {
      (this as any)[key] = clone((default_state as any)[key]);
    }
  }

  resetOptions(): void {
    this._options = clone(default_options);
  }

  setOptions(opts: Partial<DynamicJoinOptions> = {}): void {
    const keys = Object.keys(default_options) as (keyof DynamicJoinOptions)[];
    for (const key of keys) {
      if (isNotEmpty(opts[key]) || isElement(opts[key])) {
        (this._options as any)[key] = opts[key];
      }
    }
  }

  get options(): DynamicJoinOptions {
    return this._options;
  }

  // --- Legend UI Methods ---

  private _destroy_legend_ui(): void {
    if (
      this._filters_controls.legend &&
      this._filters_controls.legend.destroy
    ) {
      this._filters_controls.legend.destroy();
      delete this._filters_controls.legend;
    }
    // Clear the set of visible classes when destroying
    this._visible_legend_classes.clear();
  }

  private _get_aggregated_table(): AggregatedTableEntry[] {
    return Array.from(this._aggregated_lookup.entries()).map(
      ([key, value]) => ({ key, value }),
    );
  }

  private _build_legend_ui(): void {
    const { elLegendContainer } = this.options;
    const cscale = this._color_scale;
    const valid = isElement(elLegendContainer) && !!cscale;
    this._destroy_legend_ui();

    if (!valid) {
      console.warn("Cannot build legend: Missing container or color scale.");
      return;
    }

    buildLegendInput({
      elWrapper: elLegendContainer!,
      config: {
        colorScale: cscale,
        color_na: this.options.color_na,
      },
      data: this._get_aggregated_table(),
      onBuilt: (legend: any) => {
        this._filters_controls.legend = legend;
      },
      onUpdate: (_: any, __: any, allVisibleClasses: Set<number | string>) => {
        this._visible_legend_classes = allVisibleClasses;
        this._apply_style();
      },
    });
  }

  private _destroy_filter_ui(): void {
    const { elSelectContainer } = this.options;

    for (const control of Object.values(this._filters_controls)) {
      if (control.destroy) {
        control.destroy();
      }
    }
    this._filters_controls = {};
    this._current_filters = {};

    if (elSelectContainer) {
      elSelectContainer.innerHTML = "";
    }
  }

  // load your attribute table; include all necessary fields
  private async _update_table_base(): Promise<void> {
    const { dataUrl, data } = this.options;

    try {
      if (isNotEmpty(data)) {
        this._table_raw = data;
      } else {
        if (!isUrl(dataUrl)) {
          throw new Error("Missing valid URL");
        }
        const resp = await fetch(dataUrl as string);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        const json = await resp.json();
        this._table_raw = isArray(json.data) ? json.data : [];
      }
      this._table_base = this._apply_static_filter(this._table_raw);

      if (this.options.onTableReady) {
        this.options.onTableReady(this._table_base, this);
      }
    } catch (error) {
      console.error("Failed to update table base:", error);
      this._table_raw = [];
      this._table_base = [];
      throw error; // Re-throw if you want to handle it upstream
    }
  }

  private _apply_static_filter(data: any[] = []): any[] {
    const compiledFilters: CompiledFilter[] = this.options.staticFilters.map(
      ({ field, operator, value }) => ({
        field,
        op: operators.get(operator) || ((a: any, b: any) => true),
        value,
      }),
    );

    return data.filter((row) =>
      compiledFilters.every(({ field, op, value }) => op(row[field], value)),
    );
  }

  private async _build_filter_ui(): Promise<void> {
    const { elSelectContainer } = this.options;

    if (!elSelectContainer) {
      console.warn("missing filter container");
      return;
    }

    this._destroy_filter_ui();

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
          await this._build_drop_down_input(elWrapper, config);
          break;
        case "slider":
          await this._build_slider_input(elWrapper, config);
          break;
        default:
          console.warn(`Unsupported filter type: ${type}`);
          break;
      }
    }
  }

  private async _build_drop_down_input(
    elWrapper: HTMLElement,
    config: DynamicFilter,
  ): Promise<void> {
    await buildTomSelectInput({
      elWrapper,
      data: this._table_raw,
      config: config,
      onBuilt: (ts: any, name: string) => {
        this._filters_controls[name] = ts;
      },
      onUpdate: (value: any, name: string) => {
        this._current_filters[name] = value;
        this.refresh();
      },
    });
  }

  // build range slider input using noUiSlider
  private async _build_slider_input(
    elWrapper: HTMLElement,
    config: DynamicFilter,
  ): Promise<void> {
    await buildSlider({
      elWrapper,
      data: this._table_raw,
      config: config,
      onBuilt: (slider: any, name: string) => {
        this._filters_controls[name] = slider;
      },
      onUpdate: (range: any, name: string) => {
        this._current_filters[name] = range;
        this.refresh();
      },
    });
  }

  private _filter_row = (row: any): boolean => {
    return this.options.dynamicFilters.every(({ name, type }) => {
      const filterValue = this._current_filters[name];
      const value = row[name];

      if (filterValue == null) {
        return true;
      }

      switch (type) {
        case "dropdown":
          return value === filterValue;
        case "slider":
          const [min, max] = filterValue;
          const numericValue = Number(value);

          if (isEmpty(max)) {
            //single value
            return numericValue === min;
          }

          return numericValue >= min && numericValue <= max;

        default:
          return true;
      }
    });
  };

  getTableFitered(): any[] {
    return clone(this._table_filtered);
  }

  getTableBase(): any[] {
    return clone(this._table_base);
  }

  getTableRaw(): any[] {
    return clone(this._table_raw);
  }

  getTableAggregated(): AggregatedTableEntry[] {
    return this._get_aggregated_table();
  }

  getCurrentFilters(): Record<string, any> {
    return clone(this._current_filters);
  }

  private _update_table_filtered(): void {
    this._table_filtered = this._table_base.filter(this._filter_row);

    if (this.options.onTableFiltered) {
      this.options.onTableFiltered(this._table_filtered, this);
    }
  }

  private _update_table_aggregated(): void {
    const agg = aggregators[this.options.aggregateFn] || aggregators.none;
    const filteredData = this._table_filtered;

    // Group by joinKey only
    const groups = new Map<string, any[]>();
    this._aggregated_lookup.clear();

    for (const row of filteredData) {
      const value = row[this.options.field as string];
      const joinKey = row[this.options.fieldJoinData as string];

      if (!groups.has(joinKey)) {
        groups.set(joinKey, []);
      }
      groups.get(joinKey)!.push(value);
    }

    for (const [joinKey, values] of groups) {
      const aggregatedValue = agg(values);
      this._aggregated_lookup.set(joinKey, aggregatedValue);
    }

    if (this.options.onTableAggregated) {
      this.options.onTableAggregated(this._get_aggregated_table(), this);
    }
  }

  // use chroma.limits + .scale().classes() to get a color function
  private _update_color_scale(): void {
    const values = this._get_aggregated_table()
      .map((r) => r.value)
      .filter(isNotEmpty);

    if (isEmpty(values)) {
      console.warn("No valid values for color scale computation");
      this._color_scale = null;
      return;
    }

    const limits = chroma.limits(
      values,
      this.options.stat,
      this.options.classes,
    );

    this._color_scale = chroma.scale(this.options.palette).classes(limits);
  }

  private _add_layer(): void {
    const hasSource = this._map.getSource(this._id_source);
    const hasLayer = this._map.getLayer(this._id_layer);

    if (!hasSource) {
      this._map.addSource(this._id_source, {
        type: "vector",
        tiles: this.options.tilesUrl,
      });
    }

    if (!hasLayer) {
      const paint = this.options.paint[this.options.type] || {};
      paint[`${this.options.type}-color`] = this.options.color_na;

      this._map.addLayer(
        {
          id: this._id_layer,
          source: this._id_source,
          type: this.options.type,
          "source-layer": this._id_source_layer,
          paint,
        },
        (settings as any).layerBefore,
      );
    }
  }

  // apply the dynamic style, considering the toggled legend classes
  private _apply_style(): void {
    if (!this._map.getLayer(this._id_layer)) {
      console.warn("Missing layer", this._id_layer);
      return;
    }
    if (!this._color_scale) {
      console.warn("Missing color scale, use default");
      // Set a default fallback color if scale is missing
      this._map.setPaintProperty(
        this._id_layer,
        `${this.options.type}-color`,
        this.options.color_na || "#ccc",
      );
      this._map.setPaintProperty(
        this._id_layer,
        `${this.options.type}-opacity`,
        0.6,
      );
      return;
    }

    const transparentColor = "rgba(0, 0, 0, 0)";
    const classes = (this._color_scale as any).classes();
    const colorExpr: any[] = ["match", ["get", this.options.fieldJoinGeom]];
    const showAll = this._visible_legend_classes.size === 0; // Check if selection set is empty

    // Helper to find class index for a value
    const getClassIndex = (value: any): number | string => {
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
      // Use optional chaining on _color_scale just in case it's null/undefined despite earlier check
      return this._color_scale?.(value) ? classes.length - 1 : "na";
    };

    for (const [key, value] of this._aggregated_lookup) {
      const classIdentifier = getClassIndex(value); // Get index (0, 1, ...) or 'na'
      const isSelected = this._visible_legend_classes.has(classIdentifier);

      let color: string;
      if (showAll || isSelected) {
        // If showing all OR this class is selected, get original color
        color =
          classIdentifier === "na"
            ? this.options.color_na
            : (this._color_scale(value) as any)?.hex();
        // Handle case where color scale might return undefined/null even for valid class
        if (!color) {
          color = this.options.color_na;
        }
      } else {
        // If not showing all AND this class is not selected, make transparent
        color = transparentColor;
      }

      colorExpr.push(key, color);
    }

    // default
    colorExpr.push(transparentColor);

    if (colorExpr.length < 4) {
      this._map.setPaintProperty(
        this._id_layer,
        `${this.options.type}-color`,
        transparentColor,
      );
    } else {
      this._map.setPaintProperty(
        this._id_layer,
        `${this.options.type}-color`,
        colorExpr,
      );
    }

    this._map.setPaintProperty(
      this._id_layer,
      `${this.options.type}-opacity`,
      0.7,
    );
  }

  private _setup_map_event(): void {
    this._map.on("click", this._id_layer, this._on_map_click);
  }

  private _on_map_click = (ev: any): any => {
    if (this.options.onMapClick) {
      const map = ev.target;
      const idLayer = this._id_layer;
      const features = map.queryRenderedFeatures(ev.point, {
        layers: [idLayer],
      });
      const enrichedFeatures = features.map((feature: any) => {
        const geomJoinValue =
          feature.properties[this.options.fieldJoinGeom as string];
        const value = this._aggregated_lookup.get(geomJoinValue);
        feature.properties.aggregated_value = value;
        return feature;
      });

      return this.options.onMapClick(enrichedFeatures, this, ev);
    }
  };

  destroy(): void {
    this._destroy_filter_ui(); // Destroy filters
    this._destroy_legend_ui(); // Destroy legend

    (this._map as any).off("click", this._id_layer, this._on_map_click);

    this._remove_layer(); // Remove map layer/source
  }

  private _remove_layer(): void {
    const hasSource = this._map.getSource(this._id_source);
    const hasLayer = this._map.getLayer(this._id_layer);

    if (hasLayer) {
      this._map.removeLayer(this._id_layer);
    }
    if (hasSource) {
      this._map.removeSource(this._id_source);
    }
  }

  async generateSeries(): Promise<any> {
    // test network latency
    await waitTimeoutAsync(100);
    const data = generate_series();
    return data;
  }
}

const aggregators: Record<string, AggregatorFunction> = {
  none: (vals: any[]) => {
    if (vals.length === 1) return vals[0];
    if (vals.length > 1) {
      console.warn(
        `No aggregator set. Expected single value, got ${vals.length}. Using first.`,
      );
      return vals[0];
    }
    return null;
  },
  first: (vals: any[]) => vals[0] ?? null,
  last: (vals: any[]) => vals.at(-1) ?? null,
  sum: (vals: number[]) => vals.reduce((a, b) => a + b, 0),
  max: (vals: number[]) => Math.max(...vals),
  min: (vals: number[]) => Math.min(...vals),
  median: (vals: number[]) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  mode: (vals: any[]) => {
    const counts = vals.reduce((acc: Record<string, number>, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    return (
      Object.entries(counts).reduce((a, [v, c]) => (c > a[1] ? [v, c] : a), [
        null,
        0,
      ] as any) as any
    )[0];
  },
};

const operators = new Map<string, (a: any, b: any) => boolean>([
  ["==", (a, b) => a == b],
  ["!=", (a, b) => a != b],
  [">", (a, b) => a > b],
  [">=", (a, b) => a >= b],
  ["<", (a, b) => a < b],
  ["<=", (a, b) => a <= b],
]);
