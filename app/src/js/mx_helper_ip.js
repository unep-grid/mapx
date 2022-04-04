import {getApiUrl} from './api_routes';

/**
 * Retrieve ip data info
 */
export async function getIpInfo() {
  try {
    const apiUrlViews = getApiUrl('getIpInfo');
    const resp = await fetch(apiUrlViews);
    if (resp.ok) {
      return resp.json();
    }
    throw new Error('getIpInfo failed');
  } catch (e) {
    console.error(e);
  }
}
