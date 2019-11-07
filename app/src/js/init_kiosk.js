document.addEventListener('DOMContentLoaded', function() {
  console.log('KIOSK MODE');
  const h = mx.helpers;
  const idMap = mx.settings.map.id;
  mx.maps[idMap] = {};
  /**
   * Update settings
   */
  const loc = new URL(window.location.href);

  const apiPublic =
    API_HOST_PUBLIC || loc.hostname.replace(/^app|^dev\./, 'api.');
  const apiPort = API_PORT || loc.port;

  Object.assign(mx.settings.api, {
    host_public: apiPublic,
    protocol: loc.protocol,
    port: apiPort
  });

  fetch(h.getApiUrl('getConfigMap'))
    .then((d) => d.json())
    .then((c) => {
      Object.assign(mx.settings, {
        modeKiosk: true,
        map: Object.assign(mx.settings.map, {
          token: c.token
        })
      });
      
      const views = h.getQueryParameterInit('views');
      return h.getViewsRemote(views);
    })
    .then((views) => {
      mx.maps[idMap].views = views;
      return h.getViewsBounds(views);
    })
    .then((bounds) => {
      /*
       * Init map
       */
      return h.initMapx({
        id: idMap,
        mapPosition: {
          bounds: bounds
        }
      });
    });
});
