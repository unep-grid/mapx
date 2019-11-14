document.addEventListener('DOMContentLoaded', function() {
  console.log('READONLY MODE');
  const h = mx.helpers;
  h.setApiUrlAuto();
  /**
   * Init readonly mode
   */
  fetch(h.getApiUrl('getConfigMap'))
    .then((d) => (d ? d.json() : {}))
    .then((c) => {
      mx.settings.map.token = c.token;
      h.initMapx({
        token: c.token,
        modeReadOnly: true
      });
    });
});
