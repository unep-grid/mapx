import {
  LEGACY_STYLE_SETTINGS,
  Zartigl,
  resolveTimeInputSelection,
  splitLegacySettings,
} from "@fxi/zartigl";
import {
  catalog,
  getCatalogEntry,
  formatVertical,
  mergeStyles,
  resolveEntryStyle,
  resolveLocalizedText,
} from "@fxi/zartigl/catalog";
import { el } from "../../el_mapx";
import { ElementCreator } from "../../el/src/index.js";
import { maplibregl, settings as mxSettings } from "../../mx";
import { moduleLoad } from "../../modules_loader_async";
import { setClickHandler, debounce } from "../../mx_helper_misc";
import { getDictItem } from "../../language";
import { ArcoChart, formatValue } from "./chart.js";
import {
  ArcoColorDomainControl,
  isColorDomainEligible,
} from "./color_domain_control.js";
import { createPaletteDropdown } from "./palette_dropdown.js";
import { TimeScrub } from "./time_scrub.js";
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
  loop: true,
  geoVideo: null,
  maxPoints: 200,
  maxDepths: 50,
  style: null,
  settings: null,
  time: null,
  timeRange: null,
  depth: null,
  visible: true,
};

/** Playback speed in time steps per second; zartigl owns the offered speeds. */
const defaultPlaybackSpeed = 2;

/**
 * ARCO map legend : animated Zarr ocean data (zartigl) with time/depth
 * navigation and point series chart.
 *
 * Independent from BaseTimeMapLegend : zartigl owns the layer lifecycle,
 * time/depth metadata and legend data, only the conventions are shared.
 */
const warnedSettings = new Set();

/**
 * Move deprecated flat style settings (`opacity`, `particleDensity`…) to
 * the style, warning once per key: `style` wins over them, else they patch
 * `base`. `settings` keeps engine tuning only.
 *
 * @param {{style?: object | null, settings?: object | null}} change
 * @param {object} [base] Current style override.
 * @returns {{style: object | undefined, settings: object | undefined}}
 */
export function withLegacySettings({ style, settings }, base) {
  const legacy = splitLegacySettings(settings ?? undefined);
  for (const key of legacy.legacyKeys) {
    if (!warnedSettings.has(key)) {
      warnedSettings.add(key);
      console.warn(
        `ArcoMapLegend: settings.${key} is deprecated: use ${LEGACY_STYLE_SETTINGS[key]}`,
      );
    }
  }
  const tuning = Object.keys(legacy.settings).length
    ? legacy.settings
    : undefined;
  if (!legacy.legacyKeys.length) {
    return { style: style ?? undefined, settings: tuning };
  }
  return {
    style:
      style == null
        ? mergeStyles(base, legacy.style)
        : mergeStyles(legacy.style, style),
    settings: tuning,
  };
}

export class ArcoMapLegend {
  constructor(options) {
    this._opt = { ...defaultOptions, ...options };
    const { style, settings } = withLegacySettings(this._opt);
    /** Style override over the layer's own. */
    this._opt.style = style ?? {};
    this._opt.settings = settings ?? null;
    this._opt.source = options.source ?? options.backend ?? this._opt.source;
    if (this._opt.geoVideo?.loop != null) {
      this._opt.loop = this._opt.geoVideo.loop;
    }
    this._chart_mode = "time";
    this._point = null;
    this._id_query = 0;
    this._id_time = 0;
    this._status = null;
    this._playing = false;
    this._playbackSpeed =
      this._opt.geoVideo?.stepsPerSecond ?? defaultPlaybackSpeed;
    this._visibility = createVisibilityGate(
      this._opt.map?.getContainer?.() ?? null,
    );
    this._visible = this._visibility.isVisible();
    this._unsubscribeVisibility = this._visibility.subscribe((visible) => {
      this._setVisible(visible);
    });
    this._pending_updates = 0;
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
    // GeoVideo reports its time only while it plays : when paused, the
    // requested step owns the visible date, even if the frame lags.
    this._on_time_change = (time) => {
      if (!this._playing || this._scrub.interacting) {
        return;
      }
      const now = performance.now();
      if (now - (this._lastVideoUiUpdate || 0) < 200) {
        return;
      }
      this._lastVideoUiUpdate = now;
      this._syncTime(time);
    };
    // zartigl owns the playing state : it stops playback on a date, step or
    // depth change, a source change, or the end of the timeline.
    this._on_playback_change = (playing) => {
      if (this._scrub.interacting) {
        return;
      }
      // Paused (end, chunk handoff, navigation) : show the date of the
      // last played frame, which the throttled time sync may have skipped.
      if (!playing && this._playing) {
        this._syncTime(this._z.getTimeMeta().current ?? this._time);
      }
      this._setPlaying(playing);
    };
    // Slider drag : keep the playing state, seek live, resume on release
    this._scrub = new TimeScrub({
      isPlaying: () => this._playing,
      pause: () => {
        this._scrub_resume = null;
        this._suspendPlayback();
      },
      present: (time) => this._syncTime(time, { fromSlider: true }),
      apply: (time) => {
        this._scrub_seek = this._updateFromControl({ time });
      },
      live: () => this._playbackState().available,
      finish: (_time, resume) => {
        if (this._refresh_pending) {
          this._refresh_pending = false;
          this._syncStateFromZartigl({ keepTime: true });
          this._refreshAfterSourceChange();
        }
        if (resume && this._playing) {
          this._resumeAfterSeek();
        }
      },
    });
    // A source change made by zartigl itself, such as a fallback after a
    // GeoVideo failure; changes made through update() resync there.
    this._on_source_change = () => {
      if (this._pending_updates > 0 || !this._elContainer) {
        return;
      }
      this._syncStateFromZartigl();
      this._refreshAfterSourceChange();
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
      style: this._opt.style,
      settings: this._opt.settings || undefined,
      timeRange: this._opt.timeRange ?? undefined,
      time: this._opt.time ?? undefined,
      depth: this._opt.depth ?? undefined,
      visible: this._opt.visible,
      geoVideo: {
        autoplay: this._opt.geoVideo?.autoplay ?? false,
        loop: this._opt.loop,
        stepsPerSecond: this._playbackSpeed,
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
    this._z.on("sourceChange", this._on_source_change);

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
    this._z?.off("sourceChange", this._on_source_change);
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

    const { style, settings } = withLegacySettings(change, this._opt.style);
    const next = { ...change, style, settings };
    const idTime = change.time != null ? ++this._id_time : this._id_time;
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
    const sourceBefore = this._z.getSource?.();
    this._pending_updates++;
    try {
      await this._z.update(next);
    } finally {
      this._pending_updates--;
    }
    if (this.isDestroyed()) {
      return;
    }
    // A date or depth change can move between GeoVideo and Zarr.
    const sourceAfter = this._z.getSource?.();
    const sourceChanged =
      sourceBefore?.id !== sourceAfter?.id ||
      sourceBefore?.type !== sourceAfter?.type;

    if (nextLayer) {
      this._layer_def = nextLayer;
      this._layer_label = resolveLocalizedText(
        nextLayer.title,
        mxSettings.language,
        catalog.defaultLocale,
      );
      this._point = null;
      this._chart_mode = "time";
      this._marker?.remove();
      this._marker = null;
    }
    if (change.layer != null || change.source != null) {
      this._meta = null;
    }
    this._syncOptions(next, nextLayer);
    // A newer time request owns the visible date : an older one resolving
    // late must not move it back.
    const keepTime = idTime !== this._id_time;
    if (structural || sourceChanged) {
      this._syncStateFromZartigl({ keepTime });
    } else if (change.time != null || change.depth != null) {
      this._syncAxesFromZartigl({ keepTime });
    }
    if (structural || sourceChanged) {
      this._refreshAfterSourceChange();
      return;
    }

    // While scrubbing, the slider owns the time : a resolved, older seek must
    // not move the handle back.
    if (change.time != null && !keepTime && !this._scrub.interacting) {
      this._syncTime(this._time);
    }
    if (change.depth != null) {
      this._syncDepth(this._depth);
    }
    if (style !== undefined) {
      this._syncStyle();
      this.renderLegend();
      this._syncColorDomainControl();
    }
    if (change.geoVideo) {
      this._syncPlaybackControls();
    }
  }

  /**
   * Rebuild the controls for the time, depth and playback of a new source.
   * A slider being dragged is rebuilt once released.
   */
  _refreshAfterSourceChange() {
    if (this._scrub.interacting) {
      this._refresh_pending = true;
      this._syncPlaybackControls();
      return;
    }
    if (!this.hasDepth() && this._chart_mode === "depth") {
      this._chart_mode = "time";
    }
    this._id_query++;
    this._rebuild();
    if (this._point) {
      void this.updateChart();
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
    if (change.style !== undefined) {
      this._opt.style = change.style;
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
      if (change.geoVideo.stepsPerSecond != null) {
        this._playbackSpeed = change.geoVideo.stepsPerSecond;
      }
    }
  }

  _syncStateFromZartigl(opt) {
    this._syncAxesFromZartigl(opt);
    // A layer switch keeps only the override keys the new layer draws.
    const override = this._z.getStyleOverride?.();
    if (override) {
      this._opt.style = override;
    }
    this._syncStyle();
  }

  /** The style drawn, as the settings panel shows it. */
  _syncStyle() {
    if (this._layer_def) {
      this._style = resolveEntryStyle(this._layer_def, this._opt.style);
    }
  }

  /**
   * Time and depth state only : cheap enough for every playback or scrub
   * step, unlike getDebugInfo() which reads layout.
   */
  _syncAxesFromZartigl({ keepTime = false } = {}) {
    this._time_meta = this._z.getTimeMeta();
    this._depth_meta = this._z.getDepthMeta();
    this._depths = orderVerticalValues(
      this._depth_meta.values,
      this._depth_meta,
    );
    if (!keepTime && !this._scrub.interacting) {
      this._time = this._time_meta.current ?? this._time_meta.max;
    }
    this._depth =
      this._depth_meta.current ?? this._depths[0] ?? this._opt.depth ?? 0;
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
    const pending = this._updateFromControl({ time });
    // zartigl steps from the time just requested.
    this._syncStepButtons();
    return pending;
  }

  _syncTime(time, opt = {}) {
    this._time = time;
    if (!opt.fromSlider) {
      const index = nearestIndex(this._time_meta.values, this._time);
      this.elTimeSlider?.noUiSlider?.set(index);
    }
    this._updateTimeReadout(this._time);
    this._syncStepButtons();
    if (this._chart_mode === "time") {
      this._chart?.setCursor(this._time);
    }
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
    if (!this._point) {
      return;
    }
    // The profile already holds every depth; the time series depends on it
    if (this._chart_mode === "depth") {
      this._chart?.setCursor(nearest);
      this._updateValueReadout();
    } else {
      this._update_chart_debounced();
    }
  }

  /**
   * Playback : GeoVideo only, owned by zartigl. Date, step and depth
   * navigation stay available on every source.
   */
  _playbackState() {
    return (
      this._z?.getPlaybackState?.() ?? {
        available: false,
        playing: false,
        loop: this._opt.loop,
        stepsPerSecond: this._playbackSpeed,
        speeds: [],
      }
    );
  }

  play() {
    if (this._playing || !this._playbackState().available) {
      return;
    }
    this._setPlaying(true);
    if (this._visible) {
      this._playGeoVideo();
    }
  }

  stop() {
    this._scrub_resume = null;
    this._scrub.cancel();
    this._setPlaying(false);
    this._suspendPlayback();
  }

  /**
   * Pause zartigl without changing the playing state, as during a scrub.
   */
  _suspendPlayback() {
    this._z?.pause?.();
  }

  /**
   * Resume once the released seek applied : it may load another artifact,
   * whose new layer would otherwise drop a playback resumed too early. A
   * stop or a new scrub meanwhile cancels the resume.
   */
  _resumeAfterSeek() {
    const token = Symbol("resume");
    this._scrub_resume = token;
    void Promise.resolve(this._scrub_seek).then(() => {
      if (this._scrub_resume !== token || this.isDestroyed()) {
        return;
      }
      this._scrub_resume = null;
      this._setPlaying(true);
      this._resumePlayback();
    });
  }

  _resumePlayback() {
    // The scrub may have left GeoVideo, which then cannot resume.
    if (!this._playbackState().available) {
      this._setPlaying(false);
      return;
    }
    if (this._visible) {
      this._playGeoVideo();
    }
  }

  /**
   * Manual navigation : one time step, stopping playback. zartigl resolves
   * the step and keeps it inside the timeline.
   */
  stepNext() {
    this._step(1);
  }

  stepPrevious() {
    this._step(-1);
  }

  _step(offset) {
    const time = this._z?.getSteppedTime?.(offset);
    this.stop();
    if (time !== undefined) {
      this.setTime(time);
    }
  }

  _syncStepButtons() {
    if (this.elButtonPrevious) {
      this.elButtonPrevious.disabled =
        this._z?.getSteppedTime?.(-1) === undefined;
    }
    if (this.elButtonNext) {
      this.elButtonNext.disabled = this._z?.getSteppedTime?.(1) === undefined;
    }
  }

  toggleLoop() {
    if (!this._playbackState().available) {
      return;
    }
    this._opt.loop = !this._opt.loop;
    this._syncPlaybackControls();
    void this._updateFromControl({ geoVideo: { loop: this._opt.loop } });
  }

  _cyclePlaybackSpeed() {
    const { available, speeds, stepsPerSecond } = this._playbackState();
    if (!available || !speeds.length) {
      return;
    }
    const index = speeds.indexOf(stepsPerSecond);
    this._playbackSpeed = speeds[(index + 1) % speeds.length];
    this._syncPlaybackRateButton(this._playbackSpeed);
    void this._updateFromControl({
      geoVideo: { stepsPerSecond: this._playbackSpeed },
    });
  }

  _syncPlaybackRateButton(speed = this._playbackState().stepsPerSecond) {
    if (!this.elButtonRate) {
      return;
    }
    this.elButtonRate.textContent = `${speed}/s`;
  }

  _setPlaying(playing) {
    this._playing = playing;
    this._syncPlaybackControls();
  }

  /** Playback controls stay visible, disabled where zartigl cannot play. */
  _syncPlaybackControls() {
    const disabled = !this._playbackState().available;
    for (const elButton of [
      this.elButtonPlay,
      this.elButtonStop,
      this.elButtonLoop,
      this.elButtonRate,
    ]) {
      if (elButton) {
        elButton.disabled = disabled;
      }
    }
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

  _setVisible(visible) {
    if (visible === this._visible || this.isDestroyed()) {
      return;
    }
    this._visible = visible;
    if (!visible) {
      this._z?.suspend();
      return;
    }
    this._z?.resume();
    if (this._playing && !this._scrub.interacting) {
      this._resumePlayback();
    }
  }

  _setLoading(loading) {
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
      this._updateValueReadout();
      return;
    }
    const idQuery = ++this._id_query;
    const mode = this._chart_mode;
    const unit = this._z.getVariableMeta().units || this._meta?.unit || "";
    try {
      this._chart.showMessage("Loading…");
      this._updateValueReadout();
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
      this._chart.setSeries({
        data: result.points.map((point) => [
          point.axisValue,
          this._sampleValue(point.values),
        ]),
        mode: mode,
        unit: unit,
        label: this._layer_label,
        verticalLabel: formatVerticalAxisLabel(this._depth_meta, this._depths),
      });
      this._chart.setCursor(mode === "time" ? this._time : this.getDepth());
      this._updateValueReadout();
    } catch (error) {
      if (idQuery === this._id_query && !this.isDestroyed()) {
        this._chart.showMessage(`Query failed : ${error.message || error}`);
        this._updateValueReadout();
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
    // The series is decimated : read the drawn line, not the nearest sample
    const cursor = this._chart_mode === "time" ? this._time : this.getDepth();
    this.elValue.innerText = formatValue(this._chart?.valueAt(cursor));
  }

  /**
   * Patch the style override, e.g. `{ raster: { opacity: 0.5 } }`.
   *
   * @param {import("@fxi/zartigl/catalog").LayerStyleInput} patch
   * @returns {Promise<void>}
   */
  updateStyle(patch) {
    this._opt.style = mergeStyles(this._opt.style, patch);
    this._syncStyle();
    return this._updateFromControl({ style: this._opt.style });
  }

  /**
   * @deprecated Use updateStyle(); flat style keys move to the style.
   */
  updateSettings(settings) {
    return this._updateFromControl({ settings });
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
    return this._layer_def?.kind === "vector";
  }

  _buildTimeRow() {
    const { values } = this._time_meta;

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
      const sliderTime = (sliderValues) =>
        values[Math.round(Number(sliderValues[0]))];
      this.elTimeSlider.noUiSlider.on("start", () => this._scrub.begin());
      this.elTimeSlider.noUiSlider.on("slide", (sliderValues) => {
        this._scrub.request(sliderTime(sliderValues));
      });
      this.elTimeSlider.noUiSlider.on("change", (sliderValues) => {
        // A tap on the track fires 'change' without 'start' / 'end'
        const tap = !this._scrub.interacting;
        this._scrub.begin();
        this._scrub.request(sliderTime(sliderValues));
        if (tap) {
          this._scrub.end();
        }
      });
      this.elTimeSlider.noUiSlider.on("end", () => this._scrub.end());
    } else {
      this.elTimeSlider.classList.add("disabled");
    }

    const elButtons = this._buildPlayerButtons();

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

  /**
   * Step buttons navigate on every source; play, stop, loop and rate stay
   * visible and are disabled where zartigl cannot play.
   */
  _buildPlayerButtons() {
    this.elButtonPrevious = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Previous",
        on: { click: () => this.stepPrevious() },
      },
      el("i", { class: ["fa", "fa-step-backward"] }),
    );
    this.elButtonNext = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Next",
        on: { click: () => this.stepNext() },
      },
      el("i", { class: ["fa", "fa-step-forward"] }),
    );
    this.elButtonPlay = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Play",
        on: { click: () => this.play() },
      },
      el("i", { class: ["fa", "fa-play"] }),
    );
    this.elButtonStop = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Stop",
        on: { click: () => this.stop() },
      },
      el("i", { class: ["fa", "fa-stop"] }),
    );
    this.elButtonLoop = el(
      "button",
      {
        class: ["btn", "btn-default"],
        title: "Loop",
        on: { click: () => this.toggleLoop() },
      },
      el("i", { class: ["fa", "fa-repeat"] }),
    );
    this.elButtonRate = el("button", {
      class: ["btn", "btn-default", "arco--playback_rate"],
      dataset: { lang_key: "arco_playback_speed", lang_type: "title" },
      on: { click: () => this._cyclePlaybackSpeed() },
    });
    const elButtonRate = this.elButtonRate;
    void getDictItem("arco_playback_speed").then((title) => {
      elButtonRate.title = title;
    });
    this._syncPlaybackControls();
    this._syncStepButtons();

    return el("div", { class: "arco--player_buttons" }, [
      this.elButtonPrevious,
      this.elButtonPlay,
      this.elButtonStop,
      this.elButtonNext,
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
    const isVector = this.isVector();
    const dynamicStyle = this._z.supportsDynamicStyle();
    this._syncStyle();

    const rows = [
      dynamicStyle ? this._buildPaletteRow() : null,
      this._buildRangeRow({
        label: "Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        get: () => this._style.raster.opacity,
        set: (value) => this.updateStyle({ raster: { opacity: value } }),
      }),
      dynamicStyle
        ? this._buildRangeRow({
            label: "Vibrance",
            min: -1,
            max: 1,
            step: 0.01,
            get: () => this._style.raster.vibrance,
            set: (value) => this.updateStyle({ raster: { vibrance: value } }),
          })
        : null,
      dynamicStyle
        ? this._buildCheckboxRow({
            label: "Log scale",
            get: () => this._style.raster.logScale,
            set: (value) => this.updateStyle({ raster: { logScale: value } }),
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
        onChange: (colorDomain) =>
          this.updateStyle({ raster: { colorDomain } }),
      });
      this._syncColorDomainControl();
      rows.push(this._colorDomainControl.elRoot);
    }

    if (isVector) {
      rows.push(
        this._buildRangeRow({
          label: "Density",
          min: 0.001,
          max: 0.2,
          step: 0.001,
          get: () => this._style.particles.density,
          set: (value) => this.updateStyle({ particles: { density: value } }),
        }),
        this._buildRangeRow({
          label: "Speed",
          min: 0.1,
          max: 8,
          step: 0.1,
          get: () => this._style.particles.speed,
          set: (value) => this.updateStyle({ particles: { speed: value } }),
        }),
        this._buildRangeRow({
          label: "Fade",
          min: 0,
          max: 1,
          step: 0.01,
          get: () => this._style.particles.fade,
          set: (value) => this.updateStyle({ particles: { fade: value } }),
        }),
        this._buildSelectRow({
          label: "Render mode",
          value: this._style.renderMode,
          options: [
            ["particles", "Particles"],
            ["raster", "Raster"],
            ["raster+particles", "Raster + particles"],
          ],
          set: (value) => this.updateStyle({ renderMode: value }),
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
    if (!this._colorDomainControl || !this._style) {
      return;
    }
    const min = this._meta?.min;
    const max = this._meta?.max;
    const frameDomain =
      Number.isFinite(min) && Number.isFinite(max) && min <= max
        ? [min, max]
        : null;
    this._colorDomainControl.sync({
      colorDomain: this._style.raster.colorDomain,
      frameDomain,
    });
  }

  _buildPaletteRow() {
    const palettes = this._z.getPalettes();
    const paletteDefault = this._style.palette || palettes[0]?.id;
    this._paletteDropdown?.destroy();
    const elPalette = createPaletteDropdown({
      document: this._opt.elInputs.ownerDocument,
      palettes,
      value: paletteDefault,
      onChange: (value) => this.updateStyle({ palette: value }),
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
