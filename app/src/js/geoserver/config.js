import { getApiUrl } from "../api_routes/index.js";

export async function getGeoserverPublicConfig() {
  const url = getApiUrl("/get/config/geoserver");
  const res = await fetch(url);
  return res.json();
}

export async function getGeoserverUrl() {
  const c = await getGeoserverPublicConfig();
  return c.url;
}
