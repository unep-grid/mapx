import { el } from "../../el";

export class OceanMapLegend {
  constructor(options) {
    this._i = 0;
    this.map = options.map;
    this.idLayer = options.idLayer;
    this.elLegend = options.elLegend;
    this.elInputs = options.elInputs;
    this.baseURL = options.baseURL;
    this.palette = options.palette;
    this.maxDate = options.maxDate;
    this.minDate = options.minDate;
    this.metadata = options.metadata;
    this.before = options.before;
    // WMS depths : may be hardcoded in WMS server
    this.depths = options.depths || [-0.5, -1, -5, -10, -20, -50, -100];
    this.palettes = options.palettes || ["redblue"];
    this.transitionDuration = options.transitionDuration || 2000;
    this.setupUI();
    this.update();
  }

  setupUI() {
    const optDepth = this.depths.map((value) =>
      el("option", { value }, value.toFixed(2)),
    );
    const optPalettes = this.palettes.map((value) =>
      el("option", { value }, value),
    );

    this.elDepthInput = el(
      "select",
      {
        class: "form-control",
      },
      { on: { change: () => this.updateMapSource() } },
      optDepth,
    );

    this.elPaletteInput = el(
      "select",
      {
        class: "form-control",
      },
      { on: { change: () => this.update() } },
      optPalettes,
    );

    this.elDateInput = el("input", {
      class: "form-control",
      type: "date",
      min: this.formatDate(this.minDate),
      max: this.getDateDayBefore(this.maxDate),
      value: this.getDateDayBefore(this.maxDate),
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

    this.elImageLegend = el("img", { src: null });

    this.elInputContainer = el(
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

    this.elLegend.appendChild(this.elImageLegend);

    this.elInputs.appendChild(this.elInputContainer);
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
      palette: this.palette,
    });
    return `${this.baseURL}?${params}`;
  }

  clear(id) {
    id = id || this.idLayer;

    if (this.map.getLayer(id)) {
      this.map.removeLayer(id);
    }

    if (this.map.getSource(id)) {
      this.map.removeSource(id);
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
    console.log(this.formatDate(day), this.elDateInput.value);

    this.updateMapSource();
  }

  formatDate(d) {
    const now = this.dateNoon(d);
    return now.toISOString().split("T")[0];
  }

  getDateDayBefore(d) {
    const today = this.dateNoon(d);
    today.setDate(today.getDate());
    return this.formatDate(today);
  }

  formatTimeNoon(d) {
    const date = this.formatDate(d);
    const time = `${date}T12:00:00.000Z`;
    return time;
  }

  transition(a, b) {
    const layerA = this.map.getLayer(a);
    const layerB = this.map.getLayer(b);
    if (layerA) {
      setTimeout(() => {
        this.map.setPaintProperty(a, "raster-opacity", 0);
      }, this.transitionDuration * 2);
      setTimeout(() => {
        this.clear(a);
      }, this.transitionDuration * 3);
    }
    if (layerB) {
      this.map.setPaintProperty(b, "raster-opacity", 1);
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
      this.idLayer
    }@${selectedDate}_${selectedPalette}_${selectedDepth}_${this._i++}`;

    this.clear(idLayer);

    this.map.addLayer({
      id: idLayer,
      before: this.before,
      type: "raster",
      source: idLayer,
      metadata: this.metadata,
      paint: {
        "raster-opacity": 0,
        "raster-opacity-transition": {
          duration: this.transitionDuration,
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
    this.palette = this.elPaletteInput.value;
    this.elImageLegend.src = this.computeLegendUrl();
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
    this.nextDay();
    this._id_anim = setTimeout(() => {
      this.play();
    }, this.transitionDuration);
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
    return `${this.baseURL}?${params}${bboxCode}`;
  }
}
export function getPalettes() {
  return [
    "ferret",
    "rainbow",
    "occam",
    "redblue",
    "ncview",
    "sst_36",
    "greyscale",
    "alg2",
    "occam_pastel-30",
    "alg",
  ];
}

export function getDepths() {
  return [
    -0.49402499198913574, -1.5413750410079956, -2.6456689834594727,
    -3.8194949626922607, -5.078224182128906, -6.440614223480225,
    -7.92956018447876, -9.572997093200684, -11.404999732971191,
    -13.467140197753906, -15.810070037841797, -18.495559692382812,
    -21.598819732666016, -25.211410522460938, -29.444730758666992,
    -34.43415069580078, -40.344051361083984, -47.37369155883789,
    -55.76428985595703, -65.80726623535156, -77.85385131835938,
    -92.3260726928711, -109.72930145263672, -130.66600036621094,
    -155.85069274902344, -186.12559509277344, -222.47520446777344,
    -266.0403137207031, -318.1274108886719, -380.2130126953125,
    -453.9377136230469, -541.0889282226562, -643.5667724609375,
    -763.3331298828125, -902.3392944335938, -1062.43994140625, -1245.291015625,
    -1452.2509765625, -1684.2840576171875, -1941.8929443359375,
    -2225.077880859375, -2533.3359375, -2865.702880859375, -3220.820068359375,
    -3597.031982421875, -3992.48388671875, -4405.22412109375, -4833.291015625,
    -5274.7841796875, -5727.9169921875,
  ];
}
