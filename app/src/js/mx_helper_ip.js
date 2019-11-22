/**
* Retrieve ip data info
*/
export function getIpInfo() {
  const apiUrlViews = mx.helpers.getApiUrl('getIpInfo');
  return fetch(apiUrlViews).then((data) => data.json());
}


