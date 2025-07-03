import { DateTime, Duration, Interval } from "luxon";
import { el } from "../../el_mapx";
import flatpickr from "flatpickr";
import "../../search/style_flatpickr.less";
import { isNotEmpty } from "../../is_test";
import { isEmpty } from "../../is_test";
import { isDateString } from "../../is_test";
import { makeId } from "../../mx_helper_misc";
import { layersOrderAuto } from "../../map_helpers";
import { settings } from "../../settings";
import "./style.less";

const defaultOptions = {
  idView: null,
  map: null,
  variable: null,
  dataset: null,
  product: null,
  elInputs: null,
  elLegend: null,
  baseURL: null,
  style: null,
  animation: true,
  elevation: 0,
  transitionDuration: 2000,
  before: settings.layerBefore,
  dpr: window.devicePixelRatio,
  showLayers: true,
  showStyles: true,
  showIncrement: true,
  increment: "P1D",
  increments: ["PT1H", "PT3H", "P1D", "P1W", "P1M", "P1Y"],
  // cb
  onRender: () => {},
};

/**
 * Base class for time-enabled map legends
 * Provides common functionality for time navigation, UI controls, and layer management
 */
export class BaseTimeMapLegend {
  constructor(options) {
    this._opt = { ...defaultOptions, ...options };
    this._i = 0;
    this._layers = new Array();
    this._id_anim = new Set();
    this._on_render = this._opt.onRender.bind(this);
  }

  async init() {
    await this.updateCapabilities();
    this.reset();
    window._tm = this;
  }

  reset() {
    if (this.isDestroyed()) {
      return;
    }
    this.stop();
    this.clearAll();
    this.updateLayerInfo();
    this.build();
    this.update();
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this.clearAll();
  }

  isDestroyed() {
    return !!this._destroyed;
  }

  update(skipTransition) {
    this.updateMapSource(skipTransition);
    this.updateLegend();
  }

  render() {
    this.next();
    this.onRender();
    const id_anim_play = setTimeout(() => {
      this.render();
    }, this._opt.transitionDuration);
    this._id_anim.add(id_anim_play);
  }

  start() {
    if (this._playing) {
      return;
    }
    this.stop();
    this._playing = true;
    this.elButtonPlay?.classList.add("playing");
    this.render();
  }

  stop() {
    this._playing = false;
    this.elButtonPlay?.classList.remove("playing");
    this.stopAnim();
  }

  stopAnim() {
    for (const id of this._id_anim) {
      clearTimeout(id);
      this._id_anim.delete(id);
    }
  }

  onRender() {
    this._on_render();
  }

  set(ts, updateUi = true) {
    const { time, slot } = ts;
    this.setSlot(slot);
    this.setTime(time);
    if (updateUi) {
      this._fp.setDate(time.toISO());
    }
    this.elTime.innerText = time.toSQL();
    this.updateMapSource();
  }

  next(stop) {
    if (stop === true) {
      this.stop();
    }
    const ts = this.getNextTimeSlot();
    this.set(ts);
  }

  previous(stop) {
    if (stop) {
      this.stop();
    }
    const ts = this.getPreviousTimeSlot();
    this.set(ts);
  }

  clear(id) {
    id = id || this._id_layer || this._opt.idLayer;

    if (this._opt.map.getLayer(id)) {
      this._opt.map.removeLayer(id);
    }

    if (this._opt.map.getSource(id)) {
      this._opt.map.removeSource(id);
    }
    const pos = this._layers.indexOf(id);
    if (pos) {
      this._layers.splice(pos, 1);
    }
  }

  clearAll() {
    this.clear();
    for (const id of this._layers) {
      this.clear(id);
    }
  }

  transition(a, b, skip) {
    const layerA = this._opt.map.getLayer(a);
    const layerB = this._opt.map.getLayer(b);

    if (layerB) {
      this._opt.map.setPaintProperty(b, "raster-opacity", 1);
    }

    if (!layerA) {
      return;
    }

    if (!this._opt.animation || skip) {
      this.clear(a);
      return;
    }

    /**
     * Reduce layer opacity
     */
    const id_anim_opacity = setTimeout(() => {
      if (this._opt.map.getLayer(a)) {
        this._opt.map.setPaintProperty(a, "raster-opacity", 0);
      }
    }, this._opt.transitionDuration * 2);
    this._id_anim.add(id_anim_opacity);

    /**
     * Remove layer a, after duration,  with a margin
     */
    setTimeout(() => {
      this.clear(a);
    }, this._opt.transitionDuration * 3);
  }

  updateMapSource(skipTransition) {
    const selectedDate = this.getTimeISOstring();
    const selectedElevation = this?.elElevationInput?.value;
    const selectedStyle = this.elStyleInput.value;
    const idLayerCurrent = this._id_layer;
    const hasOldLayer = this._opt.map.getLayer(idLayerCurrent);
    const idLayer = [this._opt.idView || "MX-TML", makeId(15)].join("_");
    const idBefore = hasOldLayer ? idLayerCurrent : this._opt.before;

    // Use abstract method for URL construction
    const newUrl = this.constructUrl(
      selectedDate,
      selectedElevation,
      selectedStyle,
    );

    this.clear(idLayer);
    this.add(idLayer, newUrl, idBefore);
    this.transition(idLayerCurrent, idLayer, skipTransition);

    layersOrderAuto("tml");
  }

  add(idLayer, url, idBefore) {
    const { dpr } = this._opt;
    this._opt.map.addLayer(
      {
        id: idLayer,
        type: "raster",
        source: idLayer,
        metadata: {
          idView: this._opt.idView,
          position: this._i--,
          priority: 0,
        },
        paint: {
          "raster-opacity": 0,
          "raster-opacity-transition": {
            duration: this._opt.transitionDuration,
          },
        },
        source: {
          type: "raster",
          tiles: [url],
          tileSize: dpr > 1 ? 512 : 256,
        },
      },
      idBefore,
    );
    this._id_layer = idLayer;

    if (!this._layers.includes(idLayer)) {
      this._layers.push(idLayer);
    }
  }

  updateLegend() {
    this._opt.style = this.elStyleInput.value;
    const url = this.getLegendUrl();
    if (url) {
      this._elImageLegend.src = url;
    }
  }

  updateVariable(reset = true) {
    this._opt.variable = this.elVariableInput.value;
    if (reset) {
      this.reset();
    }
  }

  updateIncrement() {
    this.stop();
    this.setIncrementDuration(this.elIncrementDurationInput.value);
  }

  // Abstract methods - must be implemented by subclasses
  constructUrl(selectedDate, selectedElevation, selectedStyle) {
    throw new Error("constructUrl must be implemented by subclass");
  }

  constructGetCapabilitiesUrl() {
    throw new Error("constructGetCapabilitiesUrl must be implemented by subclass");
  }

  async parseCapabilities(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    return xmlDoc;
  }

  async updateCapabilities() {
    try {
      const url = this.constructGetCapabilitiesUrl();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Get capabilities error! Status: ${response.status}`,
        );
      }
      const xmlText = await response.text();
      this._capabilities = await this.parseCapabilities(xmlText);
    } catch (error) {
      this.destroy();
      console.error("Failed to fetch or parse capabilities:", error);
    }
  }

  updateLayerInfo() {
    this._layer_info = this.createLayerInfo(this._capabilities);
    this.setTime(this.getTimeDefault());
    this.setSlot(this.getDefaultSlot());
  }

  // Abstract method - must be implemented by subclasses
  createLayerInfo(xmlDoc) {
    throw new Error("createLayerInfo must be implemented by subclass");
  }

  getLayerInfo(id) {
    return this._layer_info[id];
  }

  getLayerInfoAll() {
    return this._layer_info;
  }

  parseTimeSlots(node) {
    const intervalsValues = Array.from(node.querySelectorAll("Value")).map(
      (v) => v.textContent,
    );

    const slots = intervalsValues.map((intervalString) => {
      let intervalTrimmed = intervalString.trim();
      let components = intervalTrimmed.split("/");
      let duration = components[2]; //e.g. 'PT3H'
      let from = components[0];
      let to = components[1];

      const singleInterval =
        isDateString(from) && isEmpty(duration) && isEmpty(to);

      if (singleInterval) {
        duration = "P1D";
        intervalTrimmed = `${from}/${from}/${duration}`;
      }

      const step = Duration.fromISO(duration);
      const interval = Interval.fromISO(intervalTrimmed);
      const end = interval.end.toUTC();
      const start = interval.start.toUTC();
      const hour = start.hour;

      return {
        step,
        interval,
        start,
        end,
        hour,
      };
    });

    return slots.filter(isNotEmpty);
  }

  getSlots() {
    return this.getLayerInfo("time_slots");
  }

  getFirstSlot() {
    return this.getSlotByValue("first");
  }
  getLastSlot() {
    return this.getSlotByValue("last");
  }
  getDefaultSlot() {
    return this.getSlotByValue("default");
  }
  getCurrentSlot() {
    return this.getSlotByValue("current");
  }
  getNextSlot() {
    return this.getSlotByValue("next");
  }
  getPreviousSlot() {
    return this.getSlotByValue("previous");
  }
  getSlotFromTime(time) {
    return this.getSlotByValue("time", time);
  }

  getSlotByValue(type = "current", timeOrigin = null) {
    const slots = this.getSlots();
    const nSlot = slots.length;
    const time =
      timeOrigin || type === "default" ? this.getTimeDefault() : this.getTime();

    if (type === "first") {
      return slots[0];
    }
    if (type === "last") {
      return slots[nSlot - 1];
    }

    for (let i = 0; i < nSlot; i++) {
      const slot = slots[i];
      const isMatch = this.slotIncludes(slot, time);
      if (isMatch) {
        switch (type) {
          case "time":
          case "default":
          case "current": {
            return slot;
          }
          case "next": {
            return slots[i + 1] || slots[0];
          }
          case "previous":
            return slots[i - 1] || slots[nSlot - 1];
        }
      }
    }
    console.warn("no slot found returning first");
    return slots[0];
  }

  setTime(time) {
    this._time = time;
  }

  getTime() {
    return this._time;
  }

  getTimeDefault() {
    return this.getLayerInfo("time_default");
  }

  getTimeInput() {
    const dates = this._fp?.selectedDates;
    const start = dates[0];
    // utc compensation
    const delta = start.getTimezoneOffset() * 60 * 1000;
    const time = start.getTime();
    const utc = new Date(time - delta);
    const dateTimeUtc = DateTime.fromJSDate(utc).toUTC();
    return dateTimeUtc;
  }

  getTimeISOstring() {
    return this.getTime().toISO();
  }

  onInputChange() {
    this.stop();
    const time = this.getTimeInput();
    const ts = this.getTimeSlot(time);
    this.set(ts, false);
  }

  getTimeSlotDefault() {
    const time = this.getTimeDefault();
    const slot = this.getSlotFromTime(time);
    return {
      time,
      slot,
    };
  }

  getTimeSlot(time) {
    const slot = this.getSlotFromTime(time);
    const { start, step } = slot;

    const nStep = Math.ceil(time.diff(start) / step);
    const snapTime = start.plus(nStep * step);
    const valid = this.validate(snapTime);

    if (valid) {
      return {
        time: snapTime,
        slot: slot,
      };
    }
    console.warn(`Invalid timeslot, using default`, slot);
    return this.getTimeSlotDefault();
  }

  getTimeSlotMove(backward) {
    const slotc = this.getCurrentSlot();
    const currentTime = this.getTime();
    const increment = this.getIncrementDuration();
    const { interval, start, step } = slotc;
    const duration = Duration.fromISO(increment);
    const futureTime = currentTime[backward ? "minus" : "plus"](duration);

    // Get plain number of step from start to future
    const nStepFuture = Math.ceil(futureTime.diff(start) / step);
    const moved = start.plus(nStepFuture * step);

    // _m__|-----|___
    const usePrevious = interval.isAfter(moved);
    // ___|-----|__m_
    const useNext = interval.isBefore(moved);

    if (usePrevious) {
      const slotp = this.getPreviousSlot();
      const { end } = slotp;
      return {
        time: end,
        slot: slotp,
      };
    }
    if (useNext) {
      const slotn = this.getNextSlot();
      const { start } = slotn;
      return {
        slot: slotn,
        time: start,
      };
    }

    return {
      time: moved,
      slot: slotc,
    };
  }

  setSlot(slot) {
    this._slot = slot;
  }

  getSlot() {
    return this._slot;
  }
  getIncrementDuration() {
    return this._opt.increment;
  }

  setIncrementDuration(iso) {
    const duration = Duration.fromISO(iso);
    if (duration.isValid) {
      this._opt.increment = iso;
      return true;
    }
  }

  getPreviousTimeSlot() {
    return this.getTimeSlotMove(true);
  }

  getNextTimeSlot() {
    return this.getTimeSlotMove();
  }

  validate(time) {
    const slots = this.getLayerInfo("time_slots");
    const isDateTime = time instanceof DateTime;
    if (!isDateTime) {
      time = DateTime.fromISO(time);
    }
    for (const slot of slots) {
      if (this.slotIncludes(slot, time)) {
        return true;
      }
    }
    return false;
  }

  slotIncludes(slot, time) {
    const { start, end, interval } = slot;
    const t = time.toUTC();
    return interval.contains(t) || t.equals(start) || t.equals(end);
  }

  // Abstract method - must be implemented by subclasses
  getLegendUrl() {
    throw new Error("getLegendUrl must be implemented by subclass");
  }

  setVariable(variable) {
    const variables = this.getLayerInfo("variables");
    if (!variables.includes(variable)) {
      throw new Error(`Variable '${variable}' not found`);
    }
    this.elVariableInput.value = variable;
    this._opt.variable = variable;
  }

  build() {
    const {
      elevation_values,
      elevation_default,
      time_default,
      styles,
      style_default,
      variables,
      variable,
    } = this.getLayerInfoAll();

    const { showLayers, showStyles, showIncrement, increment, increments } =
      this._opt;

    const defaultDate = time_default.toISO();
    const defaultDateSql = time_default.toSQL();

    /**
     * Elevation
     */
    if (isNotEmpty(elevation_default)) {
      const optElevation = elevation_values.map((value) =>
        el(
          "option",
          { value, selected: value === elevation_default ? true : null },
          Number(value).toFixed(2),
        ),
      );
      this.elElevationInput = el(
        "select",
        { class: "form-control" },
        { on: { change: () => this.updateMapSource(true) } },
        optElevation,
      );
      this.elElevation = el("div", [
        el("label", "Elevation"),
        this.elElevationInput,
      ]);
    }

    /**
     * Style
     */
    const optStyles = styles.map((style) =>
      el(
        "option",
        {
          value: style.name,
          selected: style.name === style_default ? true : null,
        },
        style.name,
      ),
    );

    this.elStyleInput = el(
      "select",
      { class: "form-control" },
      { on: { change: () => this.update(true) } },
      optStyles,
    );

    this.elStyle = el("div", [el("label", "Style"), this.elStyleInput]);

    if (!showStyles) {
      this.elStyle.style.display = "none";
    }

    /**
     * Date
     */
    this.elDateInput = el("input", {
      type: "date",
      class: "form-control",
    });

    this._fp = flatpickr(this.elDateInput, {
      defaultDate: defaultDate,
      disable: [
        (date) => {
          const dTime = DateTime.fromJSDate(date).toUTC();
          return !this.validate(dTime);
        },
      ],
      onChange: () => {
        this.onInputChange();
      },
    });

    /**
     * Increment duration
     */

    const slots = this.getSlots();
    const allSteps = slots.map((slot) => slot.step);
    const uniqueSteps = [...new Set(allSteps.map((step) => step.toISO()))]
      .map((iso) => Duration.fromISO(iso))
      .sort((a, b) => a - b);

    const smallestStep = uniqueSteps[0];

    const incrementsChoices = [
      {
        label: durationToHuman(smallestStep),
        iso: smallestStep.toISO(),
      },
    ];

    for (const iso of increments) {
      const duration = Duration.fromISO(iso);
      if (
        duration > smallestStep &&
        !uniqueSteps.some((step) => step.equals(duration))
      ) {
        incrementsChoices.push({
          label: durationToHuman(duration),
          iso: duration.toISO(),
        });
      }
    }

    const optIncrements = incrementsChoices.map((increment) =>
      el(
        "option",
        {
          value: increment.iso,
          selected: increment.iso === increment ? true : null,
        },
        el("span", increment.label),
      ),
    );

    this.elIncrementDurationInput = el(
      "select",
      {
        class: "form-control",
        on: {
          change: () => {
            this.updateIncrement();
          },
        },
      },
      optIncrements,
    );

    this.elIncrementDuration = el("div", [
      el("label", "Increment duration"),
      this.elIncrementDurationInput,
    ]);

    if (!showIncrement) {
      this.elIncrementDuration.style.display = "none";
    }

    /**
     * Variable
     */
    const optVariables = variables.map((name) =>
      el(
        "option",
        {
          value: name,
          selected: name === variable ? true : null,
        },
        name,
      ),
    );

    this.elVariableInput = el(
      "select",
      { class: "form-control" },
      {
        on: {
          change: () => {
            this.updateVariable();
          },
        },
      },
      optVariables,
    );

    this.elVariable = el("div", [el("label", "Layer"), this.elVariableInput]);

    if (!showLayers) {
      this.elVariable.style.display = "none";
    }

    /**
     * Player
     */
    this.elButtonPlay = el(
      "button",
      {
        class: ["btn", "btn-default"],
        on: { click: () => this.start() },
      },
      el("i", { class: ["fa", "fa-play"], title: "play" }),
    );

    const elButtonsPlayer = el("div", { class: "input-group-btn" }, [
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.previous(true) },
        },
        el("i", { class: ["fa", "fa-step-backward"], title: "previous" }),
      ),
      this.elButtonPlay,
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.stop() },
        },
        el("i", { class: ["fa", "fa-stop"], title: "stop" }),
      ),
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.next(true) },
        },
        el("i", { class: ["fa", "fa-step-forward"], title: "next" }),
      ),
    ]);

    /**
     * Legends
     */

    this._elImageLegend = el("img", { src: null });

    /**
     *  Date
     */
    this.elTime = el("span", defaultDateSql);
    this.elDate = el("div", [
      el("label", "Date"),
      el("div", { class: "input-group" }, [this.elDateInput, elButtonsPlayer]),
      el(
        "div",
        {
          class: "text-muted",
          style: { display: "flex", justifyContent: "center" },
        },
        this.elTime,
      ),
    ]);

    /**
     * Form
     */
    this._elInputContainer = el(
      "div",
      {
        class: ["form-group", this.getContainerClass()],
        style: {
          padding: "20px",
        },
      },
      [
        this.elDate,
        this.elIncrementDuration,
        this.elElevation,
        this.elStyle,
        this.elVariable,
      ],
    );

    this._opt.elLegend.innerHTML = "";
    this._opt.elInputs.innerHTML = "";
    this._opt.elLegend.appendChild(this._elImageLegend);
    this._opt.elInputs.appendChild(this._elInputContainer);

    this.updateVariable(false);
    this.updateIncrement();
  }

  // Abstract method - can be overridden by subclasses for custom styling
  getContainerClass() {
    return "time_map_legend_extension";
  }
}

/**
 * Converts milliseconds to a human-readable string format.
 *
 * @param {duration} duration The duration to convert
 * @returns {string} A string representing the duration in years, months, days, hours, minutes, and seconds.
 */
function durationToHuman(durationInput) {
  const duration = durationInput.shiftTo(
    "years",
    "months",
    "days",
    "hours",
    "minutes",
    "seconds",
  );

  const durationObject = duration.toObject();

  for (const item in durationObject) {
    if (!durationObject[item]) {
      delete durationObject[item];
    }
  }
  const durationClean = Duration.fromObject(durationObject);

  return durationClean.toHuman();
}
