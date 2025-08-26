import { getViewMetadata } from "../metadata/utils.js";
import { getViewExtent } from "../map_helpers/index.js";
import { getGeoserverUrl } from "./config.js";
import { modalMarkdown } from "../modal_markdown/index.js";
import { templateHandler } from "../language/index.js";

/** Normalize to (-180, 180] with -180 pushed to +180 for stability */
function norm180(x) {
  let y = ((((x + 180) % 360) + 360) % 360) - 180;
  if (y === -180) y = 180;
  return y;
}

/** Smallest signed delta (lng2 - lng1) in (-180, 180] */
function lonDelta(lng1, lng2) {
  return norm180(lng2 - lng1);
}
/** Tight bbox around two lon/lat points; robust at the anti-meridian */
function makeTightGeographicBbox(lng1, lat1, lng2, lat2, padPercent = 0.05) {
  // Re-express lng2 as lng1 + smallest angular delta
  const d = lonDelta(lng1, lng2);
  const u1 = lng1;
  const u2 = lng1 + d; // |u2 - u1| ≤ 180

  let minLon = Math.min(u1, u2);
  let maxLon = Math.max(u1, u2);
  let minLat = Math.min(lat1, lat2);
  let maxLat = Math.max(lat1, lat2);

  // Degree padding
  const dLon = Math.max(1e-6, maxLon - minLon);
  const dLat = Math.max(1e-6, maxLat - minLat);
  const padLon = dLon * padPercent;
  const padLat = dLat * padPercent;

  minLon -= padLon;
  maxLon += padLon;
  minLat -= padLat;
  maxLat += padLat;

  // Clamp latitude
  minLat = Math.max(-83, minLat);
  maxLat = Math.min(83, maxLat);

  return { minLon, minLat, maxLon, maxLat };
}
/** Project bbox using all 4 corners and clamp Mercator X/Y */
async function projectBbox(
  { minLon, minLat, maxLon, maxLat },
  targetCrs = "EPSG:3857",
) {
  const { default: proj4 } = await import("proj4");

  const corners = [
    [minLon, minLat],
    [minLon, maxLat],
    [maxLon, minLat],
    [maxLon, maxLat],
  ].map((p) => proj4("EPSG:4326", targetCrs, p));

  let xs = corners.map((p) => p[0]),
    ys = corners.map((p) => p[1]);
  let minx = Math.min(...xs),
    maxx = Math.max(...xs);
  let miny = Math.min(...ys),
    maxy = Math.max(...ys);

  if (targetCrs === "EPSG:3857") {
    const MAX_MERC = 20037508.342789244;
    minx = Math.max(minx, -MAX_MERC);
    maxx = Math.min(maxx, MAX_MERC);
    miny = Math.max(miny, -MAX_MERC);
    maxy = Math.min(maxy, MAX_MERC);
  }

  if (maxx - minx === 0) {
    maxx += 1;
    minx -= 1;
  }
  if (maxy - miny === 0) {
    maxy += 1;
    miny -= 1;
  }

  return { minx, miny, maxx, maxy };
}

/** Compute pixel size preserving aspect ratio; width in [500, 1000] */
function computeSize(minx, miny, maxx, maxy, preferredWidth = 800) {
  const dx = Math.max(1e-6, maxx - minx);
  const dy = Math.max(1e-6, maxy - miny);
  const ratio = dy / dx; // height/width in CRS units

  // Clamp width, then compute height
  let width = Math.min(1000, Math.max(500, Math.round(preferredWidth)));
  let height = Math.round(width * ratio);

  // Ensure at least ~100px tall for visibility; rescale width if needed
  if (height < 100) {
    const scale = 100 / Math.max(1, height);
    width = Math.min(1000, Math.max(500, Math.round(width * scale)));
    height = Math.round(width * ratio);
  }
  // Also avoid absurdly tall images
  if (height > 2000) {
    const scale = 2000 / height;
    width = Math.round(width * scale);
    height = 2000;
  }

  // Guarantee minimum of 1 pixel
  width = Math.max(1, width);
  height = Math.max(1, height);

  return { width, height };
}

/** Build BBOX parameter string respecting WMS version & CRS axis order */
function bboxParamString({ minx, miny, maxx, maxy }, wmsVersion, crsCode) {
  // WMS 1.3.0 + EPSG:4326 uses axis order (lat,lon); everything else is x,y
  const is130 = wmsVersion === "1.3.0";
  const is4326 = crsCode === "EPSG:4326";
  if (is130 && is4326) {
    // minLat,minLon,maxLat,maxLon
    // Our inputs are in x/y order; swap into y/x
    return `${miny},${minx},${maxy},${maxx}`;
  }
  // Standard: minx,miny,maxx,maxy
  return `${minx},${miny},${maxx},${maxy}`;
}

/** Main: produce a WMS GetMap URL (PNG) for a distortion-free preview */
async function buildWmsPreviewUrl({
  geoserverBase,
  layerName,
  bboxGeographic,
  targetCrs = "EPSG:3857",
  wmsVersion = "1.3.0",
  preferredWidth = 800,
  transparent = true,
  styles = "",
}) {
  // 1) Tight, padded geographic bbox with anti-meridian handling
  const tightGeo = makeTightGeographicBbox(
    bboxGeographic.lng1,
    bboxGeographic.lat1,
    bboxGeographic.lng2,
    bboxGeographic.lat2,
    0.06, // ~6% padding feels nice in previews
  );

  // 2) Project bbox into the requested CRS
  const projBox = await projectBbox(tightGeo, targetCrs);

  // 3) Pixel size that preserves aspect ratio
  const { width, height } = computeSize(
    projBox.minx,
    projBox.miny,
    projBox.maxx,
    projBox.maxy,
    preferredWidth,
  );

  // 4) Axis order & params
  const crsParamName = wmsVersion === "1.3.0" ? "CRS" : "SRS";
  const bboxStr = bboxParamString(projBox, wmsVersion, targetCrs);

  // 5) Build URL
  const url = new URL("/geoserver/wms", geoserverBase); // adjust if your base already includes /geoserver
  url.searchParams.set("service", "WMS");
  url.searchParams.set("version", wmsVersion);
  url.searchParams.set("request", "GetMap");
  url.searchParams.set("layers", layerName);
  url.searchParams.set("styles", styles); // keep empty for default
  url.searchParams.set(crsParamName, targetCrs);
  url.searchParams.set("bbox", bboxStr);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("format", "image/png");
  url.searchParams.set("transparent", transparent ? "true" : "false");
  // Optional niceties:
  url.searchParams.set("tiled", "false");
  url.searchParams.set("bgcolor", "0xFFFFFF");
  // url.searchParams.set("format_options", "antialiasing:full");

  const urlStr = url.toString();

  return {
    wmsUrl: urlStr,
    wmsUrlFormat: formatUrl(urlStr),
    width,
    height,
    bboxProjected: projBox,
    crsParamName,
  };
}

/** Build complete WFS URL with safe small bounding box */
function buildWfsUrl(geoserverBase, layerName) {
  const url = new URL("/geoserver/wfs", geoserverBase);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeName", layerName);
  // Use a small safe bounding box to prevent large data requests
  url.searchParams.set("bbox", "-1,-1,1,1,EPSG:4326");
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("count", "10");
  url.searchParams.set("startIndex", "0");
  const urlStr = url.toString();
  return {
    wfsUrl: urlStr,
    wfsUrlFormat: formatUrl(urlStr),
  };
}

/** Build complete TMS URL */
function buildTmsUrl(geoserverBase, layerName) {
  const tmsUrl = `${geoserverBase}/gwc/service/tms/1.0.0/${layerName}@EPSG:4326@png/{z}/{x}/{y}.png`;
  return {
    tmsUrl: tmsUrl,
    tmsUrlFormat: tmsUrl,
  };
}

/** Build complete WMTS URL */
function buildWmtsUrl(geoserverBase, layerName) {
  const url = new URL("/geoserver/gwc/service/wmts", geoserverBase);
  url.searchParams.set("layer", layerName);
  url.searchParams.set("style", "");
  url.searchParams.set("tilematrixset", "EPSG:4326");
  url.searchParams.set("Service", "WMTS");
  url.searchParams.set("Request", "GetTile");
  url.searchParams.set("Version", "1.0.0");
  url.searchParams.set("Format", "image/png");
  url.searchParams.set("TileMatrix", "{z}");
  url.searchParams.set("TileCol", "{x}");
  url.searchParams.set("TileRow", "{y}");
  const urlStr = url.toString();
  return {
    wmtsUrl: urlStr,
    wmtsUrlFormat: formatUrl(urlStr),
  };
}

export async function viewOgcDoc(idView) {
  const { default: template } = await import("./ogc_template.md");

  const meta = await getViewMetadata(idView);
  const bbox = await getViewExtent(idView); // expects {lng1,lat1,lng2,lat2}
  const geoserverUrl = await getGeoserverUrl();

  // Choose your preview CRS; EPSG:3857 is good for global, change as needed
  const targetCrs = "EPSG:3857";
  const wmsVersion = "1.3.0";
  const layerName = `${meta.project}:${meta.id}`;

  // Build complete WMS URL with proper projection and bbox
  const { wmsUrl, wmsUrlFormat } = await buildWmsPreviewUrl({
    geoserverBase: geoserverUrl,
    layerName,
    bboxGeographic: bbox,
    targetCrs,
    wmsVersion,
    preferredWidth: 800, // will be clamped to [500,1000]
    transparent: true,
    styles: "", // or a named style
  });

  // Build complete URLs for all OGC services
  const { wfsUrl, wfsUrlFormat } = buildWfsUrl(geoserverUrl, layerName);
  const { tmsUrl, tmsUrlFormat } = buildTmsUrl(geoserverUrl, layerName);
  const { wmtsUrl, wmtsUrlFormat } = buildWmtsUrl(geoserverUrl, layerName);

  const doc = templateHandler(template, {
    wmsUrl,
    wmsUrlFormat,
    wfsUrl,
    wfsUrlFormat,
    tmsUrl,
    tmsUrlFormat,
    wmtsUrl,
    wmtsUrlFormat,
    layerName,
  });

  return modalMarkdown({
    title: "OGC Doc",
    txt: doc,
  });
}

function formatUrl(url) {
  const urlObj = new URL(url);
  let output = `${urlObj.origin}${urlObj.pathname}`;

  if (urlObj.search) {
    output += "?";
    const params = Array.from(urlObj.searchParams.entries())
      .map(
        ([key, value]) =>
          `${decodeURIComponent(key)} = ${decodeURIComponent(value)}`,
      )
      .join("\n&");
    output += params;
  }

  if (urlObj.hash) {
    output += `\n# ${decodeURIComponent(urlObj.hash.substring(1))}`;
  }

  return output;
}
