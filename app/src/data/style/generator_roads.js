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
 * node index.js | pbcopy
 *
 * -> replace roads layers
 *
 */

const config = {
  timestamp: new Date().toISOString(),
  generatorName: "generator_roads.js",
  types: ["path", "regular", "motor"],
  source: "mapbox_composite",
  classes: {
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
  widthType: {
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
  zoomWidthStart: 10,
  zoomWidthEnd: 18,
  startWidth: 0.1,
  endWidth: 1,
};

function createLayer(
  id,
  classes,
  structure,
  opacity,
  minZoom,
  color,
  width,
  capStyle = "round"
) {
  return {
    id,
    metadata: {
      auto_generated: true,
      generator: config.generatorName,
      date: config.timestamp,
    },
    minzoom: minZoom,
    type: "line",
    source: config.source,
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
        config.zoomWidthStart,
        width * config.startWidth,
        config.zoomWidthEnd,
        width * config.endWidth,
      ],
    },
    layout: {
      "line-join": "round",
      "line-cap": capStyle,
      "line-round-limit": 2,
    },
  };
}

function createCasingLayer(id, classes, structure, opacity, minZoom, width) {
  return createLayer(
    `${id}_case`,
    classes,
    structure,
    opacity,
    minZoom,
    config.casingColor,
    width + config.casingWidth,
    "butt"
  );
}

function createLayers() {
  const layers = [];

  for (const type of config.types) {
    for (const structure of config.structures) {
      const id = `road_${type}${structure === "none" ? "" : `_${structure}`}`;
      const width = config.baseWidth + config.widthType[type];
      const minZoom = config.minZoomType[type];
      const capStyle = structure === "none" ? "round" : "butt";
      const opacity = structure === "tunnel" ? 0.4 : 1;
      // Add casing layer first
      layers.push(
        createCasingLayer(
          id,
          config.classes[type],
          structure,
          opacity,
          minZoom,
          width
        )
      );
      // Add regular layer
      layers.push(
        createLayer(
          id,
          config.classes[type],
          structure,
          opacity,
          minZoom,
          config.colors[type],
          width,
          capStyle
        )
      );
    }
  }

  return layers;
}

const layers = createLayers();
const string = JSON.stringify(layers).slice(1, -1) + ",";
console.log(string);
