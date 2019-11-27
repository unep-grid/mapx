// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../src/events.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Events = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
* Simple event management
* @example 
*     var e = new Events(); 
*     e.on('test',()=>{console.log('ok')});
*     e.fire('test') -> 'ok'
*      
*/
var Events =
/*#__PURE__*/
function () {
  function Events() {
    _classCallCheck(this, Events);

    this._on_cb = [];
  }

  _createClass(Events, [{
    key: "fire",
    value: function fire(type) {
      var cbs = this._on_cb;
      var ncb = cbs.length;

      while (ncb) {
        var c = cbs[ncb - 1];

        if (c.type === type) {
          c.cb();

          if (c.once) {
            cbs.splice(ncb, 1);
          }
        }

        ncb--;
      }
    }
  }, {
    key: "on",
    value: function on(type, cb) {
      this._on_cb.push({
        type: type,
        cb: cb,
        once: false
      });
    }
  }, {
    key: "off",
    value: function off(type, cb) {
      var cbs = this._on_cb;
      var ncb = cbs.length;

      while (ncb) {
        var c = cbs[ncb];

        if (c.type === type && c.cb === cb) {
          cbs.splice(ncb, 1);
        }

        ncb--;
      }
    }
  }, {
    key: "once",
    value: function once(type, cb) {
      this._on_cb.push({
        type: type,
        cb: cb,
        once: true
      });
    }
  }]);

  return Events;
}();

exports.Events = Events;
},{}],"../src/settings.json":[function(require,module,exports) {
module.exports = {
  "url": "http://localhost:80",
  "container": "body",
  "params": {},
  "style": {
    "width": "810px",
    "height": "410px",
    "backgroundColor": "#474747",
    "resize": "both",
    "border": "none",
    "maxHeight": "100%",
    "maxWidth": "100%"
  }
};
},{}],"../src/framecom.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FrameWorker = exports.FrameManager = void 0;

var _events = require("./events.js");

var settings = _interopRequireWildcard(require("./settings.json"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var FrameManager =
/*#__PURE__*/
function (_Events) {
  _inherits(FrameManager, _Events);

  function FrameManager(opt) {
    var _this;

    _classCallCheck(this, FrameManager);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(FrameManager).call(this));
    _this.opt = Object.assign({}, settings, opt);
    _this._url = null;
    _this._req = [];

    _this.init();

    _this.reqCounter = 0;
    return _this;
  }

  _createClass(FrameManager, [{
    key: "init",
    value: function init() {
      this.setUrl();
      this.build();
      this.setUrl();
      this.setParams();
      this.render();
      this.initListener();
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.removeListener();
      this.iframe.remove();
    }
  }, {
    key: "build",
    value: function build() {
      this.iframe = document.createElement('iframe');

      for (var s in this.opt.style) {
        this.iframe.style[s] = this.opt.style[s];
      }

      if (!(this.opt.container instanceof Element)) {
        this.opt.container = document.querySelector(this.opt.container);
      }

      this.opt.container.appendChild(this.iframe);
    }
  }, {
    key: "setUrl",
    value: function setUrl(url) {
      this._url = new URL(url || this.opt.url);
    }
  }, {
    key: "render",
    value: function render() {
      this.iframe.src = this.url;
    }
  }, {
    key: "setParams",
    value: function setParams(params) {
      var p = this.opt.params = params || this.opt.params;

      for (var i in p) {
        this.setParam(i, p[i]);
      }
    }
  }, {
    key: "setParam",
    value: function setParam(key, value) {
      this.url.searchParams.set(key, value);
    }
  }, {
    key: "post",
    value: function post(request) {
      this.iframe.contentWindow.postMessage(JSON.stringify(request), '*');
    }
  }, {
    key: "initListener",
    value: function initListener() {
      this._msg_handler = this.handleWorkerMessage.bind(this);
      window.addEventListener('message', this._msg_handler);
    }
  }, {
    key: "removeListener",
    value: function removeListener() {
      window.removeEventListener('message', this._msg_handler);
    }
  }, {
    key: "handleWorkerMessage",
    value: function handleWorkerMessage(msg) {
      try {
        var request = JSON.parse(msg.data);

        if (request === 'ready') {
          this.fire('ready');
          console.log('ready received');
        } else if (request.idRequest > -1) {
          var req = this._req.find(function (r) {
            return r.id === request.idRequest;
          });

          if (req) {
            var reqPos = this._req.indexOf(req);

            this._req.splice(reqPos, 1);

            req.onResponse(request.result);
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    }
  }, {
    key: "ask",
    value: function ask(idResolver, data) {
      var fw = this;
      return new Promise(function (resolve) {
        var request = {
          id: fw.reqCounter++,
          idResolver: idResolver,
          data: data
        };
        fw.post(request);

        request.onResponse = function (res) {
          resolve(res);
        };

        fw._req.push(request);
      });
    }
  }, {
    key: "url",
    get: function get() {
      return this._url;
    }
  }]);

  return FrameManager;
}(_events.Events);

exports.FrameManager = FrameManager;
var settingsWorker = {
  resolvers: {}
};

var FrameWorker =
/*#__PURE__*/
function () {
  function FrameWorker(opt) {
    _classCallCheck(this, FrameWorker);

    this.opt = Object.assign({}, settingsWorker, opt);
    this.init();
  }

  _createClass(FrameWorker, [{
    key: "init",
    value: function init() {
      if (this.isNested()) {
        this.initListener();
        this.post('ready');
        console.log('ready posted');
      }
    }
  }, {
    key: "isNested",
    value: function isNested() {
      return window.parent !== window;
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.removeListener();
    }
  }, {
    key: "post",
    value: function post(data) {
      window.parent.postMessage(JSON.stringify(data), '*');
    }
  }, {
    key: "initListener",
    value: function initListener() {
      this._msg_handler = this.handleManagerMessage.bind(this);
      window.addEventListener('message', this._msg_handler, false);
    }
  }, {
    key: "removeListener",
    value: function removeListener() {
      window.removeEventListener('message', this._msg_handler);
    }
  }, {
    key: "handleManagerMessage",
    value: function handleManagerMessage(msg) {
      console.log(msg);

      try {
        var fw = this;
        var request = JSON.parse(msg.data);
        var idRequest = request.id;
        var idResolver = request.idResolver;
        var resolver = this.opt.resolvers[idResolver];
        return new Promise(function (resolve) {
          if (resolver instanceof Function) {
            var result = resolver(request.data);
            resolve(result);
          } else {
            resolve(null);
          }
        }).then(function (res) {
          fw.post({
            idRequest: idRequest,
            result: res
          });
        }).catch(function (e) {
          return console.error(e);
        });
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    }
  }]);

  return FrameWorker;
}();

exports.FrameWorker = FrameWorker;
},{"./events.js":"../src/events.js","./settings.json":"../src/settings.json"}],"../src/index.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MxSdkWorker = exports.MxSdk = void 0;

var _framecom = require("./framecom.js");

var settings = _interopRequireWildcard(require("./settings.json"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var MxSdk =
/*#__PURE__*/
function (_FrameManager) {
  _inherits(MxSdk, _FrameManager);

  function MxSdk(opt) {
    var _this;

    _classCallCheck(this, MxSdk);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(MxSdk).call(this, opt));
    _this.opt = Object.assign({}, settings, opt);
    return _this;
  }

  return MxSdk;
}(_framecom.FrameManager);

exports.MxSdk = MxSdk;

var MxSdkWorker =
/*#__PURE__*/
function (_FrameWorker) {
  _inherits(MxSdkWorker, _FrameWorker);

  function MxSdkWorker(opt) {
    _classCallCheck(this, MxSdkWorker);

    return _possibleConstructorReturn(this, _getPrototypeOf(MxSdkWorker).call(this, opt));
  }

  return MxSdkWorker;
}(_framecom.FrameWorker);

exports.MxSdkWorker = MxSdkWorker;
},{"./framecom.js":"../src/framecom.js","./settings.json":"../src/settings.json"}],"index.js":[function(require,module,exports) {
"use strict";

var _index = require("../src/index.js");

var mxsdk = new _index.MxSdk({
  //url:   'http://dev.mapx.localhost:8880/static.html?project=MX-HPP-OWB-3SI-3FF-Q3R&views=MX-T8GJQ-GIC8X-AHLA9&zoomToViews=true&lat=-4.087&lng=21.754&z=4.886'
  url: 'http://dev.mapx.localhost:8880/?project=MX-HPP-OWB-3SI-3FF-Q3R&language=en'
});
mxsdk.on('ready', function () {
  mxsdk.ask('get_views').then(function (r) {
    return console.log(r);
  });
  mxsdk.ask('get_ip').then(function (r) {
    return console.log(r);
  });
  setTimeout(function () {
    mxsdk.ask('set_project', 'MX-JZL-FJV-RLN-7OH-QLU');
  }, 3000);
});
},{"../src/index.js":"../src/index.js"}],"../../../../../../../../../../../../../usr/local/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "57712" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../../../../../../../../../../../usr/local/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/example.e31bb0bc.js.map