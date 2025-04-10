import { getMap } from ".";
import { isArray } from "../is_test";

// proj4 will be imported dynamically only if projecting to Web Mercator

// --- Configuration & Constants ---

const DEFAULT_BUFFER_PIXELS = 5;
const SRID_WGS84 = 4326;
const SRID_WEBMERCATOR = 3857;

// Define Proj4 strings directly
const PROJECTION_WGS84 = "+proj=longlat +datum=WGS84 +no_defs +type=crs";
const PROJECTION_WEBMERCATOR =
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs";

// --- Type Aliases (Based on Mapbox GL JS) ---

/** Mapbox GL JS Point representation: [number, number] or {x: number, y: number} */
/** @typedef {[number, number] | {x: number, y: number}} PointLike */

/** Mapbox GL JS LngLat representation: {lng: number, lat: number} */
/** @typedef {{lng: number, lat: number}} LngLat */

/** Pixel Bounding Box format: [[minX, minY], [maxX, maxY]] */
/** @typedef {[[number, number], [number, number]]} PixelBbox */

// --- Exported Functions ---

/**
 * Creates a pixel bounding box from a map event point.
 * Output format is compatible with mapboxgl.Map#queryRenderedFeatures.
 *
 * @param {{ point: PointLike }} event - Mapbox map event containing a `point`.
 * @param {number} [buffer=DEFAULT_BUFFER_PIXELS] - Pixel buffer around the event point.
 * @returns {PixelBbox} Pixel bounding box [[minX, minY], [maxX, maxY]].
 * @throws {Error} If event or event.point is invalid.
 */
export function eventToPointBbox(event, buffer = DEFAULT_BUFFER_PIXELS) {
  // Check if event and event.point exist
  if (!event?.point) {
    throw new Error(
      "Invalid event object provided. Must contain a 'point' property.",
    );
  }

  // Handle both {x, y} and [x, y] PointLike formats
  const x = isArray(event.point) ? event.point[0] : event.point.x;
  const y = isArray(event.point) ? event.point[1] : event.point.y;

  if (typeof x !== "number" || typeof y !== "number") {
    throw new Error("Invalid event.point format. Coordinates must be numbers.");
  }

  // Return the bounding box as an array of two points [sw, ne]
  return [
    [x - buffer, y - buffer], // Bottom-left corner [minX, minY]
    [x + buffer, y + buffer], // Top-right corner [maxX, maxY]
  ];
}

/**
 * Converts a pixel bounding box to a WMS BBOX string, with projection support.
 *
 * @param {Array<Array<number>>} pixelBbox - Pixel bounding box [[minX, minY], [maxX, maxY]].
 * @param {Object} options - Configuration options
 * @param {number} [options.targetSrid=SRID_WGS84] - Target SRID (4326 or 3857).
 * @param {boolean} [options.useLatLngOrder=false] - For WMS 1.3.0 compatibility with SRID 4326.
 * @returns {Promise<string>} WMS BBOX parameter string.
 * @throws {Error} If inputs are invalid or processing fails.
 */
export async function pointBboxToWms(
  pixelBbox,
  { targetSrid = SRID_WGS84, useLatLngOrder = false } = {},
) {
  validateInputs(pixelBbox, targetSrid);

  const map = getMap();
  if (!map) {
    throw new Error("Map instance not available via getMap().");
  }

  // Get geographic coordinates from pixel coordinates
  const { minLng, minLat, maxLng, maxLat } = getGeographicBounds(
    map,
    pixelBbox,
  );

  // Get final coordinates based on target SRID
  const coordinates = await getProjectedCoordinates(
    { minLng, minLat, maxLng, maxLat },
    targetSrid,
  );

  // Format the WMS BBOX string
  return formatBboxString(coordinates, targetSrid, useLatLngOrder);
}

/**
 * Validates the input parameters.
 */
function validateInputs(pixelBbox, targetSrid) {
  // Validate pixelBbox format
  const isValidBbox =
    Array.isArray(pixelBbox) &&
    pixelBbox.length === 2 &&
    pixelBbox.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every((coord) => typeof coord === "number"),
    );

  if (!isValidBbox) {
    throw new Error(
      "Invalid pixelBbox format. Expected [[minX, minY], [maxX, maxY]] with numbers.",
    );
  }

  // Check for supported SRID
  if (targetSrid !== SRID_WGS84 && targetSrid !== SRID_WEBMERCATOR) {
    throw new Error(
      `Unsupported target SRID: ${targetSrid}. Only ${SRID_WGS84} (WGS84) and ` +
        `${SRID_WEBMERCATOR} (Web Mercator) are supported.`,
    );
  }
}

/**
 * Unprojects pixel coordinates to geographic bounds.
 */
function getGeographicBounds(map, pixelBbox) {
  const swLatLng = map.unproject(pixelBbox[0]); // bottom-left pixel
  const neLatLng = map.unproject(pixelBbox[1]); // top-right pixel

  return {
    minLng: Math.min(swLatLng.lng, neLatLng.lng),
    minLat: Math.min(swLatLng.lat, neLatLng.lat),
    maxLng: Math.max(swLatLng.lng, neLatLng.lng),
    maxLat: Math.max(swLatLng.lat, neLatLng.lat),
  };
}

/**
 * Projects geographic coordinates to the target coordinate system if needed.
 */
async function getProjectedCoordinates(bounds, targetSrid) {
  const { minLng, minLat, maxLng, maxLat } = bounds;

  // If target is WGS84, no projection needed
  if (targetSrid === SRID_WGS84) {
    return [minLng, minLat, maxLng, maxLat];
  }

  // For Web Mercator, project the coordinates
  try {
    const proj4 = (await import("proj4")).default;

    // Project the geographic corners to Web Mercator
    const swProjected = proj4(PROJECTION_WGS84, PROJECTION_WEBMERCATOR, [
      minLng,
      minLat,
    ]);
    const neProjected = proj4(PROJECTION_WGS84, PROJECTION_WEBMERCATOR, [
      maxLng,
      maxLat,
    ]);

    // Return projected bounds
    return [
      Math.min(swProjected[0], neProjected[0]), // minX
      Math.min(swProjected[1], neProjected[1]), // minY
      Math.max(swProjected[0], neProjected[0]), // maxX
      Math.max(swProjected[1], neProjected[1]), // maxY
    ];
  } catch (error) {
    throw new Error(
      `Projection from WGS84 to Web Mercator failed: ${error.message}`,
    );
  }
}

/**
 * Formats the coordinates into a WMS BBOX string.
 */
function formatBboxString(coordinates, targetSrid, useLatLngOrder) {
  const [val1, val2, val3, val4] = coordinates;

  // For WMS 1.3.0 with EPSG:4326, swap coordinate order if requested
  if (targetSrid === SRID_WGS84 && useLatLngOrder) {
    return `${val2},${val1},${val4},${val3}`; // minLat,minLng,maxLat,maxLng
  }

  // Standard order for all other cases
  return `${val1},${val2},${val3},${val4}`;
}
