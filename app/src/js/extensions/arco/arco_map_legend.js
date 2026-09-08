import { Zartigl, resolveTimeInputSelection } from "@fxi/zartigl";
import {
  catalog,
  getCatalogEntry,
  formatVertical,
  resolveLocalizedText,
} from "@fxi/zartigl/catalog";
import { el } from "../../el_mapx";
import { ElementCreator } from "../../el/src/index.js";
import { maplibregl, settings as mxSettings } from "../../mx";
import { moduleLoad } from "../../modules_loader_async";
import { setClickHandler, debounce } from "../../mx_helper_misc";
import { ArcoChart } from "./chart.js";
import {
  ArcoColorDomainControl,
  isColorDomainEligible,
  resolveInitialColorDomain,
} from "./color_domain_control.js";
import { createPaletteDropdown } from "./palette_dropdown.js";
import { formatVerticalAxisLabel, orderVerticalValues } from "./vertical.js";
import { createVisibilityGate } from "../../app_visibility/index.js";
import "../shared/style.less";
import "./style.less";

const defaultOptions = {
  idView: null,
  map: null,
  layer: "ocean-current-velocity",
  source: "auto",
  elInputs: null,
  elLegend: null,
  title: "ARCO",
  subtitle: null,
  playbackInterval: 800,
  loop: true,
  geoVideo: null,
  maxPoints: 200,
  maxDepths: 50,
  settings: null,
  time: null,
  timeRange: null,
  depth: null,
  visible: true,
};

const playbackRates = [1, 2, 5, 10];

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
    this._opt.source = options.source ?? options.backend ?? this._opt.source;
    if (this._opt.geoVideo?.loop != null) {
      this._opt.loop = this._opt.geoVideo.loop;
    }
    this._chart_mode = "time";
    this._point = null;
    this._id_query = 0;
    this._status = null;
    this._playing = false;
    this._playbackRate = this._opt.geoVideo?.playbackRate ?? playbackRates[0];
    this._visibility = createVisibilityGate(
      this._opt.map?.getContainer?.() ?? null,
    );
    this._visible = this._visibility.isVisible();
    this._unsubscribeVisibility = this._visibility.subscribe((visible) => {
      this._setVisible(visible);
    });
    this._on_loading = () => this._setLoading(true);
    this._on_loaded = (meta) => {
      this._meta = meta;
      this._setLoading(false);
      this.renderLegend();
      this._syncColorDomainControl();
    };
    this._on_error = (error) => {
      this._setLoading(false);
      console.warn("ArcoMapLegend:", error);
    };
    this._on_status = (status) => {
      this._status = status;
      this._renderStatus();
    };
    this._on_time_change = (time) => {
      if (this._z?.getSource()?.type !== "geovideo") {
        return;
      }
      const now = performance.now();
      if (now - (this._lastVideoUiUpdate || 0) < 200) {
        return;
      }
      this._lastVideoUiUpdate = now;
      this._syncTime(time);
    };
    this._on_playback_change = (playing) => {
      if (this._z?.getSource()?.type !== "geovideo") {
        return;
      }
      this._setPlaying(playing);
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
    this._layer_def = resolveCatalogEntry(this._opt.layer, catalog);

    if (!this._layer_def) {
      throw new Error(`ARCO catalog layer '${this._opt.layer}' not found`);
    }
    this._layer_label = resolveLocalizedText(
      this._layer_def.title,
      mxSettings.language,
      catalog.defaultLocale,
    );

    const idView = this._opt.idView || "arco";
    const idLayer = toMapxLayerId(idView);
    this._id_layer = idLayer;
    this._z = new Zartigl({
      id: idLayer,
      map: this._opt.map,
      catalog: catalog,
      layer: this._layer_def.id,
      source: this._opt.source,
      settings: this._opt.settings || undefined,
      timeRange: this._opt.timeRange ?? undefined,
      time: this._opt.time ?? undefined,
      depth: this._opt.depth ?? undefined,
      visible: this._opt.visible,
      geoVideo: {
        autoplay: this._opt.geoVideo?.autoplay ?? false,
        loop: this._opt.loop,
        playbackRate: this._playbackRate,
      },
      before: mxSettings.layerBefore,
      metadata: {
        idView,
        idLayer,
        type: "arco",
        catalogLayer: this._layer_def.id,
        label: this._layer_label,
      },
    });
    this._z.on("loading", this._on_loading);
    this._z.on("loaded", this._on_loaded);
    this._z.on("error", this._on_error);
    this._z.on("status", this._on_status);
    this._z.on("timeChange", this._on_time_change);
    this._z.on("playbackChange", this._on_playback_change);

    if (!this._visible) {
      this._z.suspend();
    }

    await this._z.init();
    if (this.isDestroyed()) {
      return;
    }

    this._initialized = true;
    this._syncStateFromZartigl();

    this.build();
    this.renderLegend();
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this.stop();
    this._unsubscribeVisibility?.();
    this._visibility?.destroy();
    this.disablePick();
    this._z?.off("loading", this._on_loading);
    this._z?.off("loaded", this._on_loaded);
    this._z?.off("error", this._on_error);
    this._z?.off("status", this._on_status);
    this._z?.off("timeChange", this._on_time_change);
    this._z?.off("playbackChange", this._on_playback_change);
    this._z?.destroy();
    this._chart?.destroy();
    this._colorDomainControl?.destroy();
    this._paletteDropdown?.destroy();
    this._marker?.remove();
    this._marker = null;
    this.elTimeSlider?.noUiSlider?.destroy();
    this.elDepthSlider?.noUiSlider?.destroy();
    if (this._opt.elInputs) {
      this._opt.elInputs.innerHTML = "";
    }
    if (this._opt.elLegend) {
      this._opt.elLegend.innerHTML = "";
    }
  }

  isDestroyed() {
    return !!this._destroyed;
  }

  /**
   * Update any subset of the active zartigl configuration.
   * Layer aliases accepted by MapX are resolved to canonical catalog UUIDs.
   *
   * @param {import("@fxi/zartigl").ZartiglUpdate} change
   * @returns {Promise<void>}
   */
  async update(change) {
    if (!this._initialized || !this._z) {
      throw new Error("Call init() before update()");
    }

    const next = { ...change };
    let nextLayer = null;
    if (change.layer != null) {
      nextLayer = resolveCatalogEntry(change.layer, catalog);
      if (!nextLayer) {
        throw new Error(`ARCO catalog layer '${change.layer}' not found`);
      }
      next.layer = nextLayer.id;
    }

    const structural =
      change.layer != null ||
      change.source != null ||
      Object.prototype.hasOwnProperty.call(change, "timeRange");

    if (structural) {
      this.stop();
    }
    await this._z.update(next);
    if (this.isDestroyed()) {
      return;
    }

    if (nextLayer) {
      this._layer_def = nextLayer;
      this._layer_label = resolveLocalizedText(
        nextLayer.title,
        mxSettings.language,
        catalog.defaultLocale,
      );
      this._point = null;
      this._series = null;
      this._chart_mode = "time";
      this._marker?.remove();
      this._marker = null;
    }
    if (change.layer != null || change.source != null) {
      this._meta = null;
    }
    this._syncOptions(change, nextLayer);
    if (structural || change.time != null || change.depth != null) {
      this._syncStateFromZartigl();
    }
    if (structural) {
      if (!this.hasDepth() && this._chart_mode === "depth") {
        this._chart_mode = "time";
      }
      this._id_query++;
      this._rebuild();
      if (this._point) {
        void this.updateChart();
      }
      return;
    }

    if (change.time != null) {
      this._syncTime(this._time);
    }
    if (change.depth != null) {
      this._syncDepth(this._depth);
    }
    if (change.settings) {
      this._syncSettings(change.settings);
      if (
        "palette" in change.settings ||
        "logScale" in change.settings ||
        "colorDomain" in change.settings
      ) {
        this.renderLegend();
      }
      if ("colorDomain" in change.settings) {
        this._syncColorDomainControl();
      }
    }
    if (change.geoVideo) {
      this._syncPlaybackControls();
    }
  }

  _updateFromControl(change) {
    return this.update(change).catch((error) => {
      if (error?.name !== "AbortError" && !this.isDestroyed()) {
        this._on_error(error);
      }
    });
  }

  _syncOptions(change, nextLayer) {
    if (nextLayer) {
      this._opt.layer = nextLayer.id;
    }
    if (change.source != null) {
      this._opt.source = change.source;
    }
    if (Object.prototype.hasOwnProperty.call(change, "timeRange")) {
      this._opt.timeRange = change.timeRange;
    }
    if (change.time != null) {
      this._opt.time = change.time;
    }
    if (change.depth != null) {
      this._opt.depth = change.depth;
    }
    if (change.visible != null) {
      this._opt.visible = change.visible;
    }
    if (change.settings) {
      this._opt.settings = {
        ...(this._opt.settings || {}),
        ...change.settings,
      };
    }
    if (change.geoVideo) {
      this._opt.geoVideo = {
        ...(this._opt.geoVideo || {}),
        ...change.geoVideo,
      };
      if (change.geoVideo.loop != null) {
        this._opt.loop = change.geoVideo.loop;
      }
      if (change.geoVideo.playbackRate != null) {
        this._playbackRate = change.geoVideo.playbackRate;
      }
    }
  }

  _syncStateFromZartigl() {
    this._time_meta = this._z.getTimeMeta();
    this._depth_meta = this._z.getDepthMeta();
    this._depths = orderVerticalValues(
      this._depth_meta.values,
      this._depth_meta,
    );
    this._time = this._time_meta.current ?? this._time_meta.max;
    this._depth =
      this._depth_meta.current ?? this._depths[0] ?? this._opt.depth ?? 0;
    const appliedSettings = this._z.getDebugInfo?.().settings;
    if (appliedSettings) {
      this._opt.settings = { ...appliedSettings };
    }
  }

  _rebuild() {
    this._chart?.destroy();
    this._colorDomainControl?.destroy();
    this._paletteDropdown?.destroy();
    this.elTimeSlider?.noUiSlider?.destroy();
    this.elDepthSlider?.noUiSlider?.destroy();
    this._chart = null;
    this._colorDomainControl = null;
    this._paletteDropdown = null;
    this.build();
    this.renderLegend();
  }

  /**
   * Time
   */
  setTime(ms, opt = {}) {
    const { min, max } = this._time_meta;
    const time = Math.max(min, Math.min(max, ms));
    this._syncTime(time, opt);
    return this._updateFromControl({ time });
  }

  _syncTime(time, opt = {}) {
    this._time = time;
    if (!opt.fromSlider) {
      const index = nearestIndex(this._time_meta.values, this._time);
      this.elTimeSlider?.noUiSlider?.set(index);
    }
    this._updateTimeReadout(this._time);
    this._chart?.setCursor(this._time);
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
    return (
      this._time_meta.current ?? this._time_meta.max ?? this._time_meta.min
    );
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
    this._syncDepth(nearest, opt);
    return this._updateFromControl({ depth: nearest });
  }

  _syncDepth(nearest, opt = {}) {
    const index = nearestIndex(this._depths, nearest);
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
    this._setPlaying(true);
    if (this._z.getSource?.()?.type === "geovideo") {
      this._playGeoVideo();
      return;
    }
    if (this._visible) {
      this._tick();
    }
  }

  stop() {
    this._setPlaying(false);
    clearTimeout(this._id_timer);
    if (this._z?.getSource?.()?.type === "geovideo") {
      this._z.pause?.();
    }
  }

  stepNext(stop) {
    if (stop) {
      this.stop();
    }
    this.setTime(this._timeAtOffset(1, { wrap: true }));
  }

  stepPrevious(stop) {
    if (stop) {
      this.stop();
    }
    this.setTime(this._timeAtOffset(-1, { wrap: true }));
  }

  toggleLoop() {
    this._opt.loop = !this._opt.loop;
    this._syncPlaybackControls();
    void this._updateFromControl({ geoVideo: { loop: this._opt.loop } });
  }

  _cyclePlaybackRate() {
    const index = playbackRates.indexOf(this._playbackRate);
    this._playbackRate = playbackRates[(index + 1) % playbackRates.length];
    void this._updateFromControl({
      geoVideo: { playbackRate: this._playbackRate },
    });
    this._syncPlaybackRateButton();
  }

  _syncPlaybackRateButton() {
    if (!this.elButtonRate) {
      return;
    }
    const label = `${this._playbackRate}×`;
    this.elButtonRate.textContent = label;
    this.elButtonRate.title = `Playback rate: ${label}`;
  }

  _setPlaying(playing) {
    this._playing = playing;
    this._syncPlaybackControls();
  }

  _syncPlaybackControls() {
    this.elButtonPlay?.classList.toggle("playing", this._playing);
    this.elButtonLoop?.classList.toggle("active", this._opt.loop);
    this._syncPlaybackRateButton();
  }

  _playGeoVideo() {
    void this._z.play?.().catch((error) => {
      this._setPlaying(false);
      this._on_error(error);
    });
  }

  _timeAtOffset(offset, { wrap }) {
    const values = this._time_meta.values || [];
    if (values.length) {
      const currentIndex = nearestIndex(values, this._time);
      const targetIndex = currentIndex + offset;
      if (!wrap && (targetIndex < 0 || targetIndex >= values.length)) {
        return null;
      }
      const wrappedIndex =
        ((targetIndex % values.length) + values.length) % values.length;
      return values[wrappedIndex];
    }

    const target = this._time + this._timeStep() * offset;
    if (target > this._time_meta.max) {
      return wrap ? this._time_meta.min : null;
    }
    if (target < this._time_meta.min) {
      return wrap ? this._time_meta.max : null;
    }
    return target;
  }

  _tick() {
    clearTimeout(this._id_timer);
    if (!this._visible) {
      return;
    }
    this._id_timer = setTimeout(() => {
      if (this.isDestroyed() || !this._playing || !this._visible) {
        return;
      }
      // backpressure : do not advance while chunks are loading
      if (!this._loading) {
        const next = this._timeAtOffset(this._playbackRate, {
          wrap: this._opt.loop,
        });
        if (next === null) {
          if (this._time !== this._time_meta.max) {
            this.setTime(this._time_meta.max);
          }
          this.stop();
          return;
        }
        this.setTime(next);
      }
      this._tick();
    }, this._opt.playbackInterval);
  }

  _setVisible(visible) {
    if (visible === this._visible || this.isDestroyed()) {
      return;
    }
    this._visible = visible;
    if (!visible) {
      clearTimeout(this._id_timer);
      this._z?.suspend();
      return;
    }
    this._z?.resume();
    if (this._playing) {
      if (this._z?.getSource?.()?.type === "geovideo") {
        this._playGeoVideo();
      } else {
        this._tick();
      }
    }
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
    const unit = this._z.getVariableMeta().units || this._meta?.unit || "";
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
        label: this._layer_label,
        verticalLabel: formatVerticalAxisLabel(this._depth_meta, this._depths),
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
    const { u, v } = zarrVariables(this._layer_def) || {};
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
    return this._updateFromControl({ settings });
  }

  _syncSettings(settings) {
    if (!this._settings) {
      return;
    }
    for (const [key, value] of Object.entries(settings)) {
      this._settings[key] = value;
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
    const { el } = new ElementCreator({ document: elLegend.ownerDocument });
    let content = null;

    if (legend.type === "image" && legend.url) {
      content = el("img", {
        src: legend.url,
        alt: this._layer_label,
      });
    } else if (legend.type === "gradient") {
      const palette = this._z
        .getPalettes()
        .find((candidate) => candidate.id === legend.palette);
      const colors = palette?.colors;
      if (!colors?.length) {
        return;
      }
      const elBar = el("div", {
        class: "arco--legend_bar",
        style: {
          background: `linear-gradient(to right, ${colors.join(", ")})`,
        },
      });
      const format = (value) =>
        Number.isFinite(value) ? Number(value).toPrecision(3) : "";
      const elMeta = el("div", { class: "arco--legend_meta" }, [
        el("span", format(legend.min)),
        el("span", legend.unit || ""),
        el("span", format(legend.max)),
      ]);
      content = el("div", { class: "arco--legend" }, [elBar, elMeta]);
    }

    if (!content) {
      return;
    }
    elLegend.replaceChildren(content);
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
      "span",
      { class: "arco--subtitle" },
      this._opt.subtitle || this._layer_label,
    );
    this.elStatusText = el("span", {
      class: "arco--status",
      "aria-live": "polite",
    });
    const elSubtitleLine = el("div", { class: "arco--subtitle_line" }, [
      elSubtitle,
      this.elStatusText,
    ]);
    this._renderStatus();
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
      el("div", [elTitle, elSubtitleLine]),
      elButtonSettings,
    ]);
  }

  _renderStatus() {
    if (!this.elStatusText || !this._status) {
      return;
    }
    const status = this._status;
    let text = status.phase;
    let detail = "";
    switch (status.phase) {
      case "metadata":
        text = "fetching metadata";
        break;
      case "fetching":
        text = `fetching ${status.completed}/${status.total}`;
        break;
      case "blocked":
        detail = status.message || "";
        break;
      case "error":
        detail = status.error?.message || "";
        break;
    }
    this.elStatusText.textContent = ` · ${text}`;
    if (detail) {
      this.elStatusText.title = detail;
    } else {
      this.elStatusText.removeAttribute("title");
    }
  }

  isVector() {
    return this._layer_def.kind === "vector";
  }

  _buildTimeRow() {
    const { values } = this._time_meta;
    // continuous playback only for scalar layers : vector layers
    // reload the velocity field at each step, no frame cache
    const playback = !this.isVector();

    this.elTimeInput = this._buildDateInput();
    this.elTimeSlider = el("div", { class: "arco--time_slider" });
    if (values.length > 1) {
      this._noUiSlider.create(this.elTimeSlider, {
        range: { min: 0, max: values.length - 1 },
        start: nearestIndex(values, this._time),
        step: 1,
        connect: [true, false],
        behaviour: "drag",
        pips: {
          mode: "count",
          values: Math.min(4, values.length),
          density: 100,
          stepped: true,
          format: {
            to: (index) =>
              formatTimeTick(
                values[Math.round(index)],
                this._time_meta.granularity,
              ),
          },
        },
      });
      this.elTimeSlider.noUiSlider.on("update", (sliderValues) => {
        this._updateTimeReadout(values[Math.round(Number(sliderValues[0]))]);
      });
      this.elTimeSlider.noUiSlider.on("change", (sliderValues) => {
        this.stop();
        this.setTime(values[Math.round(Number(sliderValues[0]))], {
          fromSlider: true,
        });
      });
    } else {
      this.elTimeSlider.classList.add("disabled");
    }

    const navigationEnabled = values.length > 1;
    const transportEnabled =
      navigationEnabled || this._time_meta.timelineKind === "snapshot-loop";
    const elButtons = this._buildPlayerButtons(playback, {
      navigationEnabled,
      transportEnabled,
    });

    return el("div", { class: "arco--time_row" }, [
      el("div", { class: "arco--time_header" }, [
        el("div", { class: "arco--readout" }, [
          el("label", timeInputLabel(this._time_meta.granularity)),
          this.elTimeInput,
        ]),
        elButtons,
      ]),
      el("div", { class: "arco--time_controls" }, this.elTimeSlider),
    ]);
  }

  _buildPlayerButtons(
    playback,
    { navigationEnabled = true, transportEnabled = navigationEnabled } = {},
  ) {
    const elButtonPrevious = el(
      "button",
      {
        class: ["btn", "btn-default"],
        disabled: navigationEnabled ? null : true,
        title: "Previous",
        on: { click: () => this.stepPrevious(true) },
      },
      el("i", { class: ["fa", "fa-step-backward"] }),
    );
    const elButtonNext = el(
      "button",
      {
        class: ["btn", "btn-default"],
        disabled: navigationEnabled ? null : true,
        title: "Next",
        on: { click: () => this.stepNext(true) },
      },
      el("i", { class: ["fa", "fa-step-forward"] }),
    );

    if (playback) {
      this.elButtonPlay = el(
        "button",
        {
          class: ["btn", "btn-default", this._playing ? "playing" : null],
          disabled: transportEnabled ? null : true,
          title: "Play",
          on: { click: () => this.play() },
        },
        el("i", { class: ["fa", "fa-play"] }),
      );
      this.elButtonLoop = el(
        "button",
        {
          class: ["btn", "btn-default", this._opt.loop ? "active" : null],
          disabled: transportEnabled ? null : true,
          title: "Loop",
          on: { click: () => this.toggleLoop() },
        },
        el("i", { class: ["fa", "fa-repeat"] }),
      );
      this.elButtonRate = el(
        "button",
        {
          class: ["btn", "btn-default", "arco--playback_rate"],
          disabled: transportEnabled ? null : true,
          on: { click: () => this._cyclePlaybackRate() },
        },
        `${this._playbackRate}×`,
      );
      this._syncPlaybackControls();
    }

    return el("div", { class: "arco--player_buttons" }, [
      elButtonPrevious,
      this.elButtonPlay,
      playback
        ? el(
            "button",
            {
              class: ["btn", "btn-default"],
              disabled: transportEnabled ? null : true,
              title: "Stop",
              on: { click: () => this.stop() },
            },
            el("i", { class: ["fa", "fa-stop"] }),
          )
        : null,
      elButtonNext,
      this.elButtonLoop,
      this.elButtonRate,
    ]);
  }

  _buildDateInput() {
    const { granularity, min, max, values } = this._time_meta;
    const onChange = (event) => {
      const time = resolveTimeInputSelection(
        values,
        event.target.value,
        granularity,
      );
      if (time === undefined) {
        return;
      }
      this.stop();
      this.setTime(time);
    };
    if (granularity === "year") {
      const years = [
        ...new Set(values.map((time) => new Date(time).getUTCFullYear())),
      ];
      return el(
        "select",
        {
          class: ["form-control", "arco--date_input"],
          "aria-label": "Year",
          disabled: values.length > 1 ? null : true,
          on: { change: onChange },
        },
        years.map((year) => el("option", { value: year }, String(year))),
      );
    }
    const type =
      granularity === "month"
        ? "month"
        : granularity === "day"
          ? "date"
          : "datetime-local";
    return el("input", {
      type,
      class: ["form-control", "arco--date_input"],
      min: timeInputValue(min, granularity),
      max: timeInputValue(max, granularity),
      step: timeInputStep(this._time_meta),
      disabled: values.length > 1 ? null : true,
      "aria-label": timeInputLabel(granularity),
      on: { change: onChange },
    });
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
    const axisLabel = formatVerticalAxisLabel(this._depth_meta, depths);

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
        el("label", axisLabel),
        this.elDepthReadout,
      ]),
      this.elDepthSlider,
      el("span", { class: "arco--depth_units" }, units || "m"),
    ]);
  }

  _buildChartCol() {
    const unit = this._z.getVariableMeta().units || "";
    const verticalLabel = formatVerticalAxisLabel(
      this._depth_meta,
      this._depths,
    );
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
        title: `${verticalLabel} profile at picked point`,
        on: { click: () => this.setChartMode("depth") },
      },
      verticalLabel,
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
    const dynamicStyle = this._z.supportsDynamicStyle();
    const renderMode =
      settings.renderMode ?? defaults.renderMode ?? "particles";

    this._settings = {
      palette: settings.palette ?? defaults.palette,
      opacity: settings.opacity ?? raster.opacity ?? 1,
      vibrance: settings.vibrance ?? raster.vibrance ?? 0,
      logScale: settings.logScale ?? raster.logScale ?? false,
      colorDomain: resolveInitialColorDomain(settings, raster),
      particleDensity: settings.particleDensity ?? particles.density ?? 0.01,
      speed: settings.speed ?? particles.speed ?? 1,
      fade: settings.fade ?? particles.fade ?? 0.7,
      renderMode,
    };

    const rows = [
      dynamicStyle ? this._buildPaletteRow(defaults) : null,
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
      dynamicStyle
        ? this._buildRangeRow({
            label: "Vibrance",
            min: -1,
            max: 1,
            step: 0.01,
            get: () => this._settings.vibrance,
            set: (value) => {
              this._settings.vibrance = value;
              this.updateSettings({ vibrance: value });
            },
          })
        : null,
      dynamicStyle
        ? this._buildCheckboxRow({
            label: "Log scale",
            get: () => this._settings.logScale,
            set: (value) => {
              this._settings.logScale = value;
              this.updateSettings({ logScale: value });
            },
          })
        : null,
    ];

    this._colorDomainControl?.destroy();
    this._colorDomainControl = null;
    if (
      dynamicStyle &&
      isColorDomainEligible({
        kind: this._layer_def.kind,
        backend: this._z.getSource()?.type,
        dynamicStyle,
      })
    ) {
      this._colorDomainControl = new ArcoColorDomainControl({
        document: this._opt.elInputs.ownerDocument,
        onChange: (colorDomain) => this.updateSettings({ colorDomain }),
      });
      this._syncColorDomainControl();
      rows.push(this._colorDomainControl.elRoot);
    }

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
          label: "Speed",
          min: 0.1,
          max: 8,
          step: 0.1,
          get: () => this._settings.speed,
          set: (value) => {
            this._settings.speed = value;
            this.updateSettings({ speed: value });
          },
        }),
        this._buildRangeRow({
          label: "Fade",
          min: 0,
          max: 1,
          step: 0.01,
          get: () => this._settings.fade,
          set: (value) => {
            this._settings.fade = value;
            this.updateSettings({ fade: value });
          },
        }),
        this._buildSelectRow({
          label: "Render mode",
          value: this._settings.renderMode,
          options: [
            ["particles", "Particles"],
            ["raster", "Raster"],
            ["raster+particles", "Raster + particles"],
          ],
          set: (value) => this.updateSettings({ renderMode: value }),
        }),
      );
    }

    this._elSettings = el(
      "div",
      { class: "arco--settings" },
      rows.filter(Boolean),
    );
    return this._elSettings;
  }

  _syncColorDomainControl() {
    if (!this._colorDomainControl || !this._settings) {
      return;
    }
    const min = this._meta?.min;
    const max = this._meta?.max;
    const frameDomain =
      Number.isFinite(min) && Number.isFinite(max) && min <= max
        ? [min, max]
        : null;
    this._colorDomainControl.sync({
      colorDomain: this._settings.colorDomain,
      frameDomain,
    });
  }

  _buildPaletteRow(defaults) {
    const palettes = this._z.getPalettes();
    const paletteDefault =
      this._settings.palette || defaults.palette || palettes[0]?.id;
    this._paletteDropdown?.destroy();
    const elPalette = createPaletteDropdown({
      document: this._opt.elInputs.ownerDocument,
      palettes,
      value: paletteDefault,
      onChange: (value) => {
        this._settings.palette = value;
        this.updateSettings({ palette: value });
      },
    });
    this._paletteDropdown = elPalette;
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

  _buildSelectRow({ label, value, options, set }) {
    const elInput = el(
      "select",
      {
        class: "form-control",
        on: { change: (event) => set(event.target.value) },
      },
      options.map(([optionValue, optionLabel]) =>
        el(
          "option",
          {
            value: optionValue,
            selected: optionValue === value ? true : null,
          },
          optionLabel,
        ),
      ),
    );
    return el("div", { class: "arco--settings_row" }, [
      el("label", label),
      elInput,
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
      this.elTimeReadout.innerText = formatDateTime(
        ms,
        this._time_meta.granularity,
      );
    }
    if (this.elTimeInput) {
      this.elTimeInput.value = timeInputValue(ms, this._time_meta.granularity);
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

function formatDateTime(ms, granularity = "minute") {
  const iso = new Date(ms).toISOString();
  if (granularity === "year") {
    return iso.slice(0, 4);
  }
  if (granularity === "month") {
    return iso.slice(0, 7);
  }
  if (granularity === "day") {
    return iso.slice(0, 10);
  }
  if (granularity === "second") {
    return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
  }
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function timeInputLabel(granularity) {
  if (granularity === "year") {
    return "Year";
  }
  if (granularity === "month") {
    return "Month";
  }
  if (granularity === "day") {
    return "Date";
  }
  return "Date & time";
}

function timeInputValue(ms, granularity) {
  const iso = new Date(ms).toISOString();
  if (granularity === "year") {
    return iso.slice(0, 4);
  }
  if (granularity === "month") {
    return iso.slice(0, 7);
  }
  if (granularity === "day") {
    return iso.slice(0, 10);
  }
  return iso.slice(0, granularity === "second" ? 19 : 16);
}

function timeInputStep(meta) {
  if (meta.granularity === "second") {
    return Math.max(1, (meta.step || 1000) / 1000);
  }
  if (meta.granularity === "minute" || meta.granularity === "hour") {
    return Math.max(60, (meta.step || 60000) / 1000);
  }
  return 1;
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

function formatTimeTick(ms, granularity) {
  const iso = new Date(ms).toISOString();
  if (granularity === "year") {
    return iso.slice(0, 4);
  }
  if (granularity === "month") {
    return iso.slice(0, 7);
  }
  if (granularity === "day") {
    return iso.slice(0, 10);
  }
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`;
}

function toMapxLayerId(id) {
  const value = String(id || "arco");
  return value.startsWith("MX-") ? value : `MX-${value}`;
}

/**
 * zartigl catalog entries are keyed by UUID; the human-readable slugs
 * previously used as ids (e.g. "ocean-current-velocity") now only live in
 * `entry.aliases`, so fall back to matching those for existing configs.
 */
function resolveCatalogEntry(id, data) {
  return (
    getCatalogEntry(id, data) ??
    data.layers.find((entry) => entry.aliases?.includes(id))
  );
}

function zarrVariables(layerDef) {
  return layerDef.sources.find((source) => source.type === "zarr")?.variables;
}
