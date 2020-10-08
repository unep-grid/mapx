/**
 * Remove service worker cache
 */
export function clearMapxCache() {
  const h = mx.helpers;

  const elModal = h.modal({
    title: 'Clear cached and stored data',
    content: h.el('div',
      h.el('h3', 'Do you want to remove all cached data?'),
      h.el(
        'p',
        'This operation will remove all cached data set by MapX, including tiles, GeoJSON, drafts, WMS responses, summaries. This will only impact your browser : no data will be removed server side.'
      )
    ),
    buttons: [
      h.el(
        'button',
        {
          class: ['btn', 'btn-default'],
          on: {click: clean}
        },
        'Yes'
      )
    ],
    textCloseButton: 'Cancel',
    addBackground : true
  });

  function clean() {
    if ('serviceWorker' in navigator) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
      mx.data.draft.dropInstance();
      mx.data.geojson.dropInstance();
      h.miniCacheClear(); // minicache
      h.clearServiceWorker();
      h.iconFlash('trash-o');
    }
    elModal.close();
  }
}

/**
 * Unregister service worker
 */
export function clearServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}

/**
 * Refresh the page
 */
export function reload() {
  window.location.reload();
}

/**
 * Get version as array [major,minor,maintenance]
 */
export function getVersion() {
  return mx.version;
}
