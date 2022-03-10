import {getApiUrl} from './../api_routes';

export async function getFileFormatList() {
  try {
    const url = getApiUrl('getFileFormatList');
    const resp = await fetch(url);
    if (resp.ok) {
      const ff = await resp.json();
      return ff;
    }
    throw new Error('getFileFormatList failed');
  } catch (e) {
    console.error(e);
  }
}
