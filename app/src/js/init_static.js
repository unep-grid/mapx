document.addEventListener('DOMContentLoaded', function() {
  console.log('STATIC MODE');
  const h = mx.helpers;
  h.setApiUrlAuto();
  /**
   * Init static mode
   */
  fetch(h.getApiUrl('getConfigMap'))
    .then((d) => (d ? d.json() : {}))
    .then((c) => {
      mx.settings.map.token = c.token;
      h.initMapx({
        token: c.token,
        modeStatic: true
      });
    });
});
