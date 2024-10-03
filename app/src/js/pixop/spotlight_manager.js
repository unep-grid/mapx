import { Spotlight } from "./spotlight.js";
import { events, listeners } from "./../mx.js";
import { getMap } from "./../map_helpers/index.js";
import { el } from "./../el_mapx/index.js";
import { isBoolean, isElement, isNumeric } from "./../is_test/index.js";
import { isFirefox, setBusy } from "./../mx_helper_misc.js";
import { bindAll } from "../bind_class_methods/index.js";
import { onNextFrame } from "../animation_frame/index.js";

/**
 * SpotlightManager class for managing spotlight functionality on a map.
 * @class
 */
export class SpotlightManager {
  constructor(config) {
    bindAll(this);
    this._init_config = config;
    this._init = false;
    this._enabled = false;
    this._spotlight = null;
  }

  get ready() {
    return this._init;
  }

  get enabled() {
    return this._enabled;
  }

  get hasSpotlight() {
    return this._spotlight instanceof Spotlight;
  }

  get hasProgress() {
    return isElement(this._elProgress);
  }

  /**
   * Initialize the SpotlightManager instance.
   * @internal
   */
  init(config) {
    if (this._init) return;
    this.initConfig(config);
    this.initUI();
    if (isFirefox()) {
      return;
    }
    this.initEventListeners();
    this.initSpotlight();
    this._init = true;
  }

  initConfig(config) {
    const defaultConfig = {
      idToggleMain: "btnOverlapSpotlight",
      idSelectNum: "selectNLayersOverlap",
      idTextArea: "txtAreaOverlap",
      idTextResol: "txtResolOverlap",
      idEnableCalcArea: "checkEnableOverlapArea",
      idToolboxContainer: "spotlight_tools_box_container",
      nLayersOverlap: 0,
      enable: false,
      calcArea: false,
      map: getMap(),
    };

    this._config = { ...defaultConfig, ...config };
    this._map = this._config.map;
  }

  /**
   * Initialize UI elements.
   * @internal
   */
  initUI() {
    const {
      idToggleMain,
      idSelectNum,
      idTextArea,
      idTextResol,
      idEnableCalcArea,
      idToolboxContainer,
    } = this._config;

    this._elToolboxContainer = document.getElementById(idToolboxContainer);

    if (isFirefox()) {
      this._elToolboxContainer.style.display = "none";
      return;
    }
    this._elToggleMain = document.getElementById(idToggleMain);
    this._elSelectNum = document.getElementById(idSelectNum);
    this._elTextArea = document.getElementById(idTextArea);
    this._elTextResol = document.getElementById(idTextResol);
    this._elEnableCalcArea = document.getElementById(idEnableCalcArea);

    this._elProgress = el("div", {
      style: {
        height: "100%",
        width: "0px",
        backgroundColor: "var(--mx_ui_link)",
      },
    });

    const elProgressContainer = el(
      "div",
      {
        style: {
          height: "5px",
          width: "100%",
          position: "absolute",
          bottom: 0,
          left: 0,
        },
      },
      this._elProgress,
    );

    if (this._elToggleMain) {
      this._elToggleMain.style.position = "relative";
      this._elToggleMain.style.overflow = "hidden";
      this._elToggleMain.appendChild(elProgressContainer);
    }
  }

  /**
   * Initialize event listeners.
   * @internal
   */
  initEventListeners() {
    if (this._elToggleMain) {
      this._elToggleMain.addEventListener("click", this.handleToggleClick);
    }

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
  initSpotlight() {
    if (this.hasSpotlight) {
      this._spotlight.destroy();
    }

    this._spotlight = new Spotlight({
      map: this._map,
      enabled: () => this.enabled,
      nLayersOverlap: this.nLayersOverlap,
      calcArea: this.useCalcArea,
      onCalcArea: this.handleCalcArea,
      onProgress: this.handleProgress,
      onRendered: this.handleRendered,
      onRender: this.handleRender,
    });
  }

  nLayersOverlap() {
    return this._elSelectNum
      ? Number(this._elSelectNum.value)
      : this._config.nLayersOverlap;
  }

  useCalcArea() {
    return this._elEnableCalcArea
      ? this._elEnableCalcArea.checked
      : this._config.calcArea;
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
    const enable = isBoolean(opt.enable) ? opt.enable : !this.enabled;

    this._enabled = enable;

    const nLayers = opt.nLayers || opt.nLayersOverlap;
    const calcArea = opt.calcArea;

    if (isNumeric(nLayers)) {
      this._config.nLayersOverlap = nLayers;
    }
    if (isBoolean(calcArea)) {
      this._config.calcArea = calcArea;
    }

    if (this._elToggleMain) {
      this._elToggleMain.checked = enable;
      this._elToggleMain.classList.toggle("active", enable);
    }

    if (enable) {
      this.render();
    } else {
      this.clear();
    }

    events.fire({
      type: "spotlight_update",
      data: { enable },
    });
  }

  /**
   * Handle area calculation.
   * @param {number} area - Calculated area.
   * @internal
   */
  handleCalcArea(area) {
    if (!this._elEnableCalcArea || !this.hasSpotlight) {
      return;
    }

    const resol = this._spotlight.getResolution();
    if (!isElement(this._elTextArea) || !isElement(this._elTextResol)) {
      return;
    }
    const areaKm = Math.round(area * 1e-6);
    const resolLat = this.formatDist(resol.lat);
    const resolLng = this.formatDist(resol.lng);
    this._elTextArea.innerText = `~ ${areaKm} km²`;
    this._elTextResol.innerText = `~ ${resolLat} x ${resolLng}`;
  }

  /**
   * Handle progress updates.
   * @param {number} p - Progress value.
   * @internal
   */
  handleProgress(p) {
    onNextFrame(() => {
      if (p > 0) {
        this._elProgress.style.width = `${p * 100}%`;
      } else {
        setTimeout(() => {
          this._elProgress.style.width = `0`;
        }, 1000);
      }
    });

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
    const suffix = squared ? "²" : "";
    const factor = squared ? 1e-6 : 1e-3;

    if (v > 1000) {
      return `${(v * factor).toFixed(3)} km${suffix}`;
    } else {
      return `${v.toFixed(3)} m${suffix}`;
    }
  }

  /**
   * Clear the spotlight.
   * @internal
   */
  clear() {
    if (this.hasSpotlight) {
      this._spotlight.clear();
    }
    this.handleProgress(0);
  }

  /**
   * Render the spotlight.
   * @internal
   */
  render() {
    if (!this.ready || !this.enabled) {
      return;
    }
    // timeout instead of frame : wait for tiles to be rendered
    clearTimeout(this._id_timeout);
    this._id_timeout = setTimeout(() => {
      if (this.enabled) {
        this._spotlight.render();
      }
    }, 200);
  }

  /**
   * Destroy the SpotlightManager instance.
   */
  destroy() {
    if (this.hasSpotlight) {
      this._spotlight.destroy();
      delete this._spotlight;
    }

    this._map.off("movestart", this.clear);
    this._map.off("moveend", this.render);
    this._map.off("styledata", this.render);

    listeners.removeListenerByGroup("spotlight_pixop_ui");

    this._elToggleMain.removeEventListener("click", this.handleToggleClick);

    this._init = false;
    this._enabled = false;
  }
}
