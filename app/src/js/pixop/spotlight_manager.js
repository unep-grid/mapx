import { Spotlight } from "./spotlight.js";
import { RadialProgress } from "./../radial_progress/index.js";
import { events, listeners } from "./../mx.js";
import { getMap } from "./..//map_helpers/index.js";
import { el } from "./../el_mapx/index.js";
import { isElement } from "./../is_test/index.js";
import { setBusy } from "./../mx_helper_misc.js";
import { bindAll } from "../bind_class_methods/index.js";

/**
 * SpotlightManager class for managing spotlight functionality on a map.
 * @class
 */
export class SpotlightManager {
  constructor(config) {
    const sl = this;
    bindAll(sl);
    sl._init_config = config;
  }

  get ready() {
    return !!this._init;
  }
  get enabled() {
    return !!this._enabled;
  }
  get has_spotlight() {
    return this._spotlight instanceof Spotlight;
  }
  get has_progress() {
    return this._prog instanceof RadialProgress;
  }

  /**
   * Initialize the SpotlightManager instance.
   * @internal
   */
  init(config) {
    this.initConfig(config);
    this.initUI();
    this.initEventListeners();
    this._init = true;
    this._enabled = false;
  }

  initConfig(config) {
    config = config || this._init_config;

    const defaultConfig = {
      elIds: {
        toggleMain: "btnOverlapSpotlight",
        selectNum: "selectNLayersOverlap",
        textArea: "txtAreaOverlap",
        textResol: "txtResolOverlap",
        enableCalcArea: "checkEnableOverlapArea",
      },
      map: getMap(),
    };

    this._config = { ...defaultConfig, ...config };
    this._map = this._config.map;
    this._spotlight = null;
    this._prog = null;
    this._idTimeout = 0;
  }

  /**
   * Initialize UI elements.
   * @internal
   */
  initUI() {
    const { elIds } = this._config;

    this._elToggleMain = document.getElementById(elIds.toggleMain);
    this._elSelectNum =
      document.getElementById(elIds.selectNum) || el("select");
    this._elTextArea = document.getElementById(elIds.textArea) || el("span");
    this._elTextResol = document.getElementById(elIds.textResol) || el("span");
    this._elEnableCalcArea =
      document.getElementById(elIds.enableCalcArea) ||
      el("input", { type: "checkbox" });

    if (!this.has_progress) {
      this._prog = new RadialProgress(this._elToggleMain, {
        radius: 20,
        stroke: 2,
        strokeColor: "red",
      });
    }
  }

  /**
   * Initialize event listeners.
   * @internal
   */
  initEventListeners() {
    this._elToggleMain.addEventListener("click", this.handleToggleClick);

    if (this._elEnableCalcArea) {
      listeners.addListener({
        target: this._elEnableCalcArea,
        type: "change",
        idGroup: "spotlight_pixop_ui",
        callback: this.render,
        bind: this,
      });
    }

    if (this._elSelectNum) {
      listeners.addListener({
        target: this._elSelectNum,
        type: "change",
        idGroup: "spotlight_pixop_ui",
        callback: this.render,
        bind: this,
      });
    }

    this._map.on("movestart", this.clear);
    this._map.on("moveend", this.render);
    this._map.on("styledata", this.render);
  }

  /**
   * Create the Spotlight instance.
   * @internal
   */
  createSpotlight() {
    if (!this.ready) {
      console.warn("spotlight is not ready");
      return;
    }
    if (!this.enabled) {
      console.warn("spotlight is not enabled");
      return;
    }
    if (this.has_spotlight) {
      this._spotlight.destroy();
    }
    this._spotlight = new Spotlight({
      map: this._map,
      enabled: () => this._elToggleMain.checked,
      nLayersOverlap: () =>
        this._elSelectNum ? this._elSelectNum.value * 1 : 1,
      calcArea: () =>
        this._elEnableCalcArea ? this._elEnableCalcArea.checked : false,
      onCalcArea: this.handleCalcArea,
      onProgress: this.handleProgress,
      onRendered: this.handleRendered,
      onRender: this.handleRender,
    });
  }

  /**
   * Handle toggle click event.
   * @internal
   */
  handleToggleClick() {
    this.toggle();
  }

  /**
   * Toggle the Spotlight on/off.
   * @param {Object} [opt] - Optional configuration object.
   */
  toggle(opt = {}) {
    try {
      const enable =
        opt.enable ?? !this._elToggleMain.classList.contains("active");

      this._enabled = enable;
      this._elToggleMain.checked = enable;
      this._elToggleMain.classList.toggle("active", enable);

      if (enable) {
        this.render();
      } else {
        this.destroy();
      }

      events.fire({
        type: "spotlight_update",
        data: { enable },
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Handle area calculation.
   * @param {number} area - Calculated area.
   * @internal
   */
  handleCalcArea(area) {
    if (!this._elEnableCalcArea || !this.has_spotlight) {
      return;
    }

    const resol = this._spotlight.getResolution();
    if (isElement(this._elTextArea) && isElement(this._elTextResol)) {
      const areaKm = Math.round(area * 1e-6);
      const resolLat = this.formatDist(resol.lat);
      const resolLng = this.formatDist(resol.lng);
      this._elTextArea.innerText = `~ ${areaKm} km2`;
      this._elTextResol.innerText = `~ ${resolLat} x ${resolLng}`;
    }
  }

  /**
   * Handle progress updates.
   * @param {number} p - Progress value.
   * @internal
   */
  handleProgress(p) {
    this._prog.update(p * 100);
    if (p * 100 === 100) {
      this._prog.update(0);
    }
    events.fire({
      type: "spotlight_progress",
      data: { progress: p },
    });
  }

  /**
   * Handle rendered event.
   * @param {Object} px - Rendered object.
   * @internal
   */
  handleRendered(px) {
    setBusy(false);
    px.setOpacity(0.5);
  }

  /**
   * Handle render event.
   * @param {Object} px - Render object.
   * @internal
   */
  handleRender(px) {
    setBusy(true);
    px.setOpacity(0.1);
  }

  /**
   * Format distance for display.
   * @param {number} v - Distance value.
   * @param {boolean} [squared=false] - Whether to square the value.
   * @returns {string} Formatted distance string.
   * @internal
   */
  formatDist(v, squared = false) {
    v = v || 0;
    const suffix = squared ? "2" : "";
    const factor = squared ? 1e-6 : 1e-3;

    if (v > 1000) {
      return `${Math.round(v * factor * 1000) / 1000} km${suffix}`;
    } else {
      return `${Math.round(v * 1000) / 1000} m${suffix}`;
    }
  }

  /**
   * Clear the spotlight.
   * @internal
   */
  clear() {
    this._spotlight.clear();
  }

  /**
   * Render the spotlight.
   * @internal
   */
  render() {
    const sl = this;
    if (!sl.ready || !sl.enabled) {
      return;
    }

    clearTimeout(sl._idTimeout);
    sl._idTimeout = setTimeout(() => {
      try {
        if (!sl.has_spotlight) {
          sl.createSpotlight();
        }
        sl._spotlight.render();
      } catch (e) {
        debugger;
        console.error(e);
      }
    }, 200);
  }

  /**
   * Destroy the SpotlightManager instance.
   */
  destroy() {
    if (!this.ready) {
      console.warn("Attempt to destroy spotlight when not ready");
      return;
    }
    if (this.has_spotlight) {
      this._spotlight.destroy();
      delete this._spotlight;
    }
    this._map.off("moveend", this.render);
    this._map.off("movestart", this.clear);
    this._map.off("styledata", this.render);
    listeners.removeListenerByGroup("spotlight_pixop_ui");
  }
}
