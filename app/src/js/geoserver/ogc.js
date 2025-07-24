import { getViewMetadata } from "../metadata/utils.js";
import { getViewExtent } from "../map_helpers/index.js";
import { getGeoserverUrl } from "./config.js";
import { modalMarkdown } from "../modal_markdown/index.js";
import { templateHandler } from "../language/index.js";

export async function viewOgcDoc(idView) {
  const { default: template } = await import("./ogc_template.md");
  const meta = await getViewMetadata(idView);
  const bbox = await getViewExtent(idView);
  const geoserverUrl = await getGeoserverUrl();

  // Dynamic imports for only the Turf modules we need

  const { point } = await import("@turf/helpers");
  const { default: distance } = await import("@turf/distance");

  // Ensure we have min/max values correctly ordered
  const minLng = Math.min(bbox.lng1, bbox.lng2);
  const maxLng = Math.max(bbox.lng1, bbox.lng2);
  const minLat = Math.min(bbox.lat1, bbox.lat2);
  const maxLat = Math.max(bbox.lat1, bbox.lat2);

  // Calculate actual distances in meters
  const westPoint = point([minLng, (minLat + maxLat) / 2]);
  const eastPoint = point([maxLng, (minLat + maxLat) / 2]);
  const northPoint = point([(minLng + maxLng) / 2, maxLat]);
  const southPoint = point([(minLng + maxLng) / 2, minLat]);

  const widthMeters = distance(westPoint, eastPoint, { units: "meters" });
  const heightMeters = distance(southPoint, northPoint, { units: "meters" });

  const ratio = widthMeters / heightMeters;

  const widthTile = 512;
  const heightTile = Math.round(widthTile / ratio);

  // For WMS 1.3.0 with CRS=EPSG:4326, BBOX is minLat,minLon,maxLat,maxLon
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`;

  const doc = templateHandler(template, {
    host: geoserverUrl,
    bbox: bboxStr,
    layer: `${meta.project}:${meta.id}`,
    project: meta.project,
    heightTile,
    widthTile,
  });

  return modalMarkdown({
    title: "OGC Doc",
    txt: doc,
  });
}
