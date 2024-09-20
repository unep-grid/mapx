import { getViewMetadata } from "../metadata/utils.js";
import { getViewExtent } from "../map_helpers/index.js";
import { getGeoserverUrl } from "./config.js";

export async function getGeoserverLayerPreviewFromView(idView, format = "png") {
  const meta = await getViewMetadata(idView);
  const bbox = await getViewExtent(idView);
  const geoserverUrl = await getGeoserverUrl();

  // For WMS 1.3.0 with CRS=EPSG:4326, BBOX is minLat,minLon,maxLat,maxLon
  const bboxStr = `${bbox.lat1},${bbox.lng1},${bbox.lat2},${bbox.lng2}`;

  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: `${meta.project}:${meta.id}`,
    bbox: bboxStr,
    width: "768",
    height: "766",
    crs: "EPSG:4326",
    styles: "",
    format: format === "png" ? "image/png" : "application/openlayers2",
  });

  return `${geoserverUrl}?${params.toString()}`;
}
