

/**
* Remove service worker cache
*/
export function clearCache(){
  if ('serviceWorker' in navigator) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        caches.delete(cacheName);
      });
    });
    mx.localforage.clear()
    mx.helpers.clearServiceWorker();
    mx.helpers.reload();
  }
}

/**
* Unregister service worker
*/
export function clearServiceWorker(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(
      function(registrations) {
        for(let registration of registrations) {  
          registration.unregister();
        }
      });
  }
}

/**
* Refresh the page
*/
export function reload(){
  window.location.reload();
}

/**
* Get version as array [major,minor,maintenance]
*/
export function getVersion(){
  return mx.info.version.split('.').map(r => r*1);
}
