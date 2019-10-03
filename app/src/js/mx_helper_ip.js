
/**
* Retrieve ip data info
*/
export function getIpInfo() {
  const apiUrlViews = mx.helpers.getApiUrl('getIpInfo');
  return fetch(apiUrlViews).then((data) => data.json());
}

/**
* Send ip data to a shiny session
*/
export function sendIpInfo(opt) {
  opt = opt || {};
  const h = mx.helpers;
  const hasShiny = h.isObject(window.Shiny);

  if (hasShiny) {
    getIpInfo().then((data) => {
      Shiny.onInputChange(opt.idInput || 'ip_info', data);
    });
  }
}
