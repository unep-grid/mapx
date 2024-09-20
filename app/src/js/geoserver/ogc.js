import { getViewMetadata } from "../metadata/utils.js";
import { getViewExtent } from "../map_helpers/index.js";
import { getGeoserverUrl } from './config.js';
import { modalMarkdown } from "../modal_markdown/index.js";
import { templateHandler } from "../language/index.js";


export async function viewOgcDoc(idView) {
  const { default: template } = await import("./ogc_template.md");
  const meta = await getViewMetadata(idView);
  const bbox = await getViewExtent(idView);
  const geoserverUrl = await getGeoserverUrl();

  // For WMS 1.3.0 with CRS=EPSG:4326, BBOX is minLat,minLon,maxLat,maxLon
  const bboxStr = `${bbox.lat1},${bbox.lng1},${bbox.lat2},${bbox.lng2}`;

  const doc = templateHandler(template, {
    host: geoserverUrl,
    bbox: bboxStr,
    layer: `${meta.project}:${meta.id}`,
    project: meta.project,
  });

  return modalMarkdown({
    title: "OGC Doc",
    txt: doc,
  });
}
