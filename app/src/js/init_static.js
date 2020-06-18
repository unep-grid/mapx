document.addEventListener('DOMContentLoaded', function() {
  console.log('STATIC MODE');
  const h = mx.helpers;
  /*
  * Update api URL according to current path, local value or
  * weback env. variable.
  */
  h.setApiUrlAuto();
  /**
   * Init static mode
   */
  fetch(h.getApiUrl('getConfigMap'))
    .then((d) => (d ? d.json() : {}))
    .then((c) => {
      mx.settings.map.token = c.token;
     return h.initMapx({
        token: c.token,
        modeStatic: true
      });
    });
});
