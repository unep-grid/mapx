import { getApiUrl, setApiUrlAuto } from "./api_routes";
import { initMapx } from "./map_helpers/index.js";
import { settings } from "./settings";
document.addEventListener("DOMContentLoaded", loadStatic);

async function loadStatic() {
  try {
    console.log("STATIC MODE");
    /*
     * Update api URL according to current path, local value or
     * weback env. variable.
     */
    setApiUrlAuto();

    /**
     * Init static mode
     */
    const urlConfig = getApiUrl("getConfigServices");
    const resp = await fetch(urlConfig);
    const services = resp.ok ? await resp.json() : {};
    Object.assign(settings.services, services);
    return initMapx({
      static: true,
    });
  } catch (e) {
    console.error(e);
  }
}
