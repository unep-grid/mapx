
var iframeComRunning = false;

/**
* Iframe message handler
* @param {Object} msg from parent
* @return NULL
*/
function iframeComMsgHandler(msg){
   var cmd = msg.data;
  switch(cmd){
    case 'getCurrentUser':
      iframeComMsgToParent(mx.settings.user);
      break;
  }
}

/**
* Send value to iframe parent
* @param {Object|String|Array} v Value to send. Will be converted as JSON.
* @retur NULL
*/
export function iframeComMsgToParent(v){
  window.parent.postMessage(JSON.stringify(v), '*');
}

/**
* Set status of iframe communication
* @aparam {String} cmd command : start or stop
*/
export function iframeComSet(cmd){
  if( cmd === 'start' && iframeComRunning === false ){
    iframeComMsgToParent("ready");
    window.addEventListener("message",iframeComMsgHandler);
    iframeComRunning = true;
  }else if( cmd == 'stop' ){
    iframeComMsgToParent("stop");
    window.removeEventListener("message",iframeComMsgHandler);
    iframeComRunning = false;
  }
}


