/**
 * Pure helpers used by the draw geometry edit session.
 */

const SIMPLE_TYPES = {
  Point: "point",
  LineString: "line",
  Polygon: "polygon",
};

const MULTI_TYPES = {
  MultiPoint: "Point",
  MultiLineString: "LineString",
  MultiPolygon: "Polygon",
};

const FAMILY_TYPES = {
  point: "Point",
  line: "LineString",
  polygon: "Polygon",
};

/**
 * Return the draw family for a supported GeoJSON geometry.
 *
 * @param {Object|null} geometry GeoJSON geometry
 * @return {String|null} point|line|polygon
 */
export function getEditableGeometryType(geometry) {
  const type = geometry?.type;
  const simpleType = MULTI_TYPES[type] || type;
  return SIMPLE_TYPES[simpleType] || null;
}

/**
 * Test whether a geometry is complete enough to store in edit history.
 * Mapbox Draw exposes incomplete features while a geometry is being drawn.
 *
 * @param {Object|null} geometry GeoJSON geometry
 * @return {Boolean}
 */
export function isCompleteGeometry(geometry) {
  const type = geometry?.type;
  const coordinates = geometry?.coordinates;

  if (MULTI_TYPES[type]) {
    return (
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.every((part) =>
        isCompleteGeometry({
          type: MULTI_TYPES[type],
          coordinates: part,
        }),
      )
    );
  }

  switch (type) {
    case "Point":
      return isPosition(coordinates);
    case "LineString":
      return (
        Array.isArray(coordinates) &&
        coordinates.length >= 2 &&
        coordinates.every(isPosition)
      );
    case "Polygon":
      return (
        Array.isArray(coordinates) &&
        coordinates.length > 0 &&
        coordinates.every(isCompleteRing)
      );
    default:
      return false;
  }
}

/**
 * Remove incomplete Draw placeholders from a FeatureCollection.
 *
 * @param {Object|null} data GeoJSON FeatureCollection
 * @return {Object} filtered FeatureCollection
 */
export function getCompleteFeatureCollection(data) {
  return {
    type: "FeatureCollection",
    features: (data?.features || []).filter((feature) =>
      isCompleteGeometry(feature?.geometry),
    ),
  };
}

/**
 * Stable history identity. Draw feature ids are intentionally ignored.
 *
 * @param {Object|null} data GeoJSON FeatureCollection
 * @return {String}
 */
export function getFeatureCollectionGeometryHash(data) {
  const complete = getCompleteFeatureCollection(data);
  return JSON.stringify(complete.features.map((feature) => feature.geometry));
}

/**
 * Expand a multipart feature into independently selectable simple features.
 *
 * @param {Object} feature GeoJSON feature
 * @return {Array<Object>} simple GeoJSON features
 */
export function splitFeatureForEditing(feature) {
  const geometry = feature?.geometry;
  const simpleType = MULTI_TYPES[geometry?.type];
  if (!simpleType) {
    return geometry ? [feature] : [];
  }
  return geometry.coordinates.map((coordinates) => ({
    type: "Feature",
    properties: { ...(feature.properties || {}) },
    geometry: {
      type: simpleType,
      coordinates,
    },
  }));
}

/**
 * Validate raw Draw data and assemble its same-family parts for persistence.
 * Incomplete data deliberately has no geometry result, so callers cannot
 * accidentally interpret it as an explicit null/delete update.
 *
 * @param {Object|null} data Raw Draw FeatureCollection
 * @param {Object} opt Assembly policy
 * @param {String} opt.type point|line|polygon
 * @param {Boolean} opt.allowMultipart Allow more than one simple part
 * @param {Boolean} opt.promoteToMulti Return Multi* even for one part
 * @param {Boolean} [opt.allowEmptyPlaceholder] Treat an untouched initial
 *        Draw placeholder as an empty geometry
 * @param {String} [opt.activeMode] Current Mapbox Draw mode
 * @return {Object} {status, geometry?}
 */
export function prepareGeometryForSave(data, opt) {
  if (opt.activeMode?.startsWith("draw_")) {
    return { status: "active_drawing" };
  }

  const features = data?.features || [];
  if (features.some((feature) => !isCompleteGeometry(feature?.geometry))) {
    if (
      opt.allowEmptyPlaceholder &&
      features.every((feature) => !hasAnyPosition(feature?.geometry))
    ) {
      return { status: "valid", geometry: null };
    }
    return { status: "incomplete" };
  }
  if (features.length === 0) {
    return { status: "valid", geometry: null };
  }

  const simpleType = FAMILY_TYPES[opt.type];
  const multiType = `Multi${simpleType}`;
  const parts = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (getEditableGeometryType(geometry) !== opt.type) {
      return { status: "incompatible" };
    }
    if (geometry.type === multiType) {
      parts.push(...geometry.coordinates);
    } else if (geometry.type === simpleType) {
      parts.push(geometry.coordinates);
    } else {
      return { status: "incompatible" };
    }
  }

  if (!opt.allowMultipart && parts.length > 1) {
    return { status: "multipart_not_allowed" };
  }
  if (opt.promoteToMulti || parts.length > 1) {
    return {
      status: "valid",
      geometry: {
        type: multiType,
        coordinates: parts,
      },
    };
  }
  return {
    status: "valid",
    geometry: {
      type: simpleType,
      coordinates: parts[0],
    },
  };
}

/**
 * Invoke the persistence callback only after geometry validation succeeds.
 *
 * @param {Object|null} data Raw Draw FeatureCollection
 * @param {Object} opt Assembly policy accepted by prepareGeometryForSave
 * @param {Function|null} onSave Persistence callback
 * @return {Promise<Object>} saved result or validation status
 */
export async function applyGeometrySave(data, opt, onSave) {
  const prepared = prepareGeometryForSave(data, opt);
  if (prepared.status !== "valid") {
    return prepared;
  }
  const result = {
    status: "saved",
    geometry: prepared.geometry,
  };
  if (typeof onSave === "function") {
    await onSave(result);
  }
  return result;
}

/**
 * Calculate a geometry's focus bounds and center.
 *
 * @param {Object|null} geometry GeoJSON geometry
 * @return {Object|null} bounds and center, or null for an empty geometry
 */
export function getGeometryFocus(geometry) {
  const coordinates = [];
  collectCoordinates(geometry?.coordinates, coordinates);
  if (coordinates.length === 0) {
    return null;
  }
  const lngs = coordinates.map((coordinate) => coordinate[0]);
  const lats = coordinates.map((coordinate) => coordinate[1]);
  const bounds = [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
  return {
    bounds,
    center: [
      (bounds[0][0] + bounds[1][0]) / 2,
      (bounds[0][1] + bounds[1][1]) / 2,
    ],
    isPoint:
      bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1],
  };
}

/**
 * Compose the circle plugin's geometry-specific behavior onto the current
 * Mapbox Draw modes. The plugin bundles an older Draw version, so its complete
 * modes must not replace current mode lifecycle and multipart fixes.
 *
 * @param {Object} baseModes Current Mapbox Draw modes
 * @param {Object} circleModes Circle plugin modes
 * @return {Object} compatible simple/direct selection modes
 */
export function getCircleCompatibleSelectModes(baseModes, circleModes) {
  const circleDirect = circleModes.DirectMode;
  const circleSimple = circleModes.SimpleSelectMode;
  return {
    direct_select: {
      ...baseModes.direct_select,
      dragFeature: circleDirect.dragFeature,
      dragVertex: circleDirect.dragVertex,
      toDisplayFeatures: circleDirect.toDisplayFeatures,
    },
    simple_select: {
      ...baseModes.simple_select,
      dragMove: circleSimple.dragMove,
      toDisplayFeatures: circleSimple.toDisplayFeatures,
    },
  };
}

function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function isCompleteRing(ring) {
  if (
    !Array.isArray(ring) ||
    ring.length < 4 ||
    !ring.every(isPosition)
  ) {
    return false;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function collectCoordinates(value, coordinates) {
  if (!Array.isArray(value)) {
    return;
  }
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    coordinates.push(value);
    return;
  }
  for (const item of value) {
    collectCoordinates(item, coordinates);
  }
}

function hasAnyPosition(geometry) {
  const coordinates = [];
  collectCoordinates(geometry?.coordinates, coordinates);
  return coordinates.length > 0;
}
