import { getApiUrl, setApiUrlAuto } from "./api_routes";
import { isNotEmpty } from "./is_test";
import { initMapx } from "./map_helpers/index.js";
import { settings } from "./settings";
document.addEventListener("DOMContentLoaded", loadStatic);

async function loadStatic() {
  try {
    console.log("STATIC MODE");
    await updateSettingsStatic();
    return initMapx({
      static: true,
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * Update api url and settings
 */
async function updateSettingsStatic() {
  setApiUrlAuto();
  const urlConfig = getApiUrl("getConfigUpdate");
  const resp = await fetch(urlConfig);
  const conf = resp.ok ? await resp.json() : {};

  for (const [key, value] of Object.entries(conf)) {
    if (isNotEmpty(value)) {
      // expects both object for now
      Object.assign(settings[key], value);
    }
  }
}
