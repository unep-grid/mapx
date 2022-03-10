import {getApiUrl, setApiUrlAuto} from './api_routes';
import {initMapx} from './mx_helper_map.js';

document.addEventListener('DOMContentLoaded', loadStatic);

async function loadStatic() {
  try {
    console.log('STATIC MODE');
    /*
     * Update api URL according to current path, local value or
     * weback env. variable.
     */
    setApiUrlAuto();

    /**
     * Init static mode
     */
    const resp = await fetch(getApiUrl('getConfigMap'));
    const config = resp.ok ? await resp.json() : {};
    mx.settings.map.token = config.token;
    return initMapx({
      token: config.token,
      modeStatic: true
    });
  } catch (e) {
    console.error(e);
  }
}
