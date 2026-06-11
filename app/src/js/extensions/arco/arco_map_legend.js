import { Zartigl } from "@fxi/zartigl";
import { catalog, getCatalogLayer, formatVertical } from "@fxi/zartigl/catalog";
import flatpickr from "flatpickr";
import { el } from "../../el_mapx";
import { maplibregl, settings as mxSettings } from "../../mx";
import { moduleLoad } from "../../modules_loader_async";
import { setClickHandler, debounce } from "../../mx_helper_misc";
import { ArcoChart } from "./chart.js";
import "../../search/style_flatpickr.less";
import "../shared/style.less";
import "./style.less";

const defaultOptions = {
  idView: null,
  map: null,
  layer: "ocean-current-velocity",
  backend: "auto",
  elInputs: null,
  elLegend: null,
  title: "ARCO",
  subtitle: null,
  playbackInterval: 800,
  loop: true,
  maxPoints: 200,
  maxDepths: 50,
  settings: null,
  time: null,
  depth: null,
};

/**
 * ARCO map legend : animated Zarr ocean data (zartigl) with time/depth
 * navigation and point series chart.
 *
 * Independent from BaseTimeMapLegend : zartigl owns the layer lifecycle,
 * time/depth metadata and legend data, only the conventions are shared.
 */
export class ArcoMapLegend {
  constructor(options) {
    this._opt = { ...defaultOptions, ...options };
    this._chart_mode = "time";
    this._point = null;
    this._id_query = 0;
    this._on_loading = () => this._setLoading(true);
    this._on_loaded = (meta) => {
      this._meta = meta;
      this._setLoading(false);
      this.renderLegend();
    };
    this._on_error = (error) => {
      this._setLoading(false);
      console.warn("ArcoMapLegend:", error);
    };
    this._on_pick = this._handlePickClick.bind(this);
    this._update_chart_debounced = debounce(() => this.updateChart(), 350);
  }

  async init() {
    const [noUiSlider, echarts] = await Promise.all([
      moduleLoad("nouislider"),
      moduleLoad("echarts"),
    ]);
    this._noUiSlider = noUiSlider;
    this._echarts = echarts;
    this._layer_def = getCatalogLayer(this._opt.layer, catalog);

    if (!this._layer_def) {
      throw new Error(`ARCO catalog layer '${this._opt.layer}' not found`);
    }

    const idView = this._opt.idView || "arco";
    const idLayer = toMapxLayerId(idView);
    this._id_layer = idLayer;
    this._z = new Zartigl({
      id: idLayer,
      map: this._opt.map,
      catalog: catalog,
      backend: this._opt.backend,
      settings: this._opt.settings || undefined,
      before: mxSettings.layerBefore,
      metadata: {
        idView,
        idLayer,
        type: "arco",
        catalogLayer: this._opt.layer,
        label: this._layer_def.label,
      },
    });
    this._z.on("loading", this._on_loading);
    this._z.on("loaded", this._on_loaded);
    this._z.on("error", this._on_error);

    await this._z.setLayer(this._opt.layer);

    this._time_meta = this._z.getTimeMeta();
    this._depth_meta = this._z.getDepthMeta();
    this._depths = [...this._depth_meta.values].sort((a, b) => a - b);
    this._time = this._resolveInitialTime(
      this._opt.time ?? this._time_meta.current ?? this._time_meta.max,
    );
    this._depth = this._resolveInitialDepth(
      this._opt.depth ?? this._depth_meta.current ?? this._depths[0] ?? 0,
    );

    this.build();
    this.renderLegend();
    this.setDepth(this._depth);
    this.setTime(this._time);
    window._arco = this;
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this.stop();
    this.disablePick();
    this._z?.off("loading", this._on_loading);
    this._z?.off("loaded", this._on_loaded);
    this._z?.off("error", this._on_error);
    this._z?.destroy();
    this._chart?.destroy();
    this._marker?.remove();
    this._marker = null;
    this._fp?.destroy();
    this.elTimeSlider?.noUiSlider?.destroy();
    this.elDepthSlider?.noUiSlider?.destroy();
    if (this._opt.elInputs) {
      this._opt.elInputs.innerHTML = "";
    }
    if (this._opt.elLegend) {
      this._opt.elLegend.innerHTML = "";
    }
    if (window._arco === this) {
      delete window._arco;
    }
  }

  isDestroyed() {
    return !!this._destroyed;
  }

  /**
   * Time
   */
  setTime(ms, opt = {}) {
    const { min, max } = this._time_meta;
    const time = Math.max(min, Math.min(max, ms));
    this._time = time;
    this._z.setTime(time);
    if (!opt.fromSlider) {
      this.elTimeSlider?.noUiSlider?.set(time);
    }
    this._updateTimeReadout(time);
    this._chart?.setCursor(time);
    this._updateValueReadout();
    const refreshProfile =
      this._chart_mode === "depth" && this._point && !this._playing;
    if (refreshProfile) {
      this._update_chart_debounced();
    }
  }

  getTime() {
    return this._time;
  }

  _resolveInitialTime(time) {
    const value = timeToMs(time);
    if (Number.isFinite(value)) {
      return value;
    }
    return this._time_meta.current ?? this._time_meta.max ?? this._time_meta.min;
  }

  _timeStep() {
    const { step, values } = this._time_meta;
    if (step > 0) {
      return step;
    }
    if (values?.length > 1) {
      return values[1] - values[0];
    }
    return 21600000; // PT6H
  }

  /**
   * Depth
   */
  hasDepth() {
    return this._depths.length > 1;
  }

  getDepth() {
    return this._depth ?? this._depths[0] ?? 0;
  }

  _resolveInitialDepth(depth) {
    if (!this._depths.length) {
      return depth;
    }
    return this._depths[nearestIndex(this._depths, depth)];
  }

  setDepthIndex(index) {
    const depth = this._depths[Math.round(index)];
    if (depth === undefined) {
      return;
    }
    this.setDepth(depth, { fromSlider: true });
  }

  setDepth(depth, opt = {}) {
    if (!this._depths.length) {
      return;
    }
    const index = nearestIndex(this._depths, depth);
    const nearest = this._depths[index];
    if (nearest === undefined) {
      return;
    }
    this._depth = nearest;
    this._z.setDepth(nearest);
    if (!opt.fromSlider) {
      this.elDepthSlider?.noUiSlider?.set(index);
    }
    this._updateDepthReadout(nearest);
    if (this._point) {
      this._update_chart_debounced();
    }
  }

  /**
   * Playback
   */
  play() {
    if (this._playing) {
      return;
    }
    this._playing = true;
    this.elButtonPlay?.classList.add("playing");
    this._tick();
  }

  stop() {
    this._playing = false;
    this.elButtonPlay?.classList.remove("playing");
    clearTimeout(this._id_timer);
  }

  stepNext(stop) {
    if (stop) {
      this.stop();
    }
    const next = this._time + this._timeStep();
    this.setTime(next > this._time_meta.max ? this._time_meta.min : next);
  }

  stepPrevious(stop) {
    if (stop) {
      this.stop();
    }
    const previous = this._time - this._timeStep();
    this.setTime(
      previous < this._time_meta.min ? this._time_meta.max : previous,
    );
  }

  toggleLoop() {
    this._opt.loop = !this._opt.loop;
    this.elButtonLoop?.classList.toggle("active", this._opt.loop);
  }

  _tick() {
    clearTimeout(this._id_timer);
    this._id_timer = setTimeout(() => {
      if (this.isDestroyed() || !this._playing) {
        return;
      }
      // backpressure : do not advance while chunks are loading
      if (!this._loading) {
        const next = this._time + this._timeStep();
        const ended = next > this._time_meta.max;
        if (ended && !this._opt.loop) {
          this.stop();
          return;
        }
        this.setTime(ended ? this._time_meta.min : next);
      }
      this._tick();
    }, this._opt.playbackInterval);
  }

  _setLoading(loading) {
    this._loading = loading;
    this.elStatus?.classList.toggle("loading", loading);
  }

  /**
   * Point picking : capture a single map click, suppress the default
   * MapX popup/highlight using the 'arco' click mode.
   */
  enablePick() {
    if (this._picking) {
      return;
    }
    this._picking = true;
    setClickHandler({ type: "arco", enable: true });
    this._opt.map.getCanvas().style.cursor = "crosshair";
    this.elButtonPick?.classList.add("active");
    this._opt.map.once("click", this._on_pick);
  }

  disablePick() {
    if (!this._picking) {
      return;
    }
    this._picking = false;
    setClickHandler({ type: "arco", enable: false });
    this._opt.map.getCanvas().style.cursor = "";
    this.elButtonPick?.classList.remove("active");
    this._opt.map.off("click", this._on_pick);
  }

  togglePick() {
    if (this._picking) {
      this.disablePick();
    } else {
      this.enablePick();
    }
  }

  _handlePickClick(event) {
    const { lng, lat } = event.lngLat;
    this._point = { longitude: lng, latitude: lat };
    this._marker?.remove();
    this._marker = new maplibregl.Marker({ color: "var(--mx_ui_link)" })
      .setLngLat([lng, lat])
      .addTo(this._opt.map);
    this.disablePick();
    this.updateChart();
  }

  /**
   * Chart
   */
  setChartMode(mode) {
    this._chart_mode = mode;
    this.elButtonModeTime?.classList.toggle("active", mode === "time");
    this.elButtonModeDepth?.classList.toggle("active", mode === "depth");
    this.updateChart();
  }

  async updateChart() {
    if (this.isDestroyed() || !this._chart) {
      return;
    }
    if (!this._point) {
      this._chart.showMessage("Use the target button, then click on the map");
      return;
    }
    const idQuery = ++this._id_query;
    const mode = this._chart_mode;
    const unit = this._layer_def.variables?.units || this._meta?.unit || "";
    try {
      this._chart.showMessage("Loading…");
      const result =
        mode === "time"
          ? await this._z.queryTimeSeries({
              ...this._point,
              depth: this.hasDepth() ? this.getDepth() : undefined,
              maxPoints: this._opt.maxPoints,
            })
          : await this._z.queryDepthProfile({
              ...this._point,
              time: this._time,
              maxDepths: this._opt.maxDepths,
            });
      if (idQuery !== this._id_query || this.isDestroyed()) {
        return;
      }
      this._series = result.points.map((point) => [
        point.axisValue,
        this._sampleValue(point.values),
      ]);
      this._chart.setSeries({
        data: this._series,
        mode: mode,
        unit: unit,
        label: this._layer_def.label,
      });
      if (mode === "time") {
        this._chart.setCursor(this._time);
      }
      this._updateValueReadout();
    } catch (error) {
      if (idQuery === this._id_query && !this.isDestroyed()) {
        this._series = null;
        this._chart.showMessage(`Query failed : ${error.message || error}`);
      }
    }
  }

  /**
   * Scalar value of a sample : magnitude for u/v vectors,
   * first value otherwise.
   */
  _sampleValue(values) {
    if ("magnitude" in values) {
      return values.magnitude;
    }
    const { u, v } = this._layer_def.variables || {};
    if (u in values && v in values) {
      return Math.hypot(values[u], values[v]);
    }
    return values[Object.keys(values)[0]];
  }

  _updateValueReadout() {
    if (!this.elValue) {
      return;
    }
    const series = this._series;
    if (!series?.length) {
      this.elValue.innerText = "-";
      return;
    }
    const cursor = this._chart_mode === "time" ? this._time : this.getDepth();
    let nearest = series[0];
    for (const point of series) {
      if (Math.abs(point[0] - cursor) < Math.abs(nearest[0] - cursor)) {
        nearest = point;
      }
    }
    const value = nearest[1];
    this.elValue.innerText = isFinite(value) ? value.toPrecision(3) : "-";
  }

  /**
   * Settings
   */
  updateSettings(settings) {
    this._syncSettings(settings);
    this._z.updateSettings(settings);
    const legendChanged = "palette" in settings || "logScale" in settings;
    if (legendChanged) {
      this.renderLegend();
    }
  }

  _syncSettings(settings) {
    if (!this._settings) {
      return;
    }
    for (const [key, value] of Object.entries(settings)) {
      if (key === "speedFactor" || key === "fadeOpacity") {
        this._settings[key] = asZoomWeightedPair(value, this._settings[key]);
      } else {
        this._settings[key] = value;
      }
    }
  }

  /**
   * Legend, rendered in the view legend container
   */
  renderLegend() {
    const elLegend = this._opt.elLegend;
    if (!elLegend || this.isDestroyed()) {
      return;
    }
    const legend = this._z.getLegend();
    elLegend.innerHTML = "";

    if (legend.type === "image") {
      elLegend.appendChild(
        el("img", { src: legend.url, alt: this._layer_def.label }),
      );
      return;
    }
    if (legend.type !== "gradient") {
      return;
    }
    const palette = this._z
      .getPalettes()
      .find((candidate) => candidate.id === legend.palette);
    const colors = palette?.colors || [];
    const elBar = el("div", {
      class: "arco--legend_bar",
      style: {
        background: `linear-gradient(to right, ${colors.join(", ")})`,
      },
    });
    const format = (value) =>
      isFinite(value) ? Number(value).toPrecision(3) : "";
    const elMeta = el("div", { class: "arco--legend_meta" }, [
      el("span", format(legend.min)),
      el("span", legend.unit || ""),
      el("span", format(legend.max)),
    ]);
    elLegend.appendChild(
      el("div", { class: "arco--legend" }, [elBar, elMeta]),
    );
  }

  /**
   * UI
   */
  build() {
    this._elContainer = el(
      "div",
      { class: ["arco_extension", "time_map_legend_extension"] },
      [
        this._buildHeader(),
        this._buildTimeRow(),
        this._buildBody(),
        this._buildSettings(),
      ],
    );
    this._opt.elInputs.innerHTML = "";
    this._opt.elInputs.appendChild(this._elContainer);
  }

  _buildHeader() {
    this.elStatus = el("span", { class: "arco--status_dot" });
    const elTitle = el("div", { class: "arco--title" }, [
      this.elStatus,
      el("span", this._opt.title),
    ]);
    const elSubtitle = el(
      "div",
      { class: "arco--subtitle" },
      this._opt.subtitle || this._layer_def.label,
    );
    const elButtonSettings = el(
      "button",
      {
        class: ["btn", "btn-default", "arco--btn_icon"],
        title: "Settings",
        on: { click: () => this._elSettings.classList.toggle("active") },
      },
      el("i", { class: ["fa", "fa-gear"] }),
    );
    return el("div", { class: "arco--header" }, [
      el("div", [elTitle, elSubtitle]),
      elButtonSettings,
    ]);
  }

  isVector() {
    return this._layer_def.kind === "vector";
  }

  _buildTimeRow() {
    const { min, max } = this._time_meta;
    // continuous playback only for scalar layers : vector layers
    // reload the velocity field at each step, no frame cache
    const playback = !this.isVector();

    this.elTimeReadout = el("span", {
      class: ["arco--readout_value", "arco--clickable"],
      title: "Pick a date",
      on: { click: () => this._openDatePicker() },
    });
    this._buildDatePicker();
    this.elTimeSlider = el("div", { class: "arco--time_slider" });
    this._noUiSlider.create(this.elTimeSlider, {
      range: { min, max },
      start: this._time,
      step: this._timeStep(),
      connect: [true, false],
      behaviour: "drag",
      pips: {
        mode: "count",
        values: 4,
        density: 100,
        format: { to: (ms) => formatYear(ms) },
      },
    });
    this.elTimeSlider.noUiSlider.on("update", (values) => {
      this._updateTimeReadout(Number(values[0]));
    });
    this.elTimeSlider.noUiSlider.on("change", (values) => {
      this.stop();
      this.setTime(Number(values[0]), { fromSlider: true });
    });

    const elButtonPrevious = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Previous",
        on: { click: () => this.stepPrevious(true) },
      },
      el("i", { class: ["fa", "fa-step-backward"] }),
    );
    const elButtonNext = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Next",
        on: { click: () => this.stepNext(true) },
      },
      el("i", { class: ["fa", "fa-step-forward"] }),
    );

    if (playback) {
      this.elButtonPlay = el(
        "button",
        {
          class: ["btn", "btn-default"],
          title: "Play",
          on: { click: () => this.play() },
        },
        el("i", { class: ["fa", "fa-play"] }),
      );
      this.elButtonLoop = el(
        "button",
        {
          class: ["btn", "btn-default", this._opt.loop ? "active" : null],
          title: "Loop",
          on: { click: () => this.toggleLoop() },
        },
        el("i", { class: ["fa", "fa-repeat"] }),
      );
    }

    const elButtons = el("div", { class: "arco--player_buttons" }, [
      elButtonPrevious,
      this.elButtonPlay,
      playback
        ? el(
            "button",
            {
              class: ["btn", "btn-default"],
              title: "Stop",
              on: { click: () => this.stop() },
            },
            el("i", { class: ["fa", "fa-stop"] }),
          )
        : null,
      elButtonNext,
      this.elButtonLoop,
    ]);

    return el("div", { class: "arco--time_row" }, [
      el("div", { class: "arco--readout" }, [
        el("label", "Date & time"),
        this.elTimeReadout,
        this.elTimeInput,
      ]),
      el("div", { class: "arco--time_controls" }, [
        this.elTimeSlider,
        elButtons,
      ]),
    ]);
  }

  /**
   * Datetime picker anchored to the readout. flatpickr works in local
   * time : picker wall-clock values are mapped 1:1 to UTC.
   */
  _buildDatePicker() {
    const { min, max } = this._time_meta;
    this.elTimeInput = el("input", {
      type: "text",
      class: "arco--date_input",
      tabindex: "-1",
    });
    this._fp = flatpickr(this.elTimeInput, {
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 60,
      minDate: msToPickerDate(min),
      maxDate: msToPickerDate(max),
      positionElement: this.elTimeReadout,
      onChange: (dates) => {
        const date = dates[0];
        if (!date) {
          return;
        }
        this.stop();
        this.setTime(this._snapTime(pickerDateToMs(date)));
      },
    });
  }

  _openDatePicker() {
    this._fp?.setDate(msToPickerDate(this._time), false);
    this._fp?.open();
  }

  _snapTime(ms) {
    const { min, max } = this._time_meta;
    const step = this._timeStep();
    const snapped = min + Math.round((ms - min) / step) * step;
    return Math.max(min, Math.min(max, snapped));
  }

  _buildBody() {
    const children = [];
    if (this.hasDepth()) {
      children.push(this._buildDepthCol());
    }
    children.push(this._buildChartCol());
    return el("div", { class: "arco--body" }, children);
  }

  _buildDepthCol() {
    const { label, units } = this._depth_meta;
    const depths = this._depths;
    const start = depths.indexOf(this.getDepth());

    this.elDepthReadout = el("span", { class: "arco--readout_value" });
    this.elDepthSlider = el("div", { class: "arco--depth_slider" });
    this._noUiSlider.create(this.elDepthSlider, {
      range: { min: 0, max: depths.length - 1 },
      start: start > -1 ? start : 0,
      step: 1,
      orientation: "vertical",
      connect: [true, false],
      behaviour: "tap",
      pips: {
        mode: "count",
        values: 6,
        density: 100,
        stepped: true,
        format: {
          to: (index) => formatVertical(depths[Math.round(index)], label),
        },
      },
    });
    this.elDepthSlider.noUiSlider.on("update", (values) => {
      const depth = depths[Math.round(Number(values[0]))];
      this._updateDepthReadout(depth);
    });
    this.elDepthSlider.noUiSlider.on("change", (values) => {
      this.setDepthIndex(Number(values[0]));
    });
    this._updateDepthReadout(this.getDepth());

    return el("div", { class: "arco--depth_col" }, [
      el("div", { class: "arco--readout" }, [
        el("label", label || "Depth"),
        this.elDepthReadout,
      ]),
      this.elDepthSlider,
      el("span", { class: "arco--depth_units" }, units || "m"),
    ]);
  }

  _buildChartCol() {
    const unit = this._layer_def.variables?.units || "";
    this.elValue = el("span", { class: "arco--readout_value" }, "-");
    const elChart = el("div", { class: "arco--chart" });
    this._chart = new ArcoChart({
      echarts: this._echarts,
      elContainer: elChart,
    });
    this._chart.init();

    this.elButtonModeTime = el(
      "button",
      {
        class: ["btn", "btn-default", "active"],
        title: "Time series at picked point",
        on: { click: () => this.setChartMode("time") },
      },
      "Time",
    );
    this.elButtonModeDepth = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Depth profile at picked point",
        on: { click: () => this.setChartMode("depth") },
      },
      "Depth",
    );
    this.elButtonPick = el(
      "button",
      {
        class: ["btn", "btn-default", "arco--btn_icon"],
        title: "Pick a point on the map",
        on: { click: () => this.togglePick() },
      },
      el("i", { class: ["fa", "fa-crosshairs"] }),
    );
    const elToolbar = el("div", { class: "arco--toolbar" }, [
      this.elButtonModeTime,
      this.hasDepth() ? this.elButtonModeDepth : null,
      this.elButtonPick,
    ]);

    return el("div", { class: "arco--chart_col" }, [
      el("div", { class: ["arco--readout", "arco--readout_cursor"] }, [
        this.elValue,
        el("span", { class: "arco--readout_unit" }, `${unit} @ cursor`),
      ]),
      elChart,
      elToolbar,
    ]);
  }

  /**
   * Settings panel : runtime zartigl parameters. Ranges follow the
   * zartigl demo-prod tweakpane configuration.
   */
  _buildSettings() {
    const defaults = this._layer_def.defaults || {};
    const raster = defaults.raster || {};
    const particles = defaults.particles || {};
    const settings = this._opt.settings || {};
    const isVector = this.isVector();

    this._settings = {
      palette: settings.palette ?? defaults.palette,
      opacity: settings.opacity ?? raster.opacity ?? 1,
      vibrance: settings.vibrance ?? raster.vibrance ?? 0,
      logScale: settings.logScale ?? raster.logScale ?? false,
      particleDensity: settings.particleDensity ?? particles.density ?? 0.01,
      speedFactor: asZoomWeightedPair(
        settings.speedFactor ?? particles.speedFactor,
        [0.25, 0.6],
      ),
      fadeOpacity: asZoomWeightedPair(
        settings.fadeOpacity ?? particles.fadeOpacity,
        [0.96, 0.99],
      ),
      dropRate: settings.dropRate ?? particles.dropRate ?? 0.003,
      dropRateBump: settings.dropRateBump ?? particles.dropRateBump ?? 0,
    };

    const rows = [
      this._buildPaletteRow(defaults),
      this._buildRangeRow({
        label: "Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        get: () => this._settings.opacity,
        set: (value) => {
          this._settings.opacity = value;
          this.updateSettings({ opacity: value });
        },
      }),
      this._buildRangeRow({
        label: "Vibrance",
        min: -1,
        max: 1,
        step: 0.01,
        get: () => this._settings.vibrance,
        set: (value) => {
          this._settings.vibrance = value;
          this.updateSettings({ vibrance: value });
        },
      }),
      this._buildCheckboxRow({
        label: "Log scale",
        get: () => this._settings.logScale,
        set: (value) => {
          this._settings.logScale = value;
          this.updateSettings({ logScale: value });
        },
      }),
    ];

    if (isVector) {
      rows.push(
        this._buildRangeRow({
          label: "Density",
          min: 0.001,
          max: 0.15,
          step: 0.001,
          get: () => this._settings.particleDensity,
          set: (value) => {
            this._settings.particleDensity = value;
            this.updateSettings({ particleDensity: value });
          },
        }),
        this._buildRangeRow({
          label: "Speed local",
          min: 0.01,
          max: 2,
          step: 0.01,
          get: () => this._settings.speedFactor[0],
          set: (value) => {
            this._settings.speedFactor[0] = value;
            this.updateSettings({ speedFactor: [...this._settings.speedFactor] });
          },
        }),
        this._buildRangeRow({
          label: "Speed global",
          min: 0.01,
          max: 2,
          step: 0.01,
          get: () => this._settings.speedFactor[1],
          set: (value) => {
            this._settings.speedFactor[1] = value;
            this.updateSettings({ speedFactor: [...this._settings.speedFactor] });
          },
        }),
        this._buildRangeRow({
          label: "Fade local",
          min: 0.9,
          max: 1,
          step: 0.0001,
          get: () => this._settings.fadeOpacity[0],
          set: (value) => {
            this._settings.fadeOpacity[0] = value;
            this.updateSettings({ fadeOpacity: [...this._settings.fadeOpacity] });
          },
        }),
        this._buildRangeRow({
          label: "Fade global",
          min: 0.9,
          max: 1,
          step: 0.0001,
          get: () => this._settings.fadeOpacity[1],
          set: (value) => {
            this._settings.fadeOpacity[1] = value;
            this.updateSettings({ fadeOpacity: [...this._settings.fadeOpacity] });
          },
        }),
        this._buildRangeRow({
          label: "Drop rate",
          min: 0,
          max: 0.1,
          step: 0.001,
          get: () => this._settings.dropRate,
          set: (value) => {
            this._settings.dropRate = value;
            this.updateSettings({ dropRate: value });
          },
        }),
        this._buildRangeRow({
          label: "Drop bump",
          min: 0,
          max: 0.1,
          step: 0.001,
          get: () => this._settings.dropRateBump,
          set: (value) => {
            this._settings.dropRateBump = value;
            this.updateSettings({ dropRateBump: value });
          },
        }),
      );
    }

    this._elSettings = el("div", { class: "arco--settings" }, rows);
    return this._elSettings;
  }

  _buildPaletteRow(defaults) {
    const palettes = this._z.getPalettes();
    const paletteDefault = this._settings.palette || defaults.palette || palettes[0]?.id;
    const elPalette = el(
      "select",
      {
        class: "form-control",
        on: {
          change: (event) => {
            this._settings.palette = event.target.value;
            this.updateSettings({ palette: event.target.value });
          },
        },
      },
      palettes.map((palette) =>
        el(
          "option",
          {
            value: palette.id,
            selected: palette.id === paletteDefault ? true : null,
          },
          palette.label,
        ),
      ),
    );
    return el("div", { class: "arco--settings_row" }, [
      el("label", "Palette"),
      elPalette,
    ]);
  }

  _buildRangeRow(config) {
    const { label, min, max, step, get, set } = config;
    const digits = countDecimals(step);
    const elValue = el(
      "span",
      { class: "arco--settings_value" },
      get().toFixed(digits),
    );
    const elInput = el("input", {
      type: "range",
      min: min,
      max: max,
      step: step,
      value: get(),
      on: {
        input: (event) => {
          const value = Number(event.target.value);
          elValue.innerText = value.toFixed(digits);
          set(value);
        },
      },
    });
    return el("div", { class: "arco--settings_row" }, [
      el("label", label),
      elInput,
      elValue,
    ]);
  }

  _buildCheckboxRow(config) {
    const { label, get, set } = config;
    const elInput = el("input", {
      type: "checkbox",
      checked: get() ? true : null,
      on: {
        change: (event) => set(event.target.checked),
      },
    });
    return el("div", { class: "arco--settings_row" }, [
      el("label", label),
      elInput,
    ]);
  }

  _updateTimeReadout(ms) {
    if (this.elTimeReadout) {
      this.elTimeReadout.innerText = formatDateTime(ms);
    }
  }

  _updateDepthReadout(depth) {
    if (this.elDepthReadout) {
      this.elDepthReadout.innerText = formatVertical(
        depth,
        this._depth_meta.label,
      );
    }
  }
}

function formatDateTime(ms) {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * Local Date whose wall-clock parts equal the UTC parts of ms
 */
function msToPickerDate(ms) {
  const date = new Date(ms);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  );
}

function pickerDateToMs(date) {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  );
}

function timeToMs(time) {
  if (time instanceof Date) {
    return time.getTime();
  }
  if (typeof time === "number") {
    return time;
  }
  if (typeof time === "string") {
    return new Date(time).getTime();
  }
  return NaN;
}

/**
 * ZoomWeighted : scalar or [high zoom, low zoom] pair
 */
function asZoomWeightedPair(value, fallback) {
  if (Array.isArray(value)) {
    return [...value];
  }
  if (typeof value === "number") {
    return [value, value];
  }
  return [...fallback];
}

function nearestIndex(values, target) {
  let index = 0;
  let distance = Infinity;
  for (let i = 0; i < values.length; i++) {
    const next = Math.abs(values[i] - target);
    if (next < distance) {
      index = i;
      distance = next;
    }
  }
  return index;
}

function countDecimals(step) {
  const text = String(step);
  const pos = text.indexOf(".");
  return pos === -1 ? 0 : text.length - pos - 1;
}

function formatYear(ms) {
  return new Date(ms).toISOString().slice(0, 4);
}

function toMapxLayerId(id) {
  const value = String(id || "arco");
  return value.startsWith("MX-") ? value : `MX-${value}`;
}
