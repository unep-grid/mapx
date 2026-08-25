const SOURCE_ID = "mx-draw-geometry-preview";

const LAYERS = [
  {
    id: "mx-draw-geometry-preview-fill",
    type: "fill",
    paint: {
      "fill-color": "#ff7800",
      "fill-opacity": 0.24,
    },
  },
  {
    id: "mx-draw-geometry-preview-line",
    type: "line",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#ff7800",
      "line-width": 4,
    },
  },
  {
    id: "mx-draw-geometry-preview-point",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "#ff7800",
      "circle-radius": 7,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  },
];

export class GeometryPreview {
  constructor() {
    this.owner = null;
  }

  /**
   * Add or update the temporary GeoJSON preview owned by the draw controller.
   * @param {Object} map MapLibre map
   * @param {Object} data GeoJSON feature
   * @param {symbol|null} owner owner allowed to perform scoped cleanup
   */
  show(map, data, owner = null) {
    const source = map.getSource(SOURCE_ID);
    if (source?.setData) {
      source.setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: "geojson", data });
    }
    for (const layer of LAYERS) {
      if (!map.getLayer(layer.id)) {
        map.addLayer({ ...layer, source: SOURCE_ID });
      }
    }
    this.owner = owner;
  }

  /**
   * Remove layers before their source, as required by MapLibre.
   * Supplying an owner makes cleanup conditional; omitting it forces cleanup.
   * @param {Object|null} map MapLibre map
   * @param {symbol} [owner] expected owner
   * @returns {boolean} whether this caller owned and cleared the preview
   */
  clear(map, owner) {
    if (owner !== undefined && owner !== this.owner) {
      return false;
    }
    if (map) {
      for (const layer of [...LAYERS].reverse()) {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    }
    this.owner = null;
    return true;
  }
}
