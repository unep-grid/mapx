import { DateTime, Duration, Interval } from "luxon";
import { el } from "../../el";
import { isNotEmpty } from "../../is_test";
import { isEmpty } from "../../is_test";

// Define external default options
const defaultOptions = {
  depths: [-0.5, -1, -5, -10, -20, -50, -100],
  palettes: ["redblue"],
  transitionDuration: 2000,
};

export class TimeMapLegend {
  constructor(options) {
    this._opt = { ...defaultOptions, ...options };
    this._i = 0;
  }

  async init() {
    await this.updateCapabilities();
    this.setupUI();
    this.update();
  }

  setupUI() {
    const optDepth = this._opt.depths.map((value) =>
      el("option", { value }, value.toFixed(2)),
    );
    const optPalettes = this._opt.palettes.map((value) =>
      el("option", { value }, value),
    );

    this.elDepthInput = el(
      "select",
      { class: "form-control" },
      { on: { change: () => this.updateMapSource() } },
      optDepth,
    );

    this.elPaletteInput = el(
      "select",
      { class: "form-control" },
      { on: { change: () => this.update() } },
      optPalettes,
    );

    this.elDateInput = el("input", {
      class: "form-control",
      type: "date",
      min: this.formatDate(this._opt.minDate),
      max: this.getDateDayBefore(this._opt.maxDate),
      value: this.getDateDayBefore(this._opt.maxDate),
      on: {
        change: () => {
          this.stop();
          this.updateMapSource();
        },
      },
    });

    const elButtonsDays = el("div", { class: "input-group-btn" }, [
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.previousDay() },
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
          on: { click: () => this.nextDay() },
        },
        el("i", { class: ["fa", "fa-step-forward"], title: "next" }),
      ),
    ]);

    this._elImageLegend = el("img", { src: null });

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

        el("label", "Depth"),
        this.elDepthInput,
        el("label", "Palette"),
        this.elPaletteInput,
      ],
    );

    this._opt.elLegend.appendChild(this._elImageLegend);
    this._opt.elInputs.appendChild(this._elInputContainer);
  }

  computeLegendUrl() {
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetLegendGraphic",
      version: "1.1.1",
      layer: "wo",
      format: "image/png",
      colorscalerange: "-0.00001,0.00001",
      logscale: "false",
      palette: this._opt.palette,
    });
    return `${this._opt.baseURL}?${params}`;
  }

  clear(id) {
    id = id || this._opt.idLayer;

    if (this._opt.map.getLayer(id)) {
      this._opt.map.removeLayer(id);
    }

    if (this._opt.map.getSource(id)) {
      this._opt.map.removeSource(id);
    }
  }

  destroy() {
    this.stop();
    this.clear();
  }

  getMinDate() {
    return this.dateNoon(this.elDateInput.getAttribute("min"));
  }

  getMaxDate() {
    return this.dateNoon(this.elDateInput.getAttribute("max"));
  }

  dateInRange(d) {
    const date = this.dateNoon(d);
    return date >= this.getMinDate() && date <= this.getMaxDate();
  }

  isDateGtMax(d) {
    const date = this.dateNoon(d);
    return date > this.getMaxDate();
  }

  isDateLtMin(d) {
    const date = this.dateNoon(d);
    return date < this.getMinDate();
  }

  nextDay() {
    this.stop();
    const value = this.elDateInput.value;
    const day = this.dateNoon(value);
    day.setDate(day.getDate() + 1);
    this.setDate(day);
  }

  previousDay() {
    this.stop();
    const value = this.elDateInput.value;
    const day = this.dateNoon(value);
    day.setDate(day.getDate() - 1);
    this.setDate(day);
  }

  dateNoon(d) {
    let date = new Date(d);
    date.setHours("12");
    return date;
  }

  setDate(d) {
    let day = this.dateNoon(d);
    const isLtMin = this.isDateLtMin(day);
    const isGtMax = this.isDateGtMax(day);

    if (isLtMin) {
      day = this.getMaxDate();
    }

    if (isGtMax) {
      day = this.getMinDate();
    }

    this.elDateInput.value = this.formatDate(day);
    this.updateMapSource();
  }

  formatDate(d) {
    const now = this.dateNoon(d);
    return now.toISOString().split("T")[0];
  }

  getDateDayBefore(d) {
    const today = this.dateNoon(d);
    today.setDate(today.getDate() - 1);
    return this.formatDate(today);
  }

  formatTimeNoon(d) {
    const date = this.formatDate(d);
    const time = `${date}T12:00:00.000Z`;
    return time;
  }

  transition(a, b) {
    const layerA = this._opt.map.getLayer(a);
    const layerB = this._opt.map.getLayer(b);
    if (layerA) {
      setTimeout(() => {
        this._opt.map.setPaintProperty(a, "raster-opacity", 0);
      }, this._opt.transitionDuration * 2);
      setTimeout(() => {
        this.clear(a);
      }, this._opt.transitionDuration * 3);
    }
    if (layerB) {
      this._opt.map.setPaintProperty(b, "raster-opacity", 1);
    }
  }

  updateMapSource() {
    const selectedDate = this.elDateInput.value;
    const selectedDepth = this.elDepthInput.value;
    const selectedPalette = this.elPaletteInput.value;

    let newWmsUrl = this.constructWmsUrl(
      selectedDate,
      selectedDepth,
      selectedPalette,
    );
    const idLayerCurrent = this._id_layer;
    const idLayer = `${
      this._opt.idLayer
    }@${selectedDate}_${selectedPalette}_${selectedDepth}_${this._i++}`;

    this.clear(idLayerCurrent);

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
  }

  updateLegend() {
    this._opt.palette = this.elPaletteInput.value;
    this._elImageLegend.src = this.computeLegendUrl();
  }

  update() {
    this.updateMapSource();
    this.updateLegend();
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    this.nextDay();
    this._id_anim = setTimeout(() => {
      this.play();
    }, this._opt.transitionDuration);
  }

  stop() {
    clearTimeout(this._id_anim);
    this._playing = false;
  }

  constructWmsUrl(selectedDate, selectedDepth, selectedPalette) {
    const objParam = {
      service: "WMS",
      request: "GetMap",
      layers: "wo",
      styles: `boxfill/${selectedPalette}`,
      format: "image/png",
      transparent: "true",
      version: "1.3.0",
      crs: "EPSG:3857",
      width: 256,
      height: 256,
      colorscalerange: "-0.00001,0.00001",
      logscale: "false",
      time: this.formatTimeNoon(selectedDate),
      elevation: selectedDepth,
    };
    const params = new URLSearchParams(objParam).toString();
    const bboxCode = "&bbox={bbox-epsg-3857}";
    return `${this._opt.baseURL}?${params}${bboxCode}`;
  }

  constructWmsGetCapabilitiesUrl() {
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetCapabilities",
      version: "1.3.0",
    });
    return `${this._opt.baseURL}?${params.toString()}`;
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
      console.error("Failed to fetch or parse capabilities:", error);
      this._capabilities = null;
    }
  }

  async parseCapabilities(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    debugger;

    return {
      serviceTitle: xmlDoc.querySelector("Service > Title")?.textContent,
      serviceAbstract: xmlDoc.querySelector("Service > Abstract")?.textContent,
    };
  }

  getLayerInfo(xmlDoc) {
    const layerName = this._opt.layerName;
    const out = {};
    if (isEmpty(layerName)) {
      throw new Error("Missing 'layerName' value");
    }
    const layers = Array.from(xmlDoc.querySelectorAll("Layer Layer"));

    const names = layers.map((l) => l.querySelector("Name")?.textContent);

    if (!names.includes(layerName)) {
      throw new Error(
        `Invalid layer name '${layerName}'. Available names : '${names.join(
          ",",
        )}' `,
      );
    }

    const layer = layers.find(
      (l) => l.querySelector("Name")?.textContent === layerName,
    );

    out.styles = Array.from(layer.querySelectorAll("Style > Name")).map(
      (s) => s.textContent,
    );

    const nodeElevation = layer.querySelector("Dimension[name='elevation']");

    if (isNotEmpty(nodeElevation)) {
      out.elevation_default = nodeElevation.getAttribute("default");
      out.elevation_values = nodeElevation.textContent.split(",");
      out.elevation_units = nodeElevation.getAttribute("units");
    }

    const nodeTime = layer.querySelector("Dimension[name='time']");

    if (isNotEmpty(nodeTime)) {
      out.time_default = nodeTime.getAttribute("default");
      out.time_values = this.parseTime(nodeTime);
    }
  }

  parseTime(node) {
    const intervals = node.textContent.split(",");
    return intervals.map((interval) => {
      Interval.fromISO(interval);
    });
  }

  findCurrentInterval(){
    this._itnerval.find(i=> i.contains(this._date));

  }



}
