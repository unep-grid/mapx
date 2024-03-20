import { DateTime, Duration, Interval } from "luxon";
import { el } from "../../el";
import flatpickr from "flatpickr";
import "../../search/style_flatpickr.less";
import { isNotEmpty } from "../../is_test";
import { isEmpty } from "../../is_test";
import { isDateString } from "../../is_test";

// Define external default options
const defaultOptions = {
  style: "boxfill/rainbow",
  elevation: 0,
  transitionDuration: 2000,
  metedata: { id: "x" },
};

export class TimeMapLegend {
  constructor(options) {
    this._opt = { ...defaultOptions, ...options };
    this._i = 0;
    this._layers = new Set();
    window._tml = this;
  }

  async init() {
    await this.updateCapabilities();
    await this.updateLayerInfo();
    this.build();
    this.update();
  }

  destroy() {
    this.stop();
    this.clearAll();
  }

  update() {
    this.updateMapSource();
    this.updateLegend();
  }

  play() {
    if (this._playing) {
      return;
    }
    this._playing = true;
    this.next();
    this._id_anim = setTimeout(() => {
      this.stop();
      this.play();
    }, this._opt.transitionDuration);
  }

  stop() {
    this._playing = false;
    clearTimeout(this._id_anim);
  }

  set(ts, updateUi = true) {
    const { time, slot } = ts;
    this.setSlot(slot);
    this.setTime(time);
    if (updateUi) {
      this._fp.setDate(time.toISO());
    }
    this.updateMapSource();
  }

  next() {
    const ts = this.getNextTimeSlot();
    this.set(ts);
  }

  previous() {
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
    this._layers.delete(id);
  }

  clearAll() {
    this.clear();
    for (const id of this._layers) {
      this.clear(id);
    }
  }

  transition(a, b) {
    const layerA = this._opt.map.getLayer(a);
    const layerB = this._opt.map.getLayer(b);

    if (layerB) {
      this._opt.map.setPaintProperty(b, "raster-opacity", 1);
    }

    if (layerA) {
      setTimeout(() => {
        if (this._opt.map.getLayer(a)) {
          this._opt.map.setPaintProperty(a, "raster-opacity", 0);
        }
      }, this._opt.transitionDuration * 2);
      setTimeout(() => {
        this.clear(a);
      }, this._opt.transitionDuration * 3);
    }
  }

  updateMapSource() {
    const selectedDate = this.getTimeISOstring();
    const selectedElevation = this?.elElevationInput?.value;
    const selectedStyle = this.elStyleInput.value;

    let newWmsUrl = this.constructWmsUrl(
      selectedDate,
      selectedElevation,
      selectedStyle,
    );

    const idLayerCurrent = this._id_layer;
    const idLayer = [
      this._opt.idLayer,
      selectedDate,
      selectedStyle,
      selectedElevation,
      this._id++,
    ].join("_");

    this.clear(idLayer);
    this._opt.map.addLayer({
      id: idLayer,
      before: this._opt.before,
      type: "raster",
      source: idLayer,
      metadata: this._opt.metadata,
      paint: {
        "raster-opacity": 0,
        "raster-opacity-transition": {
          duration: this._opt.transitionDuration,
        },
      },
      source: {
        type: "raster",
        tiles: [newWmsUrl],
        tileSize: 256,
      },
    });

    this.transition(idLayerCurrent, idLayer);
    this._id_layer = idLayer;
    this._layers.add(idLayer);
  }

  updateLegend() {
    this._opt.style = this.elStyleInput.value;
    this._elImageLegend.src = this.getLegendUrl();
  }

  constructWmsUrl(selectedDate, selectedElevation, selectedStyle) {
    const { layerName } = this._opt;
    const objParam = {
      service: "WMS",
      request: "GetMap",
      layers: layerName,
      styles: selectedStyle,
      format: "image/png",
      transparent: "true",
      version: "1.3.0",
      crs: "EPSG:3857",
      width: 256,
      height: 256,
      colorscalerange: "-0.00001,0.00001",
      logscale: "false",
      time: selectedDate,
      elevation: selectedElevation,
    };
    const params = new URLSearchParams(objParam).toString();
    const bboxCode = "&bbox={bbox-epsg-3857}";
    const url = `${this._opt.baseURL}?${params}${bboxCode}`;
    return url;
  }

  constructWmsGetCapabilitiesUrl() {
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetCapabilities",
      version: "1.3.0",
    });
    return `${this._opt.baseURL}?${params.toString()}`;
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

  async updateLayerInfo() {
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
     *    "layer_names",
     *    "styles",
     *    "elevation_default",
     *    "elevation_values",
     *    "elevation_units",
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
    const { layerName } = this._opt;

    const layers = Array.from(xmlDoc.querySelectorAll("Layer Layer"));
    const layerNames = layers.map((l) => l.querySelector("Name")?.textContent);
    const layerExists = layerNames.includes(layerName);

    if (!layerExists) {
      const layersPrint = layerNames.join(",\n");
      throw new Error(
        `Invalid layerName '${layerName}'. Available names : '${layersPrint}`,
      );
    }

    /**
     * Get layer data
     */
    const layer = layers.find(
      (l) => l.querySelector("Name")?.textContent === layerName,
    );

    const title = layer.querySelector("Title")?.textContent;
    const abstract = layer.querySelector("Abstract")?.textContent;

    const styles = Array.from(layer.querySelectorAll("Style")).map((s) => {
      return {
        name: s.querySelector("Name")?.textContent,
        url_legend: s
          .querySelector("LegendURL > OnlineResource")
          .getAttribute("xlink:href"),
      };
    });

    const style = this._opt.style || out.styles[0]?.name;

    const out = {
      title,
      styles,
      abstract,
      style_default: style,
      layer_names: layerNames,
    };

    /**
     * Elevation
     */
    const nodeElevation = layer.querySelector("Dimension[name='elevation']");

    if (nodeElevation) {
      out.elevation_default =
        this._opt.elevation || nodeElevation.getAttribute("default");
      out.elevation_values = nodeElevation.textContent
        .split(",")
        .map((v) => v.trim());
      out.elevation_units = nodeElevation.getAttribute("units");
    }

    /**
     * Time
     */
    const nodeTime = layer.querySelector("Dimension[name='time']");

    if (nodeTime) {
      const timeDefault = nodeTime.getAttribute("default");
      out.time_default = DateTime.fromISO(timeDefault).toUTC();
      out.time_slots = this.parseTimeSlots(nodeTime);
    }

    return out;
  }

  parseTimeSlots(node) {
    const intervalsValues = node.textContent.split(",");
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
    return DateTime.fromJSDate(this._fp?.selectedDates[0]).toUTC();
  }

  getTimeISOstring() {
    return this.getTime().toISO();
  }

  onInputChange() {
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
    const nStep = Math.ceil(start.diff(time) / step);
    const snapTime = start.plus(nStep * step);
    const valid = this.validate(snapTime);

    if (valid) {
      return {
        time: snapTime,
        slot: slot,
      };
    }
    return this.getTimeSlotDefault();
  }

  getTimeSlotMove(n = 1) {
    const slotc = this.getCurrentSlot();
    const currentTime = this.getTime();
    const { interval, start, step } = slotc;
    const nStepCurrent = Math.ceil(currentTime.diff(start) / step);
    const nStepMove = step * (nStepCurrent + n);
    const moved = start.plus(nStepMove);
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

  build() {
    const {
      elevation_values,
      elevation_default,
      time_default,
      styles,
      style_default,
    } = this.getLayerInfoAll();
    const defaultDate = time_default.toISO();

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
        { on: { change: () => this.updateMapSource() } },
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
      { on: { change: () => this.update() } },
      optStyles,
    );

    this.elStyle = el("div", [el("label", "Style"), this.elStyleInput]);

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
     * Player
     */
    const elButtonsDays = el("div", { class: "input-group-btn" }, [
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.previous() },
        },
        el("i", { class: ["fa", "fa-step-backward"], title: "previous" }),
      ),
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.play() },
        },
        el("i", { class: ["fa", "fa-play"], title: "play" }),
      ),
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
          on: { click: () => this.next() },
        },
        el("i", { class: ["fa", "fa-step-forward"], title: "next" }),
      ),
    ]);

    /**
     * Legends
     */

    this._elImageLegend = el("img", { src: null });

    /**
     * Form
     */
    this._elInputContainer = el(
      "div",
      {
        class: "form-group",
        style: {
          padding: "20px",
        },
      },
      [
        el("label", "Date"),
        el("div", { class: "input-group" }, [this.elDateInput, elButtonsDays]),
        this.elElevation,
        this.elStyle,
      ],
    );

    this._opt.elLegend.appendChild(this._elImageLegend);
    this._opt.elInputs.appendChild(this._elInputContainer);
  }
}
