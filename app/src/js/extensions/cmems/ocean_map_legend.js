import { DateTime, Duration, Interval } from "luxon";
import { el } from "../../el";
import flatpickr from "flatpickr";
import "../../search/style_flatpickr.less";
import { isNotEmpty } from "../../is_test";
import { isEmpty } from "../../is_test";
import { isDateString } from "../../is_test";
import { makeId } from "../../mx_helper_misc";
import "./style.less";
import { layersOrderAuto } from "../../map_helpers";
import { settings } from "../../settings";

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
  showIncrementDuration: true,
  incrementDuration: "default",
  // cb
  onRender: () => {},
};

export class TimeMapLegend {
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
    const newWmsUrl = this.constructWmtsUrl(
      selectedDate,
      selectedElevation,
      selectedStyle,
    );

    this.clear(idLayer);
    this.add(idLayer, newWmsUrl, idBefore);
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

  constructWmtsUrl(selectedDate, selectedElevation, selectedStyle) {
    const { variable, baseURL, product, dataset, dpr } = this._opt;

    const layer = `${product}/${dataset}/${variable}`;

    const style = [selectedStyle, "inverse", "noclamp", "logscale"]
      .filter(isEmpty)
      .join(",");

    const paramObject = {
      service: "WMTS",
      version: "1.0",
      request: "GetTile",
      layer: layer,
      tilematrixset: dpr > 1 ? "EPSG:3857@2x" : "EPSG:3857",
      style: style,
      elevation: selectedElevation,
      time: selectedDate,
    };

    const params = new URLSearchParams(paramObject).toString();
    const tile = "&tileMatrix={z}&tileRow={y}&tileCol={x}";
    const url = `${baseURL}?${params}${tile}`;
    return url;
  }

  constructWmsGetCapabilitiesUrl() {
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetCapabilities",
      version: "1.3.0",
    });
    const { baseURL, product, dataset } = this._opt;
    return `${baseURL}/${product}/${dataset}/?${params.toString()}`;
  }

  async parseCapabilities(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    return xmlDoc;
  }

  async updateCapabilities() {
    try {
      const url = this.constructWmsGetCapabilitiesUrl();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `WMS get capabilities error! Status: ${response.status}`,
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

  getLayerInfo(id) {
    /**
     * Available:
     *  [
     *    "title",
     *    "abstract",
     *    "variables",
     *    "variable",
     *    "styles",
     *    "elevation_default",
     *    "elevation_values",
     *    "elevation_unit",
     *    "time_default",
     *    "time_slots",
     *  ];
     */
    return this._layer_info[id];
  }
  getLayerInfoAll() {
    return this._layer_info;
  }

  createLayerInfo(xmlDoc) {
    let { variable } = this._opt;

    /**
     * NOTE: this should work for the prototype, but
     * we should probably handle namespace, like (ows:<Key>)
     * Possible solution :
     * - getElementsByTagNameNS ?
     * - xPath ?
     */
    const layers = Array.from(xmlDoc.querySelectorAll("Contents Layer"));
    const variables = layers.map(
      (l) => l.querySelector("VariableInformation Id")?.textContent,
    );

    if (isEmpty(variable)) {
      variable = variables[0];
      this._opt.variable = variable;
    }

    const variableExists = variables.includes(variable);

    if (!variableExists) {
      const variablesPrint = variables.join(",\n");
      throw new Error(
        `Invalid variable '${variable}' Available names : '${variablesPrint} `,
      );
    }

    /**
     * Get layer data
     */
    const layer = layers.find(
      (l) => l.querySelector("VariableInformation Id").textContent === variable,
    );

    const dimensions = Array.from(layer.querySelectorAll("Dimension"));

    const meta = layer.querySelector("VariableInformation");

    const title = meta.querySelector("Name").textContent;
    const abstract = ""; // seems to be in doc -> Themes>Theme>Theme>Title...

    const styles = Array.from(layer.querySelectorAll("Style Identifier")).map(
      (s) => {
        return {
          name: s.textContent,
          url_legend: null,
        };
      },
    );

    const style = this._opt.style || styles[0]?.name;

    const out = {
      title,
      styles,
      abstract,
      style_default: style,
      variables: Array.from(new Set(variables)),
      variable: variable,
    };

    /**
     * Elevation
     */
    const nodeElevation = dimensions.find(
      (d) => d.querySelector("Identifier").textContent === "elevation",
    );

    if (nodeElevation) {
      out.elevation_default =
        this._opt.elevation ||
        nodeElevation.querySelector("Default").textContent;

      out.elevation_values = Array.from(
        nodeElevation.querySelectorAll("Value"),
      ).map((v) => v.textContent);

      out.elevation_unit =
        nodeElevation.querySelector("UnitSymbol").textContent;
    }

    /**
     * Time
     */
    const nodeTime = dimensions.find(
      (d) => d.querySelector("Identifier").textContent === "time",
    );

    if (nodeTime) {
      const validInterval =
        nodeTime.querySelector("UOM").textContent === "ISO8601";
      if (validInterval) {
        const timeDefault = nodeTime.querySelector("Default").textContent;
        out.time_default = DateTime.fromISO(timeDefault).toUTC();
        out.time_slots = this.parseTimeSlots(nodeTime);
      }
    }

    return out;
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

  getTimeSlotMove(n = 1) {
    const slotc = this.getCurrentSlot();
    const currentTime = this.getTime();
    const incrementDuration = this.getIncrementDuration();
    const { interval, start, step } = slotc;

    let futureTime;

    switch (incrementDuration) {
      case "week":
        futureTime = currentTime.plus({ weeks: n });
        break;
      case "month":
        futureTime = currentTime.plus({ months: n });
        break;
      case "year":
        futureTime = currentTime.plus({ years: n });
        break;
      case "auto":
      default:
        futureTime = currentTime.plus(step * n);
    }

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
    return this._opt.incrementDuration;
  }

  setIncrementDuration(s) {
    this._opt.incrementDuration = s;
  }

  getPreviousTimeSlot() {
    return this.getTimeSlotMove(-1);
  }

  getNextTimeSlot() {
    return this.getTimeSlotMove(1);
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

  getLegendUrl() {
    const data = this.getLayerInfo("styles").find((s) => {
      return s.name === this._opt.style;
    });
    return data?.url_legend;
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

    const { showLayers, showStyles, showIncrementDuration, incrementDuration } =
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
    const optIncrementDurations = ["default", "week", "month", "year"].map(
      (v) =>
        el(
          "option",
          {
            value: v,
            selected: v === incrementDuration ? true : null,
          },
          el("span", v),
        ),
    );

    this.elIncrementDurationInput = el(
      "select",
      {
        class: "form-control",
        on: {
          change: (e) => {
            this.stop();
            this.setIncrementDuration(e.target.value);
          },
        },
      },
      optIncrementDurations,
    );

    this.elIncrementDuration = el("div", [
      el("label", "Increment duration"),
      this.elIncrementDurationInput,
    ]);

    if (!showIncrementDuration) {
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
          change: (e) => {
            this._opt.variable = e.target.value;
            this.reset();
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
        class: ["form-group", "cmems_extension"],
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
  }
}
