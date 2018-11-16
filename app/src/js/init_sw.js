
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
          mx.helpers.reload();
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
  // test if has mx.info. ( version before 1.5.28 ) 
  var oldVersion = !!mx.info ;

  h.getDictItem(['btn_install_update','update_app_title','update_app_msg'])
    .then((w) => {

      var btn = h.el('button',w[0],{
        class:'btn btn-default'
      });

      var txt = h.el('p',w[2]);
      var msg = h.el('div',
        txt,
        btn
      );

      btn.addEventListener('click',update);


      if( oldVersion ){
        // force version update the first time after installing 1.5.28.
        update();
      }else{
        h.modal({
          zIndex:100000,
          title:w[1],
          id:'a',
          content:msg
        });

      }

      function update(){
        if (!registration.waiting) {
          return;
        }
        /**
        * install command
        */
        registration.waiting.postMessage('mx_install');

        /**
        * If update using the modal button
        * disable it
        */
        if( typeof btn != "undefined" ){
          btn.removeEventListener('click',update);
          btn.disabled = true;
        }
      }
    });

}

