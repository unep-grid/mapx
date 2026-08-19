const WORLD_SIZE_3857 = 20037508.342789244;
const BOUNDS_ZOOM = 4;

/**
 * Arbitrary default test tile, used when a view has no usable bounds
 * (most don't). This is a structural health check ("does the URL return a
 * valid image"), not a coverage check, so which tile it is barely matters.
 */
export const DEFAULT_Z = 1;
export const DEFAULT_X = 1;
export const DEFAULT_Y = 0;

function tileBounds3857(z, x, y) {
  const size = (WORLD_SIZE_3857 * 2) / Math.pow(2, z);
  const minX = -WORLD_SIZE_3857 + x * size;
  const maxX = minX + size;
  const maxY = WORLD_SIZE_3857 - y * size;
  const minY = maxY - size;
  return [minX, minY, maxX, maxY];
}

function tileFromLonLat(lon, lat, z) {
  const n = Math.pow(2, z);
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n,
  );
  return {
    z,
    x: Math.min(Math.max(x, 0), n - 1),
    y: Math.min(Math.max(y, 0), n - 1),
  };
}

function tileFromBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 4) {
    return null;
  }
  const [west, south, east, north] = bounds.map(Number);
  if ([west, south, east, north].some((v) => !Number.isFinite(v))) {
    return null;
  }
  const lon = (west + east) / 2;
  const lat = Math.min(Math.max((south + north) / 2, -85.05), 85.05);
  return tileFromLonLat(lon, lat, BOUNDS_ZOOM);
}

function quadKey(x, y, z) {
  let key = "";
  for (let i = z; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((x & mask) !== 0) digit += 1;
    if ((y & mask) !== 0) digit += 2;
    key += digit;
  }
  return key;
}

/**
 * Substitute {bbox-epsg-3857} / {z}/{x}/{y} / {-y} (TMS) / {quadkey}
 * placeholders in a raster tile URL template with one concrete test tile.
 * Uses the view's bounds when available, otherwise a fixed default tile.
 * @param {String} template Tile URL template (data.source.tiles[0])
 * @param {Object} [opt]
 * @param {Array} [opt.bounds] [west, south, east, north]
 * @returns {String|null}
 */
export function buildTestUrl(template, opt = {}) {
  if (typeof template !== "string" || template.length === 0) {
    return null;
  }

  const tile = tileFromBounds(opt.bounds) || {
    z: DEFAULT_Z,
    x: DEFAULT_X,
    y: DEFAULT_Y,
  };
  const maxIndex = Math.pow(2, tile.z) - 1;
  const flippedY = maxIndex - tile.y;
  const bbox = tileBounds3857(tile.z, tile.x, tile.y);

  return template
    .replace(/\{bbox-epsg-3857\}/gi, bbox.join(","))
    .replace(/\{-y\}/g, flippedY)
    .replace(/\{z\}/g, tile.z)
    .replace(/\{x\}/g, tile.x)
    .replace(/\{y\}/g, tile.y)
    .replace(/\{quadkey\}/gi, quadKey(tile.x, tile.y, tile.z));
}
