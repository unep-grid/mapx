import {getApiUrl} from './api_routes';
import {modal} from './mx_helper_modal.js';

export async function handlerDownloadVectorSource(o) {
  try {
    const url = new URL(getApiUrl('downloadSourceCreate'));
    if (mx.ws) {
      o.request.idSocket = mx.ws.io.id;
    }
    for (const r in o.request) {
      url.searchParams.set(r, o.request[r]);
    }

    modal({
      id: 'modalSourceDownload',
      content:
        'Download process started. Messages will be visible in the notification center and an email will be sent at the end of the process'
    });

    await fetch(url);
  } catch (e) {
    console.error(e);
  }
}
