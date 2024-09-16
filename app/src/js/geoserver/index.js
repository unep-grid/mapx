import { getApiUrl } from "../api_routes/index.js";
import { getViewExtent } from "../map_helpers/index.js";
import { getViewMetadata } from "../metadata/utils.js";
import { nc, ws } from "./../mx.js";
import { settings } from "./../settings";
import { modalMarkdown } from "./../modal_markdown/index.js";
import { templateHandler } from "../language/index.js";

export const geoserver = {
  /*
   * `opt` is defined in shiny binding:
   *  - bind("mxGeoserverRebuild", geoserver.rebuild);
   */
  rebuild: (opt) => {
    opt = Object.assign(
      {},
      {
        recalcStyle: false,
      },
      opt,
    );

    const config = {
      idUser: settings.user.id,
      token: settings.user.token,
    };

    if (opt.recalcStyle) {
      config.overwriteStyle = true;
    }

    nc.panel.open();
    ws.emit("/client/geoserver/update", config);
    return true;
  },
};

export async function getGeoserverPublicConfig() {
  const url = getApiUrl("/get/config/geoserver");
  const res = await fetch(url);
  return res.json();
}

export async function getGeoserverUrl() {
  const c = await getGeoserverPublicConfig();
  return c.url;
}

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

export async function viewOgcDoc(idView) {
  const { default: template } = await import("./ogc_template.md");
  const meta = await getViewMetadata(idView);
  const bbox = await getViewExtent(idView);
  const geoserverUrl = await getGeoserverUrl();
  // -180,-90,180,90
  const bboxStr = `${bbox.lng1},${bbox.lat1},${bbox.lng2},${bbox.lat2}`;

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
