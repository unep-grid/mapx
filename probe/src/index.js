import './scss/style.scss';
import * as t from './tests.js';
import {WsTest} from './websocket';
import {el} from '@fxi/el';

var elTableBrowser = document.getElementById('tests_browser');
var elTableWebsocket = document.getElementById('tests_ws');
var elBtnCopy = document.getElementById('btn_get_result');

elBtnCopy.addEventListener('click', copyResults);

var websockets = [
  {
    url: WS_WEBSOCKET_ORG_URI,
    instance: null
  },
  {
    url: WS_MAPX_URI,
    instance: null
  }
];

var tests = {
  browser: t.isBrowser(),
  array: t.isArraySupported(),
  function: t.isFunctionSupported(),
  object: t.isObjectSupported(),
  json: t.isJSONSupported(),
  worker: t.isWorkerSupported(),
  uint8ClampedArray: t.isUint8ClampedArraySupported(),
  arrayBuffer: t.isArrayBufferSupported(),
  webgl: t.isWebGLSupported(),
  websocket: t.isWebsocketSupported()
};

var out = '';
for (var key in tests) {
  out = out + `<tr><td>${key}</td><td>${ok(tests[key])}</td></tr>`;
}
elTableBrowser.innerHTML = out;

if (tests.websocket === true) {
  websockets.forEach((ws) => {
    var start = Date.now();
    var elTimer, elStop, elBtnStop, elStatus, elError;
    var elRow = el(
      'tr',
      el('td', el('div', ws.url)),
      el(
        'td',
        (elBtnStop = el('button', 'pause', {on: {click: toggle}})),
        (elTimer = el('span', {class: 'ws-timer'}, 0)),
        (elStatus = el('span', {class: 'ws-status'}, '')),
        (elError = el('span', {class: 'ws-error'}, '')),
        (elStop = el('span', {class: 'ws-warning'}, ''))
      )
    );

    elTableWebsocket.appendChild(elRow);

    ws.instance = new WsTest(ws.url, {
      log_levels: ['open', 'close', 'error', 'timeover', 'stop'],
      onHeartbeat: () => {
        var w = ws.instance;
        if (w) {
          elStatus.innerText =
            ' Sent: ' + w.sent + ' Received: ' + w.received + ' ';
          elTimer.innerText = ' Time: ' + formatTime(Date.now() - start) + '; ';
        }
      },
      onMessage: () => {},
      onError: (err) => {
        elError.innerText = err;
        elTimer.className = 'error';
        stop();
      },
      onStop: (message) => {
        elStop.innerText = message;
      },
      onPause: () => {},
      time_send: 1 * 1e3,
      time_heartbeat: 1 * 1e3,
      time_response_max: 30 * 1e3
    });

    function toggle() {
      var isPaused = ws.instance.paused;

      if (isPaused) {
        elBtnStop.innerText = 'pause';
      } else {
        elBtnStop.innerText = 'resume';
      }

      ws.instance.toggle();
    }
  });
}

function copyResults() {
  var res_ws = websockets.map((w) => {
    return {
      url: w.url,
      logs: tests.websocket ? w.instance.getLogs() : [],
      status: tests.websocket ? w.instance.getStatus() : {}
    };
  });

  var res = {
    browser: tests,
    websocket: res_ws
  };

  var elInput = document.createElement('textarea');
  elInput.value = JSON.stringify(res);
  document.body.appendChild(elInput);
  elInput.focus();
  elInput.select();
  document.execCommand('copy');
  elInput.remove();
  alert('Copied');
}

function formatTime(ms) {
  var s = ms / 1000;
  var time = parseFloat(s).toFixed(3);
  var hours = Math.floor(time / 60 / 60);
  var minutes = Math.floor(time / 60) % 60;
  var seconds = Math.floor(time - minutes * 60);
  return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2);
}

function pad(num, size) {
  return ('000' + num).slice(size * -1);
}

function ok(test) {
  if (!test) {
    return `<span class=error>failed</span>`;
  }
  return `<span class=passed>ok</span>`;
}
