export function handlerDownloadVectorSource(o) {
  const h = mx.helpers;
  const urlRoute = mx.helpers.getApiUrl('downloadSourceCreate');
  if (mx.ws) {
    o.request.idSocket = mx.ws.io.id;
  }
  const query = mx.helpers.objToParams(o.request);
  const urlRouteQuery = `${urlRoute}?${query}`;

  h.modal({
      id : "modalSourceDownload",
      content : "Download process started. Messages will be visible in the notification center and an email will be sent at the end of the process"
  })


  fetch(urlRouteQuery).then(console.log);
}
