
/**
 * Register and handle service worker events
 * Adapted from https://developers.google.com/web/tools/workbox/guides/advanced-recipes
 * SEE also sw_listen_skip_waiting_install.js in ./webpack folder
 */

console.log("INIT SW");
if ('serviceWorker' in navigator) {

  window.addEventListener('load', function() {

    navigator.serviceWorker.register('/service-worker.js')
      .then(function (registration) {

        /**
         *  if no controller, new service worker will
         *  activate immediatly
         */
        if (!navigator.serviceWorker.controller) {
          return;
        }

        var blockReload;
        navigator.serviceWorker.addEventListener('controllerchange', function(event) {
          if (blockReload) return;
          blockReload = true;
          if( mx.helpers.reload ){
            mx.helpers.reload();
          }else{
            window.location.reload();
          }

        });
        onNewServiceWorker(registration, function() {
          showRefreshUI(registration);
        });
      });
  });
}

function onNewServiceWorker(registration, callback) {
  if (registration.waiting) {
    // SW is waiting to activate. Can occur if multiple clients open and
    // one of the clients is refreshed.
    return callback();
  }

  function listenInstalledStateChange() {
    registration.installing.addEventListener('statechange', function(event) {
      if (event.target.state === 'installed') {
        // A new service worker is available, inform the user
        callback();
      }
    });
  }

  if (registration.installing) {
    return listenInstalledStateChange();
  }

  // We are currently controlled so a new SW may be found...
  // Add a listener in case a new SW is found,
  registration.addEventListener('updatefound', listenInstalledStateChange);
}
/**
 * Display a modal window to inform the user to update
 */
function showRefreshUI(registration) {
  var h = mx.helpers;
  var skipWaiting = !!(!mx || !mx.info || !h || !h.el || !h.modal || !h.getDictItem);

  if( skipWaiting ){
    console.log("Skip waiting");
    update();
  }else{
    console.log("Ask the user to install");
    buildModal();
  }

  function update(){
    if (!registration.waiting) {
      return;
    }
    registration.waiting.postMessage('mx_install');
  }

  function buildModal(){
    h.getDictItem(['btn_install_update','update_app_title','update_app_msg'])
      .then((w) => {

        var txtButton = w[0];
        var titleModal = w[1];
        var txtMsg = w[2];

        var btn = h.el('button',txtButton,{
          class:'btn btn-default'
        });

        var txt = h.el('p',txtMsg);
        var msg = h.el('div',
          txt,
          btn
        );

        btn.addEventListener('click',function(){
          update();
          btn.removeEventListener('click',update);
          btn.disabled = true;
        });

        h.modal({
          zIndex: 100000,
          title: titleModal,
          id: 'a',
          content: msg
        });

      });
  }



}

