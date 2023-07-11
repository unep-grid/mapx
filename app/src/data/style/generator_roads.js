/**
 * License : MIT
 * Author/copyright : 2023-present unepgrid.ch
 *
 * Generate road layers
 * - Should lower the visual importance of roads
 * - Still shows contextual information
 * - Basic handling of bridges and tunnels
 * - Configurable
 * - Works with zoom levels
 *
 * Usage :
 * node generator_roads.js | pbcopy
 *
 * -> replace roads layers
 *
 */
const config = {
  generatorName: "generator_roads.js",
  roadTypes: ["path", "regular", "motor"],
  mapSource: "mapbox_composite",
  roadClasses: {
    motor: ["motorway", "trunk", "motorway_link", "trunk_link"],
    regular: [
      "primary",
      "primary_link",
      "secondary",
      "secondary_link",
      "tertiary",
      "tertiary_link",
      "residential",
      "street",
      "street_limited",
      "service",
    ],
    path: ["path", "pedestrian", "footway", "steps", "track"],
  },
  structures: ["tunnel", "none", "bridge"],
  colors: {
    motor: "rgb(240,240,240)",
    regular: "rgb(255,255,255)",
    path: "rgb(255,255,255)",
  },
  baseWidth: 0.6,
  roadTypeWidths: {
    motor: 10,
    regular: 8,
    path: 2,
  },
  minZoomType: {
    motor: 8,
    regular: 8,
    path: 12,
  },
  casingColor: "rgb(200,200,200)",
  casingWidth: 1.5,
  zoomWidthRange: {
    start: 10,
    end: 18,
  },
  widthRange: {
    start: 0.1,
    end: 1,
  },
};

class RoadLayerGenerator {
  constructor(opt) {
    this.config = Object.assign({}, config, opt);
  }

  createLayer(
    id,
    classes,
    structure,
    opacity,
    minZoom,
    color,
    width,
    capStyle = "round"
  ) {
    const rlg = this;
    return {
      id,
      metadata: {
        auto_generated: true,
        generator: rlg.config.generatorName,
        date: new Date().toISOString(),
      },
      minzoom: minZoom,
      type: "line",
      source: rlg.config.mapSource,
      "source-layer": "road",
      filter: [
        "all",
        ["match", ["get", "class"], classes, true, false],
        ["==", ["get", "structure"], structure],
        ["match", ["get", "type"], ["platform"], false, true],
      ],
      paint: {
        "line-color": color,
        "line-opacity": opacity,
        "line-width": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          rlg.config.zoomWidthRange.start,
          width * rlg.config.widthRange.start,
          rlg.config.zoomWidthRange.end,
          width * rlg.config.widthRange.end,
        ],
      },
      layout: {
        "line-join": "round",
        "line-cap": capStyle,
        "line-round-limit": 2,
      },
    };
  }

  createCasingLayer(id, classes, structure, opacity, minZoom, width) {
    const rlg = this;
    return rlg.createLayer(
      `${id}_case`,
      classes,
      structure,
      opacity,
      minZoom,
      rlg.config.casingColor,
      width + rlg.config.casingWidth,
      "butt"
    );
  }

  createLayers() {
    const rlg = this;
    const layers = [];
    for (const type of rlg.config.roadTypes) {
      for (const structure of rlg.config.structures) {
        const id = `road_${type}${structure === "none" ? "" : `_${structure}`}`;
        const width = rlg.config.baseWidth + rlg.config.roadTypeWidths[type];
        const minZoom = rlg.config.minZoomType[type];
        const capStyle = structure === "none" ? "round" : "butt";
        const opacity = structure === "tunnel" ? 0.4 : 1;

        const opacityCasing = [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          10,
          0,
          14,
          0.2,
          15,
          0.8,
          15.1,
          1,
        ];

        // Add casing layer first
        layers.push(
          rlg.createCasingLayer(
            id,
            rlg.config.roadClasses[type],
            structure,
            opacityCasing,
            minZoom,
            width
          )
        );
        // Add regular layer
        layers.push(
          rlg.createLayer(
            id,
            rlg.config.roadClasses[type],
            structure,
            opacity,
            minZoom,
            rlg.config.colors[type],
            width,
            capStyle
          )
        );
      }
    }

    return layers;
  }

  printLayers() {
    const rlg = this;
    const layers = rlg.createLayers();
    const string = JSON.stringify(layers).slice(1, -1) + ",";
    console.log(string);
  }
}

const roadLayerGenerator = new RoadLayerGenerator();
roadLayerGenerator.printLayers();
