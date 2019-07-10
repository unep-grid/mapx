(function(){

  /*
   * TEST OF MAPBOX GL AND WEBSOCKET: one by one
   * based on https://github.com/mapbox/mapbox-gl-supported/blob/gh-pages/index.js
   */

  var elTests = document.getElementById("tests");
  var websockets = {
    1: {
      uri: WS_WEBSOCKET_ORG_URI,
      instance: null
    },
    2: {
      uri: WS_MAPX_URI,
      instance: null
    }
  };

  var tests = {
    browser: !!isBrowser(),
    array: !!isArraySupported(),
    function: !!isFunctionSupported(),
    object: !!isObjectSupported(),
    json: !!isJSONSupported(),
    worker: !!isWorkerSupported(),
    uint8ClampedArray: !!isUint8ClampedArraySupported(),
    arrayBuffer: !!isArrayBufferSupported(),
    webgl: !!isWebGLSupported(),
    websocket1: {
      title: 'websocket #1 (' + websockets[1].uri + ')',
      result: isWebsocketSupported(1)
    },
    websocket2: {
      title: 'websocket #2 (' + websockets[2].uri + ')',
      result: isWebsocketSupported(2)
    }
  };

  for (var t in tests) {
    var el = document.createElement("li");
    el.classList.add(t);
    var test = (tests[t]['result'] !== undefined) ? tests[t]['result'] : tests[t];
    if(test instanceof Node){
      el.innerText = (tests[t]['title'] !== undefined ? tests[t]['title'] : t) + "=" ;
      el.appendChild(test);
    }else{
      el.innerText = t + "=" + test;
    }
    elTests.appendChild(el);
  }

  function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  function isArraySupported() {
    return (
      Array.prototype &&
      Array.prototype.every &&
      Array.prototype.filter &&
      Array.prototype.forEach &&
      Array.prototype.indexOf &&
      Array.prototype.lastIndexOf &&
      Array.prototype.map &&
      Array.prototype.some &&
      Array.prototype.reduce &&
      Array.prototype.reduceRight &&
      Array.isArray
    );
  }

  function isFunctionSupported() {
    return Function.prototype && Function.prototype.bind;
  }

  function isObjectSupported() {
    return (
      Object.keys &&
      Object.create &&
      Object.getPrototypeOf &&
      Object.getOwnPropertyNames &&
      Object.isSealed &&
      Object.isFrozen &&
      Object.isExtensible &&
      Object.getOwnPropertyDescriptor &&
      Object.defineProperty &&
      Object.defineProperties &&
      Object.seal &&
      Object.freeze &&
      Object.preventExtensions
    );
  }

  function isJSONSupported() {
    return 'JSON' in window && 'parse' in JSON && 'stringify' in JSON;
  }

  function isWorkerSupported() {
    if (!('Worker' in window && 'Blob' in window && 'URL' in window)) {
      return false;
    }

    var blob = new Blob([''], {
      type: 'text/javascript'
    });
    var workerURL = URL.createObjectURL(blob);
    var supported;
    var worker;

    try {
      worker = new Worker(workerURL);
      supported = true;
    } catch (e) {
      supported = false;
    }

    if (worker) {
      worker.terminate();
    }
    URL.revokeObjectURL(workerURL);

    return supported;
  }

  // IE11 only supports `Uint8ClampedArray` as of version
  // [KB2929437](https://support.microsoft.com/en-us/kb/2929437)
  function isUint8ClampedArraySupported() {
    return 'Uint8ClampedArray' in window;
  }

  // https://github.com/mapbox/mapbox-gl-supported/issues/19
  function isArrayBufferSupported() {
    return ArrayBuffer.isView;
  }


  function isWebGLSupported() {

    var canvas = document.createElement('canvas');
    var attributes = {
      antialias: false,
      alpha: true,
      stencil: true,
      depth: true
    };
    if (canvas.probablySupportsContext) {
      return (
        canvas.probablySupportsContext('webgl', attributes) ||
        canvas.probablySupportsContext('experimental-webgl', attributes)
      );

    } else if (canvas.supportsContext) {
      return (
        canvas.supportsContext('webgl', attributes) ||
        canvas.supportsContext('experimental-webgl', attributes)
      );

    } else {
      return (
        canvas.getContext('webgl', attributes) ||
        canvas.getContext('experimental-webgl', attributes)
      );
    }
  }

  /**
   * websocket
   */

  // Disable/undisable copy-to-clipboard button
  var btC2C = document.querySelector('#copy-to-clipboard');
  btC2C.disabled = true;
  var eventWsTestTerminate = new Event('ws_test_terminate');
  document.addEventListener('ws_test_terminate', function (e) {
    if (this._terminateCount === undefined) {
      this._terminateCount = 0;
    }
    this._terminateCount++;
    if (this._terminateCount > 1) {
      btC2C.disabled = false;
      btWsEndTest.disabled = true;
      btWsEndTest.querySelector('.throbber').classList.add('hidden');
    }
  });

  // Allow to end websocket test
  var wsTestEnd = false;
  var btWsEndTest = document.querySelector('#end-websocket-test');
  btWsEndTest.addEventListener('click', function (e) {
    wsTestEnd = true;
    btWsEndTest.disabled = true;
  });

  function isWebsocketSupported(wsTestId){
    var ulWs = document.createElement("ul");
    var wsresult = {
      open:"waiting...",
      close:"waiting...",
      message:"sending messages; waiting echos...",
      error:"none"
    };
    for( var r in wsresult){
      var liWs = document.createElement("li");
      liWs.classList.add("ws-"+r);
      var spanWs = document.createElement("span");
      spanWs.id="ws-"+r;
      spanWs.innerText = wsresult[r];
      liWs.innerText= r + "=";
      liWs.appendChild(spanWs);
      ulWs.appendChild(liWs);
    }
    try{
      var wsUri = websockets[wsTestId].uri;
      var websocket = websockets[wsTestId].instance = new WebSocket(wsUri);
      websocket.onopen = function(evt) { onOpen(evt, wsTestId, ulWs); };
      websocket.onclose = function(evt) { onClose(evt, ulWs); };
      websocket.onmessage = function(evt) { onMessage(evt, wsTestId, ulWs); };
      websocket.onerror = function(evt) { onError(evt, ulWs); };
    }
    catch(err){
      onError(err);
    }
    return ulWs;
  }
  function onOpen(evt, wsTestId, ulWs) {
    ulWs.querySelector('#ws-open').innerText = true;

    // Sending "ping" messages
    var elMsg = ulWs.querySelector('.ws-message');
    var elUl = document.createElement('ul');
    elMsg.appendChild(elUl);
    var pingui = 1;
    var ping = function() {
      var message = {
        id: pingui,
        content: 'ping item ' + pingui,
      };
      var elLi = document.createElement('li');
      elLi.innerHTML = 'sending message: "' + message.content + '" <span class="response-item-' + pingui + '">...<span>';
      elUl.appendChild(elLi);
      websockets[wsTestId].instance.send(JSON.stringify(message));
      if (wsTestEnd) {
        clearInterval(si);
      }
      pingui++;
    };
    ping();
    var si = setInterval(ping, 2000);
  }
  function onClose(evt, ulWs) {
    ulWs.querySelector("#ws-close").innerText = true;
  }
  function onMessage(evt, wsTestId, ulWs) {
    try {
      var message = JSON.parse(evt.data);
      message.id;
      message.content;
    } catch(e) {
      var message = null;
    }
    if (message) {
      ulWs.querySelector('.response-item-' + message.id).innerText = '; echoed: "' + message.content + '"';
      if (wsTestEnd) {
        websockets[wsTestId].instance.close();
        ulWs.querySelector("#ws-message").innerText = 'done';
        document.dispatchEvent(eventWsTestTerminate);
      }
    }
  }
  function onError(evt, ulWs) {
    ulWs.querySelector("#ws-error").innerText = true;
    document.dispatchEvent(eventWsTestTerminate);
  }

})();
