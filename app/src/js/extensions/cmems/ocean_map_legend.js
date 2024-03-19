import { DateTime, Duration, Interval } from "luxon";
import { el } from "../../el";
import { isEmpty } from "../../is_test";
import flatpickr from "flatpickr";
import "../../search/style_flatpickr.less";

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
    await this.updateLayerInfo();
    this.setupUI();
    debugger;
    //this.update();
  }

  setupUI() {
    const { elevation_values, elevation_default, time_default, styles } =
      this.getLayerInfoAll();

    const optDepth = elevation_values.map((value) =>
      el(
        "option",
        { value, selected: value === elevation_default },
        Number(value).toFixed(2),
      ),
    );
    const optPalettes = styles.map((value) => el("option", { value }, value));

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
      type: "date",
      class: "form-control",
    });

    this._fp = flatpickr(this.elDateInput, {
      disable: [
        (date) => {
          return !this.validate(DateTime.fromJSDate(date));
        },
      ],
      enableTime: true,
    });
    this._fp.setDate(time_default.toISO());

    const elButtonsDays = el("div", { class: "input-group-btn" }, [
      el(
        "button",
        {
          class: ["btn", "btn-default"],
          on: { click: () => this.nextTime() },
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
          on: { click: () => this.nextTime() },
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

  getLegendUrl() {
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
    this._elImageLegend.src = this.getLegendUrl();
  }

  update() {
    this.updateMapSource();
    this.updateLegend();
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    this.nextTime();
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
  }

  getLayerInfo(id) {
    /**
     * Available:
     *  [
     *    "layer_names",
     *    "styles",
     *    "elevation_default",
     *    "elevation_values",
     *    "elevation_units",
     *    "time_default",
     *    "time_intervals",
     *  ];
     */
    return this._layer_info[id];
  }
  getLayerInfoAll() {
    return this._layer_info;
  }

  createLayerInfo(xmlDoc) {
    const out = {};
    const { layerName } = this._opt;

    if (isEmpty(layerName)) {
      throw new Error("Missing 'layerName' value");
    }

    const layers = Array.from(xmlDoc.querySelectorAll("Layer Layer"));

    out.layer_names = layers.map((l) => l.querySelector("Name")?.textContent);

    if (!out.layer_names.includes(layerName)) {
      throw new Error(
        `Invalid layer name '${layerName}'. Available names : '${out.layer_names.join(
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

    if (nodeElevation) {
      out.elevation_default = nodeElevation.getAttribute("default");
      out.elevation_values = nodeElevation.textContent
        .split(",")
        .map((v) => v.trim());
      out.elevation_units = nodeElevation.getAttribute("units");
    }

    const nodeTime = layer.querySelector("Dimension[name='time']");

    if (nodeTime) {
      out.time_default = DateTime.fromISO(nodeTime.getAttribute("default"));
      out.time_intervals = this.parseIntervals(nodeTime);
    }

    return out;
  }

  parseIntervals(node) {
    const intervalsValues = node.textContent.split(",");
    const intervals = intervalsValues.map((interval) => {
      const intervalTrimmed = interval.trim();
      const duration = intervalTrimmed.split("/")[2]; //e.g. 'PT3H'
      return {
        step: Duration.fromISO(duration),
        interval: Interval.fromISO(intervalTrimmed),
      };
    });
    return intervals;
  }

  findCurrentInterval() {
    return this.findInterval("current");
  }
  findNextInterval() {
    return this.findInterval("next");
  }
  findPreviousInterval() {
    return this.findInterval("previous");
  }
  findInterval(type = "current") {
    const intervals = this.getLayerInfo("time_intervals");
    const nInterval = intervals.length;
    for (let i = 0; i < nInterval; i++) {
      const isCurrent = intervals[i].interval.contains(this.getTime());
      if (isCurrent) {
        switch (type) {
          case "current": {
            return intervals[i];
          }
          case "next": {
            const next = intervals[i + 1] || intervals[0];
            return next;
          }
          case "previous":
            const next = intervals[i - 1] || intervals[nInterval - 1];
            return next;
        }
      }
    }
    console.warn("no interval found returning first");
    return intervals[0];
  }

  getTime() {
    return this._time || this.getLayerInfo("time_default");
  }

  nextTime() {
    const t = this.getNextTime();
    this._fp.setDate(t);
  }
  previousTime() {
    const t = this.getPreviousTime();
    this._fp.setDate(t);
  }

  getTimeMove(n = 1) {
    const { interval, step } = this.findCurrentInterval();
    const moved = this.getTime().plus(step * n);

    if (moved < interval.start) {
      const { interval } = this.findPreviousInterval();
      return interval.end;
    }
    if (moved > interval.end) {
      const { interval } = this.findNextInterval();
      return interval.start;
    }
    return moved;
  }

  getPreviousTime() {
    return this.getTimeMove(-1);
  }
  
  getNextTime() {
    return this.getTimeMove(1);
  }

  validate(time) {
    const intervals = this.getLayerInfo("time_intervals");
    if ((!time) instanceof DateTime) {
      time = DateTime.fromISO(time);
    }
    for (const { interval } of intervals) {
      if (interval.contains(time)) {
        return true;
      }
    }
    return false;
  }
}
