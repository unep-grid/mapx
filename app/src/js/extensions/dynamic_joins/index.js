import chroma from "chroma-js";
import { getApiUrl } from "../../api_routes";
import { el } from "../../el_mapx";
import { moduleLoad } from "../../modules_loader_async";

export class DynamicJoin {
  /**
   * @param {mapboxgl.Map} map – an already-initialized Mapbox GL map
   */
  constructor(map) {
    window._dj = this;
    this._map = map;
    this._options = {};
    this._rawTable = [];
    this._aggTable = [];
    this._colorScale = null;
    // multi-field filtering support
    this._fieldsFilter = [];
    this._filterSelects = {};
    this._currentFilters = {};
  }
  // remove existing filter UI and TomSelect instances
  _destroyFilterUI() {
    const container = this._options.container;
    if (!container) return;
    for (const ts of Object.values(this._filterSelects)) {
      ts.destroy();
    }
    this._filterSelects = {};
    this._currentFilters = {};
    container.innerHTML = "";
  }

  // helper to refresh styling after filter change
  _refresh() {
    this._prepareDataForStyling();
    this._computeColorScale();
    this._applyStyle();
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
   * @param {Array}  opts.joinOn               – [ dataField, featureProperty ]
   * @param {string} [opts.stat='quantile']    – 'quantile', 'equal', 'kmeans', etc.
   * @param {number} [opts.classes=5]          – number of classes/breaks
   * @param {string} [opts.na='#ccc']          – fallback color for missing joins
   * @param {Array<string>} [opts.fieldsFilter] – array of field names to build filter inputs on
   * @param {string} [opts.fieldValue ]        – value field
   * @param {string} [opts.aggregation='sum']  – 'sum', 'median', 'max', 'min', or 'mode'
   * @param {HTMLElement} [opts.container]     – DOM element to append filter UI
   */
  async init(opts) {
    // merge provided opts with defaults
    this._options = {
      palette: "OrRd",
      stat: "quantile",
      classes: 5,
      na: "#ccc",
      aggregation: "sum",
      ...opts,
    };

    // destruct for private props
    const {
      idSourceGeom,
      idSourceData,
      dataUrl,
      joinOn,
      fieldsFilter,
      fieldValue,
      container,
    } = this._options;

    // join fields
    this._fieldValue = fieldValue;
    this._fieldJoinData = joinOn[1];
    this._fieldJoinGeom = joinOn[0];
    this._idSourceGeom = idSourceGeom;
    this._sourceLayer = idSourceGeom;
    this._idSourceData = idSourceData;
    this._fieldsFilter = fieldsFilter;
    for (const field of this._fieldsFilter) {
      this._currentFilters[field] = null;
    }
    this._idLayer = `${idSourceGeom}-dynamic-join`;
    this._idSource = `${idSourceGeom}-dynamic-join-src`;
    this._data_url = dataUrl;

    // load raw data
    await this._loadData();

    // if filtering enabled, build the UI for each field
    if (this._fieldsFilter.length > 0 && container) {
      await this._buildFilterUI(container);
    }

    // prepare aggregated values
    this._prepareDataForStyling();
    this._computeColorScale();
    this._addLayer();
    this._applyStyle();
  }

  // load your attribute table; include all filter fields if provided
  async _loadData() {
    let url;

    if (this._data_url) {
      url = this._data_url;
    } else {
      // request data including all filter fields
      const attrs = [
        this._fieldJoinData,
        this._fieldValue,
        ...this._fieldsFilter,
      ];
      url = new URL(getApiUrl("getSourceTableAttribute"));
      url.searchParams.set("id", this._idSourceData);
      url.searchParams.set("attributes", attrs);
    }
    const resp = await fetch(url);
    const json = await resp.json();
    this._rawTable = Array.isArray(json.data) ? json.data : [];
  }

  // build inputs with TomSelect for each filter field
  async _buildFilterUI(container) {
    // clear any existing filter UI
    this._destroyFilterUI();
    const TomSelect = await moduleLoad("tom-select");

    const elWrapper = el("div", {
      style: {
        padding: "15px",
      },
    });
    container.appendChild(elWrapper);

    for (const field of this._fieldsFilter) {
      // compute distinct values and counts
      const counts = {};
      for (const row of this._rawTable) {
        const v = row[field];
        if (v != null) {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      const options = Object.entries(counts)
        .map(([value, count]) => ({ value, text: `${value} (${count})` }))
        .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));

      // create input element
      const id = `dj_select_${field}`;
      const elInput = el("select", { id });
      const elLabel = el("label", { for: id }, field);
      elWrapper.appendChild(elLabel);
      elWrapper.appendChild(elInput);

      // initialize TomSelect on input
      const ts = new TomSelect(elInput, {
        options,
        create: false,
        allowEmptyOption: true,
        dropdownParent: "body",
        closeAfterSelect: true,
        placeholder: `Filter by ${field}`,
        onChange: (val) => {
          this._currentFilters[field] = val || null;
          this._refresh();
        },
      });
      this._filterSelects[field] = ts;
      this._currentFilters[field] = null;
    }
  }

  // group & aggregate rows by join key, applying current filters
  _prepareDataForStyling() {
    const groups = {};

    // group rows by join key, applying all active filters
    for (const row of this._rawTable) {
      let skip = false;
      for (const field of this._fieldsFilter) {
        const selected = this._currentFilters[field];
        if (selected != null && row[field] !== selected) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
      const key = row[this._fieldJoinData];
      if (!groups[key]) groups[key] = [];
      groups[key].push(row.value);
    }

    // aggregation function
    const agg = (vals) => {
      const { aggregation } = this._options;
      switch (aggregation) {
        case "sum":
          return vals.reduce((a, b) => a + b, 0);
        case "max":
          return Math.max(...vals);
        case "min":
          return Math.min(...vals);
        case "median":
          vals.sort((a, b) => a - b);
          const mid = Math.floor(vals.length / 2);
          return vals.length % 2 === 0
            ? (vals[mid - 1] + vals[mid]) / 2
            : vals[mid];
        case "mode":
          const counts = vals.reduce((c, v) => {
            c[v] = (c[v] || 0) + 1;
            return c;
          }, {});
          return Object.entries(counts).reduce(
            (a, [v, c]) => (c > a[1] ? [v, c] : a),
            [null, 0],
          )[0];
        default: // fallback to sum
          return vals.reduce((a, b) => a + b, 0);
      }
    };

    this._aggTable = Object.entries(groups).map(([key, vals]) => ({
      key,
      value: agg(vals),
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

  // build the Mapbox GL "match" expression
  _buildMatchExpression() {
    const expr = ["match", ["get", this._fieldJoinGeom]];
    this._aggTable.forEach((row) => {
      expr.push(row.key, this._colorScale(row.value).hex());
    });
    expr.push(this._options.na);
    return expr;
  }

  // add the layer if not already present
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
          "fill-color": this._options.na,
          "fill-opacity": 0.6,
          "fill-outline-color": "#333",
        },
      });
    }
  }

  destroy() {
    return this._removeLayer();
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

  // apply the dynamic style
  _applyStyle() {
    const matchExpr = this._buildMatchExpression();
    this._map.setPaintProperty(this._idLayer, "fill-color", matchExpr);
  }

  /**
   * Update styling, optionally re-fetching data if the source changes.
   * @param {Object} newOpts – any of the same keys you passed into init()
   */
  async update(newOpts = {}) {
    // merge provided opts
    this._options = { ...this._options, ...newOpts };
    // normalize filter fields (support legacy single filterField)
    const { fieldsFilter, container } = this._options;
    this._fieldsFilter = fieldsFilter;
    // reset new filters
    for (const field of this._fieldsFilter) {
      if (!(field in this._currentFilters)) {
        this._currentFilters[field] = null;
      }
    }
    // if data source changed, reload data and rebuild filter UI
    if (newOpts.idSourceData || newOpts.dataUrl) {
      this._idSourceData = this._options.idSourceData;
      this._data_url = this._options.dataUrl;
      await this._loadData();
      if (this._fieldsFilter.length > 0 && container) {
        this._destroyFilterUI();
        await this._buildFilterUI(container);
      }
    }
    // if filter fields changed, rebuild filter UI
    else if (newOpts.fieldsFilter) {
      if (this._fieldsFilter.length > 0 && container) {
        this._destroyFilterUI();
        await this._buildFilterUI(container);
      }
    }
    // reapply data styling
    this._refresh();
  }
}
