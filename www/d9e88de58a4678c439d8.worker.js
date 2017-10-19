/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 247);
/******/ })
/************************************************************************/
/******/ ({

/***/ 205:
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ 247:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _geojsonhint = __webpack_require__(248);

var geojsonhint = _interopRequireWildcard(_geojsonhint);

var _meta = __webpack_require__(3);

var _bbox = __webpack_require__(5);

var _bbox2 = _interopRequireDefault(_bbox);

var _mx_helper_stat = __webpack_require__(255);

var stat = _interopRequireWildcard(_mx_helper_stat);

var _mx_helper_colors = __webpack_require__(256);

var color = _interopRequireWildcard(_mx_helper_colors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// geojson type to mapbox gl type
var typeSwitcher = {
  "Point": "circle",
  "MultiPoint": "line",
  "LineString": "line",
  "MultiLineString": "line",
  "Polygon": "fill",
  "MultiPolygon": "fill",
  "GeometryCollection": "fill"
};

// Inital message
/* jshint esversion : 6*/
// Importation of helpers

postMessage({
  progress: 0,
  message: "start"
});

// handle message send from the main thread
onmessage = function onmessage(e) {
  try {

    /**
     * Initialisation : set local helper and variables
     */

    // init variables
    var errorMsg = "";
    var warningMsg = "";
    var dat = e.data;
    var gJson = dat.data;
    var fileName = dat.fileName;
    var fileType = dat.fileType;

    // set basic timing function
    var timerVal = 0;

    // start timer
    var timerStart = function timerStart() {
      timerVal = new Date();
    };

    // give intermediate time, reset timer
    var timerLap = function timerLap() {
      var lap = new Date() - timerVal;
      return lap;
    };

    // printable version of timerLaè
    var timerLapString = function timerLapString() {
      return " " + timerLap() + " ms ";
    };

    // start timer
    timerStart();

    /**
     * validation : geojson validation with geojsonhint
     */

    // Validation. Is that a valid geojson ?
    var messages = geojsonhint.hint(gJson);
    // extract errors
    var errors = messages.filter(function (x) {
      return x.level == "error";
    });
    // extract message
    var warnings = messages.filter(function (x) {
      return x.level == "message";
    });

    /*    // set a message with summary*/
    //var logMessage = " geojson validation " +
    //" n errors = " + errors.length +
    //" n warnings = " + warnings.length + " done in" +
    //timerLapString();

    //console.log(fileName + " summary :  " + logMessage);

    // send message
    postMessage({
      progress: 60,
      message: "Validation done in " + timerLapString()
    });

    // validation : warnings
    if (warnings.length > 0) {
      warningMsg = warnings.length + " warning message(s) found. Check the console for more info";
      postMessage({
        progress: 75,
        message: warnings.length + " warnings found. Please check the console."
      });

      warnings.forEach(function (x) {
        console.log({ file: fileName, warnings: JSON.stringify(x) });
      });
    }
    // varlidation: errors
    if (errors.length > 0) {
      errorMsg = errors.length + " errors found. Please check the console.";
      postMessage({
        progress: 100,
        message: errorMsg,
        errorMessage: errorMsg
      });

      errors.forEach(function (x) {
        console.log({ file: fileName, errors: x });
      });

      return;
    }

    /**
     * Avoid multi type : we don't handle them for now
     */

    var geomTypes = [];
    if (gJson.features) {
      // array of types in data
      geomTypes = gJson.features.map(function (x) {
        if (x.geometry && x.geometry.type) {
          return x.geometry.type;
        } else {
          return undefined;
        }
      }).filter(function (v, i, s) {
        return s.indexOf(v) === i && v !== undefined;
      });
    } else {
      geomTypes = [gJson.geometry.type];
    }

    postMessage({
      progress: 90,
      message: "Geometry type found in " + timerLapString()
    });

    /**
     * Remove features without geom
     * hack related to https://github.com/Turfjs/turf/issues/853
     * Delete this block.
     */

    (0, _meta.featureEach)(gJson, function (f, i) {
      if (f.geometry === null) {
        f.geometry = {
          type: geomTypes[0],
          coordinates: []
        };
      }
    });

    /**
    * Get table of all attributes. 
    */
    var attributes = {};
    var p;
    attributes.tmp = {};
    attributes.init = false;
    (0, _meta.propEach)(gJson, function (prop) {
      // init attributes with empty array
      if (!attributes.init) {
        for (p in prop) {
          attributes.tmp[p] = [];
        }
        attributes.init = true;
      }
      // 
      for (p in prop) {
        if (attributes.tmp[p] && prop[p]) {
          attributes.tmp[p].push(prop[p]);
        }
      }
    });

    for (p in attributes.tmp) {
      attributes[p] = stat.getArrayStat({
        arr: attributes.tmp[p],
        stat: "distinct"
      });
    }

    delete attributes.tmp;
    delete attributes.init;

    /**
     * Get extent : get extent using a Turf bbox
     */

    var extent = (0, _bbox2.default)(gJson);

    // Quick extent validation 
    if (Math.round(extent[0]) > 180 || Math.round(extent[0]) < -180 || Math.round(extent[1]) > 90 || Math.round(extent[1]) < -90 || Math.round(extent[2]) > 180 || Math.round(extent[2]) < -180 || Math.round(extent[3]) > 90 || Math.round(extent[3]) < -90) {

      errorMsg = fileName + " : extent seems to be out of range: " + extent;

      postMessage({
        progress: 100,
        msssage: errorMsg,
        errorMessage: errorMsg
      });

      console.log({
        "errors": errorMsg
      });
      return;
    }

    postMessage({
      progress: 80,
      message: "extent found in " + timerLapString()
    });
    /**
     * Set default for a new layer
     */

    // Set random id for source and layer
    var id = "MX-DROP-" + fileName;
    var idSource = id + "-SRC";
    // Set random color
    var ran = Math.random();
    var colA = color.randomHsl(0.3, ran);
    var colB = color.randomHsl(0.9, ran);

    // Set default type from geojson type
    var typ = typeSwitcher[geomTypes[0]];

    // Set up default style
    var dummyStyle = {
      "circle": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "circle-color": colA,
          "circle-radius": 10,
          "circle-stroke-width": 1,
          "circle-stroke-color": colB
        }
      },
      "fill": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "fill-color": colA,
          "fill-outline-color": colB
        }
      },
      "line": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "line-color": colA,
          "line-width": 10
        }
      }
    };

    postMessage({
      progress: 99,
      message: "Worker job done in " + timerLapString(),
      id: id,
      extent: extent,
      attributes: attributes,
      layer: dummyStyle[typ],
      geojson: gJson
    });
  } catch (err) {
    console.log(err);
    postMessage({
      progress: 100,
      errorMessage: "An error occured, check the console"
    });
  }
};

/***/ }),

/***/ 248:
/***/ (function(module, exports, __webpack_require__) {

var jsonlint = __webpack_require__(249),
  geojsonHintObject = __webpack_require__(253);

/**
 * @alias geojsonhint
 * @param {(string|object)} GeoJSON given as a string or as an object
 * @param {Object} options
 * @param {boolean} [options.noDuplicateMembers=true] forbid repeated
 * properties. This is only available for string input, becaused parsed
 * Objects cannot have duplicate properties.
 * @param {boolean} [options.precisionWarning=true] warn if GeoJSON contains
 * unnecessary coordinate precision.
 * @returns {Array<Object>} an array of errors
 */
function hint(str, options) {

    var gj, errors = [];

    if (typeof str === 'object') {
        gj = str;
    } else if (typeof str === 'string') {
        try {
            gj = jsonlint.parse(str);
        } catch(e) {
            var match = e.message.match(/line (\d+)/);
            var lineNumber = parseInt(match[1], 10);
            return [{
                line: lineNumber - 1,
                message: e.message,
                error: e
            }];
        }
    } else {
        return [{
            message: 'Expected string or object as input',
            line: 0
        }];
    }

    errors = errors.concat(geojsonHintObject.hint(gj, options));

    return errors;
}

module.exports.hint = hint;


/***/ }),

/***/ 249:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process, module) {/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var jsonlint = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,12],$V1=[1,13],$V2=[1,9],$V3=[1,10],$V4=[1,11],$V5=[1,14],$V6=[1,15],$V7=[14,18,22,24],$V8=[18,22],$V9=[22,24];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"JSONString":3,"STRING":4,"JSONNumber":5,"NUMBER":6,"JSONNullLiteral":7,"NULL":8,"JSONBooleanLiteral":9,"TRUE":10,"FALSE":11,"JSONText":12,"JSONValue":13,"EOF":14,"JSONObject":15,"JSONArray":16,"{":17,"}":18,"JSONMemberList":19,"JSONMember":20,":":21,",":22,"[":23,"]":24,"JSONElementList":25,"$accept":0,"$end":1},
terminals_: {2:"error",4:"STRING",6:"NUMBER",8:"NULL",10:"TRUE",11:"FALSE",14:"EOF",17:"{",18:"}",21:":",22:",",23:"[",24:"]"},
productions_: [0,[3,1],[5,1],[7,1],[9,1],[9,1],[12,2],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[15,2],[15,3],[20,3],[19,1],[19,3],[16,2],[16,3],[25,1],[25,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 // replace escaped characters with actual character
          this.$ = yytext.replace(/\\(\\|")/g, "$"+"1")
                     .replace(/\\n/g,'\n')
                     .replace(/\\r/g,'\r')
                     .replace(/\\t/g,'\t')
                     .replace(/\\v/g,'\v')
                     .replace(/\\f/g,'\f')
                     .replace(/\\b/g,'\b');
        
break;
case 2:
this.$ = Number(yytext);
break;
case 3:
this.$ = null;
break;
case 4:
this.$ = true;
break;
case 5:
this.$ = false;
break;
case 6:
return this.$ = $$[$0-1];
break;
case 13:
this.$ = {}; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 14: case 19:
this.$ = $$[$0-1]; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 15:
this.$ = [$$[$0-2], $$[$0]];
break;
case 16:
this.$ = {}; this.$[$$[$0][0]] = $$[$0][1];
break;
case 17:

            this.$ = $$[$0-2];
            if ($$[$0-2][$$[$0][0]] !== undefined) {
                if (!this.$.__duplicateProperties__) {
                    Object.defineProperty(this.$, '__duplicateProperties__', {
                        value: [],
                        enumerable: false
                    });
                }
                this.$.__duplicateProperties__.push($$[$0][0]);
            }
            $$[$0-2][$$[$0][0]] = $$[$0][1];
        
break;
case 18:
this.$ = []; Object.defineProperty(this.$, '__line__', {
            value: this._$.first_line,
            enumerable: false
        })
break;
case 20:
this.$ = [$$[$0]];
break;
case 21:
this.$ = $$[$0-2]; $$[$0-2].push($$[$0]);
break;
}
},
table: [{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,12:1,13:2,15:7,16:8,17:$V5,23:$V6},{1:[3]},{14:[1,16]},o($V7,[2,7]),o($V7,[2,8]),o($V7,[2,9]),o($V7,[2,10]),o($V7,[2,11]),o($V7,[2,12]),o($V7,[2,3]),o($V7,[2,4]),o($V7,[2,5]),o([14,18,21,22,24],[2,1]),o($V7,[2,2]),{3:20,4:$V0,18:[1,17],19:18,20:19},{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:23,15:7,16:8,17:$V5,23:$V6,24:[1,21],25:22},{1:[2,6]},o($V7,[2,13]),{18:[1,24],22:[1,25]},o($V8,[2,16]),{21:[1,26]},o($V7,[2,18]),{22:[1,28],24:[1,27]},o($V9,[2,20]),o($V7,[2,14]),{3:20,4:$V0,20:29},{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:30,15:7,16:8,17:$V5,23:$V6},o($V7,[2,19]),{3:5,4:$V0,5:6,6:$V1,7:3,8:$V2,9:4,10:$V3,11:$V4,13:31,15:7,16:8,17:$V5,23:$V6},o($V8,[2,17]),o($V8,[2,15]),o($V9,[2,21])],
defaultActions: {16:[2,6]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 6
break;
case 2:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 4
break;
case 3:return 17
break;
case 4:return 18
break;
case 5:return 23
break;
case 6:return 24
break;
case 7:return 22
break;
case 8:return 21
break;
case 9:return 10
break;
case 10:return 11
break;
case 11:return 8
break;
case 12:return 14
break;
case 13:return 'INVALID'
break;
}
},
rules: [/^(?:\s+)/,/^(?:(-?([0-9]|[1-9][0-9]+))(\.[0-9]+)?([eE][-+]?[0-9]+)?\b)/,/^(?:"(?:\\[\\"bfnrt\/]|\\u[a-fA-F0-9]{4}|[^\\\0-\x09\x0a-\x1f"])*")/,/^(?:\{)/,/^(?:\})/,/^(?:\[)/,/^(?:\])/,/^(?:,)/,/^(?::)/,/^(?:true\b)/,/^(?:false\b)/,/^(?:null\b)/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (true) {
exports.parser = jsonlint;
exports.Parser = jsonlint.Parser;
exports.parse = function () { return jsonlint.parse.apply(jsonlint, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = __webpack_require__(251).readFileSync(__webpack_require__(252).normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && __webpack_require__.c[__webpack_require__.s] === module) {
  exports.main(process.argv.slice(1));
}
}
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(205), __webpack_require__(250)(module)))

/***/ }),

/***/ 250:
/***/ (function(module, exports) {

module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),

/***/ 251:
/***/ (function(module, exports) {



/***/ }),

/***/ 252:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(205)))

/***/ }),

/***/ 253:
/***/ (function(module, exports, __webpack_require__) {

var rightHandRule = __webpack_require__(254);

/**
 * @alias geojsonhint
 * @param {(string|object)} GeoJSON given as a string or as an object
 * @param {Object} options
 * @param {boolean} [options.noDuplicateMembers=true] forbid repeated
 * properties. This is only available for string input, becaused parsed
 * Objects cannot have duplicate properties.
 * @param {boolean} [options.precisionWarning=true] warn if GeoJSON contains
 * unnecessary coordinate precision.
 * @returns {Array<Object>} an array of errors
 */
function hint(gj, options) {

    var errors = [];
    var precisionWarningCount = 0;
    var maxPrecisionWarnings = 10;
    var maxPrecision = 6;

    function root(_) {

        if ((!options || options.noDuplicateMembers !== false) &&
           _.__duplicateProperties__) {
            errors.push({
                message: 'An object contained duplicate members, making parsing ambigous: ' + _.__duplicateProperties__.join(', '),
                line: _.__line__
            });
        }

        if (requiredProperty(_, 'type', 'string')) {
            return;
        }

        if (!types[_.type]) {
            var expectedType = typesLower[_.type.toLowerCase()];
            if (expectedType !== undefined) {
                errors.push({
                    message: 'Expected ' + expectedType + ' but got ' + _.type + ' (case sensitive)',
                    line: _.__line__
                });
            } else {
                errors.push({
                    message: 'The type ' + _.type + ' is unknown',
                    line: _.__line__
                });
            }
        } else if (_) {
            types[_.type](_);
        }
    }

    function everyIs(_, type) {
        // make a single exception because typeof null === 'object'
        return _.every(function(x) {
            return x !== null && typeof x === type;
        });
    }

    function requiredProperty(_, name, type) {
        if (typeof _[name] === 'undefined') {
            return errors.push({
                message: '"' + name + '" member required',
                line: _.__line__
            });
        } else if (type === 'array') {
            if (!Array.isArray(_[name])) {
                return errors.push({
                    message: '"' + name +
                        '" member should be an array, but is an ' +
                        (typeof _[name]) + ' instead',
                    line: _.__line__
                });
            }
        } else if (type === 'object' && _[name] && _[name].constructor.name !== 'Object') {
            return errors.push({
                message: '"' + name +
                    '" member should be ' + (type) +
                    ', but is an ' + (_[name].constructor.name) + ' instead',
                line: _.__line__
            });
        } else if (type && typeof _[name] !== type) {
            return errors.push({
                message: '"' + name +
                    '" member should be ' + (type) +
                    ', but is an ' + (typeof _[name]) + ' instead',
                line: _.__line__
            });
        }
    }

    // http://geojson.org/geojson-spec.html#feature-collection-objects
    function FeatureCollection(featureCollection) {
        crs(featureCollection);
        bbox(featureCollection);
        if (featureCollection.properties !== undefined) {
            errors.push({
                message: 'FeatureCollection object cannot contain a "properties" member',
                line: featureCollection.__line__
            });
        }
        if (featureCollection.coordinates !== undefined) {
            errors.push({
                message: 'FeatureCollection object cannot contain a "coordinates" member',
                line: featureCollection.__line__
            });
        }
        if (!requiredProperty(featureCollection, 'features', 'array')) {
            if (!everyIs(featureCollection.features, 'object')) {
                return errors.push({
                    message: 'Every feature must be an object',
                    line: featureCollection.__line__
                });
            }
            featureCollection.features.forEach(Feature);
        }
    }

    // http://geojson.org/geojson-spec.html#positions
    function position(_, line) {
        if (!Array.isArray(_)) {
            return errors.push({
                message: 'position should be an array, is a ' + (typeof _) +
                    ' instead',
                line: _.__line__ || line
            });
        }
        if (_.length < 2) {
            return errors.push({
                message: 'position must have 2 or more elements',
                line: _.__line__ || line
            });
        }
        if (_.length > 3) {
            return errors.push({
                message: 'position should not have more than 3 elements',
                line: _.__line__ || line
            });
        }
        if (!everyIs(_, 'number')) {
            return errors.push({
                message: 'each element in a position must be a number',
                line: _.__line__ || line
            });
        }

        if (options && options.precisionWarning) {
            if (precisionWarningCount === maxPrecisionWarnings) {
                precisionWarningCount += 1;
                return errors.push({
                    message: 'truncated warnings: we\'ve encountered coordinate precision warning ' + maxPrecisionWarnings + ' times, no more warnings will be reported',
                    level: 'message',
                    line: _.__line__ || line
                });
            } else if (precisionWarningCount < maxPrecisionWarnings) {
                _.forEach(function(num) {
                    var precision = 0;
                    var decimalStr = String(num).split('.')[1];
                    if (decimalStr !== undefined)
                        precision = decimalStr.length;
                    if (precision > maxPrecision) {
                        precisionWarningCount += 1;
                        return errors.push({
                            message: 'precision of coordinates should be reduced',
                            level: 'message',
                            line: _.__line__ || line
                        });
                    }
                });
            }
        }
    }

    function positionArray(coords, type, depth, line) {
        if (line === undefined && coords.__line__ !== undefined) {
            line = coords.__line__;
        }
        if (depth === 0) {
            return position(coords, line);
        }
        if (depth === 1 && type) {
            if (type === 'LinearRing') {
                if (!Array.isArray(coords[coords.length - 1])) {
                    errors.push({
                        message: 'a number was found where a coordinate array should have been found: this needs to be nested more deeply',
                        line: line
                    });
                    return true;
                }
                if (coords.length < 4) {
                    errors.push({
                        message: 'a LinearRing of coordinates needs to have four or more positions',
                        line: line
                    });
                }
                if (coords.length &&
                    (coords[coords.length - 1].length !== coords[0].length ||
                    !coords[coords.length - 1].every(function(pos, index) {
                        return coords[0][index] === pos;
                }))) {
                    errors.push({
                        message: 'the first and last positions in a LinearRing of coordinates must be the same',
                        line: line
                    });
                    return true;
                }
            } else if (type === 'Line' && coords.length < 2) {
                return errors.push({
                    message: 'a line needs to have two or more coordinates to be valid',
                    line: line
                });
            }
        }
        if (!Array.isArray(coords)) {
            errors.push({
                message: 'a number was found where a coordinate array should have been found: this needs to be nested more deeply',
                line: line
            });
        } else {
            var results = coords.map(function(c) {
                return positionArray(c, type, depth - 1, c.__line__ || line);
            });
            return results.some(function(r) {
                return r;
            });
        }
    }

    function crs(_) {
        if (!_.crs) return;
        var defaultCRSName = 'urn:ogc:def:crs:OGC:1.3:CRS84';
        if (typeof _.crs === 'object' && _.crs.properties && _.crs.properties.name === defaultCRSName) {
            errors.push({
                message: 'old-style crs member is not recommended, this object is equivalent to the default and should be removed',
                line: _.__line__
            });
        } else {
            errors.push({
                message: 'old-style crs member is not recommended',
                line: _.__line__
            });
        }
    }

    function bbox(_) {
        if (!_.bbox) {
            return;
        }
        if (Array.isArray(_.bbox)) {
            if (!everyIs(_.bbox, 'number')) {
                errors.push({
                    message: 'each element in a bbox member must be a number',
                    line: _.bbox.__line__
                });
            }
            if (!(_.bbox.length === 4 || _.bbox.length === 6)) {
                errors.push({
                    message: 'bbox must contain 4 elements (for 2D) or 6 elements (for 3D)',
                    line: _.bbox.__line__
                });
            }
            return errors.length;
        }
        errors.push({
            message: 'bbox member must be an array of numbers, but is a ' + (typeof _.bbox),
            line: _.__line__
        });
    }

    function geometrySemantics(geom) {
        if (geom.properties !== undefined) {
            errors.push({
                message: 'geometry object cannot contain a "properties" member',
                line: geom.__line__
            });
        }
        if (geom.geometry !== undefined) {
            errors.push({
                message: 'geometry object cannot contain a "geometry" member',
                line: geom.__line__
            });
        }
        if (geom.features !== undefined) {
            errors.push({
                message: 'geometry object cannot contain a "features" member',
                line: geom.__line__
            });
        }
    }

    // http://geojson.org/geojson-spec.html#point
    function Point(point) {
        crs(point);
        bbox(point);
        geometrySemantics(point);
        if (!requiredProperty(point, 'coordinates', 'array')) {
            position(point.coordinates);
        }
    }

    // http://geojson.org/geojson-spec.html#polygon
    function Polygon(polygon) {
        crs(polygon);
        bbox(polygon);
        if (!requiredProperty(polygon, 'coordinates', 'array')) {
            if (!positionArray(polygon.coordinates, 'LinearRing', 2)) {
                rightHandRule(polygon, errors);
            }
        }
    }

    // http://geojson.org/geojson-spec.html#multipolygon
    function MultiPolygon(multiPolygon) {
        crs(multiPolygon);
        bbox(multiPolygon);
        if (!requiredProperty(multiPolygon, 'coordinates', 'array')) {
            if (!positionArray(multiPolygon.coordinates, 'LinearRing', 3)) {
                rightHandRule(multiPolygon, errors);
            }
        }
    }

    // http://geojson.org/geojson-spec.html#linestring
    function LineString(lineString) {
        crs(lineString);
        bbox(lineString);
        if (!requiredProperty(lineString, 'coordinates', 'array')) {
            positionArray(lineString.coordinates, 'Line', 1);
        }
    }

    // http://geojson.org/geojson-spec.html#multilinestring
    function MultiLineString(multiLineString) {
        crs(multiLineString);
        bbox(multiLineString);
        if (!requiredProperty(multiLineString, 'coordinates', 'array')) {
            positionArray(multiLineString.coordinates, 'Line', 2);
        }
    }

    // http://geojson.org/geojson-spec.html#multipoint
    function MultiPoint(multiPoint) {
        crs(multiPoint);
        bbox(multiPoint);
        if (!requiredProperty(multiPoint, 'coordinates', 'array')) {
            positionArray(multiPoint.coordinates, '', 1);
        }
    }

    function GeometryCollection(geometryCollection) {
        crs(geometryCollection);
        bbox(geometryCollection);
        if (!requiredProperty(geometryCollection, 'geometries', 'array')) {
            if (!everyIs(geometryCollection.geometries, 'object')) {
                errors.push({
                    message: 'The geometries array in a GeometryCollection must contain only geometry objects',
                    line: geometryCollection.__line__
                });
            }
            if (geometryCollection.geometries.length === 1) {
                errors.push({
                    message: 'GeometryCollection with a single geometry should be avoided in favor of single part or a single object of multi-part type',
                    line: geometryCollection.geometries.__line__
                });
            }
            geometryCollection.geometries.forEach(function(geometry) {
                if (geometry) {
                    if (geometry.type === 'GeometryCollection') {
                        errors.push({
                            message: 'GeometryCollection should avoid nested geometry collections',
                            line: geometryCollection.geometries.__line__
                        });
                    }
                    root(geometry);
                }
            });
        }
    }

    function Feature(feature) {
        crs(feature);
        bbox(feature);
        // https://github.com/geojson/draft-geojson/blob/master/middle.mkd#feature-object
        if (feature.id !== undefined &&
            typeof feature.id !== 'string' &&
            typeof feature.id !== 'number') {
            errors.push({
                message: 'Feature "id" member must have a string or number value',
                line: feature.__line__
            });
        }
        if (feature.features !== undefined) {
            errors.push({
                message: 'Feature object cannot contain a "features" member',
                line: feature.__line__
            });
        }
        if (feature.coordinates !== undefined) {
            errors.push({
                message: 'Feature object cannot contain a "coordinates" member',
                line: feature.__line__
            });
        }
        if (feature.type !== 'Feature') {
            errors.push({
                message: 'GeoJSON features must have a type=feature member',
                line: feature.__line__
            });
        }
        requiredProperty(feature, 'properties', 'object');
        if (!requiredProperty(feature, 'geometry', 'object')) {
            // http://geojson.org/geojson-spec.html#feature-objects
            // tolerate null geometry
            if (feature.geometry) root(feature.geometry);
        }
    }

    var types = {
        Point: Point,
        Feature: Feature,
        MultiPoint: MultiPoint,
        LineString: LineString,
        MultiLineString: MultiLineString,
        FeatureCollection: FeatureCollection,
        GeometryCollection: GeometryCollection,
        Polygon: Polygon,
        MultiPolygon: MultiPolygon
    };

    var typesLower = Object.keys(types).reduce(function(prev, curr) {
        prev[curr.toLowerCase()] = curr;
        return prev;
    }, {});

    if (typeof gj !== 'object' ||
        gj === null ||
        gj === undefined) {
        errors.push({
            message: 'The root of a GeoJSON object must be an object.',
            line: 0
        });
        return errors;
    }

    root(gj);

    errors.forEach(function(err) {
        if ({}.hasOwnProperty.call(err, 'line') && err.line === undefined) {
            delete err.line;
        }
    });

    return errors;
}

module.exports.hint = hint;


/***/ }),

/***/ 254:
/***/ (function(module, exports) {

function rad(x) {
    return x * Math.PI / 180;
}

function isRingClockwise (coords) {
    var area = 0;
    if (coords.length > 2) {
        var p1, p2;
        for (var i = 0; i < coords.length - 1; i++) {
            p1 = coords[i];
            p2 = coords[i + 1];
            area += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
        }
    }

    return area >= 0;
}

function isPolyRHR (coords) {
    if (coords && coords.length > 0) {
        if (isRingClockwise(coords[0]))
            return false;
        var interiorCoords = coords.slice(1, coords.length);
        if (!interiorCoords.every(isRingClockwise))
            return false;
    }
    return true;
}

function rightHandRule (geometry) {
    if (geometry.type === 'Polygon') {
        return isPolyRHR(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.every(isPolyRHR);
    }
}

module.exports = function validateRightHandRule(geometry, errors) {
    if (!rightHandRule(geometry)) {
        errors.push({
            message: 'Polygons and MultiPolygons should follow the right-hand rule',
            level: 'message',
            line: geometry.__line__
        });
    }
};


/***/ }),

/***/ 255:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloneArray = cloneArray;
exports.getArrayStat = getArrayStat;
/* jshint esversion :6 */

/** 
* Clone an array
* @param {Array} Source to clone
*/
function cloneArray(arr) {
  var i = arr.length;
  var clone = [];
  while (i--) {
    clone[i] = arr[i];
  }
  return clone;
}
/* Get stat of an array
 * @param {Object} o options
 * @param {Array} o.arr Numeric array
 * @param {String} o.stat Stat string : min, max, mean, median, distinct, quantile. Default = max;
 * @param {Number|Array} o.percentile : percentile to use for quantile
 */
function getArrayStat(o) {

  if (o.arr === undefined || o.arr.constructor != Array || o.arr.length === 0) return [];

  if (o.stat == "quantile" && o.percentile && o.percentile.constructor == Array) o.stat = "quantiles";

  var arr = cloneArray(o.arr);
  var stat = o.stat ? o.stat : "max";
  var len_o = arr.length;
  var len = len_o;

  function sortNumber(a, b) {
    return a - b;
  }

  var opt = {
    "max": function max() {
      var max = -Infinity;
      var v = 0;
      while (len--) {
        v = arr.pop();
        if (v > max) {
          max = v;
        }
      }
      return max;
    },
    "min": function min() {
      var min = Infinity;
      while (len--) {
        var v = arr.pop();
        if (v < min) {
          min = v;
        }
      }
      return min;
    },
    "sum": function sum() {
      var sum = 0;
      while (len--) {
        sum += arr.pop();
      }
      return sum;
    },
    "mean": function mean() {
      var sum = getArrayStat({
        stat: "sum",
        arr: arr
      });
      return sum / len_o;
    },
    "median": function median() {
      var median = getArrayStat({
        stat: "quantile",
        arr: arr,
        percentile: 50
      });
      return median;
    },
    "quantile": function quantile() {
      var result;
      arr.sort(sortNumber);
      o.percentile = o.percentile ? o.percentile : 50;
      var index = o.percentile / 100 * (arr.length - 1);
      if (Math.floor(index) == index) {
        result = arr[index];
      } else {
        var i = Math.floor(index);
        var fraction = index - i;
        result = arr[i] + (arr[i + 1] - arr[i]) * fraction;
      }
      return result;
    },
    "quantiles": function quantiles() {
      var quantiles = {};
      o.percentile.forEach(function (x) {
        var res = getArrayStat({
          stat: "quantile",
          arr: arr,
          percentile: x
        });
        quantiles[x] = res;
      });
      return quantiles;
    },
    "distinct": function distinct() {
      var n = {},
          r = [];

      while (len--) {
        if (!n[arr[len]]) {
          n[arr[len]] = true;
          r.push(arr[len]);
        }
      }
      return r;
    },
    "frequency": function frequency() {
      var colNames = o.colNames;
      if (colNames.constructor != Array) throw "colnames must be array";
      if (colNames.length == 0) colNames = Object.keys(arr[1]);
      var table = {};
      var val, prevVal;
      var colName;

      for (var j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        table[colName] = {};
        for (var i = 0, iL = arr.length; i < iL; i++) {
          val = arr[i][colName] || null;
          table[colName][val] = table[colName][val] + 1 || 1;
        }
      }
      return table;
    },
    "sumBy": function sumBy() {

      var colNames = o.colNames;
      if (colNames.constructor != Array) throw "colnames must be array";
      if (colNames.length == 0) colNames = Object.keys(arr[1]);
      var table = {};
      var val, prevVal;
      var colName;
      for (var j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        for (var i = 0, iL = arr.length; i < iL; i++) {
          val = arr[i][colName] || 0;
          prevVal = table[colName] || 0;
          table[colName] = prevVal + val;
        }
      }
      return table;
    }
  };

  return opt[stat](o);
}

/***/ }),

/***/ 256:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.randomHsl = randomHsl;
exports.hex2rgba = hex2rgba;
exports.rgba2hex = rgba2hex;
exports.color2obj = color2obj;
exports.colorLinear = colorLinear;
/* jshint esversion:6*/

/**
 * Generate a random hsla color string, with fixed saturation and lightness
 * @param {number} opacity opacity from 0 to 1
 * @param {number} random value from 0 to 1
 * @param {number} saturation from 0 to 100
 * @param {number} lightness from 0 to 100
 */
function randomHsl(opacity, random, saturation, lightness) {
  if (opacity === undefined) opacity = 1;
  if (saturation === undefined) saturation = 100;
  if (lightness == undefined) lightness = 50;
  if (random < 0 || random > 1 || random === undefined) random = Math.random();
  var res = "hsla(" + random * 360 + ", " + saturation + "% " + ", " + lightness + "% " + ", " + opacity + ")";
  return res;
}

/**
 * convert hex to rgb or rgba
 * @param {string} hex Hex color
 * @param {number} opacity Value of opacity, from 0 to 1
 */
function hex2rgba(hex, opacity) {

  var h = hex.replace("#", "");
  var rgba = "rgba";
  var rgb = "rgb";
  var out = "";
  var i;
  h = h.match(new RegExp("(.{" + h.length / 3 + "})", "g"));

  for (i = 0; i < h.length; i++) {
    h[i] = parseInt(h[i].length == 1 ? h[i] + h[i] : h[i], 16);
  }

  if (typeof opacity != "undefined") {
    if (opacity > 1) opacity = 1;
    if (opacity < 0) opacity = 0;
    h.push(opacity);
    rgb = rgba;
  }

  return rgb + "(" + h.join(",") + ")";
}

/**
 * convert rgb|a to hex
 * @param {string} rgba string
 */
function rgba2hex(rgb) {

  rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
  return rgb && rgb.length === 4 ? "#" + ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) + ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) + ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
}
/**
 * convert any color to obj with key alpha and hex color
 * @param {string} color string. e.g. hsl(10%,10%,0)
 * @param {Boolean} heyOnly return only the hex code
 */
function color2obj(color, hexOnly) {
  var alpha;
  var col;
  var out = {
    alpha: 1,
    color: "#000"
  };
  var div = document.createElement("div");
  div.style.color = color;
  col = div.style.color;
  if (col) {
    alpha = col.split(", ")[3];
    if (alpha) {
      out.alpha = alpha.replace("\)", '') * 1;
    }
    out.color = rgba2hex(col);
  }
  if (hexOnly) {
    out = out.color;
  }
  return out;
}

/**
* Scale an center value to get a hex color inside bounds
* @param {Object} o Options
* @param {Number} o.val Value 
* @param {Number} o.min Minimum value of the scale 
* @param {Number} o.max Maximum value of the scale 
* @param {Number} o.colMin Minimum hue in the 0-1 range 
* @param {Number} o.colMax Maximum hue in the 0-1 range
* @example 
* var start =  window.performance.now();
* for(var i=0;i<3000;i++){
* colorLinear({min:-450,max:3000,val:i,colMin:0,colMax:0.5})
* }
* console.log("done in "+(window.performance.now()-start)/1000 +" [s]");
*/
function colorLinear(o) {
  var valMin = o.min * 1 || 0;
  var valMax = o.max * 1 || 0;
  var colMin = o.colMin * 1 || 0;
  var colMax = o.colMax * 1 || 1;
  var val = o.val;
  var col;
  var isRandom = valMin == valMax;
  if (!isRandom) {
    col = (val - valMin) / (valMax - valMin);
  }
  col = col * (colMax - colMin);
  col = randomHsl(1, col);
  return color2obj(col, true);
}

/***/ }),

/***/ 3:
/***/ (function(module, exports) {

/**
 * Callback for coordEach
 *
 * @callback coordEachCallback
 * @param {Array<number>} currentCoord The current coordinate being processed.
 * @param {number} coordIndex The current index of the coordinate being processed.
 * Starts at index 0.
 * @param {number} featureIndex The current index of the feature being processed.
 * @param {number} featureSubIndex The current subIndex of the feature being processed.
 */

/**
 * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
 *
 * @name coordEach
 * @param {FeatureCollection|Geometry|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, featureSubIndex)
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.coordEach(features, function (currentCoord, coordIndex, featureIndex, featureSubIndex) {
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=featureSubIndex
 * });
 */
function coordEach(geojson, callback, excludeWrapCoord) {
    // Handles null Geometry -- Skips this GeoJSON
    if (geojson === null) return;
    var featureIndex, geometryIndex, j, k, l, geometry, stopG, coords,
        geometryMaybeCollection,
        wrapShrink = 0,
        coordIndex = 0,
        isGeometryCollection,
        type = geojson.type,
        isFeatureCollection = type === 'FeatureCollection',
        isFeature = type === 'Feature',
        stop = isFeatureCollection ? geojson.features.length : 1;

    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (featureIndex = 0; featureIndex < stop; featureIndex++) {
        var featureSubIndex = 0;

        geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry :
        (isFeature ? geojson.geometry : geojson));
        isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (geometryIndex = 0; geometryIndex < stopG; geometryIndex++) {
            geometry = isGeometryCollection ?
            geometryMaybeCollection.geometries[geometryIndex] : geometryMaybeCollection;

            // Handles null Geometry -- Skips this geometry
            if (geometry === null) continue;
            coords = geometry.coordinates;
            var geomType = geometry.type;

            wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

            switch (geomType) {
            case null:
                break;
            case 'Point':
                callback(coords, coordIndex, featureIndex, featureSubIndex);
                coordIndex++;
                featureSubIndex++;
                break;
            case 'LineString':
            case 'MultiPoint':
                for (j = 0; j < coords.length; j++) {
                    callback(coords[j], coordIndex, featureIndex, featureSubIndex);
                    coordIndex++;
                    featureSubIndex++;
                }
                break;
            case 'Polygon':
            case 'MultiLineString':
                for (j = 0; j < coords.length; j++)
                    for (k = 0; k < coords[j].length - wrapShrink; k++) {
                        callback(coords[j][k], coordIndex, featureIndex, featureSubIndex);
                        coordIndex++;
                        featureSubIndex++;
                    }
                break;
            case 'MultiPolygon':
                for (j = 0; j < coords.length; j++)
                    for (k = 0; k < coords[j].length; k++)
                        for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                            callback(coords[j][k][l], coordIndex, featureIndex, featureSubIndex);
                            coordIndex++;
                            featureSubIndex++;
                        }
                break;
            case 'GeometryCollection':
                for (j = 0; j < geometry.geometries.length; j++)
                    coordEach(geometry.geometries[j], callback, excludeWrapCoord);
                break;
            default: throw new Error('Unknown Geometry Type');
            }
        }
    }
}

/**
 * Callback for coordReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback coordReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Array<number>} currentCoord The current coordinate being processed.
 * @param {number} coordIndex The current index of the coordinate being processed.
 * Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} featureIndex The current index of the feature being processed.
 * @param {number} featureSubIndex The current subIndex of the feature being processed.
 */

/**
 * Reduce coordinates in any GeoJSON object, similar to Array.reduce()
 *
 * @name coordReduce
 * @param {FeatureCollection|Geometry|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentCoord, coordIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.coordReduce(features, function (previousValue, currentCoord, coordIndex, featureIndex, featureSubIndex) {
 *   //=previousValue
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=featureSubIndex
 *   return currentCoord;
 * });
 */
function coordReduce(geojson, callback, initialValue, excludeWrapCoord) {
    var previousValue = initialValue;
    coordEach(geojson, function (currentCoord, coordIndex, featureIndex, featureSubIndex) {
        if (coordIndex === 0 && initialValue === undefined) previousValue = currentCoord;
        else previousValue = callback(previousValue, currentCoord, coordIndex, featureIndex, featureSubIndex);
    }, excludeWrapCoord);
    return previousValue;
}

/**
 * Callback for propEach
 *
 * @callback propEachCallback
 * @param {Object} currentProperties The current properties being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Iterate over properties in any GeoJSON object, similar to Array.forEach()
 *
 * @name propEach
 * @param {FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentProperties, featureIndex)
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.propEach(features, function (currentProperties, featureIndex) {
 *   //=currentProperties
 *   //=featureIndex
 * });
 */
function propEach(geojson, callback) {
    var i;
    switch (geojson.type) {
    case 'FeatureCollection':
        for (i = 0; i < geojson.features.length; i++) {
            callback(geojson.features[i].properties, i);
        }
        break;
    case 'Feature':
        callback(geojson.properties, 0);
        break;
    }
}


/**
 * Callback for propReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback propReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {*} currentProperties The current properties being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce properties in any GeoJSON object into a single value,
 * similar to how Array.reduce works. However, in this case we lazily run
 * the reduction, so an array of all properties is unnecessary.
 *
 * @name propReduce
 * @param {FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentProperties, featureIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.propReduce(features, function (previousValue, currentProperties, featureIndex) {
 *   //=previousValue
 *   //=currentProperties
 *   //=featureIndex
 *   return currentProperties
 * });
 */
function propReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    propEach(geojson, function (currentProperties, featureIndex) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentProperties;
        else previousValue = callback(previousValue, currentProperties, featureIndex);
    });
    return previousValue;
}

/**
 * Callback for featureEach
 *
 * @callback featureEachCallback
 * @param {Feature<any>} currentFeature The current feature being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Iterate over features in any GeoJSON object, similar to
 * Array.forEach.
 *
 * @name featureEach
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentFeature, featureIndex)
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {foo: 'bar'}),
 *   turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.featureEach(features, function (currentFeature, featureIndex) {
 *   //=currentFeature
 *   //=featureIndex
 * });
 */
function featureEach(geojson, callback) {
    if (geojson.type === 'Feature') {
        callback(geojson, 0);
    } else if (geojson.type === 'FeatureCollection') {
        for (var i = 0; i < geojson.features.length; i++) {
            callback(geojson.features[i], i);
        }
    }
}

/**
 * Callback for featureReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback featureReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature} currentFeature The current Feature being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce features in any GeoJSON object, similar to Array.reduce().
 *
 * @name featureReduce
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.featureReduce(features, function (previousValue, currentFeature, featureIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   return currentFeature
 * });
 */
function featureReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    featureEach(geojson, function (currentFeature, featureIndex) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentFeature;
        else previousValue = callback(previousValue, currentFeature, featureIndex);
    });
    return previousValue;
}

/**
 * Get all coordinates from any GeoJSON object.
 *
 * @name coordAll
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @returns {Array<Array<number>>} coordinate position array
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {foo: 'bar'}),
 *   turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * var coords = turf.coordAll(features);
 * //= [[26, 37], [36, 53]]
 */
function coordAll(geojson) {
    var coords = [];
    coordEach(geojson, function (coord) {
        coords.push(coord);
    });
    return coords;
}

/**
 * Callback for geomEach
 *
 * @callback geomEachCallback
 * @param {Geometry} currentGeometry The current geometry being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} currentProperties The current feature properties being processed.
 */

/**
 * Iterate over each geometry in any GeoJSON object, similar to Array.forEach()
 *
 * @name geomEach
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentGeometry, featureIndex, currentProperties)
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.geomEach(features, function (currentGeometry, featureIndex, currentProperties) {
 *   //=currentGeometry
 *   //=featureIndex
 *   //=currentProperties
 * });
 */
function geomEach(geojson, callback) {
    var i, j, g, geometry, stopG,
        geometryMaybeCollection,
        isGeometryCollection,
        geometryProperties,
        featureIndex = 0,
        isFeatureCollection = geojson.type === 'FeatureCollection',
        isFeature = geojson.type === 'Feature',
        stop = isFeatureCollection ? geojson.features.length : 1;

  // This logic may look a little weird. The reason why it is that way
  // is because it's trying to be fast. GeoJSON supports multiple kinds
  // of objects at its root: FeatureCollection, Features, Geometries.
  // This function has the responsibility of handling all of them, and that
  // means that some of the `for` loops you see below actually just don't apply
  // to certain inputs. For instance, if you give this just a
  // Point geometry, then both loops are short-circuited and all we do
  // is gradually rename the input until it's called 'geometry'.
  //
  // This also aims to allocate as few resources as possible: just a
  // few numbers and booleans, rather than any temporary arrays as would
  // be required with the normalization approach.
    for (i = 0; i < stop; i++) {

        geometryMaybeCollection = (isFeatureCollection ? geojson.features[i].geometry :
        (isFeature ? geojson.geometry : geojson));
        geometryProperties = (isFeatureCollection ? geojson.features[i].properties :
                              (isFeature ? geojson.properties : {}));
        isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (g = 0; g < stopG; g++) {
            geometry = isGeometryCollection ?
            geometryMaybeCollection.geometries[g] : geometryMaybeCollection;

            // Handle null Geometry
            if (geometry === null) {
                callback(null, featureIndex, geometryProperties);
                featureIndex++;
                continue;
            }
            switch (geometry.type) {
            case 'Point':
            case 'LineString':
            case 'MultiPoint':
            case 'Polygon':
            case 'MultiLineString':
            case 'MultiPolygon': {
                callback(geometry, featureIndex, geometryProperties);
                featureIndex++;
                break;
            }
            case 'GeometryCollection': {
                for (j = 0; j < geometry.geometries.length; j++) {
                    callback(geometry.geometries[j], featureIndex, geometryProperties);
                    featureIndex++;
                }
                break;
            }
            default: throw new Error('Unknown Geometry Type');
            }
        }
    }
}

/**
 * Callback for geomReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback geomReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Geometry} currentGeometry The current Feature being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {Object} currentProperties The current feature properties being processed.
 */

/**
 * Reduce geometry in any GeoJSON object, similar to Array.reduce().
 *
 * @name geomReduce
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentGeometry, featureIndex, currentProperties)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.geomReduce(features, function (previousValue, currentGeometry, featureIndex, currentProperties) {
 *   //=previousValue
 *   //=currentGeometry
 *   //=featureIndex
 *   //=currentProperties
 *   return currentGeometry
 * });
 */
function geomReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    geomEach(geojson, function (currentGeometry, currentIndex, currentProperties) {
        if (currentIndex === 0 && initialValue === undefined) previousValue = currentGeometry;
        else previousValue = callback(previousValue, currentGeometry, currentIndex, currentProperties);
    });
    return previousValue;
}

/**
 * Callback for flattenEach
 *
 * @callback flattenEachCallback
 * @param {Feature} currentFeature The current flattened feature being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} featureSubIndex The subindex of the current element being processed in the
 * array. Starts at index 0 and increases if the flattened feature was a multi-geometry.
 */

/**
 * Iterate over flattened features in any GeoJSON object, similar to
 * Array.forEach.
 *
 * @name flattenEach
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentFeature, featureIndex, featureSubIndex)
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
 * ]);
 *
 * turf.flattenEach(features, function (currentFeature, featureIndex, featureSubIndex) {
 *   //=currentFeature
 *   //=featureIndex
 *   //=featureSubIndex
 * });
 */
function flattenEach(geojson, callback) {
    geomEach(geojson, function (geometry, featureIndex, properties) {
        // Callback for single geometry
        var type = (geometry === null) ? null : geometry.type;
        switch (type) {
        case null:
        case 'Point':
        case 'LineString':
        case 'Polygon':
            callback(feature(geometry, properties), featureIndex, 0);
            return;
        }

        var geomType;

        // Callback for multi-geometry
        switch (type) {
        case 'MultiPoint':
            geomType = 'Point';
            break;
        case 'MultiLineString':
            geomType = 'LineString';
            break;
        case 'MultiPolygon':
            geomType = 'Polygon';
            break;
        }

        geometry.coordinates.forEach(function (coordinate, featureSubIndex) {
            var geom = {
                type: geomType,
                coordinates: coordinate
            };
            callback(feature(geom, properties), featureIndex, featureSubIndex);
        });

    });
}

/**
 * Callback for flattenReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback flattenReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature} currentFeature The current Feature being processed.
 * @param {number} featureIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} featureSubIndex The subindex of the current element being processed in the
 * array. Starts at index 0 and increases if the flattened feature was a multi-geometry.
 */

/**
 * Reduce flattened features in any GeoJSON object, similar to Array.reduce().
 *
 * @name flattenReduce
 * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex, featureSubIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
 * ]);
 *
 * turf.flattenReduce(features, function (previousValue, currentFeature, featureIndex, featureSubIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   //=featureSubIndex
 *   return currentFeature
 * });
 */
function flattenReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    flattenEach(geojson, function (currentFeature, featureIndex, featureSubIndex) {
        if (featureIndex === 0 && featureSubIndex === 0 && initialValue === undefined) previousValue = currentFeature;
        else previousValue = callback(previousValue, currentFeature, featureIndex, featureSubIndex);
    });
    return previousValue;
}

/**
 * Callback for segmentEach
 *
 * @callback segmentEachCallback
 * @param {Feature<LineString>} currentSegment The current segment being processed.
 * @param {number} featureIndex The index of the current element being processed in the array, starts at index 0.
 * @param {number} featureSubIndex The subindex of the current element being processed in the
 * array. Starts at index 0 and increases for each iterating line segment.
 * @returns {void}
 */

/**
 * Iterate over 2-vertex line segment in any GeoJSON object, similar to Array.forEach()
 * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
 * @param {Function} callback a method that takes (currentSegment, featureIndex, featureSubIndex)
 * @returns {void}
 * @example
 * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
 *
 * // Iterate over GeoJSON by 2-vertex segments
 * turf.segmentEach(polygon, function (currentSegment, featureIndex, featureSubIndex) {
 *   //= currentSegment
 *   //= featureIndex
 *   //= featureSubIndex
 * });
 *
 * // Calculate the total number of segments
 * var total = 0;
 * var initialValue = 0;
 * turf.segmentEach(polygon, function () {
 *     total++;
 * }, initialValue);
 */
function segmentEach(geojson, callback) {
    flattenEach(geojson, function (feature, featureIndex) {
        var featureSubIndex = 0;
        // Exclude null Geometries
        if (!feature.geometry) return;
        // (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
        var type = feature.geometry.type;
        if (type === 'Point' || type === 'MultiPoint') return;

        // Generate 2-vertex line segments
        coordReduce(feature, function (previousCoords, currentCoord) {
            var currentSegment = lineString([previousCoords, currentCoord], feature.properties);
            callback(currentSegment, featureIndex, featureSubIndex);
            featureSubIndex++;
            return currentCoord;
        });
    });
}

/**
 * Callback for segmentReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback segmentReduceCallback
 * @param {*} [previousValue] The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature<LineString>} [currentSegment] The current segment being processed.
 * @param {number} [currentIndex] The index of the current element being processed in the
 * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} [currentSubIndex] The subindex of the current element being processed in the
 * array. Starts at index 0 and increases for each iterating line segment.
 */

/**
 * Reduce 2-vertex line segment in any GeoJSON object, similar to Array.reduce()
 * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
 * @param {Function} callback a method that takes (previousValue, currentSegment, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {void}
 * @example
 * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
 *
 * // Iterate over GeoJSON by 2-vertex segments
 * turf.segmentReduce(polygon, function (previousSegment, currentSegment, currentIndex, currentSubIndex) {
 *   //= previousSegment
 *   //= currentSegment
 *   //= currentIndex
 *   //= currentSubIndex
 *   return currentSegment
 * });
 *
 * // Calculate the total number of segments
 * var initialValue = 0
 * var total = turf.segmentReduce(polygon, function (previousValue) {
 *     previousValue++;
 *     return previousValue;
 * }, initialValue);
 */
function segmentReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    segmentEach(geojson, function (currentSegment, currentIndex, currentSubIndex) {
        if (currentIndex === 0 && initialValue === undefined) previousValue = currentSegment;
        else previousValue = callback(previousValue, currentSegment, currentIndex, currentSubIndex);
    });
    return previousValue;
}

/**
 * Create Feature
 *
 * @private
 * @param {Geometry} geometry GeoJSON Geometry
 * @param {Object} properties Properties
 * @returns {Feature} GeoJSON Feature
 */
function feature(geometry, properties) {
    if (geometry === undefined) throw new Error('No geometry passed');

    return {
        type: 'Feature',
        properties: properties || {},
        geometry: geometry
    };
}

/**
 * Create LineString
 *
 * @private
 * @param {Array<Array<number>>} coordinates Line Coordinates
 * @param {Object} properties Properties
 * @returns {Feature<LineString>} GeoJSON LineString Feature
 */
function lineString(coordinates, properties) {
    if (!coordinates) throw new Error('No coordinates passed');
    if (coordinates.length < 2) throw new Error('Coordinates must be an array of two or more positions');

    return {
        type: 'Feature',
        properties: properties || {},
        geometry: {
            type: 'LineString',
            coordinates: coordinates
        }
    };
}

module.exports = {
    coordEach: coordEach,
    coordReduce: coordReduce,
    propEach: propEach,
    propReduce: propReduce,
    featureEach: featureEach,
    featureReduce: featureReduce,
    coordAll: coordAll,
    geomEach: geomEach,
    geomReduce: geomReduce,
    flattenEach: flattenEach,
    flattenReduce: flattenReduce,
    segmentEach: segmentEach,
    segmentReduce: segmentReduce
};


/***/ }),

/***/ 5:
/***/ (function(module, exports, __webpack_require__) {

var coordEach = __webpack_require__(3).coordEach;

/**
 * Takes a set of features, calculates the bbox of all input features, and returns a bounding box.
 *
 * @name bbox
 * @param {FeatureCollection|Feature<any>} geojson input features
 * @returns {Array<number>} bbox extent in [minX, minY, maxX, maxY] order
 * @example
 * var line = turf.lineString([[-74, 40], [-78, 42], [-82, 35]]);
 * var bbox = turf.bbox(line);
 * var bboxPolygon = turf.bboxPolygon(bbox);
 *
 * //addToMap
 * var addToMap = [line, bboxPolygon]
 */
module.exports = function (geojson) {
    var bbox = [Infinity, Infinity, -Infinity, -Infinity];
    coordEach(geojson, function (coord) {
        if (bbox[0] > coord[0]) bbox[0] = coord[0];
        if (bbox[1] > coord[1]) bbox[1] = coord[1];
        if (bbox[2] < coord[0]) bbox[2] = coord[0];
        if (bbox[3] < coord[1]) bbox[3] = coord[1];
    });
    return bbox;
};


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZDllODhkZTU4YTQ2NzhjNDM5ZDgiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvanMvbXhfaGVscGVyX21hcF9kcmFnZHJvcC53b3JrZXIuanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMvZ2VvanNvbmhpbnQvbm9kZV9tb2R1bGVzL2pzb25saW50LWxpbmVzL2xpYi9qc29ubGludC5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vbW9kdWxlLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9vYmplY3QuanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9yaHIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2pzL214X2hlbHBlcl9zdGF0LmpzIiwid2VicGFjazovLy8uL3NyYy9qcy9teF9oZWxwZXJfY29sb3JzLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9AdHVyZi9tZXRhL2luZGV4LmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9AdHVyZi9iYm94L2luZGV4LmpzIl0sIm5hbWVzIjpbImdlb2pzb25oaW50Iiwic3RhdCIsImNvbG9yIiwidHlwZVN3aXRjaGVyIiwicG9zdE1lc3NhZ2UiLCJwcm9ncmVzcyIsIm1lc3NhZ2UiLCJvbm1lc3NhZ2UiLCJlIiwiZXJyb3JNc2ciLCJ3YXJuaW5nTXNnIiwiZGF0IiwiZGF0YSIsImdKc29uIiwiZmlsZU5hbWUiLCJmaWxlVHlwZSIsInRpbWVyVmFsIiwidGltZXJTdGFydCIsIkRhdGUiLCJ0aW1lckxhcCIsImxhcCIsInRpbWVyTGFwU3RyaW5nIiwibWVzc2FnZXMiLCJoaW50IiwiZXJyb3JzIiwiZmlsdGVyIiwieCIsImxldmVsIiwid2FybmluZ3MiLCJsZW5ndGgiLCJmb3JFYWNoIiwiY29uc29sZSIsImxvZyIsImZpbGUiLCJKU09OIiwic3RyaW5naWZ5IiwiZXJyb3JNZXNzYWdlIiwiZ2VvbVR5cGVzIiwiZmVhdHVyZXMiLCJtYXAiLCJnZW9tZXRyeSIsInR5cGUiLCJ1bmRlZmluZWQiLCJ2IiwiaSIsInMiLCJpbmRleE9mIiwiZiIsImNvb3JkaW5hdGVzIiwiYXR0cmlidXRlcyIsInAiLCJ0bXAiLCJpbml0IiwicHJvcCIsInB1c2giLCJnZXRBcnJheVN0YXQiLCJhcnIiLCJleHRlbnQiLCJNYXRoIiwicm91bmQiLCJtc3NzYWdlIiwiaWQiLCJpZFNvdXJjZSIsInJhbiIsInJhbmRvbSIsImNvbEEiLCJyYW5kb21Ic2wiLCJjb2xCIiwidHlwIiwiZHVtbXlTdHlsZSIsImxheWVyIiwiZ2VvanNvbiIsImVyciIsImNsb25lQXJyYXkiLCJjbG9uZSIsIm8iLCJjb25zdHJ1Y3RvciIsIkFycmF5IiwicGVyY2VudGlsZSIsImxlbl9vIiwibGVuIiwic29ydE51bWJlciIsImEiLCJiIiwib3B0IiwibWF4IiwiSW5maW5pdHkiLCJwb3AiLCJtaW4iLCJzdW0iLCJtZWRpYW4iLCJyZXN1bHQiLCJzb3J0IiwiaW5kZXgiLCJmbG9vciIsImZyYWN0aW9uIiwicXVhbnRpbGVzIiwicmVzIiwibiIsInIiLCJjb2xOYW1lcyIsIk9iamVjdCIsImtleXMiLCJ0YWJsZSIsInZhbCIsInByZXZWYWwiLCJjb2xOYW1lIiwiaiIsImpMIiwiaUwiLCJoZXgycmdiYSIsInJnYmEyaGV4IiwiY29sb3Iyb2JqIiwiY29sb3JMaW5lYXIiLCJvcGFjaXR5Iiwic2F0dXJhdGlvbiIsImxpZ2h0bmVzcyIsImhleCIsImgiLCJyZXBsYWNlIiwicmdiYSIsInJnYiIsIm91dCIsIm1hdGNoIiwiUmVnRXhwIiwicGFyc2VJbnQiLCJqb2luIiwidG9TdHJpbmciLCJzbGljZSIsImhleE9ubHkiLCJhbHBoYSIsImNvbCIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN0eWxlIiwic3BsaXQiLCJ2YWxNaW4iLCJ2YWxNYXgiLCJjb2xNaW4iLCJjb2xNYXgiLCJpc1JhbmRvbSJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7OztBQzdEQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0Es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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFD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QUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUssSUFBSTs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBOztBQUVBOzs7Ozs7OztBQ3ZjQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsdUJBQXVCO0FBQzlDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBOzs7Ozs7Ozs7Ozs7OztRQ3RDZ0JxQyxVLEdBQUFBLFU7UUFZQWxCLFksR0FBQUEsWTtBQW5CaEI7O0FBR0E7Ozs7QUFJTyxTQUFTa0IsVUFBVCxDQUFvQmpCLEdBQXBCLEVBQXdCO0FBQzdCLE1BQUlaLElBQUlZLElBQUkzQixNQUFaO0FBQ0EsTUFBSTZDLFFBQVEsRUFBWjtBQUNBLFNBQU05QixHQUFOLEVBQVc7QUFBRThCLFVBQU05QixDQUFOLElBQVdZLElBQUlaLENBQUosQ0FBWDtBQUFvQjtBQUNqQyxTQUFPOEIsS0FBUDtBQUNEO0FBQ0Q7Ozs7OztBQU1PLFNBQVNuQixZQUFULENBQXNCb0IsQ0FBdEIsRUFBd0I7O0FBRTdCLE1BQ0VBLEVBQUVuQixHQUFGLEtBQVVkLFNBQVYsSUFDQWlDLEVBQUVuQixHQUFGLENBQU1vQixXQUFOLElBQXFCQyxLQURyQixJQUVBRixFQUFFbkIsR0FBRixDQUFNM0IsTUFBTixLQUFpQixDQUhuQixFQUlFLE9BQU8sRUFBUDs7QUFFRixNQUNFOEMsRUFBRTFFLElBQUYsSUFBVSxVQUFWLElBQ0EwRSxFQUFFRyxVQURGLElBRUFILEVBQUVHLFVBQUYsQ0FBYUYsV0FBYixJQUE0QkMsS0FIOUIsRUFJRUYsRUFBRTFFLElBQUYsR0FBUyxXQUFUOztBQUVGLE1BQUl1RCxNQUFNaUIsV0FBWUUsRUFBRW5CLEdBQWQsQ0FBVjtBQUNBLE1BQUl2RCxPQUFRMEUsRUFBRTFFLElBQUYsR0FBUzBFLEVBQUUxRSxJQUFYLEdBQWtCLEtBQTlCO0FBQ0EsTUFBSThFLFFBQVF2QixJQUFJM0IsTUFBaEI7QUFDQSxNQUFJbUQsTUFBTUQsS0FBVjs7QUFFQSxXQUFTRSxVQUFULENBQW9CQyxDQUFwQixFQUFzQkMsQ0FBdEIsRUFBeUI7QUFDdkIsV0FBT0QsSUFBSUMsQ0FBWDtBQUNEOztBQUVELE1BQUlDLE1BQU07QUFDUixXQUFRLGVBQVU7QUFDaEIsVUFBSUMsTUFBTSxDQUFDQyxRQUFYO0FBQ0EsVUFBSTNDLElBQUksQ0FBUjtBQUNBLGFBQVFxQyxLQUFSLEVBQWU7QUFDYnJDLFlBQUlhLElBQUkrQixHQUFKLEVBQUo7QUFDQSxZQUFLNUMsSUFBSTBDLEdBQVQsRUFBZTtBQUNiQSxnQkFBTTFDLENBQU47QUFDRDtBQUNGO0FBQ0QsYUFBTzBDLEdBQVA7QUFDRCxLQVhPO0FBWVIsV0FBUSxlQUFVO0FBQ2hCLFVBQUlHLE1BQU1GLFFBQVY7QUFDQSxhQUFPTixLQUFQLEVBQWM7QUFDWixZQUFJckMsSUFBSWEsSUFBSStCLEdBQUosRUFBUjtBQUNBLFlBQUk1QyxJQUFJNkMsR0FBUixFQUFZO0FBQ1ZBLGdCQUFNN0MsQ0FBTjtBQUNEO0FBQ0Y7QUFDRCxhQUFPNkMsR0FBUDtBQUNELEtBckJPO0FBc0JSLFdBQU0sZUFBVTtBQUNkLFVBQUlDLE1BQU0sQ0FBVjtBQUNBLGFBQU9ULEtBQVAsRUFBYztBQUNaUyxlQUFPakMsSUFBSStCLEdBQUosRUFBUDtBQUNEO0FBQ0QsYUFBT0UsR0FBUDtBQUNELEtBNUJPO0FBNkJSLFlBQU8sZ0JBQVU7QUFDZixVQUFJQSxNQUFNbEMsYUFBYTtBQUNyQnRELGNBQU8sS0FEYztBQUVyQnVELGFBQU1BO0FBRmUsT0FBYixDQUFWO0FBSUEsYUFBT2lDLE1BQU1WLEtBQWI7QUFDRCxLQW5DTztBQW9DUixjQUFTLGtCQUFVO0FBQ2pCLFVBQUlXLFNBQVNuQyxhQUFhO0FBQ3hCdEQsY0FBTyxVQURpQjtBQUV4QnVELGFBQU1BLEdBRmtCO0FBR3hCc0Isb0JBQWE7QUFIVyxPQUFiLENBQWI7QUFLQSxhQUFPWSxNQUFQO0FBQ0QsS0EzQ087QUE0Q1IsZ0JBQVcsb0JBQVU7QUFDbkIsVUFBSUMsTUFBSjtBQUNBbkMsVUFBSW9DLElBQUosQ0FBU1gsVUFBVDtBQUNBTixRQUFFRyxVQUFGLEdBQWVILEVBQUVHLFVBQUYsR0FBY0gsRUFBRUcsVUFBaEIsR0FBNkIsRUFBNUM7QUFDQSxVQUFJZSxRQUFRbEIsRUFBRUcsVUFBRixHQUFhLEdBQWIsSUFBb0J0QixJQUFJM0IsTUFBSixHQUFXLENBQS9CLENBQVo7QUFDQSxVQUFJNkIsS0FBS29DLEtBQUwsQ0FBV0QsS0FBWCxLQUFxQkEsS0FBekIsRUFBZ0M7QUFDOUJGLGlCQUFTbkMsSUFBSXFDLEtBQUosQ0FBVDtBQUNELE9BRkQsTUFFTztBQUNMLFlBQUlqRCxJQUFJYyxLQUFLb0MsS0FBTCxDQUFXRCxLQUFYLENBQVI7QUFDQSxZQUFJRSxXQUFXRixRQUFRakQsQ0FBdkI7QUFDQStDLGlCQUFTbkMsSUFBSVosQ0FBSixJQUFTLENBQUNZLElBQUlaLElBQUUsQ0FBTixJQUFXWSxJQUFJWixDQUFKLENBQVosSUFBc0JtRCxRQUF4QztBQUNEO0FBQ0QsYUFBT0osTUFBUDtBQUNELEtBekRPO0FBMERSLGlCQUFZLHFCQUFVO0FBQ3BCLFVBQUlLLFlBQVksRUFBaEI7QUFDQXJCLFFBQUVHLFVBQUYsQ0FBYWhELE9BQWIsQ0FBcUIsVUFBU0osQ0FBVCxFQUFXO0FBQzlCLFlBQUl1RSxNQUFPMUMsYUFBYTtBQUN0QnRELGdCQUFPLFVBRGU7QUFFdEJ1RCxlQUFNQSxHQUZnQjtBQUd0QnNCLHNCQUFhcEQ7QUFIUyxTQUFiLENBQVg7QUFLQXNFLGtCQUFVdEUsQ0FBVixJQUFldUUsR0FBZjtBQUNELE9BUEQ7QUFRQSxhQUFPRCxTQUFQO0FBQ0QsS0FyRU87QUFzRVIsZ0JBQVcsb0JBQVU7QUFDbkIsVUFBSUUsSUFBSSxFQUFSO0FBQUEsVUFBWUMsSUFBSSxFQUFoQjs7QUFFQSxhQUFPbkIsS0FBUCxFQUNBO0FBQ0UsWUFBSyxDQUFDa0IsRUFBRTFDLElBQUl3QixHQUFKLENBQUYsQ0FBTixFQUNBO0FBQ0VrQixZQUFFMUMsSUFBSXdCLEdBQUosQ0FBRixJQUFjLElBQWQ7QUFDQW1CLFlBQUU3QyxJQUFGLENBQU9FLElBQUl3QixHQUFKLENBQVA7QUFDRDtBQUNGO0FBQ0QsYUFBT21CLENBQVA7QUFDRCxLQWxGTztBQW1GUixpQkFBWSxxQkFBVTtBQUNwQixVQUFJQyxXQUFXekIsRUFBRXlCLFFBQWpCO0FBQ0EsVUFBR0EsU0FBU3hCLFdBQVQsSUFBd0JDLEtBQTNCLEVBQWtDLE1BQU0sd0JBQU47QUFDbEMsVUFBR3VCLFNBQVN2RSxNQUFULElBQWlCLENBQXBCLEVBQXVCdUUsV0FBV0MsT0FBT0MsSUFBUCxDQUFZOUMsSUFBSSxDQUFKLENBQVosQ0FBWDtBQUN2QixVQUFJK0MsUUFBUSxFQUFaO0FBQ0EsVUFBSUMsR0FBSixFQUFRQyxPQUFSO0FBQ0EsVUFBSUMsT0FBSjs7QUFFQSxXQUFJLElBQUlDLElBQUUsQ0FBTixFQUFRQyxLQUFHUixTQUFTdkUsTUFBeEIsRUFBK0I4RSxJQUFFQyxFQUFqQyxFQUFvQ0QsR0FBcEMsRUFBd0M7QUFDdENELGtCQUFVTixTQUFTTyxDQUFULENBQVY7QUFDQUosY0FBTUcsT0FBTixJQUFpQixFQUFqQjtBQUNBLGFBQUksSUFBSTlELElBQUUsQ0FBTixFQUFRaUUsS0FBR3JELElBQUkzQixNQUFuQixFQUEwQmUsSUFBRWlFLEVBQTVCLEVBQStCakUsR0FBL0IsRUFBbUM7QUFDakM0RCxnQkFBTWhELElBQUlaLENBQUosRUFBTzhELE9BQVAsS0FBaUIsSUFBdkI7QUFDQUgsZ0JBQU1HLE9BQU4sRUFBZUYsR0FBZixJQUFvQkQsTUFBTUcsT0FBTixFQUFlRixHQUFmLElBQW9CLENBQXBCLElBQXVCLENBQTNDO0FBQ0Q7QUFDRjtBQUNELGFBQU9ELEtBQVA7QUFDRCxLQXBHTztBQXFHUixhQUFRLGlCQUFVOztBQUVoQixVQUFJSCxXQUFXekIsRUFBRXlCLFFBQWpCO0FBQ0EsVUFBR0EsU0FBU3hCLFdBQVQsSUFBd0JDLEtBQTNCLEVBQWtDLE1BQU0sd0JBQU47QUFDbEMsVUFBR3VCLFNBQVN2RSxNQUFULElBQWlCLENBQXBCLEVBQXVCdUUsV0FBV0MsT0FBT0MsSUFBUCxDQUFZOUMsSUFBSSxDQUFKLENBQVosQ0FBWDtBQUN2QixVQUFJK0MsUUFBUSxFQUFaO0FBQ0EsVUFBSUMsR0FBSixFQUFRQyxPQUFSO0FBQ0EsVUFBSUMsT0FBSjtBQUNBLFdBQUksSUFBSUMsSUFBRSxDQUFOLEVBQVFDLEtBQUdSLFNBQVN2RSxNQUF4QixFQUErQjhFLElBQUVDLEVBQWpDLEVBQW9DRCxHQUFwQyxFQUF3QztBQUN0Q0Qsa0JBQVFOLFNBQVNPLENBQVQsQ0FBUjtBQUNBLGFBQUksSUFBSS9ELElBQUUsQ0FBTixFQUFRaUUsS0FBR3JELElBQUkzQixNQUFuQixFQUEwQmUsSUFBRWlFLEVBQTVCLEVBQStCakUsR0FBL0IsRUFBbUM7QUFDakM0RCxnQkFBSWhELElBQUlaLENBQUosRUFBTzhELE9BQVAsS0FBaUIsQ0FBckI7QUFDQUQsb0JBQVFGLE1BQU1HLE9BQU4sS0FBa0IsQ0FBMUI7QUFDQUgsZ0JBQU1HLE9BQU4sSUFBZ0JELFVBQVVELEdBQTFCO0FBQ0Q7QUFDRjtBQUNELGFBQU9ELEtBQVA7QUFDRDtBQXRITyxHQUFWOztBQXlIQSxTQUFPbkIsSUFBSW5GLElBQUosRUFBVTBFLENBQVYsQ0FBUDtBQUVELEM7Ozs7Ozs7Ozs7Ozs7UUM1SmVULFMsR0FBQUEsUztRQWtCQTRDLFEsR0FBQUEsUTtRQTJCQUMsUSxHQUFBQSxRO1FBYUFDLFMsR0FBQUEsUztRQXNDQUMsVyxHQUFBQSxXO0FBekdoQjs7QUFFQTs7Ozs7OztBQU9PLFNBQVMvQyxTQUFULENBQW1CZ0QsT0FBbkIsRUFBNEJsRCxNQUE1QixFQUFvQ21ELFVBQXBDLEVBQWdEQyxTQUFoRCxFQUEyRDtBQUNoRSxNQUFJRixZQUFZeEUsU0FBaEIsRUFBMkJ3RSxVQUFVLENBQVY7QUFDM0IsTUFBSUMsZUFBZXpFLFNBQW5CLEVBQThCeUUsYUFBYSxHQUFiO0FBQzlCLE1BQUlDLGFBQWExRSxTQUFqQixFQUE0QjBFLFlBQVksRUFBWjtBQUM1QixNQUFJcEQsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBdkIsSUFBNEJBLFdBQVd0QixTQUEzQyxFQUFzRHNCLFNBQVNOLEtBQUtNLE1BQUwsRUFBVDtBQUN0RCxNQUFJaUMsTUFBTSxVQUFXakMsU0FBUyxHQUFwQixHQUNSLElBRFEsR0FDRG1ELFVBREMsR0FDWSxJQURaLEdBRVIsSUFGUSxHQUVEQyxTQUZDLEdBRVcsSUFGWCxHQUdSLElBSFEsR0FHREYsT0FIQyxHQUdTLEdBSG5CO0FBSUEsU0FBT2pCLEdBQVA7QUFDRDs7QUFHRDs7Ozs7QUFLTyxTQUFTYSxRQUFULENBQWtCTyxHQUFsQixFQUF1QkgsT0FBdkIsRUFBZ0M7O0FBRXJDLE1BQUlJLElBQUlELElBQUlFLE9BQUosQ0FBWSxHQUFaLEVBQWlCLEVBQWpCLENBQVI7QUFDQSxNQUFJQyxPQUFRLE1BQVo7QUFDQSxNQUFJQyxNQUFPLEtBQVg7QUFDQSxNQUFJQyxNQUFNLEVBQVY7QUFDQSxNQUFJOUUsQ0FBSjtBQUNBMEUsTUFBSUEsRUFBRUssS0FBRixDQUFRLElBQUlDLE1BQUosQ0FBVyxRQUFRTixFQUFFekYsTUFBRixHQUFXLENBQW5CLEdBQXVCLElBQWxDLEVBQXdDLEdBQXhDLENBQVIsQ0FBSjs7QUFFQSxPQUFNZSxJQUFJLENBQVYsRUFBYUEsSUFBSTBFLEVBQUV6RixNQUFuQixFQUEyQmUsR0FBM0IsRUFBaUM7QUFDL0IwRSxNQUFFMUUsQ0FBRixJQUFPaUYsU0FBU1AsRUFBRTFFLENBQUYsRUFBS2YsTUFBTCxJQUFlLENBQWYsR0FBbUJ5RixFQUFFMUUsQ0FBRixJQUFPMEUsRUFBRTFFLENBQUYsQ0FBMUIsR0FBaUMwRSxFQUFFMUUsQ0FBRixDQUExQyxFQUFnRCxFQUFoRCxDQUFQO0FBQ0Q7O0FBRUQsTUFBSSxPQUFPc0UsT0FBUCxJQUFrQixXQUF0QixFQUFtQztBQUNqQyxRQUFHQSxVQUFRLENBQVgsRUFBY0EsVUFBUSxDQUFSO0FBQ2QsUUFBR0EsVUFBUSxDQUFYLEVBQWNBLFVBQVEsQ0FBUjtBQUNkSSxNQUFFaEUsSUFBRixDQUFPNEQsT0FBUDtBQUNBTyxVQUFNRCxJQUFOO0FBQ0Q7O0FBRUQsU0FBT0MsTUFBTSxHQUFOLEdBQVlILEVBQUVRLElBQUYsQ0FBTyxHQUFQLENBQVosR0FBMEIsR0FBakM7QUFDRDs7QUFFRDs7OztBQUlPLFNBQVNmLFFBQVQsQ0FBa0JVLEdBQWxCLEVBQXNCOztBQUUzQkEsUUFBTUEsSUFBSUUsS0FBSixDQUFVLHNFQUFWLENBQU47QUFDQSxTQUFRRixPQUFPQSxJQUFJNUYsTUFBSixLQUFlLENBQXZCLEdBQTRCLE1BQ2pDLENBQUMsTUFBTWdHLFNBQVNKLElBQUksQ0FBSixDQUFULEVBQWdCLEVBQWhCLEVBQW9CTSxRQUFwQixDQUE2QixFQUE3QixDQUFQLEVBQXlDQyxLQUF6QyxDQUErQyxDQUFDLENBQWhELENBRGlDLEdBRWpDLENBQUMsTUFBTUgsU0FBU0osSUFBSSxDQUFKLENBQVQsRUFBZ0IsRUFBaEIsRUFBb0JNLFFBQXBCLENBQTZCLEVBQTdCLENBQVAsRUFBeUNDLEtBQXpDLENBQStDLENBQUMsQ0FBaEQsQ0FGaUMsR0FHakMsQ0FBQyxNQUFNSCxTQUFTSixJQUFJLENBQUosQ0FBVCxFQUFnQixFQUFoQixFQUFvQk0sUUFBcEIsQ0FBNkIsRUFBN0IsQ0FBUCxFQUF5Q0MsS0FBekMsQ0FBK0MsQ0FBQyxDQUFoRCxDQUhLLEdBR2dELEVBSHZEO0FBSUQ7QUFDRDs7Ozs7QUFLTyxTQUFTaEIsU0FBVCxDQUFtQjlHLEtBQW5CLEVBQXlCK0gsT0FBekIsRUFBaUM7QUFDdEMsTUFBSUMsS0FBSjtBQUNBLE1BQUlDLEdBQUo7QUFDQSxNQUFJVCxNQUFNO0FBQ1JRLFdBQVEsQ0FEQTtBQUVSaEksV0FBTztBQUZDLEdBQVY7QUFJQSxNQUFJa0ksTUFBTUMsU0FBU0MsYUFBVCxDQUF1QixLQUF2QixDQUFWO0FBQ0FGLE1BQUlHLEtBQUosQ0FBVXJJLEtBQVYsR0FBa0JBLEtBQWxCO0FBQ0FpSSxRQUFNQyxJQUFJRyxLQUFKLENBQVVySSxLQUFoQjtBQUNBLE1BQUdpSSxHQUFILEVBQU87QUFDTEQsWUFBUUMsSUFBSUssS0FBSixDQUFVLElBQVYsRUFBZ0IsQ0FBaEIsQ0FBUjtBQUNBLFFBQUdOLEtBQUgsRUFBUztBQUNQUixVQUFJUSxLQUFKLEdBQVlBLE1BQU1YLE9BQU4sQ0FBYyxJQUFkLEVBQW1CLEVBQW5CLElBQXVCLENBQW5DO0FBQ0Q7QUFDREcsUUFBSXhILEtBQUosR0FBWTZHLFNBQVNvQixHQUFULENBQVo7QUFDRDtBQUNELE1BQUdGLE9BQUgsRUFBVztBQUNWUCxVQUFNQSxJQUFJeEgsS0FBVjtBQUNBO0FBQ0QsU0FBT3dILEdBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0FBZU8sU0FBU1QsV0FBVCxDQUFxQnRDLENBQXJCLEVBQXVCO0FBQzVCLE1BQUk4RCxTQUFTOUQsRUFBRWEsR0FBRixHQUFNLENBQU4sSUFBUyxDQUF0QjtBQUNBLE1BQUlrRCxTQUFTL0QsRUFBRVUsR0FBRixHQUFNLENBQU4sSUFBUyxDQUF0QjtBQUNBLE1BQUlzRCxTQUFTaEUsRUFBRWdFLE1BQUYsR0FBUyxDQUFULElBQVksQ0FBekI7QUFDQSxNQUFJQyxTQUFTakUsRUFBRWlFLE1BQUYsR0FBUyxDQUFULElBQVksQ0FBekI7QUFDQSxNQUFJcEMsTUFBTTdCLEVBQUU2QixHQUFaO0FBQ0EsTUFBSTJCLEdBQUo7QUFDQSxNQUFJVSxXQUFXSixVQUFVQyxNQUF6QjtBQUNBLE1BQUcsQ0FBQ0csUUFBSixFQUFhO0FBQ1hWLFVBQU0sQ0FBQzNCLE1BQUlpQyxNQUFMLEtBQWNDLFNBQU9ELE1BQXJCLENBQU47QUFDRDtBQUNETixRQUFNQSxPQUFLUyxTQUFPRCxNQUFaLENBQU47QUFDQVIsUUFBTWpFLFVBQVUsQ0FBVixFQUFZaUUsR0FBWixDQUFOO0FBQ0EsU0FBT25CLFVBQVVtQixHQUFWLEVBQWMsSUFBZCxDQUFQO0FBQ0QsQzs7Ozs7OztBQ3ZIRDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsY0FBYztBQUN6QixXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLE9BQU87QUFDbEIsV0FBVyxPQUFPO0FBQ2xCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxtQ0FBbUM7QUFDOUMsV0FBVyxTQUFTO0FBQ3BCLFdBQVcsUUFBUTtBQUNuQjtBQUNBO0FBQ0EsMkJBQTJCLGFBQWE7QUFDeEMsMkJBQTJCLGlCQUFpQjtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQkFBMEIscUJBQXFCO0FBQy9DOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLCtCQUErQix1QkFBdUI7QUFDdEQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQixtQkFBbUI7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsbUJBQW1CO0FBQzlDLCtCQUErQixtQ0FBbUM7QUFDbEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLG1CQUFtQjtBQUM5QywrQkFBK0Isc0JBQXNCO0FBQ3JELG1DQUFtQyxzQ0FBc0M7QUFDekU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLGdDQUFnQztBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEVBQUU7QUFDYjtBQUNBLFdBQVcsY0FBYztBQUN6QixXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLE9BQU87QUFDbEIsV0FBVyxPQUFPO0FBQ2xCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxtQ0FBbUM7QUFDOUMsV0FBVyxTQUFTO0FBQ3BCLFdBQVcsRUFBRTtBQUNiLFdBQVcsUUFBUTtBQUNuQixhQUFhLEVBQUU7QUFDZjtBQUNBO0FBQ0EsMkJBQTJCLGFBQWE7QUFDeEMsMkJBQTJCLGlCQUFpQjtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLE9BQU87QUFDbEIsV0FBVyxPQUFPO0FBQ2xCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLDBCQUEwQjtBQUNyQyxXQUFXLFNBQVM7QUFDcEI7QUFDQTtBQUNBLDZCQUE2QixXQUFXO0FBQ3hDLDZCQUE2QixlQUFlO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFtQiw2QkFBNkI7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxFQUFFO0FBQ2I7QUFDQSxXQUFXLEVBQUU7QUFDYixXQUFXLE9BQU87QUFDbEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLDBCQUEwQjtBQUNyQyxXQUFXLFNBQVM7QUFDcEIsV0FBVyxFQUFFO0FBQ2IsYUFBYSxFQUFFO0FBQ2Y7QUFDQTtBQUNBLDZCQUE2QixXQUFXO0FBQ3hDLDZCQUE2QixlQUFlO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxhQUFhO0FBQ3hCLFdBQVcsT0FBTztBQUNsQjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLG1DQUFtQztBQUM5QyxXQUFXLFNBQVM7QUFDcEI7QUFDQTtBQUNBLDJCQUEyQixXQUFXO0FBQ3RDLDJCQUEyQixlQUFlO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsdUJBQXVCLDZCQUE2QjtBQUNwRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEVBQUU7QUFDYjtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLE9BQU87QUFDbEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsbUNBQW1DO0FBQzlDLFdBQVcsU0FBUztBQUNwQixXQUFXLEVBQUU7QUFDYixhQUFhLEVBQUU7QUFDZjtBQUNBO0FBQ0EsMkJBQTJCLGFBQWE7QUFDeEMsMkJBQTJCLGlCQUFpQjtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsbUNBQW1DO0FBQzlDLGFBQWEscUJBQXFCO0FBQ2xDO0FBQ0E7QUFDQSwyQkFBMkIsV0FBVztBQUN0QywyQkFBMkIsZUFBZTtBQUMxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsU0FBUztBQUNwQixXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLE9BQU87QUFDbEI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLG1DQUFtQztBQUM5QyxXQUFXLFNBQVM7QUFDcEI7QUFDQTtBQUNBLDZCQUE2QixXQUFXO0FBQ3hDLDZCQUE2QixlQUFlO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLFVBQVU7O0FBRXpCO0FBQ0E7QUFDQTtBQUNBLGtFQUFrRTtBQUNsRTtBQUNBOztBQUVBLG1CQUFtQixXQUFXO0FBQzlCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLGdDQUFnQztBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEVBQUU7QUFDYjtBQUNBLFdBQVcsU0FBUztBQUNwQixXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLE9BQU87QUFDbEI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLG1DQUFtQztBQUM5QyxXQUFXLFNBQVM7QUFDcEIsV0FBVyxFQUFFO0FBQ2IsYUFBYSxFQUFFO0FBQ2Y7QUFDQTtBQUNBLDZCQUE2QixXQUFXO0FBQ3hDLDZCQUE2QixlQUFlO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxPQUFPO0FBQ2xCO0FBQ0EsV0FBVyxPQUFPO0FBQ2xCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsbUNBQW1DO0FBQzlDLFdBQVcsU0FBUztBQUNwQjtBQUNBO0FBQ0EsNkJBQTZCLFdBQVc7QUFDeEMsOENBQThDLGVBQWU7QUFDN0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVULEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEVBQUU7QUFDYjtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLE9BQU87QUFDbEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsbUNBQW1DO0FBQzlDLFdBQVcsU0FBUztBQUNwQixXQUFXLEVBQUU7QUFDYixhQUFhLEVBQUU7QUFDZjtBQUNBO0FBQ0EsNkJBQTZCLFdBQVc7QUFDeEMsOENBQThDLGVBQWU7QUFDN0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsb0JBQW9CO0FBQy9CLFdBQVcsT0FBTztBQUNsQixXQUFXLE9BQU87QUFDbEI7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLG1DQUFtQztBQUM5QyxXQUFXLFNBQVM7QUFDcEIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsRUFBRTtBQUNiO0FBQ0EsV0FBVyxvQkFBb0I7QUFDL0IsV0FBVyxPQUFPO0FBQ2xCO0FBQ0EsV0FBVyxPQUFPO0FBQ2xCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLG1DQUFtQztBQUM5QyxXQUFXLFNBQVM7QUFDcEIsV0FBVyxFQUFFO0FBQ2IsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsU0FBUztBQUNwQixXQUFXLE9BQU87QUFDbEIsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esb0NBQW9DO0FBQ3BDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcscUJBQXFCO0FBQ2hDLFdBQVcsT0FBTztBQUNsQixhQUFhLG9CQUFvQjtBQUNqQztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esb0NBQW9DO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDdHpCQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsK0JBQStCO0FBQzFDLGFBQWEsY0FBYztBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSIsImZpbGUiOiJkOWU4OGRlNThhNDY3OGM0MzlkOC53b3JrZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAyNDcpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGQ5ZTg4ZGU1OGE0Njc4YzQzOWQ4IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1xuLy8gbW9kdWxlIGlkID0gMjA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qIGpzaGludCBlc3ZlcnNpb24gOiA2Ki9cbi8vIEltcG9ydGF0aW9uIG9mIGhlbHBlcnNcblxuaW1wb3J0ICogYXMgZ2VvanNvbmhpbnQgZnJvbSBcImdlb2pzb25oaW50XCI7XG5pbXBvcnQgeyBmZWF0dXJlRWFjaCwgcHJvcEVhY2ggfSBmcm9tIFwiQHR1cmYvbWV0YVwiO1xuaW1wb3J0IGJib3ggZnJvbSBcIkB0dXJmL2Jib3hcIjtcbmltcG9ydCAqIGFzIHN0YXQgZnJvbSAnLi9teF9oZWxwZXJfc3RhdC5qcyc7XG5pbXBvcnQgKiBhcyBjb2xvciBmcm9tICcuL214X2hlbHBlcl9jb2xvcnMuanMnO1xuXG5cbi8vIGdlb2pzb24gdHlwZSB0byBtYXBib3ggZ2wgdHlwZVxudmFyIHR5cGVTd2l0Y2hlciA9IHtcbiAgXCJQb2ludFwiOiBcImNpcmNsZVwiLFxuICBcIk11bHRpUG9pbnRcIjogXCJsaW5lXCIsXG4gIFwiTGluZVN0cmluZ1wiOiBcImxpbmVcIixcbiAgXCJNdWx0aUxpbmVTdHJpbmdcIjogXCJsaW5lXCIsXG4gIFwiUG9seWdvblwiOiBcImZpbGxcIixcbiAgXCJNdWx0aVBvbHlnb25cIjogXCJmaWxsXCIsXG4gIFwiR2VvbWV0cnlDb2xsZWN0aW9uXCI6IFwiZmlsbFwiXG59O1xuXG5cblxuXG5cbi8vIEluaXRhbCBtZXNzYWdlXG5wb3N0TWVzc2FnZSh7XG4gIHByb2dyZXNzOiAwLFxuICBtZXNzYWdlOiBcInN0YXJ0XCJcbn0pO1xuXG5cbi8vIGhhbmRsZSBtZXNzYWdlIHNlbmQgZnJvbSB0aGUgbWFpbiB0aHJlYWRcbm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgdHJ5IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpc2F0aW9uIDogc2V0IGxvY2FsIGhlbHBlciBhbmQgdmFyaWFibGVzXG4gICAgICovXG5cbiAgICAvLyBpbml0IHZhcmlhYmxlc1xuICAgIHZhciBlcnJvck1zZyA9IFwiXCI7XG4gICAgdmFyIHdhcm5pbmdNc2cgPSBcIlwiO1xuICAgIHZhciBkYXQgPSBlLmRhdGE7XG4gICAgdmFyIGdKc29uID0gZGF0LmRhdGE7XG4gICAgdmFyIGZpbGVOYW1lID0gZGF0LmZpbGVOYW1lO1xuICAgIHZhciBmaWxlVHlwZSA9IGRhdC5maWxlVHlwZTtcblxuXG4gICAgLy8gc2V0IGJhc2ljIHRpbWluZyBmdW5jdGlvblxuICAgIHZhciB0aW1lclZhbCA9IDA7XG5cbiAgICAvLyBzdGFydCB0aW1lclxuICAgIHZhciB0aW1lclN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aW1lclZhbCA9IG5ldyBEYXRlKCk7XG4gICAgfTtcblxuICAgIC8vIGdpdmUgaW50ZXJtZWRpYXRlIHRpbWUsIHJlc2V0IHRpbWVyXG4gICAgdmFyIHRpbWVyTGFwID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGFwID0gbmV3IERhdGUoKSAtIHRpbWVyVmFsO1xuICAgICAgcmV0dXJuIGxhcDtcbiAgICB9O1xuXG4gICAgLy8gcHJpbnRhYmxlIHZlcnNpb24gb2YgdGltZXJMYcOoXG4gICAgdmFyIHRpbWVyTGFwU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXCIgXCIgKyB0aW1lckxhcCgpICsgXCIgbXMgXCI7XG4gICAgfTtcblxuICAgIC8vIHN0YXJ0IHRpbWVyXG4gICAgdGltZXJTdGFydCgpO1xuXG5cbiAgICAvKipcbiAgICAgKiB2YWxpZGF0aW9uIDogZ2VvanNvbiB2YWxpZGF0aW9uIHdpdGggZ2VvanNvbmhpbnRcbiAgICAgKi9cblxuICAgIC8vIFZhbGlkYXRpb24uIElzIHRoYXQgYSB2YWxpZCBnZW9qc29uID9cbiAgICB2YXIgbWVzc2FnZXMgPSBnZW9qc29uaGludC5oaW50KGdKc29uKTtcbiAgICAvLyBleHRyYWN0IGVycm9yc1xuICAgIHZhciBlcnJvcnMgPSBtZXNzYWdlcy5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICByZXR1cm4geC5sZXZlbCA9PSBcImVycm9yXCI7XG4gICAgfSk7XG4gICAgLy8gZXh0cmFjdCBtZXNzYWdlXG4gICAgdmFyIHdhcm5pbmdzID0gbWVzc2FnZXMuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgcmV0dXJuIHgubGV2ZWwgPT0gXCJtZXNzYWdlXCI7XG4gICAgfSk7XG5cbi8qICAgIC8vIHNldCBhIG1lc3NhZ2Ugd2l0aCBzdW1tYXJ5Ki9cbiAgICAvL3ZhciBsb2dNZXNzYWdlID0gXCIgZ2VvanNvbiB2YWxpZGF0aW9uIFwiICtcbiAgICAgIC8vXCIgbiBlcnJvcnMgPSBcIiArIGVycm9ycy5sZW5ndGggK1xuICAgICAgLy9cIiBuIHdhcm5pbmdzID0gXCIgKyB3YXJuaW5ncy5sZW5ndGggKyBcIiBkb25lIGluXCIgK1xuICAgICAgLy90aW1lckxhcFN0cmluZygpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhmaWxlTmFtZSArIFwiIHN1bW1hcnkgOiAgXCIgKyBsb2dNZXNzYWdlKTtcblxuICAgIC8vIHNlbmQgbWVzc2FnZVxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHByb2dyZXNzOiA2MCxcbiAgICAgIG1lc3NhZ2U6IFwiVmFsaWRhdGlvbiBkb25lIGluIFwiICsgdGltZXJMYXBTdHJpbmcoKVxuICAgIH0pO1xuXG4gICAgLy8gdmFsaWRhdGlvbiA6IHdhcm5pbmdzXG4gICAgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcbiAgICAgIHdhcm5pbmdNc2cgPSB3YXJuaW5ncy5sZW5ndGggKyBcIiB3YXJuaW5nIG1lc3NhZ2UocykgZm91bmQuIENoZWNrIHRoZSBjb25zb2xlIGZvciBtb3JlIGluZm9cIjtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgcHJvZ3Jlc3M6IDc1LFxuICAgICAgICBtZXNzYWdlOiB3YXJuaW5ncy5sZW5ndGggKyBcIiB3YXJuaW5ncyBmb3VuZC4gUGxlYXNlIGNoZWNrIHRoZSBjb25zb2xlLlwiXG4gICAgICB9KTtcblxuICAgICAgd2FybmluZ3MuZm9yRWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHtmaWxlOmZpbGVOYW1lLHdhcm5pbmdzOkpTT04uc3RyaW5naWZ5KHgpfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gdmFybGlkYXRpb246IGVycm9yc1xuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JNc2cgPSBlcnJvcnMubGVuZ3RoICsgXCIgZXJyb3JzIGZvdW5kLiBQbGVhc2UgY2hlY2sgdGhlIGNvbnNvbGUuXCI7XG4gICAgICBwb3N0TWVzc2FnZSh7XG4gICAgICAgIHByb2dyZXNzOiAxMDAsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yTXNnLFxuICAgICAgICBlcnJvck1lc3NhZ2U6IGVycm9yTXNnXG4gICAgICB9KTtcblxuICAgICAgZXJyb3JzLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICBjb25zb2xlLmxvZyh7ZmlsZTpmaWxlTmFtZSxlcnJvcnM6eH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdm9pZCBtdWx0aSB0eXBlIDogd2UgZG9uJ3QgaGFuZGxlIHRoZW0gZm9yIG5vd1xuICAgICAqL1xuXG4gICAgdmFyIGdlb21UeXBlcyA9IFtdO1xuICAgIGlmKCBnSnNvbi5mZWF0dXJlcyApe1xuICAgICAgLy8gYXJyYXkgb2YgdHlwZXMgaW4gZGF0YVxuICAgICAgZ2VvbVR5cGVzICA9IGdKc29uLmZlYXR1cmVzXG4gICAgICAgIC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgaWYoeC5nZW9tZXRyeSAmJiB4Lmdlb21ldHJ5LnR5cGUpe1xuICAgICAgICAgICAgcmV0dXJuIHguZ2VvbWV0cnkudHlwZTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7IFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24odixpLHMpe1xuICAgICAgICByZXR1cm4gcy5pbmRleE9mKHYpID09PSBpICYmIHYgIT09IHVuZGVmaW5lZDtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgZ2VvbVR5cGVzID0gW2dKc29uLmdlb21ldHJ5LnR5cGVdO1xuICAgIH1cblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHByb2dyZXNzOiA5MCxcbiAgICAgIG1lc3NhZ2U6IFwiR2VvbWV0cnkgdHlwZSBmb3VuZCBpbiBcIiArIHRpbWVyTGFwU3RyaW5nKClcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBmZWF0dXJlcyB3aXRob3V0IGdlb21cbiAgICAgKiBoYWNrIHJlbGF0ZWQgdG8gaHR0cHM6Ly9naXRodWIuY29tL1R1cmZqcy90dXJmL2lzc3Vlcy84NTNcbiAgICAgKiBEZWxldGUgdGhpcyBibG9jay5cbiAgICAgKi9cblxuICAgIGZlYXR1cmVFYWNoKGdKc29uLGZ1bmN0aW9uKGYsaSl7XG4gICAgICBpZihmLmdlb21ldHJ5PT09bnVsbCl7XG4gICAgICAgIGYuZ2VvbWV0cnk9e1xuICAgICAgICAgIHR5cGU6IGdlb21UeXBlc1swXSxcbiAgICAgICAgICBjb29yZGluYXRlczogW11cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICogR2V0IHRhYmxlIG9mIGFsbCBhdHRyaWJ1dGVzLiBcbiAgICAqL1xuICAgIHZhciBhdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIHA7XG4gICAgYXR0cmlidXRlcy50bXAgPSB7fTtcbiAgICBhdHRyaWJ1dGVzLmluaXQgPSBmYWxzZTtcbiAgICBwcm9wRWFjaChnSnNvbixcbiAgICAgIGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAvLyBpbml0IGF0dHJpYnV0ZXMgd2l0aCBlbXB0eSBhcnJheVxuICAgICAgICBpZighYXR0cmlidXRlcy5pbml0KXtcbiAgICAgICAgICBmb3IocCBpbiBwcm9wKXtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMudG1wW3BdID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGF0dHJpYnV0ZXMuaW5pdCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gXG4gICAgICAgIGZvcihwIGluIHByb3Ape1xuICAgICAgICAgIGlmKGF0dHJpYnV0ZXMudG1wW3BdICYmIHByb3BbcF0pe1xuICAgICAgICAgICAgYXR0cmlidXRlcy50bXBbcF0ucHVzaChwcm9wW3BdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgICAgXG4gICAgZm9yKHAgaW4gYXR0cmlidXRlcy50bXApe1xuICAgICAgYXR0cmlidXRlc1twXSA9IHN0YXQuZ2V0QXJyYXlTdGF0KHtcbiAgICAgICAgYXJyIDogYXR0cmlidXRlcy50bXBbcF0sXG4gICAgICAgIHN0YXQgOiBcImRpc3RpbmN0XCJcbiAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBkZWxldGUgYXR0cmlidXRlcy50bXA7XG4gICAgZGVsZXRlIGF0dHJpYnV0ZXMuaW5pdDtcblxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVudCA6IGdldCBleHRlbnQgdXNpbmcgYSBUdXJmIGJib3hcbiAgICAgKi9cblxuICAgIHZhciBleHRlbnQgPSBiYm94KGdKc29uKTtcblxuICAgIC8vIFF1aWNrIGV4dGVudCB2YWxpZGF0aW9uIFxuICAgIGlmIChcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnRbMF0pID4gMTgwIHx8IE1hdGgucm91bmQoZXh0ZW50WzBdKSA8IC0xODAgfHxcbiAgICAgICAgTWF0aC5yb3VuZChleHRlbnRbMV0pID4gOTAgfHwgTWF0aC5yb3VuZChleHRlbnRbMV0pIDwgLTkwIHx8XG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50WzJdKSA+IDE4MCB8fCBNYXRoLnJvdW5kKGV4dGVudFsyXSkgPCAtMTgwIHx8XG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50WzNdKSA+IDkwIHx8IE1hdGgucm91bmQoZXh0ZW50WzNdKSA8IC05MFxuICAgICAgICkge1xuICAgICAgXG4gICAgICBlcnJvck1zZyA9IGZpbGVOYW1lICsgXCIgOiBleHRlbnQgc2VlbXMgdG8gYmUgb3V0IG9mIHJhbmdlOiBcIiArIGV4dGVudDtcblxuICAgICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgICBwcm9ncmVzczogMTAwLFxuICAgICAgICBtc3NzYWdlOiBlcnJvck1zZyxcbiAgICAgICAgZXJyb3JNZXNzYWdlOiBlcnJvck1zZ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKHtcbiAgICAgICAgXCJlcnJvcnNcIjogZXJyb3JNc2dcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHByb2dyZXNzOiA4MCxcbiAgICAgIG1lc3NhZ2U6IFwiZXh0ZW50IGZvdW5kIGluIFwiICsgdGltZXJMYXBTdHJpbmcoKVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIFNldCBkZWZhdWx0IGZvciBhIG5ldyBsYXllclxuICAgICAqL1xuXG4gICAgLy8gU2V0IHJhbmRvbSBpZCBmb3Igc291cmNlIGFuZCBsYXllclxuICAgIHZhciBpZCA9IFwiTVgtRFJPUC1cIiArIGZpbGVOYW1lIDtcbiAgICB2YXIgaWRTb3VyY2UgPSBpZCArIFwiLVNSQ1wiO1xuICAgIC8vIFNldCByYW5kb20gY29sb3JcbiAgICB2YXIgcmFuID0gTWF0aC5yYW5kb20oKTtcbiAgICB2YXIgY29sQSA9IGNvbG9yLnJhbmRvbUhzbCgwLjMsIHJhbik7XG4gICAgdmFyIGNvbEIgPSBjb2xvci5yYW5kb21Ic2woMC45LCByYW4pO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgdHlwZSBmcm9tIGdlb2pzb24gdHlwZVxuICAgIHZhciB0eXAgPSB0eXBlU3dpdGNoZXJbZ2VvbVR5cGVzWzBdXTtcblxuICAgIC8vIFNldCB1cCBkZWZhdWx0IHN0eWxlXG4gICAgdmFyIGR1bW15U3R5bGUgPSB7XG4gICAgICBcImNpcmNsZVwiOiB7XG4gICAgICAgIFwiaWRcIjogaWQsXG4gICAgICAgIFwic291cmNlXCI6IGlkU291cmNlLFxuICAgICAgICBcInR5cGVcIjogdHlwLFxuICAgICAgICBcInBhaW50XCI6IHtcbiAgICAgICAgICBcImNpcmNsZS1jb2xvclwiOiBjb2xBLFxuICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOjEwLFxuICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOjEsXG4gICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6Y29sQlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJmaWxsXCI6IHtcbiAgICAgICAgXCJpZFwiOiBpZCxcbiAgICAgICAgXCJzb3VyY2VcIjogaWRTb3VyY2UsXG4gICAgICAgIFwidHlwZVwiOiB0eXAsXG4gICAgICAgIFwicGFpbnRcIjoge1xuICAgICAgICAgIFwiZmlsbC1jb2xvclwiOiBjb2xBLFxuICAgICAgICAgIFwiZmlsbC1vdXRsaW5lLWNvbG9yXCI6IGNvbEJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwibGluZVwiOiB7XG4gICAgICAgIFwiaWRcIjogaWQsXG4gICAgICAgIFwic291cmNlXCI6IGlkU291cmNlLFxuICAgICAgICBcInR5cGVcIjogdHlwLFxuICAgICAgICBcInBhaW50XCI6IHtcbiAgICAgICAgICBcImxpbmUtY29sb3JcIjogY29sQSxcbiAgICAgICAgICBcImxpbmUtd2lkdGhcIjogMTBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cblxuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHByb2dyZXNzOiA5OSxcbiAgICAgIG1lc3NhZ2U6IFwiV29ya2VyIGpvYiBkb25lIGluIFwiKyB0aW1lckxhcFN0cmluZygpLFxuICAgICAgaWQ6IGlkLFxuICAgICAgZXh0ZW50OiBleHRlbnQsXG4gICAgICBhdHRyaWJ1dGVzIDogYXR0cmlidXRlcyxcbiAgICAgIGxheWVyOiBkdW1teVN0eWxlW3R5cF0sXG4gICAgICBnZW9qc29uIDogZ0pzb25cbiAgICB9KTtcbiAgfVxuXG4gIGNhdGNoKGVycikge1xuICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgcHJvZ3Jlc3M6IDEwMCxcbiAgICAgIGVycm9yTWVzc2FnZSA6IFwiQW4gZXJyb3Igb2NjdXJlZCwgY2hlY2sgdGhlIGNvbnNvbGVcIlxuICAgIH0pO1xuICB9XG59O1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvanMvbXhfaGVscGVyX21hcF9kcmFnZHJvcC53b3JrZXIuanMiLCJ2YXIganNvbmxpbnQgPSByZXF1aXJlKCdqc29ubGludC1saW5lcycpLFxuICBnZW9qc29uSGludE9iamVjdCA9IHJlcXVpcmUoJy4vb2JqZWN0Jyk7XG5cbi8qKlxuICogQGFsaWFzIGdlb2pzb25oaW50XG4gKiBAcGFyYW0geyhzdHJpbmd8b2JqZWN0KX0gR2VvSlNPTiBnaXZlbiBhcyBhIHN0cmluZyBvciBhcyBhbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLm5vRHVwbGljYXRlTWVtYmVycz10cnVlXSBmb3JiaWQgcmVwZWF0ZWRcbiAqIHByb3BlcnRpZXMuIFRoaXMgaXMgb25seSBhdmFpbGFibGUgZm9yIHN0cmluZyBpbnB1dCwgYmVjYXVzZWQgcGFyc2VkXG4gKiBPYmplY3RzIGNhbm5vdCBoYXZlIGR1cGxpY2F0ZSBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5wcmVjaXNpb25XYXJuaW5nPXRydWVdIHdhcm4gaWYgR2VvSlNPTiBjb250YWluc1xuICogdW5uZWNlc3NhcnkgY29vcmRpbmF0ZSBwcmVjaXNpb24uXG4gKiBAcmV0dXJucyB7QXJyYXk8T2JqZWN0Pn0gYW4gYXJyYXkgb2YgZXJyb3JzXG4gKi9cbmZ1bmN0aW9uIGhpbnQoc3RyLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgZ2osIGVycm9ycyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBzdHIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGdqID0gc3RyO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHN0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGdqID0ganNvbmxpbnQucGFyc2Uoc3RyKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBlLm1lc3NhZ2UubWF0Y2goL2xpbmUgKFxcZCspLyk7XG4gICAgICAgICAgICB2YXIgbGluZU51bWJlciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XG4gICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyIC0gMSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgIH1dO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICBtZXNzYWdlOiAnRXhwZWN0ZWQgc3RyaW5nIG9yIG9iamVjdCBhcyBpbnB1dCcsXG4gICAgICAgICAgICBsaW5lOiAwXG4gICAgICAgIH1dO1xuICAgIH1cblxuICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQoZ2VvanNvbkhpbnRPYmplY3QuaGludChnaiwgb3B0aW9ucykpO1xuXG4gICAgcmV0dXJuIGVycm9ycztcbn1cblxubW9kdWxlLmV4cG9ydHMuaGludCA9IGhpbnQ7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9nZW9qc29uaGludC9saWIvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDI0OFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKiBwYXJzZXIgZ2VuZXJhdGVkIGJ5IGppc29uIDAuNC4xNyAqL1xuLypcbiAgUmV0dXJucyBhIFBhcnNlciBvYmplY3Qgb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG5cbiAgUGFyc2VyOiB7XG4gICAgeXk6IHt9XG4gIH1cblxuICBQYXJzZXIucHJvdG90eXBlOiB7XG4gICAgeXk6IHt9LFxuICAgIHRyYWNlOiBmdW5jdGlvbigpLFxuICAgIHN5bWJvbHNfOiB7YXNzb2NpYXRpdmUgbGlzdDogbmFtZSA9PT4gbnVtYmVyfSxcbiAgICB0ZXJtaW5hbHNfOiB7YXNzb2NpYXRpdmUgbGlzdDogbnVtYmVyID09PiBuYW1lfSxcbiAgICBwcm9kdWN0aW9uc186IFsuLi5dLFxuICAgIHBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHl5LCB5eXN0YXRlLCAkJCwgXyQpLFxuICAgIHRhYmxlOiBbLi4uXSxcbiAgICBkZWZhdWx0QWN0aW9uczogey4uLn0sXG4gICAgcGFyc2VFcnJvcjogZnVuY3Rpb24oc3RyLCBoYXNoKSxcbiAgICBwYXJzZTogZnVuY3Rpb24oaW5wdXQpLFxuXG4gICAgbGV4ZXI6IHtcbiAgICAgICAgRU9GOiAxLFxuICAgICAgICBwYXJzZUVycm9yOiBmdW5jdGlvbihzdHIsIGhhc2gpLFxuICAgICAgICBzZXRJbnB1dDogZnVuY3Rpb24oaW5wdXQpLFxuICAgICAgICBpbnB1dDogZnVuY3Rpb24oKSxcbiAgICAgICAgdW5wdXQ6IGZ1bmN0aW9uKHN0ciksXG4gICAgICAgIG1vcmU6IGZ1bmN0aW9uKCksXG4gICAgICAgIGxlc3M6IGZ1bmN0aW9uKG4pLFxuICAgICAgICBwYXN0SW5wdXQ6IGZ1bmN0aW9uKCksXG4gICAgICAgIHVwY29taW5nSW5wdXQ6IGZ1bmN0aW9uKCksXG4gICAgICAgIHNob3dQb3NpdGlvbjogZnVuY3Rpb24oKSxcbiAgICAgICAgdGVzdF9tYXRjaDogZnVuY3Rpb24ocmVnZXhfbWF0Y2hfYXJyYXksIHJ1bGVfaW5kZXgpLFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpLFxuICAgICAgICBsZXg6IGZ1bmN0aW9uKCksXG4gICAgICAgIGJlZ2luOiBmdW5jdGlvbihjb25kaXRpb24pLFxuICAgICAgICBwb3BTdGF0ZTogZnVuY3Rpb24oKSxcbiAgICAgICAgX2N1cnJlbnRSdWxlczogZnVuY3Rpb24oKSxcbiAgICAgICAgdG9wU3RhdGU6IGZ1bmN0aW9uKCksXG4gICAgICAgIHB1c2hTdGF0ZTogZnVuY3Rpb24oY29uZGl0aW9uKSxcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICByYW5nZXM6IGJvb2xlYW4gICAgICAgICAgIChvcHRpb25hbDogdHJ1ZSA9PT4gdG9rZW4gbG9jYXRpb24gaW5mbyB3aWxsIGluY2x1ZGUgYSAucmFuZ2VbXSBtZW1iZXIpXG4gICAgICAgICAgICBmbGV4OiBib29sZWFuICAgICAgICAgICAgIChvcHRpb25hbDogdHJ1ZSA9PT4gZmxleC1saWtlIGxleGluZyBiZWhhdmlvdXIgd2hlcmUgdGhlIHJ1bGVzIGFyZSB0ZXN0ZWQgZXhoYXVzdGl2ZWx5IHRvIGZpbmQgdGhlIGxvbmdlc3QgbWF0Y2gpXG4gICAgICAgICAgICBiYWNrdHJhY2tfbGV4ZXI6IGJvb2xlYW4gIChvcHRpb25hbDogdHJ1ZSA9PT4gbGV4ZXIgcmVnZXhlcyBhcmUgdGVzdGVkIGluIG9yZGVyIGFuZCBmb3IgZWFjaCBtYXRjaGluZyByZWdleCB0aGUgYWN0aW9uIGNvZGUgaXMgaW52b2tlZDsgdGhlIGxleGVyIHRlcm1pbmF0ZXMgdGhlIHNjYW4gd2hlbiBhIHRva2VuIGlzIHJldHVybmVkIGJ5IHRoZSBhY3Rpb24gY29kZSlcbiAgICAgICAgfSxcblxuICAgICAgICBwZXJmb3JtQWN0aW9uOiBmdW5jdGlvbih5eSwgeXlfLCAkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zLCBZWV9TVEFSVCksXG4gICAgICAgIHJ1bGVzOiBbLi4uXSxcbiAgICAgICAgY29uZGl0aW9uczoge2Fzc29jaWF0aXZlIGxpc3Q6IG5hbWUgPT0+IHNldH0sXG4gICAgfVxuICB9XG5cblxuICB0b2tlbiBsb2NhdGlvbiBpbmZvIChAJCwgXyQsIGV0Yy4pOiB7XG4gICAgZmlyc3RfbGluZTogbixcbiAgICBsYXN0X2xpbmU6IG4sXG4gICAgZmlyc3RfY29sdW1uOiBuLFxuICAgIGxhc3RfY29sdW1uOiBuLFxuICAgIHJhbmdlOiBbc3RhcnRfbnVtYmVyLCBlbmRfbnVtYmVyXSAgICAgICAod2hlcmUgdGhlIG51bWJlcnMgYXJlIGluZGV4ZXMgaW50byB0aGUgaW5wdXQgc3RyaW5nLCByZWd1bGFyIHplcm8tYmFzZWQpXG4gIH1cblxuXG4gIHRoZSBwYXJzZUVycm9yIGZ1bmN0aW9uIHJlY2VpdmVzIGEgJ2hhc2gnIG9iamVjdCB3aXRoIHRoZXNlIG1lbWJlcnMgZm9yIGxleGVyIGFuZCBwYXJzZXIgZXJyb3JzOiB7XG4gICAgdGV4dDogICAgICAgIChtYXRjaGVkIHRleHQpXG4gICAgdG9rZW46ICAgICAgICh0aGUgcHJvZHVjZWQgdGVybWluYWwgdG9rZW4sIGlmIGFueSlcbiAgICBsaW5lOiAgICAgICAgKHl5bGluZW5vKVxuICB9XG4gIHdoaWxlIHBhcnNlciAoZ3JhbW1hcikgZXJyb3JzIHdpbGwgYWxzbyBwcm92aWRlIHRoZXNlIG1lbWJlcnMsIGkuZS4gcGFyc2VyIGVycm9ycyBkZWxpdmVyIGEgc3VwZXJzZXQgb2YgYXR0cmlidXRlczoge1xuICAgIGxvYzogICAgICAgICAoeXlsbG9jKVxuICAgIGV4cGVjdGVkOiAgICAoc3RyaW5nIGRlc2NyaWJpbmcgdGhlIHNldCBvZiBleHBlY3RlZCB0b2tlbnMpXG4gICAgcmVjb3ZlcmFibGU6IChib29sZWFuOiBUUlVFIHdoZW4gdGhlIHBhcnNlciBoYXMgYSBlcnJvciByZWNvdmVyeSBydWxlIGF2YWlsYWJsZSBmb3IgdGhpcyBwYXJ0aWN1bGFyIGVycm9yKVxuICB9XG4qL1xudmFyIGpzb25saW50ID0gKGZ1bmN0aW9uKCl7XG52YXIgbz1mdW5jdGlvbihrLHYsbyxsKXtmb3Iobz1vfHx7fSxsPWsubGVuZ3RoO2wtLTtvW2tbbF1dPXYpO3JldHVybiBvfSwkVjA9WzEsMTJdLCRWMT1bMSwxM10sJFYyPVsxLDldLCRWMz1bMSwxMF0sJFY0PVsxLDExXSwkVjU9WzEsMTRdLCRWNj1bMSwxNV0sJFY3PVsxNCwxOCwyMiwyNF0sJFY4PVsxOCwyMl0sJFY5PVsyMiwyNF07XG52YXIgcGFyc2VyID0ge3RyYWNlOiBmdW5jdGlvbiB0cmFjZSgpIHsgfSxcbnl5OiB7fSxcbnN5bWJvbHNfOiB7XCJlcnJvclwiOjIsXCJKU09OU3RyaW5nXCI6MyxcIlNUUklOR1wiOjQsXCJKU09OTnVtYmVyXCI6NSxcIk5VTUJFUlwiOjYsXCJKU09OTnVsbExpdGVyYWxcIjo3LFwiTlVMTFwiOjgsXCJKU09OQm9vbGVhbkxpdGVyYWxcIjo5LFwiVFJVRVwiOjEwLFwiRkFMU0VcIjoxMSxcIkpTT05UZXh0XCI6MTIsXCJKU09OVmFsdWVcIjoxMyxcIkVPRlwiOjE0LFwiSlNPTk9iamVjdFwiOjE1LFwiSlNPTkFycmF5XCI6MTYsXCJ7XCI6MTcsXCJ9XCI6MTgsXCJKU09OTWVtYmVyTGlzdFwiOjE5LFwiSlNPTk1lbWJlclwiOjIwLFwiOlwiOjIxLFwiLFwiOjIyLFwiW1wiOjIzLFwiXVwiOjI0LFwiSlNPTkVsZW1lbnRMaXN0XCI6MjUsXCIkYWNjZXB0XCI6MCxcIiRlbmRcIjoxfSxcbnRlcm1pbmFsc186IHsyOlwiZXJyb3JcIiw0OlwiU1RSSU5HXCIsNjpcIk5VTUJFUlwiLDg6XCJOVUxMXCIsMTA6XCJUUlVFXCIsMTE6XCJGQUxTRVwiLDE0OlwiRU9GXCIsMTc6XCJ7XCIsMTg6XCJ9XCIsMjE6XCI6XCIsMjI6XCIsXCIsMjM6XCJbXCIsMjQ6XCJdXCJ9LFxucHJvZHVjdGlvbnNfOiBbMCxbMywxXSxbNSwxXSxbNywxXSxbOSwxXSxbOSwxXSxbMTIsMl0sWzEzLDFdLFsxMywxXSxbMTMsMV0sWzEzLDFdLFsxMywxXSxbMTMsMV0sWzE1LDJdLFsxNSwzXSxbMjAsM10sWzE5LDFdLFsxOSwzXSxbMTYsMl0sWzE2LDNdLFsyNSwxXSxbMjUsM11dLFxucGVyZm9ybUFjdGlvbjogZnVuY3Rpb24gYW5vbnltb3VzKHl5dGV4dCwgeXlsZW5nLCB5eWxpbmVubywgeXksIHl5c3RhdGUgLyogYWN0aW9uWzFdICovLCAkJCAvKiB2c3RhY2sgKi8sIF8kIC8qIGxzdGFjayAqLykge1xuLyogdGhpcyA9PSB5eXZhbCAqL1xuXG52YXIgJDAgPSAkJC5sZW5ndGggLSAxO1xuc3dpdGNoICh5eXN0YXRlKSB7XG5jYXNlIDE6XG4gLy8gcmVwbGFjZSBlc2NhcGVkIGNoYXJhY3RlcnMgd2l0aCBhY3R1YWwgY2hhcmFjdGVyXG4gICAgICAgICAgdGhpcy4kID0geXl0ZXh0LnJlcGxhY2UoL1xcXFwoXFxcXHxcIikvZywgXCIkXCIrXCIxXCIpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXG4vZywnXFxuJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcci9nLCdcXHInKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFx0L2csJ1xcdCcpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXHYvZywnXFx2JylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcZi9nLCdcXGYnKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxiL2csJ1xcYicpO1xuICAgICAgICBcbmJyZWFrO1xuY2FzZSAyOlxudGhpcy4kID0gTnVtYmVyKHl5dGV4dCk7XG5icmVhaztcbmNhc2UgMzpcbnRoaXMuJCA9IG51bGw7XG5icmVhaztcbmNhc2UgNDpcbnRoaXMuJCA9IHRydWU7XG5icmVhaztcbmNhc2UgNTpcbnRoaXMuJCA9IGZhbHNlO1xuYnJlYWs7XG5jYXNlIDY6XG5yZXR1cm4gdGhpcy4kID0gJCRbJDAtMV07XG5icmVhaztcbmNhc2UgMTM6XG50aGlzLiQgPSB7fTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuJCwgJ19fbGluZV9fJywge1xuICAgICAgICAgICAgdmFsdWU6IHRoaXMuXyQuZmlyc3RfbGluZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH0pXG5icmVhaztcbmNhc2UgMTQ6IGNhc2UgMTk6XG50aGlzLiQgPSAkJFskMC0xXTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuJCwgJ19fbGluZV9fJywge1xuICAgICAgICAgICAgdmFsdWU6IHRoaXMuXyQuZmlyc3RfbGluZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH0pXG5icmVhaztcbmNhc2UgMTU6XG50aGlzLiQgPSBbJCRbJDAtMl0sICQkWyQwXV07XG5icmVhaztcbmNhc2UgMTY6XG50aGlzLiQgPSB7fTsgdGhpcy4kWyQkWyQwXVswXV0gPSAkJFskMF1bMV07XG5icmVhaztcbmNhc2UgMTc6XG5cbiAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwLTJdO1xuICAgICAgICAgICAgaWYgKCQkWyQwLTJdWyQkWyQwXVswXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kLl9fZHVwbGljYXRlUHJvcGVydGllc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2R1cGxpY2F0ZVByb3BlcnRpZXNfXycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLiQuX19kdXBsaWNhdGVQcm9wZXJ0aWVzX18ucHVzaCgkJFskMF1bMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCRbJDAtMl1bJCRbJDBdWzBdXSA9ICQkWyQwXVsxXTtcbiAgICAgICAgXG5icmVhaztcbmNhc2UgMTg6XG50aGlzLiQgPSBbXTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuJCwgJ19fbGluZV9fJywge1xuICAgICAgICAgICAgdmFsdWU6IHRoaXMuXyQuZmlyc3RfbGluZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH0pXG5icmVhaztcbmNhc2UgMjA6XG50aGlzLiQgPSBbJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSAyMTpcbnRoaXMuJCA9ICQkWyQwLTJdOyAkJFskMC0yXS5wdXNoKCQkWyQwXSk7XG5icmVhaztcbn1cbn0sXG50YWJsZTogW3szOjUsNDokVjAsNTo2LDY6JFYxLDc6Myw4OiRWMiw5OjQsMTA6JFYzLDExOiRWNCwxMjoxLDEzOjIsMTU6NywxNjo4LDE3OiRWNSwyMzokVjZ9LHsxOlszXX0sezE0OlsxLDE2XX0sbygkVjcsWzIsN10pLG8oJFY3LFsyLDhdKSxvKCRWNyxbMiw5XSksbygkVjcsWzIsMTBdKSxvKCRWNyxbMiwxMV0pLG8oJFY3LFsyLDEyXSksbygkVjcsWzIsM10pLG8oJFY3LFsyLDRdKSxvKCRWNyxbMiw1XSksbyhbMTQsMTgsMjEsMjIsMjRdLFsyLDFdKSxvKCRWNyxbMiwyXSksezM6MjAsNDokVjAsMTg6WzEsMTddLDE5OjE4LDIwOjE5fSx7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTM6MjMsMTU6NywxNjo4LDE3OiRWNSwyMzokVjYsMjQ6WzEsMjFdLDI1OjIyfSx7MTpbMiw2XX0sbygkVjcsWzIsMTNdKSx7MTg6WzEsMjRdLDIyOlsxLDI1XX0sbygkVjgsWzIsMTZdKSx7MjE6WzEsMjZdfSxvKCRWNyxbMiwxOF0pLHsyMjpbMSwyOF0sMjQ6WzEsMjddfSxvKCRWOSxbMiwyMF0pLG8oJFY3LFsyLDE0XSksezM6MjAsNDokVjAsMjA6Mjl9LHszOjUsNDokVjAsNTo2LDY6JFYxLDc6Myw4OiRWMiw5OjQsMTA6JFYzLDExOiRWNCwxMzozMCwxNTo3LDE2OjgsMTc6JFY1LDIzOiRWNn0sbygkVjcsWzIsMTldKSx7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTM6MzEsMTU6NywxNjo4LDE3OiRWNSwyMzokVjZ9LG8oJFY4LFsyLDE3XSksbygkVjgsWzIsMTVdKSxvKCRWOSxbMiwyMV0pXSxcbmRlZmF1bHRBY3Rpb25zOiB7MTY6WzIsNl19LFxucGFyc2VFcnJvcjogZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICBpZiAoaGFzaC5yZWNvdmVyYWJsZSkge1xuICAgICAgICB0aGlzLnRyYWNlKHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnVuY3Rpb24gX3BhcnNlRXJyb3IgKG1zZywgaGFzaCkge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbXNnO1xuICAgICAgICAgICAgdGhpcy5oYXNoID0gaGFzaDtcbiAgICAgICAgfVxuICAgICAgICBfcGFyc2VFcnJvci5wcm90b3R5cGUgPSBFcnJvcjtcblxuICAgICAgICB0aHJvdyBuZXcgX3BhcnNlRXJyb3Ioc3RyLCBoYXNoKTtcbiAgICB9XG59LFxucGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLCBzdGFjayA9IFswXSwgdHN0YWNrID0gW10sIHZzdGFjayA9IFtudWxsXSwgbHN0YWNrID0gW10sIHRhYmxlID0gdGhpcy50YWJsZSwgeXl0ZXh0ID0gJycsIHl5bGluZW5vID0gMCwgeXlsZW5nID0gMCwgcmVjb3ZlcmluZyA9IDAsIFRFUlJPUiA9IDIsIEVPRiA9IDE7XG4gICAgdmFyIGFyZ3MgPSBsc3RhY2suc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHZhciBsZXhlciA9IE9iamVjdC5jcmVhdGUodGhpcy5sZXhlcik7XG4gICAgdmFyIHNoYXJlZFN0YXRlID0geyB5eToge30gfTtcbiAgICBmb3IgKHZhciBrIGluIHRoaXMueXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLnl5LCBrKSkge1xuICAgICAgICAgICAgc2hhcmVkU3RhdGUueXlba10gPSB0aGlzLnl5W2tdO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxleGVyLnNldElucHV0KGlucHV0LCBzaGFyZWRTdGF0ZS55eSk7XG4gICAgc2hhcmVkU3RhdGUueXkubGV4ZXIgPSBsZXhlcjtcbiAgICBzaGFyZWRTdGF0ZS55eS5wYXJzZXIgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgbGV4ZXIueXlsbG9jID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxleGVyLnl5bGxvYyA9IHt9O1xuICAgIH1cbiAgICB2YXIgeXlsb2MgPSBsZXhlci55eWxsb2M7XG4gICAgbHN0YWNrLnB1c2goeXlsb2MpO1xuICAgIHZhciByYW5nZXMgPSBsZXhlci5vcHRpb25zICYmIGxleGVyLm9wdGlvbnMucmFuZ2VzO1xuICAgIGlmICh0eXBlb2Ygc2hhcmVkU3RhdGUueXkucGFyc2VFcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSBzaGFyZWRTdGF0ZS55eS5wYXJzZUVycm9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGFyc2VFcnJvciA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5wYXJzZUVycm9yO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwb3BTdGFjayhuKSB7XG4gICAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDIgKiBuO1xuICAgICAgICB2c3RhY2subGVuZ3RoID0gdnN0YWNrLmxlbmd0aCAtIG47XG4gICAgICAgIGxzdGFjay5sZW5ndGggPSBsc3RhY2subGVuZ3RoIC0gbjtcbiAgICB9XG4gICAgX3Rva2VuX3N0YWNrOlxuICAgICAgICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRva2VuO1xuICAgICAgICAgICAgdG9rZW4gPSBsZXhlci5sZXgoKSB8fCBFT0Y7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHRva2VuID0gc2VsZi5zeW1ib2xzX1t0b2tlbl0gfHwgdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH07XG4gICAgdmFyIHN5bWJvbCwgcHJlRXJyb3JTeW1ib2wsIHN0YXRlLCBhY3Rpb24sIGEsIHIsIHl5dmFsID0ge30sIHAsIGxlbiwgbmV3U3RhdGUsIGV4cGVjdGVkO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHN0YXRlID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXSkge1xuICAgICAgICAgICAgYWN0aW9uID0gdGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHR5cGVvZiBzeW1ib2wgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbiA9IHRhYmxlW3N0YXRlXSAmJiB0YWJsZVtzdGF0ZV1bc3ltYm9sXTtcbiAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ3VuZGVmaW5lZCcgfHwgIWFjdGlvbi5sZW5ndGggfHwgIWFjdGlvblswXSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJTdHIgPSAnJztcbiAgICAgICAgICAgICAgICBleHBlY3RlZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAocCBpbiB0YWJsZVtzdGF0ZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVybWluYWxzX1twXSAmJiBwID4gVEVSUk9SKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZC5wdXNoKCdcXCcnICsgdGhpcy50ZXJtaW5hbHNfW3BdICsgJ1xcJycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsZXhlci5zaG93UG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gJ1BhcnNlIGVycm9yIG9uIGxpbmUgJyArICh5eWxpbmVubyArIDEpICsgJzpcXG4nICsgbGV4ZXIuc2hvd1Bvc2l0aW9uKCkgKyAnXFxuRXhwZWN0aW5nICcgKyBleHBlY3RlZC5qb2luKCcsICcpICsgJywgZ290IFxcJycgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArICdcXCcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9ICdQYXJzZSBlcnJvciBvbiBsaW5lICcgKyAoeXlsaW5lbm8gKyAxKSArICc6IFVuZXhwZWN0ZWQgJyArIChzeW1ib2wgPT0gRU9GID8gJ2VuZCBvZiBpbnB1dCcgOiAnXFwnJyArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgJ1xcJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnBhcnNlRXJyb3IoZXJyU3RyLCB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGxleGVyLm1hdGNoLFxuICAgICAgICAgICAgICAgICAgICB0b2tlbjogdGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBsZXhlci55eWxpbmVubyxcbiAgICAgICAgICAgICAgICAgICAgbG9jOiB5eWxvYyxcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIGlmIChhY3Rpb25bMF0gaW5zdGFuY2VvZiBBcnJheSAmJiBhY3Rpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogJyArIHN0YXRlICsgJywgdG9rZW46ICcgKyBzeW1ib2wpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uWzBdKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHN0YWNrLnB1c2goc3ltYm9sKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKGxleGVyLnl5dGV4dCk7XG4gICAgICAgICAgICBsc3RhY2sucHVzaChsZXhlci55eWxsb2MpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChhY3Rpb25bMV0pO1xuICAgICAgICAgICAgc3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghcHJlRXJyb3JTeW1ib2wpIHtcbiAgICAgICAgICAgICAgICB5eWxlbmcgPSBsZXhlci55eWxlbmc7XG4gICAgICAgICAgICAgICAgeXl0ZXh0ID0gbGV4ZXIueXl0ZXh0O1xuICAgICAgICAgICAgICAgIHl5bGluZW5vID0gbGV4ZXIueXlsaW5lbm87XG4gICAgICAgICAgICAgICAgeXlsb2MgPSBsZXhlci55eWxsb2M7XG4gICAgICAgICAgICAgICAgaWYgKHJlY292ZXJpbmcgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJpbmctLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHByZUVycm9yU3ltYm9sO1xuICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBsZW4gPSB0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzFdO1xuICAgICAgICAgICAgeXl2YWwuJCA9IHZzdGFja1t2c3RhY2subGVuZ3RoIC0gbGVuXTtcbiAgICAgICAgICAgIHl5dmFsLl8kID0ge1xuICAgICAgICAgICAgICAgIGZpcnN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfbGluZSxcbiAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9jb2x1bW4sXG4gICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9jb2x1bW5cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAocmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgeXl2YWwuXyQucmFuZ2UgPSBbXG4gICAgICAgICAgICAgICAgICAgIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0ucmFuZ2VbMF0sXG4gICAgICAgICAgICAgICAgICAgIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ucmFuZ2VbMV1cbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgciA9IHRoaXMucGVyZm9ybUFjdGlvbi5hcHBseSh5eXZhbCwgW1xuICAgICAgICAgICAgICAgIHl5dGV4dCxcbiAgICAgICAgICAgICAgICB5eWxlbmcsXG4gICAgICAgICAgICAgICAgeXlsaW5lbm8sXG4gICAgICAgICAgICAgICAgc2hhcmVkU3RhdGUueXksXG4gICAgICAgICAgICAgICAgYWN0aW9uWzFdLFxuICAgICAgICAgICAgICAgIHZzdGFjayxcbiAgICAgICAgICAgICAgICBsc3RhY2tcbiAgICAgICAgICAgIF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZW4pIHtcbiAgICAgICAgICAgICAgICBzdGFjayA9IHN0YWNrLnNsaWNlKDAsIC0xICogbGVuICogMik7XG4gICAgICAgICAgICAgICAgdnN0YWNrID0gdnN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgICAgICBsc3RhY2sgPSBsc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhY2sucHVzaCh0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzBdKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHl5dmFsLiQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2goeXl2YWwuXyQpO1xuICAgICAgICAgICAgbmV3U3RhdGUgPSB0YWJsZVtzdGFja1tzdGFjay5sZW5ndGggLSAyXV1bc3RhY2tbc3RhY2subGVuZ3RoIC0gMV1dO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXdTdGF0ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59fTtcbi8qIGdlbmVyYXRlZCBieSBqaXNvbi1sZXggMC4zLjQgKi9cbnZhciBsZXhlciA9IChmdW5jdGlvbigpe1xudmFyIGxleGVyID0gKHtcblxuRU9GOjEsXG5cbnBhcnNlRXJyb3I6ZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICAgICAgaWYgKHRoaXMueXkucGFyc2VyKSB7XG4gICAgICAgICAgICB0aGlzLnl5LnBhcnNlci5wYXJzZUVycm9yKHN0ciwgaGFzaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHJlc2V0cyB0aGUgbGV4ZXIsIHNldHMgbmV3IGlucHV0XG5zZXRJbnB1dDpmdW5jdGlvbiAoaW5wdXQsIHl5KSB7XG4gICAgICAgIHRoaXMueXkgPSB5eSB8fCB0aGlzLnl5IHx8IHt9O1xuICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xuICAgICAgICB0aGlzLl9tb3JlID0gdGhpcy5fYmFja3RyYWNrID0gdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIHRoaXMueXlsaW5lbm8gPSB0aGlzLnl5bGVuZyA9IDA7XG4gICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrID0gWydJTklUSUFMJ107XG4gICAgICAgIHRoaXMueXlsbG9jID0ge1xuICAgICAgICAgICAgZmlyc3RfbGluZTogMSxcbiAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogMCxcbiAgICAgICAgICAgIGxhc3RfbGluZTogMSxcbiAgICAgICAgICAgIGxhc3RfY29sdW1uOiAwXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFswLDBdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuLy8gY29uc3VtZXMgYW5kIHJldHVybnMgb25lIGNoYXIgZnJvbSB0aGUgaW5wdXRcbmlucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoID0gdGhpcy5faW5wdXRbMF07XG4gICAgICAgIHRoaXMueXl0ZXh0ICs9IGNoO1xuICAgICAgICB0aGlzLnl5bGVuZysrO1xuICAgICAgICB0aGlzLm9mZnNldCsrO1xuICAgICAgICB0aGlzLm1hdGNoICs9IGNoO1xuICAgICAgICB0aGlzLm1hdGNoZWQgKz0gY2g7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgaWYgKGxpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGluZW5vKys7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2xpbmUrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlWzFdKys7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKDEpO1xuICAgICAgICByZXR1cm4gY2g7XG4gICAgfSxcblxuLy8gdW5zaGlmdHMgb25lIGNoYXIgKG9yIGEgc3RyaW5nKSBpbnRvIHRoZSBpbnB1dFxudW5wdXQ6ZnVuY3Rpb24gKGNoKSB7XG4gICAgICAgIHZhciBsZW4gPSBjaC5sZW5ndGg7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSBjaCArIHRoaXMuX2lucHV0O1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMueXl0ZXh0LnN1YnN0cigwLCB0aGlzLnl5dGV4dC5sZW5ndGggLSBsZW4pO1xuICAgICAgICAvL3RoaXMueXlsZW5nIC09IGxlbjtcbiAgICAgICAgdGhpcy5vZmZzZXQgLT0gbGVuO1xuICAgICAgICB2YXIgb2xkTGluZXMgPSB0aGlzLm1hdGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG4gICAgICAgIHRoaXMubWF0Y2ggPSB0aGlzLm1hdGNoLnN1YnN0cigwLCB0aGlzLm1hdGNoLmxlbmd0aCAtIDEpO1xuICAgICAgICB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoZWQuc3Vic3RyKDAsIHRoaXMubWF0Y2hlZC5sZW5ndGggLSAxKTtcblxuICAgICAgICBpZiAobGluZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgdGhpcy55eWxpbmVubyAtPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgICAgICB9XG4gICAgICAgIHZhciByID0gdGhpcy55eWxsb2MucmFuZ2U7XG5cbiAgICAgICAgdGhpcy55eWxsb2MgPSB7XG4gICAgICAgICAgICBmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5maXJzdF9saW5lLFxuICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vICsgMSxcbiAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxuICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID9cbiAgICAgICAgICAgICAgICAobGluZXMubGVuZ3RoID09PSBvbGRMaW5lcy5sZW5ndGggPyB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gOiAwKVxuICAgICAgICAgICAgICAgICArIG9sZExpbmVzW29sZExpbmVzLmxlbmd0aCAtIGxpbmVzLmxlbmd0aF0ubGVuZ3RoIC0gbGluZXNbMF0ubGVuZ3RoIDpcbiAgICAgICAgICAgICAgdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIC0gbGVuXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3JbMF0sIHJbMF0gKyB0aGlzLnl5bGVuZyAtIGxlbl07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy55eWxlbmcgPSB0aGlzLnl5dGV4dC5sZW5ndGg7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbi8vIFdoZW4gY2FsbGVkIGZyb20gYWN0aW9uLCBjYWNoZXMgbWF0Y2hlZCB0ZXh0IGFuZCBhcHBlbmRzIGl0IG9uIG5leHQgYWN0aW9uXG5tb3JlOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbi8vIFdoZW4gY2FsbGVkIGZyb20gYWN0aW9uLCBzaWduYWxzIHRoZSBsZXhlciB0aGF0IHRoaXMgcnVsZSBmYWlscyB0byBtYXRjaCB0aGUgaW5wdXQsIHNvIHRoZSBuZXh0IG1hdGNoaW5nIHJ1bGUgKHJlZ2V4KSBzaG91bGQgYmUgdGVzdGVkIGluc3RlYWQuXG5yZWplY3Q6ZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmJhY2t0cmFja19sZXhlcikge1xuICAgICAgICAgICAgdGhpcy5fYmFja3RyYWNrID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoJ0xleGljYWwgZXJyb3Igb24gbGluZSAnICsgKHRoaXMueXlsaW5lbm8gKyAxKSArICcuIFlvdSBjYW4gb25seSBpbnZva2UgcmVqZWN0KCkgaW4gdGhlIGxleGVyIHdoZW4gdGhlIGxleGVyIGlzIG9mIHRoZSBiYWNrdHJhY2tpbmcgcGVyc3Vhc2lvbiAob3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIgPSB0cnVlKS5cXG4nICsgdGhpcy5zaG93UG9zaXRpb24oKSwge1xuICAgICAgICAgICAgICAgIHRleHQ6IFwiXCIsXG4gICAgICAgICAgICAgICAgdG9rZW46IG51bGwsXG4gICAgICAgICAgICAgICAgbGluZTogdGhpcy55eWxpbmVub1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4vLyByZXRhaW4gZmlyc3QgbiBjaGFyYWN0ZXJzIG9mIHRoZSBtYXRjaFxubGVzczpmdW5jdGlvbiAobikge1xuICAgICAgICB0aGlzLnVucHV0KHRoaXMubWF0Y2guc2xpY2UobikpO1xuICAgIH0sXG5cbi8vIGRpc3BsYXlzIGFscmVhZHkgbWF0Y2hlZCBpbnB1dCwgaS5lLiBmb3IgZXJyb3IgbWVzc2FnZXNcbnBhc3RJbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXN0ID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gdGhpcy5tYXRjaC5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gKHBhc3QubGVuZ3RoID4gMjAgPyAnLi4uJzonJykgKyBwYXN0LnN1YnN0cigtMjApLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxuXG4vLyBkaXNwbGF5cyB1cGNvbWluZyBpbnB1dCwgaS5lLiBmb3IgZXJyb3IgbWVzc2FnZXNcbnVwY29taW5nSW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV4dCA9IHRoaXMubWF0Y2g7XG4gICAgICAgIGlmIChuZXh0Lmxlbmd0aCA8IDIwKSB7XG4gICAgICAgICAgICBuZXh0ICs9IHRoaXMuX2lucHV0LnN1YnN0cigwLCAyMC1uZXh0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChuZXh0LnN1YnN0cigwLDIwKSArIChuZXh0Lmxlbmd0aCA+IDIwID8gJy4uLicgOiAnJykpLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxuXG4vLyBkaXNwbGF5cyB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uIHdoZXJlIHRoZSBsZXhpbmcgZXJyb3Igb2NjdXJyZWQsIGkuZS4gZm9yIGVycm9yIG1lc3NhZ2VzXG5zaG93UG9zaXRpb246ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJlID0gdGhpcy5wYXN0SW5wdXQoKTtcbiAgICAgICAgdmFyIGMgPSBuZXcgQXJyYXkocHJlLmxlbmd0aCArIDEpLmpvaW4oXCItXCIpO1xuICAgICAgICByZXR1cm4gcHJlICsgdGhpcy51cGNvbWluZ0lucHV0KCkgKyBcIlxcblwiICsgYyArIFwiXlwiO1xuICAgIH0sXG5cbi8vIHRlc3QgdGhlIGxleGVkIHRva2VuOiByZXR1cm4gRkFMU0Ugd2hlbiBub3QgYSBtYXRjaCwgb3RoZXJ3aXNlIHJldHVybiB0b2tlblxudGVzdF9tYXRjaDpmdW5jdGlvbiAobWF0Y2gsIGluZGV4ZWRfcnVsZSkge1xuICAgICAgICB2YXIgdG9rZW4sXG4gICAgICAgICAgICBsaW5lcyxcbiAgICAgICAgICAgIGJhY2t1cDtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmJhY2t0cmFja19sZXhlcikge1xuICAgICAgICAgICAgLy8gc2F2ZSBjb250ZXh0XG4gICAgICAgICAgICBiYWNrdXAgPSB7XG4gICAgICAgICAgICAgICAgeXlsaW5lbm86IHRoaXMueXlsaW5lbm8sXG4gICAgICAgICAgICAgICAgeXlsbG9jOiB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy5sYXN0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbHVtbjogdGhpcy55eWxsb2MubGFzdF9jb2x1bW5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHl5dGV4dDogdGhpcy55eXRleHQsXG4gICAgICAgICAgICAgICAgbWF0Y2g6IHRoaXMubWF0Y2gsXG4gICAgICAgICAgICAgICAgbWF0Y2hlczogdGhpcy5tYXRjaGVzLFxuICAgICAgICAgICAgICAgIG1hdGNoZWQ6IHRoaXMubWF0Y2hlZCxcbiAgICAgICAgICAgICAgICB5eWxlbmc6IHRoaXMueXlsZW5nLFxuICAgICAgICAgICAgICAgIG9mZnNldDogdGhpcy5vZmZzZXQsXG4gICAgICAgICAgICAgICAgX21vcmU6IHRoaXMuX21vcmUsXG4gICAgICAgICAgICAgICAgX2lucHV0OiB0aGlzLl9pbnB1dCxcbiAgICAgICAgICAgICAgICB5eTogdGhpcy55eSxcbiAgICAgICAgICAgICAgICBjb25kaXRpb25TdGFjazogdGhpcy5jb25kaXRpb25TdGFjay5zbGljZSgwKSxcbiAgICAgICAgICAgICAgICBkb25lOiB0aGlzLmRvbmVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgICAgIGJhY2t1cC55eWxsb2MucmFuZ2UgPSB0aGlzLnl5bGxvYy5yYW5nZS5zbGljZSgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxpbmVzID0gbWF0Y2hbMF0ubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICBpZiAobGluZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsaW5lbm8gKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueXlsbG9jID0ge1xuICAgICAgICAgICAgZmlyc3RfbGluZTogdGhpcy55eWxsb2MubGFzdF9saW5lLFxuICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vICsgMSxcbiAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4sXG4gICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgP1xuICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdLmxlbmd0aCAtIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdLm1hdGNoKC9cXHI/XFxuPy8pWzBdLmxlbmd0aCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9jb2x1bW4gKyBtYXRjaFswXS5sZW5ndGhcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy55eXRleHQgKz0gbWF0Y2hbMF07XG4gICAgICAgIHRoaXMubWF0Y2ggKz0gbWF0Y2hbMF07XG4gICAgICAgIHRoaXMubWF0Y2hlcyA9IG1hdGNoO1xuICAgICAgICB0aGlzLnl5bGVuZyA9IHRoaXMueXl0ZXh0Lmxlbmd0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3RoaXMub2Zmc2V0LCB0aGlzLm9mZnNldCArPSB0aGlzLnl5bGVuZ107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbW9yZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9iYWNrdHJhY2sgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB0aGlzLm1hdGNoZWQgKz0gbWF0Y2hbMF07XG4gICAgICAgIHRva2VuID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwodGhpcywgdGhpcy55eSwgdGhpcywgaW5kZXhlZF9ydWxlLCB0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoIC0gMV0pO1xuICAgICAgICBpZiAodGhpcy5kb25lICYmIHRoaXMuX2lucHV0KSB7XG4gICAgICAgICAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9iYWNrdHJhY2spIHtcbiAgICAgICAgICAgIC8vIHJlY292ZXIgY29udGV4dFxuICAgICAgICAgICAgZm9yICh2YXIgayBpbiBiYWNrdXApIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tdID0gYmFja3VwW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBydWxlIGFjdGlvbiBjYWxsZWQgcmVqZWN0KCkgaW1wbHlpbmcgdGhlIG5leHQgcnVsZSBzaG91bGQgYmUgdGVzdGVkIGluc3RlYWQuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbi8vIHJldHVybiBuZXh0IG1hdGNoIGluIGlucHV0XG5uZXh0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5faW5wdXQpIHtcbiAgICAgICAgICAgIHRoaXMuZG9uZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG9rZW4sXG4gICAgICAgICAgICBtYXRjaCxcbiAgICAgICAgICAgIHRlbXBNYXRjaCxcbiAgICAgICAgICAgIGluZGV4O1xuICAgICAgICBpZiAoIXRoaXMuX21vcmUpIHtcbiAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gJyc7XG4gICAgICAgICAgICB0aGlzLm1hdGNoID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fY3VycmVudFJ1bGVzKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRlbXBNYXRjaCA9IHRoaXMuX2lucHV0Lm1hdGNoKHRoaXMucnVsZXNbcnVsZXNbaV1dKTtcbiAgICAgICAgICAgIGlmICh0ZW1wTWF0Y2ggJiYgKCFtYXRjaCB8fCB0ZW1wTWF0Y2hbMF0ubGVuZ3RoID4gbWF0Y2hbMF0ubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIG1hdGNoID0gdGVtcE1hdGNoO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmJhY2t0cmFja19sZXhlcikge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMudGVzdF9tYXRjaCh0ZW1wTWF0Y2gsIHJ1bGVzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JhY2t0cmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2ggPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBydWxlIGFjdGlvbiBjYWxsZWQgcmVqZWN0KCkgaW1wbHlpbmcgYSBydWxlIE1JU21hdGNoLlxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxzZTogdGhpcyBpcyBhIGxleGVyIHJ1bGUgd2hpY2ggY29uc3VtZXMgaW5wdXQgd2l0aG91dCBwcm9kdWNpbmcgYSB0b2tlbiAoZS5nLiB3aGl0ZXNwYWNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5vcHRpb25zLmZsZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnRlc3RfbWF0Y2gobWF0Y2gsIHJ1bGVzW2luZGV4XSk7XG4gICAgICAgICAgICBpZiAodG9rZW4gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZWxzZTogdGhpcyBpcyBhIGxleGVyIHJ1bGUgd2hpY2ggY29uc3VtZXMgaW5wdXQgd2l0aG91dCBwcm9kdWNpbmcgYSB0b2tlbiAoZS5nLiB3aGl0ZXNwYWNlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pbnB1dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VFcnJvcignTGV4aWNhbCBlcnJvciBvbiBsaW5lICcgKyAodGhpcy55eWxpbmVubyArIDEpICsgJy4gVW5yZWNvZ25pemVkIHRleHQuXFxuJyArIHRoaXMuc2hvd1Bvc2l0aW9uKCksIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxuICAgICAgICAgICAgICAgIHRva2VuOiBudWxsLFxuICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMueXlsaW5lbm9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gcmV0dXJuIG5leHQgbWF0Y2ggdGhhdCBoYXMgYSB0b2tlblxubGV4OmZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm5leHQoKTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyBhY3RpdmF0ZXMgYSBuZXcgbGV4ZXIgY29uZGl0aW9uIHN0YXRlIChwdXNoZXMgdGhlIG5ldyBsZXhlciBjb25kaXRpb24gc3RhdGUgb250byB0aGUgY29uZGl0aW9uIHN0YWNrKVxuYmVnaW46ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sucHVzaChjb25kaXRpb24pO1xuICAgIH0sXG5cbi8vIHBvcCB0aGUgcHJldmlvdXNseSBhY3RpdmUgbGV4ZXIgY29uZGl0aW9uIHN0YXRlIG9mZiB0aGUgY29uZGl0aW9uIHN0YWNrXG5wb3BTdGF0ZTpmdW5jdGlvbiBwb3BTdGF0ZSgpIHtcbiAgICAgICAgdmFyIG4gPSB0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChuID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2sucG9wKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFja1swXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHByb2R1Y2UgdGhlIGxleGVyIHJ1bGUgc2V0IHdoaWNoIGlzIGFjdGl2ZSBmb3IgdGhlIGN1cnJlbnRseSBhY3RpdmUgbGV4ZXIgY29uZGl0aW9uIHN0YXRlXG5fY3VycmVudFJ1bGVzOmZ1bmN0aW9uIF9jdXJyZW50UnVsZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAmJiB0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoIC0gMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdXS5ydWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbXCJJTklUSUFMXCJdLnJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gcmV0dXJuIHRoZSBjdXJyZW50bHkgYWN0aXZlIGxleGVyIGNvbmRpdGlvbiBzdGF0ZTsgd2hlbiBhbiBpbmRleCBhcmd1bWVudCBpcyBwcm92aWRlZCBpdCBwcm9kdWNlcyB0aGUgTi10aCBwcmV2aW91cyBjb25kaXRpb24gc3RhdGUsIGlmIGF2YWlsYWJsZVxudG9wU3RhdGU6ZnVuY3Rpb24gdG9wU3RhdGUobikge1xuICAgICAgICBuID0gdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxIC0gTWF0aC5hYnMobiB8fCAwKTtcbiAgICAgICAgaWYgKG4gPj0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbbl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gXCJJTklUSUFMXCI7XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyBhbGlhcyBmb3IgYmVnaW4oY29uZGl0aW9uKVxucHVzaFN0YXRlOmZ1bmN0aW9uIHB1c2hTdGF0ZShjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5iZWdpbihjb25kaXRpb24pO1xuICAgIH0sXG5cbi8vIHJldHVybiB0aGUgbnVtYmVyIG9mIHN0YXRlcyBjdXJyZW50bHkgb24gdGhlIHN0YWNrXG5zdGF0ZVN0YWNrU2l6ZTpmdW5jdGlvbiBzdGF0ZVN0YWNrU2l6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoO1xuICAgIH0sXG5vcHRpb25zOiB7fSxcbnBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eSx5eV8sJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucyxZWV9TVEFSVCkge1xudmFyIFlZU1RBVEU9WVlfU1RBUlQ7XG5zd2l0Y2goJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucykge1xuY2FzZSAwOi8qIHNraXAgd2hpdGVzcGFjZSAqL1xuYnJlYWs7XG5jYXNlIDE6cmV0dXJuIDZcbmJyZWFrO1xuY2FzZSAyOnl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cigxLHl5Xy55eWxlbmctMik7IHJldHVybiA0XG5icmVhaztcbmNhc2UgMzpyZXR1cm4gMTdcbmJyZWFrO1xuY2FzZSA0OnJldHVybiAxOFxuYnJlYWs7XG5jYXNlIDU6cmV0dXJuIDIzXG5icmVhaztcbmNhc2UgNjpyZXR1cm4gMjRcbmJyZWFrO1xuY2FzZSA3OnJldHVybiAyMlxuYnJlYWs7XG5jYXNlIDg6cmV0dXJuIDIxXG5icmVhaztcbmNhc2UgOTpyZXR1cm4gMTBcbmJyZWFrO1xuY2FzZSAxMDpyZXR1cm4gMTFcbmJyZWFrO1xuY2FzZSAxMTpyZXR1cm4gOFxuYnJlYWs7XG5jYXNlIDEyOnJldHVybiAxNFxuYnJlYWs7XG5jYXNlIDEzOnJldHVybiAnSU5WQUxJRCdcbmJyZWFrO1xufVxufSxcbnJ1bGVzOiBbL14oPzpcXHMrKS8sL14oPzooLT8oWzAtOV18WzEtOV1bMC05XSspKShcXC5bMC05XSspPyhbZUVdWy0rXT9bMC05XSspP1xcYikvLC9eKD86XCIoPzpcXFxcW1xcXFxcImJmbnJ0XFwvXXxcXFxcdVthLWZBLUYwLTldezR9fFteXFxcXFxcMC1cXHgwOVxceDBhLVxceDFmXCJdKSpcIikvLC9eKD86XFx7KS8sL14oPzpcXH0pLywvXig/OlxcWykvLC9eKD86XFxdKS8sL14oPzosKS8sL14oPzo6KS8sL14oPzp0cnVlXFxiKS8sL14oPzpmYWxzZVxcYikvLC9eKD86bnVsbFxcYikvLC9eKD86JCkvLC9eKD86LikvXSxcbmNvbmRpdGlvbnM6IHtcIklOSVRJQUxcIjp7XCJydWxlc1wiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzXSxcImluY2x1c2l2ZVwiOnRydWV9fVxufSk7XG5yZXR1cm4gbGV4ZXI7XG59KSgpO1xucGFyc2VyLmxleGVyID0gbGV4ZXI7XG5mdW5jdGlvbiBQYXJzZXIgKCkge1xuICB0aGlzLnl5ID0ge307XG59XG5QYXJzZXIucHJvdG90eXBlID0gcGFyc2VyO3BhcnNlci5QYXJzZXIgPSBQYXJzZXI7XG5yZXR1cm4gbmV3IFBhcnNlcjtcbn0pKCk7XG5cblxuaWYgKHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbmV4cG9ydHMucGFyc2VyID0ganNvbmxpbnQ7XG5leHBvcnRzLlBhcnNlciA9IGpzb25saW50LlBhcnNlcjtcbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBqc29ubGludC5wYXJzZS5hcHBseShqc29ubGludCwgYXJndW1lbnRzKTsgfTtcbmV4cG9ydHMubWFpbiA9IGZ1bmN0aW9uIGNvbW1vbmpzTWFpbihhcmdzKSB7XG4gICAgaWYgKCFhcmdzWzFdKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdVc2FnZTogJythcmdzWzBdKycgRklMRScpO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuICAgIHZhciBzb3VyY2UgPSByZXF1aXJlKCdmcycpLnJlYWRGaWxlU3luYyhyZXF1aXJlKCdwYXRoJykubm9ybWFsaXplKGFyZ3NbMV0pLCBcInV0ZjhcIik7XG4gICAgcmV0dXJuIGV4cG9ydHMucGFyc2VyLnBhcnNlKHNvdXJjZSk7XG59O1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGV4cG9ydHMubWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMSkpO1xufVxufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L25vZGVfbW9kdWxlcy9qc29ubGludC1saW5lcy9saWIvanNvbmxpbnQuanNcbi8vIG1vZHVsZSBpZCA9IDI0OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1vZHVsZSkge1xyXG5cdGlmKCFtb2R1bGUud2VicGFja1BvbHlmaWxsKSB7XHJcblx0XHRtb2R1bGUuZGVwcmVjYXRlID0gZnVuY3Rpb24oKSB7fTtcclxuXHRcdG1vZHVsZS5wYXRocyA9IFtdO1xyXG5cdFx0Ly8gbW9kdWxlLnBhcmVudCA9IHVuZGVmaW5lZCBieSBkZWZhdWx0XHJcblx0XHRpZighbW9kdWxlLmNoaWxkcmVuKSBtb2R1bGUuY2hpbGRyZW4gPSBbXTtcclxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2R1bGUsIFwibG9hZGVkXCIsIHtcclxuXHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gbW9kdWxlLmw7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZHVsZSwgXCJpZFwiLCB7XHJcblx0XHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIG1vZHVsZS5pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdG1vZHVsZS53ZWJwYWNrUG9seWZpbGwgPSAxO1xyXG5cdH1cclxuXHRyZXR1cm4gbW9kdWxlO1xyXG59O1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9tb2R1bGUuanNcbi8vIG1vZHVsZSBpZCA9IDI1MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMjUyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciByaWdodEhhbmRSdWxlID0gcmVxdWlyZSgnLi9yaHInKTtcblxuLyoqXG4gKiBAYWxpYXMgZ2VvanNvbmhpbnRcbiAqIEBwYXJhbSB7KHN0cmluZ3xvYmplY3QpfSBHZW9KU09OIGdpdmVuIGFzIGEgc3RyaW5nIG9yIGFzIGFuIG9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubm9EdXBsaWNhdGVNZW1iZXJzPXRydWVdIGZvcmJpZCByZXBlYXRlZFxuICogcHJvcGVydGllcy4gVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBmb3Igc3RyaW5nIGlucHV0LCBiZWNhdXNlZCBwYXJzZWRcbiAqIE9iamVjdHMgY2Fubm90IGhhdmUgZHVwbGljYXRlIHByb3BlcnRpZXMuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnByZWNpc2lvbldhcm5pbmc9dHJ1ZV0gd2FybiBpZiBHZW9KU09OIGNvbnRhaW5zXG4gKiB1bm5lY2Vzc2FyeSBjb29yZGluYXRlIHByZWNpc2lvbi5cbiAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fSBhbiBhcnJheSBvZiBlcnJvcnNcbiAqL1xuZnVuY3Rpb24gaGludChnaiwgb3B0aW9ucykge1xuXG4gICAgdmFyIGVycm9ycyA9IFtdO1xuICAgIHZhciBwcmVjaXNpb25XYXJuaW5nQ291bnQgPSAwO1xuICAgIHZhciBtYXhQcmVjaXNpb25XYXJuaW5ncyA9IDEwO1xuICAgIHZhciBtYXhQcmVjaXNpb24gPSA2O1xuXG4gICAgZnVuY3Rpb24gcm9vdChfKSB7XG5cbiAgICAgICAgaWYgKCghb3B0aW9ucyB8fCBvcHRpb25zLm5vRHVwbGljYXRlTWVtYmVycyAhPT0gZmFsc2UpICYmXG4gICAgICAgICAgIF8uX19kdXBsaWNhdGVQcm9wZXJ0aWVzX18pIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQW4gb2JqZWN0IGNvbnRhaW5lZCBkdXBsaWNhdGUgbWVtYmVycywgbWFraW5nIHBhcnNpbmcgYW1iaWdvdXM6ICcgKyBfLl9fZHVwbGljYXRlUHJvcGVydGllc19fLmpvaW4oJywgJyksXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxdWlyZWRQcm9wZXJ0eShfLCAndHlwZScsICdzdHJpbmcnKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0eXBlc1tfLnR5cGVdKSB7XG4gICAgICAgICAgICB2YXIgZXhwZWN0ZWRUeXBlID0gdHlwZXNMb3dlcltfLnR5cGUudG9Mb3dlckNhc2UoKV07XG4gICAgICAgICAgICBpZiAoZXhwZWN0ZWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdFeHBlY3RlZCAnICsgZXhwZWN0ZWRUeXBlICsgJyBidXQgZ290ICcgKyBfLnR5cGUgKyAnIChjYXNlIHNlbnNpdGl2ZSknLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSB0eXBlICcgKyBfLnR5cGUgKyAnIGlzIHVua25vd24nLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXykge1xuICAgICAgICAgICAgdHlwZXNbXy50eXBlXShfKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV2ZXJ5SXMoXywgdHlwZSkge1xuICAgICAgICAvLyBtYWtlIGEgc2luZ2xlIGV4Y2VwdGlvbiBiZWNhdXNlIHR5cGVvZiBudWxsID09PSAnb2JqZWN0J1xuICAgICAgICByZXR1cm4gXy5ldmVyeShmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gdHlwZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVxdWlyZWRQcm9wZXJ0eShfLCBuYW1lLCB0eXBlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgX1tuYW1lXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1wiJyArIG5hbWUgKyAnXCIgbWVtYmVyIHJlcXVpcmVkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoX1tuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnXCInICsgbmFtZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIgbWVtYmVyIHNob3VsZCBiZSBhbiBhcnJheSwgYnV0IGlzIGFuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiBfW25hbWVdKSArICcgaW5zdGVhZCcsXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JyAmJiBfW25hbWVdICYmIF9bbmFtZV0uY29uc3RydWN0b3IubmFtZSAhPT0gJ09iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1wiJyArIG5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAnXCIgbWVtYmVyIHNob3VsZCBiZSAnICsgKHR5cGUpICtcbiAgICAgICAgICAgICAgICAgICAgJywgYnV0IGlzIGFuICcgKyAoX1tuYW1lXS5jb25zdHJ1Y3Rvci5uYW1lKSArICcgaW5zdGVhZCcsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSAmJiB0eXBlb2YgX1tuYW1lXSAhPT0gdHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnXCInICsgbmFtZSArXG4gICAgICAgICAgICAgICAgICAgICdcIiBtZW1iZXIgc2hvdWxkIGJlICcgKyAodHlwZSkgK1xuICAgICAgICAgICAgICAgICAgICAnLCBidXQgaXMgYW4gJyArICh0eXBlb2YgX1tuYW1lXSkgKyAnIGluc3RlYWQnLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI2ZlYXR1cmUtY29sbGVjdGlvbi1vYmplY3RzXG4gICAgZnVuY3Rpb24gRmVhdHVyZUNvbGxlY3Rpb24oZmVhdHVyZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgY3JzKGZlYXR1cmVDb2xsZWN0aW9uKTtcbiAgICAgICAgYmJveChmZWF0dXJlQ29sbGVjdGlvbik7XG4gICAgICAgIGlmIChmZWF0dXJlQ29sbGVjdGlvbi5wcm9wZXJ0aWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZUNvbGxlY3Rpb24gb2JqZWN0IGNhbm5vdCBjb250YWluIGEgXCJwcm9wZXJ0aWVzXCIgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlQ29sbGVjdGlvbi5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZlYXR1cmVDb2xsZWN0aW9uLmNvb3JkaW5hdGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZUNvbGxlY3Rpb24gb2JqZWN0IGNhbm5vdCBjb250YWluIGEgXCJjb29yZGluYXRlc1wiIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZUNvbGxlY3Rpb24uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShmZWF0dXJlQ29sbGVjdGlvbiwgJ2ZlYXR1cmVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGlmICghZXZlcnlJcyhmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlcywgJ29iamVjdCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0V2ZXJ5IGZlYXR1cmUgbXVzdCBiZSBhbiBvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlQ29sbGVjdGlvbi5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZXMuZm9yRWFjaChGZWF0dXJlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNwb3NpdGlvbnNcbiAgICBmdW5jdGlvbiBwb3NpdGlvbihfLCBsaW5lKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShfKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAncG9zaXRpb24gc2hvdWxkIGJlIGFuIGFycmF5LCBpcyBhICcgKyAodHlwZW9mIF8pICtcbiAgICAgICAgICAgICAgICAgICAgJyBpbnN0ZWFkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ3Bvc2l0aW9uIG11c3QgaGF2ZSAyIG9yIG1vcmUgZWxlbWVudHMnLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX18gfHwgbGluZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8ubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAncG9zaXRpb24gc2hvdWxkIG5vdCBoYXZlIG1vcmUgdGhhbiAzIGVsZW1lbnRzJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZXZlcnlJcyhfLCAnbnVtYmVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ2VhY2ggZWxlbWVudCBpbiBhIHBvc2l0aW9uIG11c3QgYmUgYSBudW1iZXInLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX18gfHwgbGluZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnByZWNpc2lvbldhcm5pbmcpIHtcbiAgICAgICAgICAgIGlmIChwcmVjaXNpb25XYXJuaW5nQ291bnQgPT09IG1heFByZWNpc2lvbldhcm5pbmdzKSB7XG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uV2FybmluZ0NvdW50ICs9IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ3RydW5jYXRlZCB3YXJuaW5nczogd2VcXCd2ZSBlbmNvdW50ZXJlZCBjb29yZGluYXRlIHByZWNpc2lvbiB3YXJuaW5nICcgKyBtYXhQcmVjaXNpb25XYXJuaW5ncyArICcgdGltZXMsIG5vIG1vcmUgd2FybmluZ3Mgd2lsbCBiZSByZXBvcnRlZCcsXG4gICAgICAgICAgICAgICAgICAgIGxldmVsOiAnbWVzc2FnZScsXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX18gfHwgbGluZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVjaXNpb25XYXJuaW5nQ291bnQgPCBtYXhQcmVjaXNpb25XYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmdW5jdGlvbihudW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByZWNpc2lvbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWNpbWFsU3RyID0gU3RyaW5nKG51bSkuc3BsaXQoJy4nKVsxXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlY2ltYWxTdHIgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWNpc2lvbiA9IGRlY2ltYWxTdHIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJlY2lzaW9uID4gbWF4UHJlY2lzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVjaXNpb25XYXJuaW5nQ291bnQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ3ByZWNpc2lvbiBvZiBjb29yZGluYXRlcyBzaG91bGQgYmUgcmVkdWNlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWw6ICdtZXNzYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3NpdGlvbkFycmF5KGNvb3JkcywgdHlwZSwgZGVwdGgsIGxpbmUpIHtcbiAgICAgICAgaWYgKGxpbmUgPT09IHVuZGVmaW5lZCAmJiBjb29yZHMuX19saW5lX18gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGluZSA9IGNvb3Jkcy5fX2xpbmVfXztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwb3NpdGlvbihjb29yZHMsIGxpbmUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXB0aCA9PT0gMSAmJiB0eXBlKSB7XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ0xpbmVhclJpbmcnKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvb3Jkc1tjb29yZHMubGVuZ3RoIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIG51bWJlciB3YXMgZm91bmQgd2hlcmUgYSBjb29yZGluYXRlIGFycmF5IHNob3VsZCBoYXZlIGJlZW4gZm91bmQ6IHRoaXMgbmVlZHMgdG8gYmUgbmVzdGVkIG1vcmUgZGVlcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29vcmRzLmxlbmd0aCA8IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2EgTGluZWFyUmluZyBvZiBjb29yZGluYXRlcyBuZWVkcyB0byBoYXZlIGZvdXIgb3IgbW9yZSBwb3NpdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvb3Jkcy5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgKGNvb3Jkc1tjb29yZHMubGVuZ3RoIC0gMV0ubGVuZ3RoICE9PSBjb29yZHNbMF0ubGVuZ3RoIHx8XG4gICAgICAgICAgICAgICAgICAgICFjb29yZHNbY29vcmRzLmxlbmd0aCAtIDFdLmV2ZXJ5KGZ1bmN0aW9uKHBvcywgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb29yZHNbMF1baW5kZXhdID09PSBwb3M7XG4gICAgICAgICAgICAgICAgfSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICd0aGUgZmlyc3QgYW5kIGxhc3QgcG9zaXRpb25zIGluIGEgTGluZWFyUmluZyBvZiBjb29yZGluYXRlcyBtdXN0IGJlIHRoZSBzYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0xpbmUnICYmIGNvb3Jkcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2EgbGluZSBuZWVkcyB0byBoYXZlIHR3byBvciBtb3JlIGNvb3JkaW5hdGVzIHRvIGJlIHZhbGlkJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb29yZHMpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ2EgbnVtYmVyIHdhcyBmb3VuZCB3aGVyZSBhIGNvb3JkaW5hdGUgYXJyYXkgc2hvdWxkIGhhdmUgYmVlbiBmb3VuZDogdGhpcyBuZWVkcyB0byBiZSBuZXN0ZWQgbW9yZSBkZWVwbHknLFxuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBjb29yZHMubWFwKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9zaXRpb25BcnJheShjLCB0eXBlLCBkZXB0aCAtIDEsIGMuX19saW5lX18gfHwgbGluZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRzLnNvbWUoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcnMoXykge1xuICAgICAgICBpZiAoIV8uY3JzKSByZXR1cm47XG4gICAgICAgIHZhciBkZWZhdWx0Q1JTTmFtZSA9ICd1cm46b2djOmRlZjpjcnM6T0dDOjEuMzpDUlM4NCc7XG4gICAgICAgIGlmICh0eXBlb2YgXy5jcnMgPT09ICdvYmplY3QnICYmIF8uY3JzLnByb3BlcnRpZXMgJiYgXy5jcnMucHJvcGVydGllcy5uYW1lID09PSBkZWZhdWx0Q1JTTmFtZSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdvbGQtc3R5bGUgY3JzIG1lbWJlciBpcyBub3QgcmVjb21tZW5kZWQsIHRoaXMgb2JqZWN0IGlzIGVxdWl2YWxlbnQgdG8gdGhlIGRlZmF1bHQgYW5kIHNob3VsZCBiZSByZW1vdmVkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnb2xkLXN0eWxlIGNycyBtZW1iZXIgaXMgbm90IHJlY29tbWVuZGVkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJib3goXykge1xuICAgICAgICBpZiAoIV8uYmJveCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KF8uYmJveCkpIHtcbiAgICAgICAgICAgIGlmICghZXZlcnlJcyhfLmJib3gsICdudW1iZXInKSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2VhY2ggZWxlbWVudCBpbiBhIGJib3ggbWVtYmVyIG11c3QgYmUgYSBudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLmJib3guX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghKF8uYmJveC5sZW5ndGggPT09IDQgfHwgXy5iYm94Lmxlbmd0aCA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdiYm94IG11c3QgY29udGFpbiA0IGVsZW1lbnRzIChmb3IgMkQpIG9yIDYgZWxlbWVudHMgKGZvciAzRCknLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLmJib3guX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdiYm94IG1lbWJlciBtdXN0IGJlIGFuIGFycmF5IG9mIG51bWJlcnMsIGJ1dCBpcyBhICcgKyAodHlwZW9mIF8uYmJveCksXG4gICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdlb21ldHJ5U2VtYW50aWNzKGdlb20pIHtcbiAgICAgICAgaWYgKGdlb20ucHJvcGVydGllcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ2dlb21ldHJ5IG9iamVjdCBjYW5ub3QgY29udGFpbiBhIFwicHJvcGVydGllc1wiIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZ2VvbS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlb20uZ2VvbWV0cnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdnZW9tZXRyeSBvYmplY3QgY2Fubm90IGNvbnRhaW4gYSBcImdlb21ldHJ5XCIgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBnZW9tLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2VvbS5mZWF0dXJlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ2dlb21ldHJ5IG9iamVjdCBjYW5ub3QgY29udGFpbiBhIFwiZmVhdHVyZXNcIiBtZW1iZXInLFxuICAgICAgICAgICAgICAgIGxpbmU6IGdlb20uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI3BvaW50XG4gICAgZnVuY3Rpb24gUG9pbnQocG9pbnQpIHtcbiAgICAgICAgY3JzKHBvaW50KTtcbiAgICAgICAgYmJveChwb2ludCk7XG4gICAgICAgIGdlb21ldHJ5U2VtYW50aWNzKHBvaW50KTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KHBvaW50LCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb24ocG9pbnQuY29vcmRpbmF0ZXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI3BvbHlnb25cbiAgICBmdW5jdGlvbiBQb2x5Z29uKHBvbHlnb24pIHtcbiAgICAgICAgY3JzKHBvbHlnb24pO1xuICAgICAgICBiYm94KHBvbHlnb24pO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkocG9seWdvbiwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGlmICghcG9zaXRpb25BcnJheShwb2x5Z29uLmNvb3JkaW5hdGVzLCAnTGluZWFyUmluZycsIDIpKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRIYW5kUnVsZShwb2x5Z29uLCBlcnJvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI211bHRpcG9seWdvblxuICAgIGZ1bmN0aW9uIE11bHRpUG9seWdvbihtdWx0aVBvbHlnb24pIHtcbiAgICAgICAgY3JzKG11bHRpUG9seWdvbik7XG4gICAgICAgIGJib3gobXVsdGlQb2x5Z29uKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KG11bHRpUG9seWdvbiwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGlmICghcG9zaXRpb25BcnJheShtdWx0aVBvbHlnb24uY29vcmRpbmF0ZXMsICdMaW5lYXJSaW5nJywgMykpIHtcbiAgICAgICAgICAgICAgICByaWdodEhhbmRSdWxlKG11bHRpUG9seWdvbiwgZXJyb3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNsaW5lc3RyaW5nXG4gICAgZnVuY3Rpb24gTGluZVN0cmluZyhsaW5lU3RyaW5nKSB7XG4gICAgICAgIGNycyhsaW5lU3RyaW5nKTtcbiAgICAgICAgYmJveChsaW5lU3RyaW5nKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KGxpbmVTdHJpbmcsICdjb29yZGluYXRlcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbkFycmF5KGxpbmVTdHJpbmcuY29vcmRpbmF0ZXMsICdMaW5lJywgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbXVsdGlsaW5lc3RyaW5nXG4gICAgZnVuY3Rpb24gTXVsdGlMaW5lU3RyaW5nKG11bHRpTGluZVN0cmluZykge1xuICAgICAgICBjcnMobXVsdGlMaW5lU3RyaW5nKTtcbiAgICAgICAgYmJveChtdWx0aUxpbmVTdHJpbmcpO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkobXVsdGlMaW5lU3RyaW5nLCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb25BcnJheShtdWx0aUxpbmVTdHJpbmcuY29vcmRpbmF0ZXMsICdMaW5lJywgMik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbXVsdGlwb2ludFxuICAgIGZ1bmN0aW9uIE11bHRpUG9pbnQobXVsdGlQb2ludCkge1xuICAgICAgICBjcnMobXVsdGlQb2ludCk7XG4gICAgICAgIGJib3gobXVsdGlQb2ludCk7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShtdWx0aVBvaW50LCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb25BcnJheShtdWx0aVBvaW50LmNvb3JkaW5hdGVzLCAnJywgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBHZW9tZXRyeUNvbGxlY3Rpb24oZ2VvbWV0cnlDb2xsZWN0aW9uKSB7XG4gICAgICAgIGNycyhnZW9tZXRyeUNvbGxlY3Rpb24pO1xuICAgICAgICBiYm94KGdlb21ldHJ5Q29sbGVjdGlvbik7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShnZW9tZXRyeUNvbGxlY3Rpb24sICdnZW9tZXRyaWVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIGlmICghZXZlcnlJcyhnZW9tZXRyeUNvbGxlY3Rpb24uZ2VvbWV0cmllcywgJ29iamVjdCcpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIGdlb21ldHJpZXMgYXJyYXkgaW4gYSBHZW9tZXRyeUNvbGxlY3Rpb24gbXVzdCBjb250YWluIG9ubHkgZ2VvbWV0cnkgb2JqZWN0cycsXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IGdlb21ldHJ5Q29sbGVjdGlvbi5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdlb21ldHJ5Q29sbGVjdGlvbi5nZW9tZXRyaWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0dlb21ldHJ5Q29sbGVjdGlvbiB3aXRoIGEgc2luZ2xlIGdlb21ldHJ5IHNob3VsZCBiZSBhdm9pZGVkIGluIGZhdm9yIG9mIHNpbmdsZSBwYXJ0IG9yIGEgc2luZ2xlIG9iamVjdCBvZiBtdWx0aS1wYXJ0IHR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBnZW9tZXRyeUNvbGxlY3Rpb24uZ2VvbWV0cmllcy5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2VvbWV0cnlDb2xsZWN0aW9uLmdlb21ldHJpZXMuZm9yRWFjaChmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGlmIChnZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ0dlb21ldHJ5Q29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnR2VvbWV0cnlDb2xsZWN0aW9uIHNob3VsZCBhdm9pZCBuZXN0ZWQgZ2VvbWV0cnkgY29sbGVjdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGdlb21ldHJ5Q29sbGVjdGlvbi5nZW9tZXRyaWVzLl9fbGluZV9fXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByb290KGdlb21ldHJ5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIEZlYXR1cmUoZmVhdHVyZSkge1xuICAgICAgICBjcnMoZmVhdHVyZSk7XG4gICAgICAgIGJib3goZmVhdHVyZSk7XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9nZW9qc29uL2RyYWZ0LWdlb2pzb24vYmxvYi9tYXN0ZXIvbWlkZGxlLm1rZCNmZWF0dXJlLW9iamVjdFxuICAgICAgICBpZiAoZmVhdHVyZS5pZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICB0eXBlb2YgZmVhdHVyZS5pZCAhPT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgIHR5cGVvZiBmZWF0dXJlLmlkICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdGZWF0dXJlIFwiaWRcIiBtZW1iZXIgbXVzdCBoYXZlIGEgc3RyaW5nIG9yIG51bWJlciB2YWx1ZScsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZlYXR1cmUuZmVhdHVyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdGZWF0dXJlIG9iamVjdCBjYW5ub3QgY29udGFpbiBhIFwiZmVhdHVyZXNcIiBtZW1iZXInLFxuICAgICAgICAgICAgICAgIGxpbmU6IGZlYXR1cmUuX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmZWF0dXJlLmNvb3JkaW5hdGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZSBvYmplY3QgY2Fubm90IGNvbnRhaW4gYSBcImNvb3JkaW5hdGVzXCIgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmVhdHVyZS50eXBlICE9PSAnRmVhdHVyZScpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnR2VvSlNPTiBmZWF0dXJlcyBtdXN0IGhhdmUgYSB0eXBlPWZlYXR1cmUgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXF1aXJlZFByb3BlcnR5KGZlYXR1cmUsICdwcm9wZXJ0aWVzJywgJ29iamVjdCcpO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkoZmVhdHVyZSwgJ2dlb21ldHJ5JywgJ29iamVjdCcpKSB7XG4gICAgICAgICAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjZmVhdHVyZS1vYmplY3RzXG4gICAgICAgICAgICAvLyB0b2xlcmF0ZSBudWxsIGdlb21ldHJ5XG4gICAgICAgICAgICBpZiAoZmVhdHVyZS5nZW9tZXRyeSkgcm9vdChmZWF0dXJlLmdlb21ldHJ5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0eXBlcyA9IHtcbiAgICAgICAgUG9pbnQ6IFBvaW50LFxuICAgICAgICBGZWF0dXJlOiBGZWF0dXJlLFxuICAgICAgICBNdWx0aVBvaW50OiBNdWx0aVBvaW50LFxuICAgICAgICBMaW5lU3RyaW5nOiBMaW5lU3RyaW5nLFxuICAgICAgICBNdWx0aUxpbmVTdHJpbmc6IE11bHRpTGluZVN0cmluZyxcbiAgICAgICAgRmVhdHVyZUNvbGxlY3Rpb246IEZlYXR1cmVDb2xsZWN0aW9uLFxuICAgICAgICBHZW9tZXRyeUNvbGxlY3Rpb246IEdlb21ldHJ5Q29sbGVjdGlvbixcbiAgICAgICAgUG9seWdvbjogUG9seWdvbixcbiAgICAgICAgTXVsdGlQb2x5Z29uOiBNdWx0aVBvbHlnb25cbiAgICB9O1xuXG4gICAgdmFyIHR5cGVzTG93ZXIgPSBPYmplY3Qua2V5cyh0eXBlcykucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cnIpIHtcbiAgICAgICAgcHJldltjdXJyLnRvTG93ZXJDYXNlKCldID0gY3VycjtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwge30pO1xuXG4gICAgaWYgKHR5cGVvZiBnaiAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZ2ogPT09IG51bGwgfHxcbiAgICAgICAgZ2ogPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJvb3Qgb2YgYSBHZW9KU09OIG9iamVjdCBtdXN0IGJlIGFuIG9iamVjdC4nLFxuICAgICAgICAgICAgbGluZTogMFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9XG5cbiAgICByb290KGdqKTtcblxuICAgIGVycm9ycy5mb3JFYWNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBpZiAoe30uaGFzT3duUHJvcGVydHkuY2FsbChlcnIsICdsaW5lJykgJiYgZXJyLmxpbmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIGVyci5saW5lO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZXJyb3JzO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5oaW50ID0gaGludDtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9vYmplY3QuanNcbi8vIG1vZHVsZSBpZCA9IDI1M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJmdW5jdGlvbiByYWQoeCkge1xuICAgIHJldHVybiB4ICogTWF0aC5QSSAvIDE4MDtcbn1cblxuZnVuY3Rpb24gaXNSaW5nQ2xvY2t3aXNlIChjb29yZHMpIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgaWYgKGNvb3Jkcy5sZW5ndGggPiAyKSB7XG4gICAgICAgIHZhciBwMSwgcDI7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgcDEgPSBjb29yZHNbaV07XG4gICAgICAgICAgICBwMiA9IGNvb3Jkc1tpICsgMV07XG4gICAgICAgICAgICBhcmVhICs9IHJhZChwMlswXSAtIHAxWzBdKSAqICgyICsgTWF0aC5zaW4ocmFkKHAxWzFdKSkgKyBNYXRoLnNpbihyYWQocDJbMV0pKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXJlYSA+PSAwO1xufVxuXG5mdW5jdGlvbiBpc1BvbHlSSFIgKGNvb3Jkcykge1xuICAgIGlmIChjb29yZHMgJiYgY29vcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGlzUmluZ0Nsb2Nrd2lzZShjb29yZHNbMF0pKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaW50ZXJpb3JDb29yZHMgPSBjb29yZHMuc2xpY2UoMSwgY29vcmRzLmxlbmd0aCk7XG4gICAgICAgIGlmICghaW50ZXJpb3JDb29yZHMuZXZlcnkoaXNSaW5nQ2xvY2t3aXNlKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJpZ2h0SGFuZFJ1bGUgKGdlb21ldHJ5KSB7XG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdQb2x5Z29uJykge1xuICAgICAgICByZXR1cm4gaXNQb2x5UkhSKGdlb21ldHJ5LmNvb3JkaW5hdGVzKTtcbiAgICB9IGVsc2UgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIHJldHVybiBnZW9tZXRyeS5jb29yZGluYXRlcy5ldmVyeShpc1BvbHlSSFIpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB2YWxpZGF0ZVJpZ2h0SGFuZFJ1bGUoZ2VvbWV0cnksIGVycm9ycykge1xuICAgIGlmICghcmlnaHRIYW5kUnVsZShnZW9tZXRyeSkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgbWVzc2FnZTogJ1BvbHlnb25zIGFuZCBNdWx0aVBvbHlnb25zIHNob3VsZCBmb2xsb3cgdGhlIHJpZ2h0LWhhbmQgcnVsZScsXG4gICAgICAgICAgICBsZXZlbDogJ21lc3NhZ2UnLFxuICAgICAgICAgICAgbGluZTogZ2VvbWV0cnkuX19saW5lX19cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9yaHIuanNcbi8vIG1vZHVsZSBpZCA9IDI1NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKiBqc2hpbnQgZXN2ZXJzaW9uIDo2ICovXG5cblxuLyoqIFxuKiBDbG9uZSBhbiBhcnJheVxuKiBAcGFyYW0ge0FycmF5fSBTb3VyY2UgdG8gY2xvbmVcbiovXG5leHBvcnQgZnVuY3Rpb24gY2xvbmVBcnJheShhcnIpe1xuICB2YXIgaSA9IGFyci5sZW5ndGg7XG4gIHZhciBjbG9uZSA9IFtdO1xuICB3aGlsZShpLS0pIHsgY2xvbmVbaV0gPSBhcnJbaV07IH1cbiAgcmV0dXJuKGNsb25lKTtcbn1cbi8qIEdldCBzdGF0IG9mIGFuIGFycmF5XG4gKiBAcGFyYW0ge09iamVjdH0gbyBvcHRpb25zXG4gKiBAcGFyYW0ge0FycmF5fSBvLmFyciBOdW1lcmljIGFycmF5XG4gKiBAcGFyYW0ge1N0cmluZ30gby5zdGF0IFN0YXQgc3RyaW5nIDogbWluLCBtYXgsIG1lYW4sIG1lZGlhbiwgZGlzdGluY3QsIHF1YW50aWxlLiBEZWZhdWx0ID0gbWF4O1xuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IG8ucGVyY2VudGlsZSA6IHBlcmNlbnRpbGUgdG8gdXNlIGZvciBxdWFudGlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXJyYXlTdGF0KG8pe1xuXG4gIGlmKCBcbiAgICBvLmFyciA9PT0gdW5kZWZpbmVkIHx8XG4gICAgby5hcnIuY29uc3RydWN0b3IgIT0gQXJyYXkgfHxcbiAgICBvLmFyci5sZW5ndGggPT09IDBcbiAgKSByZXR1cm4gW107XG4gXG4gIGlmKFxuICAgIG8uc3RhdCA9PSBcInF1YW50aWxlXCIgJiZcbiAgICBvLnBlcmNlbnRpbGUgJiYgXG4gICAgby5wZXJjZW50aWxlLmNvbnN0cnVjdG9yID09IEFycmF5XG4gICkgby5zdGF0ID0gXCJxdWFudGlsZXNcIjtcblxuICB2YXIgYXJyID0gY2xvbmVBcnJheSggby5hcnIgKTtcbiAgdmFyIHN0YXQgPSAgby5zdGF0ID8gby5zdGF0IDogXCJtYXhcIjtcbiAgdmFyIGxlbl9vID0gYXJyLmxlbmd0aDtcbiAgdmFyIGxlbiA9IGxlbl9vO1xuXG4gIGZ1bmN0aW9uIHNvcnROdW1iZXIoYSxiKSB7XG4gICAgcmV0dXJuIGEgLSBiO1xuICB9XG5cbiAgdmFyIG9wdCA9IHtcbiAgICBcIm1heFwiIDogZnVuY3Rpb24oKXsgXG4gICAgICB2YXIgbWF4ID0gLUluZmluaXR5IDtcbiAgICAgIHZhciB2ID0gMCA7XG4gICAgICB3aGlsZSAoIGxlbi0tICl7XG4gICAgICAgIHYgPSBhcnIucG9wKCk7XG4gICAgICAgIGlmICggdiA+IG1heCApIHtcbiAgICAgICAgICBtYXggPSB2O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF4O1xuICAgIH0sXG4gICAgXCJtaW5cIiA6IGZ1bmN0aW9uKCl7IFxuICAgICAgdmFyIG1pbiA9IEluZmluaXR5O1xuICAgICAgd2hpbGUoIGxlbi0tICl7XG4gICAgICAgIHZhciB2ID0gYXJyLnBvcCgpO1xuICAgICAgICBpZiAodiA8IG1pbil7XG4gICAgICAgICAgbWluID0gdjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1pbjtcbiAgICB9LFxuICAgIFwic3VtXCI6ZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzdW0gPSAwOyBcbiAgICAgIHdoaWxlKCBsZW4tLSApeyBcbiAgICAgICAgc3VtICs9IGFyci5wb3AoKSA7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3VtIDtcbiAgICB9LFxuICAgIFwibWVhblwiOmZ1bmN0aW9uKCl7XG4gICAgICB2YXIgc3VtID0gZ2V0QXJyYXlTdGF0KHtcbiAgICAgICAgc3RhdCA6IFwic3VtXCIsXG4gICAgICAgIGFyciA6IGFyclxuICAgICAgfSk7XG4gICAgICByZXR1cm4gc3VtIC8gbGVuX287XG4gICAgfSxcbiAgICBcIm1lZGlhblwiOmZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbWVkaWFuID0gZ2V0QXJyYXlTdGF0KHtcbiAgICAgICAgc3RhdCA6IFwicXVhbnRpbGVcIixcbiAgICAgICAgYXJyIDogYXJyLFxuICAgICAgICBwZXJjZW50aWxlIDogNTBcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG1lZGlhbjtcbiAgICB9LFxuICAgIFwicXVhbnRpbGVcIjpmdW5jdGlvbigpe1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIGFyci5zb3J0KHNvcnROdW1iZXIpO1xuICAgICAgby5wZXJjZW50aWxlID0gby5wZXJjZW50aWxlPyBvLnBlcmNlbnRpbGUgOiA1MDtcbiAgICAgIHZhciBpbmRleCA9IG8ucGVyY2VudGlsZS8xMDAgKiAoYXJyLmxlbmd0aC0xKTtcbiAgICAgIGlmIChNYXRoLmZsb29yKGluZGV4KSA9PSBpbmRleCkge1xuICAgICAgICByZXN1bHQgPSBhcnJbaW5kZXhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGkgPSBNYXRoLmZsb29yKGluZGV4KTtcbiAgICAgICAgdmFyIGZyYWN0aW9uID0gaW5kZXggLSBpO1xuICAgICAgICByZXN1bHQgPSBhcnJbaV0gKyAoYXJyW2krMV0gLSBhcnJbaV0pICogZnJhY3Rpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXCJxdWFudGlsZXNcIjpmdW5jdGlvbigpe1xuICAgICAgdmFyIHF1YW50aWxlcyA9IHt9O1xuICAgICAgby5wZXJjZW50aWxlLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgIHZhciByZXMgPSAgZ2V0QXJyYXlTdGF0KHtcbiAgICAgICAgICBzdGF0IDogXCJxdWFudGlsZVwiLFxuICAgICAgICAgIGFyciA6IGFycixcbiAgICAgICAgICBwZXJjZW50aWxlIDogeFxuICAgICAgICB9KTtcbiAgICAgICAgcXVhbnRpbGVzW3hdID0gcmVzOyAgXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBxdWFudGlsZXM7XG4gICAgfSxcbiAgICBcImRpc3RpbmN0XCI6ZnVuY3Rpb24oKXtcbiAgICAgIHZhciBuID0ge30sIHIgPSBbXTtcblxuICAgICAgd2hpbGUoIGxlbi0tICkgXG4gICAgICB7XG4gICAgICAgIGlmICggIW5bYXJyW2xlbl1dIClcbiAgICAgICAge1xuICAgICAgICAgIG5bYXJyW2xlbl1dID0gdHJ1ZTsgXG4gICAgICAgICAgci5wdXNoKGFycltsZW5dKTsgXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByO1xuICAgIH0sXG4gICAgXCJmcmVxdWVuY3lcIjpmdW5jdGlvbigpe1xuICAgICAgdmFyIGNvbE5hbWVzID0gby5jb2xOYW1lcztcbiAgICAgIGlmKGNvbE5hbWVzLmNvbnN0cnVjdG9yICE9IEFycmF5KSB0aHJvdyhcImNvbG5hbWVzIG11c3QgYmUgYXJyYXlcIik7XG4gICAgICBpZihjb2xOYW1lcy5sZW5ndGg9PTApIGNvbE5hbWVzID0gT2JqZWN0LmtleXMoYXJyWzFdKTtcbiAgICAgIHZhciB0YWJsZSA9IHt9O1xuICAgICAgdmFyIHZhbCxwcmV2VmFsO1xuICAgICAgdmFyIGNvbE5hbWU7XG5cbiAgICAgIGZvcih2YXIgaj0wLGpMPWNvbE5hbWVzLmxlbmd0aDtqPGpMO2orKyl7XG4gICAgICAgIGNvbE5hbWUgPSBjb2xOYW1lc1tqXTtcbiAgICAgICAgdGFibGVbY29sTmFtZV0gPSB7fTtcbiAgICAgICAgZm9yKHZhciBpPTAsaUw9YXJyLmxlbmd0aDtpPGlMO2krKyl7XG4gICAgICAgICAgdmFsID0gYXJyW2ldW2NvbE5hbWVdfHxudWxsO1xuICAgICAgICAgIHRhYmxlW2NvbE5hbWVdW3ZhbF09dGFibGVbY29sTmFtZV1bdmFsXSsxfHwxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFibGU7XG4gICAgfSxcbiAgICBcInN1bUJ5XCI6ZnVuY3Rpb24oKXtcblxuICAgICAgdmFyIGNvbE5hbWVzID0gby5jb2xOYW1lcztcbiAgICAgIGlmKGNvbE5hbWVzLmNvbnN0cnVjdG9yICE9IEFycmF5KSB0aHJvdyhcImNvbG5hbWVzIG11c3QgYmUgYXJyYXlcIik7XG4gICAgICBpZihjb2xOYW1lcy5sZW5ndGg9PTApIGNvbE5hbWVzID0gT2JqZWN0LmtleXMoYXJyWzFdKTtcbiAgICAgIHZhciB0YWJsZSA9IHt9O1xuICAgICAgdmFyIHZhbCxwcmV2VmFsO1xuICAgICAgdmFyIGNvbE5hbWU7XG4gICAgICBmb3IodmFyIGo9MCxqTD1jb2xOYW1lcy5sZW5ndGg7ajxqTDtqKyspe1xuICAgICAgICBjb2xOYW1lPWNvbE5hbWVzW2pdO1xuICAgICAgICBmb3IodmFyIGk9MCxpTD1hcnIubGVuZ3RoO2k8aUw7aSsrKXtcbiAgICAgICAgICB2YWw9YXJyW2ldW2NvbE5hbWVdfHwwO1xuICAgICAgICAgIHByZXZWYWw9dGFibGVbY29sTmFtZV0gfHwgMDtcbiAgICAgICAgICB0YWJsZVtjb2xOYW1lXT0gcHJldlZhbCArIHZhbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRhYmxlO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4ob3B0W3N0YXRdKG8pKTtcblxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2pzL214X2hlbHBlcl9zdGF0LmpzIiwiLyoganNoaW50IGVzdmVyc2lvbjo2Ki9cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSBoc2xhIGNvbG9yIHN0cmluZywgd2l0aCBmaXhlZCBzYXR1cmF0aW9uIGFuZCBsaWdodG5lc3NcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcGFjaXR5IG9wYWNpdHkgZnJvbSAwIHRvIDFcbiAqIEBwYXJhbSB7bnVtYmVyfSByYW5kb20gdmFsdWUgZnJvbSAwIHRvIDFcbiAqIEBwYXJhbSB7bnVtYmVyfSBzYXR1cmF0aW9uIGZyb20gMCB0byAxMDBcbiAqIEBwYXJhbSB7bnVtYmVyfSBsaWdodG5lc3MgZnJvbSAwIHRvIDEwMFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSHNsKG9wYWNpdHksIHJhbmRvbSwgc2F0dXJhdGlvbiwgbGlnaHRuZXNzKSB7XG4gIGlmIChvcGFjaXR5ID09PSB1bmRlZmluZWQpIG9wYWNpdHkgPSAxO1xuICBpZiAoc2F0dXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBzYXR1cmF0aW9uID0gMTAwO1xuICBpZiAobGlnaHRuZXNzID09IHVuZGVmaW5lZCkgbGlnaHRuZXNzID0gNTA7XG4gIGlmIChyYW5kb20gPCAwIHx8IHJhbmRvbSA+IDEgfHwgcmFuZG9tID09PSB1bmRlZmluZWQpIHJhbmRvbSA9IE1hdGgucmFuZG9tKCk7XG4gIHZhciByZXMgPSBcImhzbGEoXCIgKyAocmFuZG9tICogMzYwKSArXG4gICAgXCIsIFwiICsgc2F0dXJhdGlvbiArIFwiJSBcIiArXG4gICAgXCIsIFwiICsgbGlnaHRuZXNzICsgXCIlIFwiICtcbiAgICBcIiwgXCIgKyBvcGFjaXR5ICsgXCIpXCI7XG4gIHJldHVybiByZXM7XG59XG5cblxuLyoqXG4gKiBjb252ZXJ0IGhleCB0byByZ2Igb3IgcmdiYVxuICogQHBhcmFtIHtzdHJpbmd9IGhleCBIZXggY29sb3JcbiAqIEBwYXJhbSB7bnVtYmVyfSBvcGFjaXR5IFZhbHVlIG9mIG9wYWNpdHksIGZyb20gMCB0byAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoZXgycmdiYShoZXgsIG9wYWNpdHkpIHtcblxuICB2YXIgaCA9IGhleC5yZXBsYWNlKFwiI1wiLCBcIlwiKTtcbiAgdmFyIHJnYmEgPSAgXCJyZ2JhXCI7XG4gIHZhciByZ2IgPSAgXCJyZ2JcIjtcbiAgdmFyIG91dCA9IFwiXCI7XG4gIHZhciBpO1xuICBoID0gaC5tYXRjaChuZXcgUmVnRXhwKFwiKC57XCIgKyBoLmxlbmd0aCAvIDMgKyBcIn0pXCIsIFwiZ1wiKSk7XG5cbiAgZm9yICggaSA9IDA7IGkgPCBoLmxlbmd0aDsgaSsrICkge1xuICAgIGhbaV0gPSBwYXJzZUludChoW2ldLmxlbmd0aCA9PSAxID8gaFtpXSArIGhbaV0gOiBoW2ldLCAxNik7XG4gIH1cblxuICBpZiAodHlwZW9mIG9wYWNpdHkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGlmKG9wYWNpdHk+MSkgb3BhY2l0eT0xO1xuICAgIGlmKG9wYWNpdHk8MCkgb3BhY2l0eT0wO1xuICAgIGgucHVzaChvcGFjaXR5KTtcbiAgICByZ2IgPSByZ2JhO1xuICB9XG5cbiAgcmV0dXJuIHJnYiArIFwiKFwiICsgaC5qb2luKFwiLFwiKSArIFwiKVwiO1xufVxuXG4vKipcbiAqIGNvbnZlcnQgcmdifGEgdG8gaGV4XG4gKiBAcGFyYW0ge3N0cmluZ30gcmdiYSBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJnYmEyaGV4KHJnYil7XG5cbiAgcmdiID0gcmdiLm1hdGNoKC9ecmdiYT9bXFxzK10/XFwoW1xccytdPyhcXGQrKVtcXHMrXT8sW1xccytdPyhcXGQrKVtcXHMrXT8sW1xccytdPyhcXGQrKVtcXHMrXT8vaSk7XG4gIHJldHVybiAocmdiICYmIHJnYi5sZW5ndGggPT09IDQpID8gXCIjXCIgK1xuICAgIChcIjBcIiArIHBhcnNlSW50KHJnYlsxXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xuICAgIChcIjBcIiArIHBhcnNlSW50KHJnYlsyXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgK1xuICAgIChcIjBcIiArIHBhcnNlSW50KHJnYlszXSwxMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtMikgOiAnJztcbn1cbi8qKlxuICogY29udmVydCBhbnkgY29sb3IgdG8gb2JqIHdpdGgga2V5IGFscGhhIGFuZCBoZXggY29sb3JcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvciBzdHJpbmcuIGUuZy4gaHNsKDEwJSwxMCUsMClcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaGV5T25seSByZXR1cm4gb25seSB0aGUgaGV4IGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yMm9iaihjb2xvcixoZXhPbmx5KXtcbiAgdmFyIGFscGhhO1xuICB2YXIgY29sO1xuICB2YXIgb3V0ID0ge1xuICAgIGFscGhhIDogMSxcbiAgICBjb2xvcjogXCIjMDAwXCJcbiAgfTtcbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIGRpdi5zdHlsZS5jb2xvciA9IGNvbG9yO1xuICBjb2wgPSBkaXYuc3R5bGUuY29sb3I7XG4gIGlmKGNvbCl7XG4gICAgYWxwaGEgPSBjb2wuc3BsaXQoXCIsIFwiKVszXTtcbiAgICBpZihhbHBoYSl7XG4gICAgICBvdXQuYWxwaGEgPSBhbHBoYS5yZXBsYWNlKFwiXFwpXCIsJycpKjE7XG4gICAgfVxuICAgIG91dC5jb2xvciA9IHJnYmEyaGV4KGNvbCk7XG4gIH1cbiAgaWYoaGV4T25seSl7XG4gICBvdXQgPSBvdXQuY29sb3I7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4qIFNjYWxlIGFuIGNlbnRlciB2YWx1ZSB0byBnZXQgYSBoZXggY29sb3IgaW5zaWRlIGJvdW5kc1xuKiBAcGFyYW0ge09iamVjdH0gbyBPcHRpb25zXG4qIEBwYXJhbSB7TnVtYmVyfSBvLnZhbCBWYWx1ZSBcbiogQHBhcmFtIHtOdW1iZXJ9IG8ubWluIE1pbmltdW0gdmFsdWUgb2YgdGhlIHNjYWxlIFxuKiBAcGFyYW0ge051bWJlcn0gby5tYXggTWF4aW11bSB2YWx1ZSBvZiB0aGUgc2NhbGUgXG4qIEBwYXJhbSB7TnVtYmVyfSBvLmNvbE1pbiBNaW5pbXVtIGh1ZSBpbiB0aGUgMC0xIHJhbmdlIFxuKiBAcGFyYW0ge051bWJlcn0gby5jb2xNYXggTWF4aW11bSBodWUgaW4gdGhlIDAtMSByYW5nZVxuKiBAZXhhbXBsZSBcbiogdmFyIHN0YXJ0ID0gIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiogZm9yKHZhciBpPTA7aTwzMDAwO2krKyl7XG4qIGNvbG9yTGluZWFyKHttaW46LTQ1MCxtYXg6MzAwMCx2YWw6aSxjb2xNaW46MCxjb2xNYXg6MC41fSlcbiogfVxuKiBjb25zb2xlLmxvZyhcImRvbmUgaW4gXCIrKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKS1zdGFydCkvMTAwMCArXCIgW3NdXCIpO1xuKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvckxpbmVhcihvKXtcbiAgdmFyIHZhbE1pbiA9IG8ubWluKjF8fDA7XG4gIHZhciB2YWxNYXggPSBvLm1heCoxfHwwO1xuICB2YXIgY29sTWluID0gby5jb2xNaW4qMXx8MDtcbiAgdmFyIGNvbE1heCA9IG8uY29sTWF4KjF8fDE7XG4gIHZhciB2YWwgPSBvLnZhbDtcbiAgdmFyIGNvbDtcbiAgdmFyIGlzUmFuZG9tID0gdmFsTWluID09IHZhbE1heDtcbiAgaWYoIWlzUmFuZG9tKXtcbiAgICBjb2wgPSAodmFsLXZhbE1pbikvKHZhbE1heC12YWxNaW4pO1xuICB9XG4gIGNvbCA9IGNvbCooY29sTWF4LWNvbE1pbik7XG4gIGNvbCA9IHJhbmRvbUhzbCgxLGNvbCk7XG4gIHJldHVybiBjb2xvcjJvYmooY29sLHRydWUpO1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2pzL214X2hlbHBlcl9jb2xvcnMuanMiLCIvKipcbiAqIENhbGxiYWNrIGZvciBjb29yZEVhY2hcbiAqXG4gKiBAY2FsbGJhY2sgY29vcmRFYWNoQ2FsbGJhY2tcbiAqIEBwYXJhbSB7QXJyYXk8bnVtYmVyPn0gY3VycmVudENvb3JkIFRoZSBjdXJyZW50IGNvb3JkaW5hdGUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGNvb3JkSW5kZXggVGhlIGN1cnJlbnQgaW5kZXggb2YgdGhlIGNvb3JkaW5hdGUgYmVpbmcgcHJvY2Vzc2VkLlxuICogU3RhcnRzIGF0IGluZGV4IDAuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBjdXJyZW50IGluZGV4IG9mIHRoZSBmZWF0dXJlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlU3ViSW5kZXggVGhlIGN1cnJlbnQgc3ViSW5kZXggb2YgdGhlIGZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICovXG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGNvb3JkaW5hdGVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5mb3JFYWNoKClcbiAqXG4gKiBAbmFtZSBjb29yZEVhY2hcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258R2VvbWV0cnl8RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKGN1cnJlbnRDb29yZCwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtleGNsdWRlV3JhcENvb3JkPWZhbHNlXSB3aGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIHRoZSBmaW5hbCBjb29yZGluYXRlIG9mIExpbmVhclJpbmdzIHRoYXQgd3JhcHMgdGhlIHJpbmcgaW4gaXRzIGl0ZXJhdGlvbi5cbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgdHVyZi5wb2ludChbMjYsIDM3XSwge1wiZm9vXCI6IFwiYmFyXCJ9KSxcbiAqICAgdHVyZi5wb2ludChbMzYsIDUzXSwge1wiaGVsbG9cIjogXCJ3b3JsZFwifSlcbiAqIF0pO1xuICpcbiAqIHR1cmYuY29vcmRFYWNoKGZlYXR1cmVzLCBmdW5jdGlvbiAoY3VycmVudENvb3JkLCBjb29yZEluZGV4LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICogICAvLz1jdXJyZW50Q29vcmRcbiAqICAgLy89Y29vcmRJbmRleFxuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqICAgLy89ZmVhdHVyZVN1YkluZGV4XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gY29vcmRFYWNoKGdlb2pzb24sIGNhbGxiYWNrLCBleGNsdWRlV3JhcENvb3JkKSB7XG4gICAgLy8gSGFuZGxlcyBudWxsIEdlb21ldHJ5IC0tIFNraXBzIHRoaXMgR2VvSlNPTlxuICAgIGlmIChnZW9qc29uID09PSBudWxsKSByZXR1cm47XG4gICAgdmFyIGZlYXR1cmVJbmRleCwgZ2VvbWV0cnlJbmRleCwgaiwgaywgbCwgZ2VvbWV0cnksIHN0b3BHLCBjb29yZHMsXG4gICAgICAgIGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLFxuICAgICAgICB3cmFwU2hyaW5rID0gMCxcbiAgICAgICAgY29vcmRJbmRleCA9IDAsXG4gICAgICAgIGlzR2VvbWV0cnlDb2xsZWN0aW9uLFxuICAgICAgICB0eXBlID0gZ2VvanNvbi50eXBlLFxuICAgICAgICBpc0ZlYXR1cmVDb2xsZWN0aW9uID0gdHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbiAgICAgICAgaXNGZWF0dXJlID0gdHlwZSA9PT0gJ0ZlYXR1cmUnLFxuICAgICAgICBzdG9wID0gaXNGZWF0dXJlQ29sbGVjdGlvbiA/IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoIDogMTtcblxuICAgIC8vIFRoaXMgbG9naWMgbWF5IGxvb2sgYSBsaXR0bGUgd2VpcmQuIFRoZSByZWFzb24gd2h5IGl0IGlzIHRoYXQgd2F5XG4gICAgLy8gaXMgYmVjYXVzZSBpdCdzIHRyeWluZyB0byBiZSBmYXN0LiBHZW9KU09OIHN1cHBvcnRzIG11bHRpcGxlIGtpbmRzXG4gICAgLy8gb2Ygb2JqZWN0cyBhdCBpdHMgcm9vdDogRmVhdHVyZUNvbGxlY3Rpb24sIEZlYXR1cmVzLCBHZW9tZXRyaWVzLlxuICAgIC8vIFRoaXMgZnVuY3Rpb24gaGFzIHRoZSByZXNwb25zaWJpbGl0eSBvZiBoYW5kbGluZyBhbGwgb2YgdGhlbSwgYW5kIHRoYXRcbiAgICAvLyBtZWFucyB0aGF0IHNvbWUgb2YgdGhlIGBmb3JgIGxvb3BzIHlvdSBzZWUgYmVsb3cgYWN0dWFsbHkganVzdCBkb24ndCBhcHBseVxuICAgIC8vIHRvIGNlcnRhaW4gaW5wdXRzLiBGb3IgaW5zdGFuY2UsIGlmIHlvdSBnaXZlIHRoaXMganVzdCBhXG4gICAgLy8gUG9pbnQgZ2VvbWV0cnksIHRoZW4gYm90aCBsb29wcyBhcmUgc2hvcnQtY2lyY3VpdGVkIGFuZCBhbGwgd2UgZG9cbiAgICAvLyBpcyBncmFkdWFsbHkgcmVuYW1lIHRoZSBpbnB1dCB1bnRpbCBpdCdzIGNhbGxlZCAnZ2VvbWV0cnknLlxuICAgIC8vXG4gICAgLy8gVGhpcyBhbHNvIGFpbXMgdG8gYWxsb2NhdGUgYXMgZmV3IHJlc291cmNlcyBhcyBwb3NzaWJsZToganVzdCBhXG4gICAgLy8gZmV3IG51bWJlcnMgYW5kIGJvb2xlYW5zLCByYXRoZXIgdGhhbiBhbnkgdGVtcG9yYXJ5IGFycmF5cyBhcyB3b3VsZFxuICAgIC8vIGJlIHJlcXVpcmVkIHdpdGggdGhlIG5vcm1hbGl6YXRpb24gYXBwcm9hY2guXG4gICAgZm9yIChmZWF0dXJlSW5kZXggPSAwOyBmZWF0dXJlSW5kZXggPCBzdG9wOyBmZWF0dXJlSW5kZXgrKykge1xuICAgICAgICB2YXIgZmVhdHVyZVN1YkluZGV4ID0gMDtcblxuICAgICAgICBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbiA9IChpc0ZlYXR1cmVDb2xsZWN0aW9uID8gZ2VvanNvbi5mZWF0dXJlc1tmZWF0dXJlSW5kZXhdLmdlb21ldHJ5IDpcbiAgICAgICAgKGlzRmVhdHVyZSA/IGdlb2pzb24uZ2VvbWV0cnkgOiBnZW9qc29uKSk7XG4gICAgICAgIGlzR2VvbWV0cnlDb2xsZWN0aW9uID0gKGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uKSA/IGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLnR5cGUgPT09ICdHZW9tZXRyeUNvbGxlY3Rpb24nIDogZmFsc2U7XG4gICAgICAgIHN0b3BHID0gaXNHZW9tZXRyeUNvbGxlY3Rpb24gPyBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbi5nZW9tZXRyaWVzLmxlbmd0aCA6IDE7XG5cbiAgICAgICAgZm9yIChnZW9tZXRyeUluZGV4ID0gMDsgZ2VvbWV0cnlJbmRleCA8IHN0b3BHOyBnZW9tZXRyeUluZGV4KyspIHtcbiAgICAgICAgICAgIGdlb21ldHJ5ID0gaXNHZW9tZXRyeUNvbGxlY3Rpb24gP1xuICAgICAgICAgICAgZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24uZ2VvbWV0cmllc1tnZW9tZXRyeUluZGV4XSA6IGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGVzIG51bGwgR2VvbWV0cnkgLS0gU2tpcHMgdGhpcyBnZW9tZXRyeVxuICAgICAgICAgICAgaWYgKGdlb21ldHJ5ID09PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgICAgIGNvb3JkcyA9IGdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuICAgICAgICAgICAgdmFyIGdlb21UeXBlID0gZ2VvbWV0cnkudHlwZTtcblxuICAgICAgICAgICAgd3JhcFNocmluayA9IChleGNsdWRlV3JhcENvb3JkICYmIChnZW9tVHlwZSA9PT0gJ1BvbHlnb24nIHx8IGdlb21UeXBlID09PSAnTXVsdGlQb2x5Z29uJykpID8gMSA6IDA7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoZ2VvbVR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgbnVsbDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhjb29yZHMsIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICAgICAgICAgICAgICBjb29yZEluZGV4Kys7XG4gICAgICAgICAgICAgICAgZmVhdHVyZVN1YkluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdMaW5lU3RyaW5nJzpcbiAgICAgICAgICAgIGNhc2UgJ011bHRpUG9pbnQnOlxuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjb29yZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY29vcmRzW2pdLCBjb29yZEluZGV4LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZVN1YkluZGV4Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgICAgICBjYXNlICdNdWx0aUxpbmVTdHJpbmcnOlxuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjb29yZHMubGVuZ3RoOyBqKyspXG4gICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBjb29yZHNbal0ubGVuZ3RoIC0gd3JhcFNocmluazsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhjb29yZHNbal1ba10sIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmVTdWJJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdNdWx0aVBvbHlnb24nOlxuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjb29yZHMubGVuZ3RoOyBqKyspXG4gICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBjb29yZHNbal0ubGVuZ3RoOyBrKyspXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGwgPSAwOyBsIDwgY29vcmRzW2pdW2tdLmxlbmd0aCAtIHdyYXBTaHJpbms7IGwrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGNvb3Jkc1tqXVtrXVtsXSwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlU3ViSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0dlb21ldHJ5Q29sbGVjdGlvbic6XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGdlb21ldHJ5Lmdlb21ldHJpZXMubGVuZ3RoOyBqKyspXG4gICAgICAgICAgICAgICAgICAgIGNvb3JkRWFjaChnZW9tZXRyeS5nZW9tZXRyaWVzW2pdLCBjYWxsYmFjaywgZXhjbHVkZVdyYXBDb29yZCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gR2VvbWV0cnkgVHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBjb29yZFJlZHVjZVxuICpcbiAqIFRoZSBmaXJzdCB0aW1lIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSB2YWx1ZXMgcHJvdmlkZWQgYXMgYXJndW1lbnRzIGRlcGVuZFxuICogb24gd2hldGhlciB0aGUgcmVkdWNlIG1ldGhvZCBoYXMgYW4gaW5pdGlhbFZhbHVlIGFyZ3VtZW50LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCB0byB0aGUgcmVkdWNlIG1ldGhvZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIGluaXRpYWxWYWx1ZS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBub3QgcHJvdmlkZWQ6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgc2Vjb25kIGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogQGNhbGxiYWNrIGNvb3JkUmVkdWNlQ2FsbGJhY2tcbiAqIEBwYXJhbSB7Kn0gcHJldmlvdXNWYWx1ZSBUaGUgYWNjdW11bGF0ZWQgdmFsdWUgcHJldmlvdXNseSByZXR1cm5lZCBpbiB0aGUgbGFzdCBpbnZvY2F0aW9uXG4gKiBvZiB0aGUgY2FsbGJhY2ssIG9yIGluaXRpYWxWYWx1ZSwgaWYgc3VwcGxpZWQuXG4gKiBAcGFyYW0ge0FycmF5PG51bWJlcj59IGN1cnJlbnRDb29yZCBUaGUgY3VycmVudCBjb29yZGluYXRlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBjb29yZEluZGV4IFRoZSBjdXJyZW50IGluZGV4IG9mIHRoZSBjb29yZGluYXRlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIFN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlSW5kZXggVGhlIGN1cnJlbnQgaW5kZXggb2YgdGhlIGZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVTdWJJbmRleCBUaGUgY3VycmVudCBzdWJJbmRleCBvZiB0aGUgZmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKi9cblxuLyoqXG4gKiBSZWR1Y2UgY29vcmRpbmF0ZXMgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvIEFycmF5LnJlZHVjZSgpXG4gKlxuICogQG5hbWUgY29vcmRSZWR1Y2VcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258R2VvbWV0cnl8RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRDb29yZCwgY29vcmRJbmRleClcbiAqIEBwYXJhbSB7Kn0gW2luaXRpYWxWYWx1ZV0gVmFsdWUgdG8gdXNlIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiB0aGUgY2FsbGJhY2suXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtleGNsdWRlV3JhcENvb3JkPWZhbHNlXSB3aGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIHRoZSBmaW5hbCBjb29yZGluYXRlIG9mIExpbmVhclJpbmdzIHRoYXQgd3JhcHMgdGhlIHJpbmcgaW4gaXRzIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgdGhhdCByZXN1bHRzIGZyb20gdGhlIHJlZHVjdGlvbi5cbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgdHVyZi5wb2ludChbMjYsIDM3XSwge1wiZm9vXCI6IFwiYmFyXCJ9KSxcbiAqICAgdHVyZi5wb2ludChbMzYsIDUzXSwge1wiaGVsbG9cIjogXCJ3b3JsZFwifSlcbiAqIF0pO1xuICpcbiAqIHR1cmYuY29vcmRSZWR1Y2UoZmVhdHVyZXMsIGZ1bmN0aW9uIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50Q29vcmQsIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gKiAgIC8vPXByZXZpb3VzVmFsdWVcbiAqICAgLy89Y3VycmVudENvb3JkXG4gKiAgIC8vPWNvb3JkSW5kZXhcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIC8vPWZlYXR1cmVTdWJJbmRleFxuICogICByZXR1cm4gY3VycmVudENvb3JkO1xuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGNvb3JkUmVkdWNlKGdlb2pzb24sIGNhbGxiYWNrLCBpbml0aWFsVmFsdWUsIGV4Y2x1ZGVXcmFwQ29vcmQpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICBjb29yZEVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGN1cnJlbnRDb29yZCwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpIHtcbiAgICAgICAgaWYgKGNvb3JkSW5kZXggPT09IDAgJiYgaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHByZXZpb3VzVmFsdWUgPSBjdXJyZW50Q29vcmQ7XG4gICAgICAgIGVsc2UgcHJldmlvdXNWYWx1ZSA9IGNhbGxiYWNrKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRDb29yZCwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgIH0sIGV4Y2x1ZGVXcmFwQ29vcmQpO1xuICAgIHJldHVybiBwcmV2aW91c1ZhbHVlO1xufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBwcm9wRWFjaFxuICpcbiAqIEBjYWxsYmFjayBwcm9wRWFjaENhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gY3VycmVudFByb3BlcnRpZXMgVGhlIGN1cnJlbnQgcHJvcGVydGllcyBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LlN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqL1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBwcm9wZXJ0aWVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5mb3JFYWNoKClcbiAqXG4gKiBAbmFtZSBwcm9wRWFjaFxuICogQHBhcmFtIHtGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAoY3VycmVudFByb3BlcnRpZXMsIGZlYXR1cmVJbmRleClcbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLnByb3BFYWNoKGZlYXR1cmVzLCBmdW5jdGlvbiAoY3VycmVudFByb3BlcnRpZXMsIGZlYXR1cmVJbmRleCkge1xuICogICAvLz1jdXJyZW50UHJvcGVydGllc1xuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBwcm9wRWFjaChnZW9qc29uLCBjYWxsYmFjaykge1xuICAgIHZhciBpO1xuICAgIHN3aXRjaCAoZ2VvanNvbi50eXBlKSB7XG4gICAgY2FzZSAnRmVhdHVyZUNvbGxlY3Rpb24nOlxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2FsbGJhY2soZ2VvanNvbi5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLCBpKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICBjYXNlICdGZWF0dXJlJzpcbiAgICAgICAgY2FsbGJhY2soZ2VvanNvbi5wcm9wZXJ0aWVzLCAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIHByb3BSZWR1Y2VcbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgdmFsdWVzIHByb3ZpZGVkIGFzIGFyZ3VtZW50cyBkZXBlbmRcbiAqIG9uIHdoZXRoZXIgdGhlIHJlZHVjZSBtZXRob2QgaGFzIGFuIGluaXRpYWxWYWx1ZSBhcmd1bWVudC5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQgdG8gdGhlIHJlZHVjZSBtZXRob2Q6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyBpbml0aWFsVmFsdWUuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgbm90IHByb3ZpZGVkOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIHNlY29uZCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIEBjYWxsYmFjayBwcm9wUmVkdWNlQ2FsbGJhY2tcbiAqIEBwYXJhbSB7Kn0gcHJldmlvdXNWYWx1ZSBUaGUgYWNjdW11bGF0ZWQgdmFsdWUgcHJldmlvdXNseSByZXR1cm5lZCBpbiB0aGUgbGFzdCBpbnZvY2F0aW9uXG4gKiBvZiB0aGUgY2FsbGJhY2ssIG9yIGluaXRpYWxWYWx1ZSwgaWYgc3VwcGxpZWQuXG4gKiBAcGFyYW0geyp9IGN1cnJlbnRQcm9wZXJ0aWVzIFRoZSBjdXJyZW50IHByb3BlcnRpZXMgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS5TdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKi9cblxuLyoqXG4gKiBSZWR1Y2UgcHJvcGVydGllcyBpbiBhbnkgR2VvSlNPTiBvYmplY3QgaW50byBhIHNpbmdsZSB2YWx1ZSxcbiAqIHNpbWlsYXIgdG8gaG93IEFycmF5LnJlZHVjZSB3b3Jrcy4gSG93ZXZlciwgaW4gdGhpcyBjYXNlIHdlIGxhemlseSBydW5cbiAqIHRoZSByZWR1Y3Rpb24sIHNvIGFuIGFycmF5IG9mIGFsbCBwcm9wZXJ0aWVzIGlzIHVubmVjZXNzYXJ5LlxuICpcbiAqIEBuYW1lIHByb3BSZWR1Y2VcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRQcm9wZXJ0aWVzLCBmZWF0dXJlSW5kZXgpXG4gKiBAcGFyYW0geyp9IFtpbml0aWFsVmFsdWVdIFZhbHVlIHRvIHVzZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgdGhlIGNhbGxiYWNrLlxuICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSB0aGF0IHJlc3VsdHMgZnJvbSB0aGUgcmVkdWN0aW9uLlxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtmb286ICdiYXInfSksXG4gKiAgICAgdHVyZi5wb2ludChbMzYsIDUzXSwge2hlbGxvOiAnd29ybGQnfSlcbiAqIF0pO1xuICpcbiAqIHR1cmYucHJvcFJlZHVjZShmZWF0dXJlcywgZnVuY3Rpb24gKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRQcm9wZXJ0aWVzLCBmZWF0dXJlSW5kZXgpIHtcbiAqICAgLy89cHJldmlvdXNWYWx1ZVxuICogICAvLz1jdXJyZW50UHJvcGVydGllc1xuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqICAgcmV0dXJuIGN1cnJlbnRQcm9wZXJ0aWVzXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gcHJvcFJlZHVjZShnZW9qc29uLCBjYWxsYmFjaywgaW5pdGlhbFZhbHVlKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBpbml0aWFsVmFsdWU7XG4gICAgcHJvcEVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGN1cnJlbnRQcm9wZXJ0aWVzLCBmZWF0dXJlSW5kZXgpIHtcbiAgICAgICAgaWYgKGZlYXR1cmVJbmRleCA9PT0gMCAmJiBpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkgcHJldmlvdXNWYWx1ZSA9IGN1cnJlbnRQcm9wZXJ0aWVzO1xuICAgICAgICBlbHNlIHByZXZpb3VzVmFsdWUgPSBjYWxsYmFjayhwcmV2aW91c1ZhbHVlLCBjdXJyZW50UHJvcGVydGllcywgZmVhdHVyZUluZGV4KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJldmlvdXNWYWx1ZTtcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgZmVhdHVyZUVhY2hcbiAqXG4gKiBAY2FsbGJhY2sgZmVhdHVyZUVhY2hDYWxsYmFja1xuICogQHBhcmFtIHtGZWF0dXJlPGFueT59IGN1cnJlbnRGZWF0dXJlIFRoZSBjdXJyZW50IGZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS5TdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKi9cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgZmVhdHVyZXMgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvXG4gKiBBcnJheS5mb3JFYWNoLlxuICpcbiAqIEBuYW1lIGZlYXR1cmVFYWNoXG4gKiBAcGFyYW0ge0dlb21ldHJ5fEZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4KVxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICB0dXJmLnBvaW50KFszNiwgNTNdLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdHVyZi5mZWF0dXJlRWFjaChmZWF0dXJlcywgZnVuY3Rpb24gKGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgpIHtcbiAqICAgLy89Y3VycmVudEZlYXR1cmVcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gZmVhdHVyZUVhY2goZ2VvanNvbiwgY2FsbGJhY2spIHtcbiAgICBpZiAoZ2VvanNvbi50eXBlID09PSAnRmVhdHVyZScpIHtcbiAgICAgICAgY2FsbGJhY2soZ2VvanNvbiwgMCk7XG4gICAgfSBlbHNlIGlmIChnZW9qc29uLnR5cGUgPT09ICdGZWF0dXJlQ29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhnZW9qc29uLmZlYXR1cmVzW2ldLCBpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgZmVhdHVyZVJlZHVjZVxuICpcbiAqIFRoZSBmaXJzdCB0aW1lIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSB2YWx1ZXMgcHJvdmlkZWQgYXMgYXJndW1lbnRzIGRlcGVuZFxuICogb24gd2hldGhlciB0aGUgcmVkdWNlIG1ldGhvZCBoYXMgYW4gaW5pdGlhbFZhbHVlIGFyZ3VtZW50LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCB0byB0aGUgcmVkdWNlIG1ldGhvZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIGluaXRpYWxWYWx1ZS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBub3QgcHJvdmlkZWQ6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgc2Vjb25kIGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogQGNhbGxiYWNrIGZlYXR1cmVSZWR1Y2VDYWxsYmFja1xuICogQHBhcmFtIHsqfSBwcmV2aW91c1ZhbHVlIFRoZSBhY2N1bXVsYXRlZCB2YWx1ZSBwcmV2aW91c2x5IHJldHVybmVkIGluIHRoZSBsYXN0IGludm9jYXRpb25cbiAqIG9mIHRoZSBjYWxsYmFjaywgb3IgaW5pdGlhbFZhbHVlLCBpZiBzdXBwbGllZC5cbiAqIEBwYXJhbSB7RmVhdHVyZX0gY3VycmVudEZlYXR1cmUgVGhlIGN1cnJlbnQgRmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LlN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqL1xuXG4vKipcbiAqIFJlZHVjZSBmZWF0dXJlcyBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkucmVkdWNlKCkuXG4gKlxuICogQG5hbWUgZmVhdHVyZVJlZHVjZVxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAocHJldmlvdXNWYWx1ZSwgY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleClcbiAqIEBwYXJhbSB7Kn0gW2luaXRpYWxWYWx1ZV0gVmFsdWUgdG8gdXNlIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiB0aGUgY2FsbGJhY2suXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHZhbHVlIHRoYXQgcmVzdWx0cyBmcm9tIHRoZSByZWR1Y3Rpb24uXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtcImZvb1wiOiBcImJhclwifSksXG4gKiAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtcImhlbGxvXCI6IFwid29ybGRcIn0pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmZlYXR1cmVSZWR1Y2UoZmVhdHVyZXMsIGZ1bmN0aW9uIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4KSB7XG4gKiAgIC8vPXByZXZpb3VzVmFsdWVcbiAqICAgLy89Y3VycmVudEZlYXR1cmVcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIHJldHVybiBjdXJyZW50RmVhdHVyZVxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGZlYXR1cmVSZWR1Y2UoZ2VvanNvbiwgY2FsbGJhY2ssIGluaXRpYWxWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gaW5pdGlhbFZhbHVlO1xuICAgIGZlYXR1cmVFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4KSB7XG4gICAgICAgIGlmIChmZWF0dXJlSW5kZXggPT09IDAgJiYgaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHByZXZpb3VzVmFsdWUgPSBjdXJyZW50RmVhdHVyZTtcbiAgICAgICAgZWxzZSBwcmV2aW91c1ZhbHVlID0gY2FsbGJhY2socHJldmlvdXNWYWx1ZSwgY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZXZpb3VzVmFsdWU7XG59XG5cbi8qKlxuICogR2V0IGFsbCBjb29yZGluYXRlcyBmcm9tIGFueSBHZW9KU09OIG9iamVjdC5cbiAqXG4gKiBAbmFtZSBjb29yZEFsbFxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHJldHVybnMge0FycmF5PEFycmF5PG51bWJlcj4+fSBjb29yZGluYXRlIHBvc2l0aW9uIGFycmF5XG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtmb286ICdiYXInfSksXG4gKiAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB2YXIgY29vcmRzID0gdHVyZi5jb29yZEFsbChmZWF0dXJlcyk7XG4gKiAvLz0gW1syNiwgMzddLCBbMzYsIDUzXV1cbiAqL1xuZnVuY3Rpb24gY29vcmRBbGwoZ2VvanNvbikge1xuICAgIHZhciBjb29yZHMgPSBbXTtcbiAgICBjb29yZEVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGNvb3JkKSB7XG4gICAgICAgIGNvb3Jkcy5wdXNoKGNvb3JkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29vcmRzO1xufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBnZW9tRWFjaFxuICpcbiAqIEBjYWxsYmFjayBnZW9tRWFjaENhbGxiYWNrXG4gKiBAcGFyYW0ge0dlb21ldHJ5fSBjdXJyZW50R2VvbWV0cnkgVGhlIGN1cnJlbnQgZ2VvbWV0cnkgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRQcm9wZXJ0aWVzIFRoZSBjdXJyZW50IGZlYXR1cmUgcHJvcGVydGllcyBiZWluZyBwcm9jZXNzZWQuXG4gKi9cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgZWFjaCBnZW9tZXRyeSBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkuZm9yRWFjaCgpXG4gKlxuICogQG5hbWUgZ2VvbUVhY2hcbiAqIEBwYXJhbSB7R2VvbWV0cnl8RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKGN1cnJlbnRHZW9tZXRyeSwgZmVhdHVyZUluZGV4LCBjdXJyZW50UHJvcGVydGllcylcbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmdlb21FYWNoKGZlYXR1cmVzLCBmdW5jdGlvbiAoY3VycmVudEdlb21ldHJ5LCBmZWF0dXJlSW5kZXgsIGN1cnJlbnRQcm9wZXJ0aWVzKSB7XG4gKiAgIC8vPWN1cnJlbnRHZW9tZXRyeVxuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqICAgLy89Y3VycmVudFByb3BlcnRpZXNcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBnZW9tRWFjaChnZW9qc29uLCBjYWxsYmFjaykge1xuICAgIHZhciBpLCBqLCBnLCBnZW9tZXRyeSwgc3RvcEcsXG4gICAgICAgIGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLFxuICAgICAgICBpc0dlb21ldHJ5Q29sbGVjdGlvbixcbiAgICAgICAgZ2VvbWV0cnlQcm9wZXJ0aWVzLFxuICAgICAgICBmZWF0dXJlSW5kZXggPSAwLFxuICAgICAgICBpc0ZlYXR1cmVDb2xsZWN0aW9uID0gZ2VvanNvbi50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nLFxuICAgICAgICBpc0ZlYXR1cmUgPSBnZW9qc29uLnR5cGUgPT09ICdGZWF0dXJlJyxcbiAgICAgICAgc3RvcCA9IGlzRmVhdHVyZUNvbGxlY3Rpb24gPyBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aCA6IDE7XG5cbiAgLy8gVGhpcyBsb2dpYyBtYXkgbG9vayBhIGxpdHRsZSB3ZWlyZC4gVGhlIHJlYXNvbiB3aHkgaXQgaXMgdGhhdCB3YXlcbiAgLy8gaXMgYmVjYXVzZSBpdCdzIHRyeWluZyB0byBiZSBmYXN0LiBHZW9KU09OIHN1cHBvcnRzIG11bHRpcGxlIGtpbmRzXG4gIC8vIG9mIG9iamVjdHMgYXQgaXRzIHJvb3Q6IEZlYXR1cmVDb2xsZWN0aW9uLCBGZWF0dXJlcywgR2VvbWV0cmllcy5cbiAgLy8gVGhpcyBmdW5jdGlvbiBoYXMgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIGhhbmRsaW5nIGFsbCBvZiB0aGVtLCBhbmQgdGhhdFxuICAvLyBtZWFucyB0aGF0IHNvbWUgb2YgdGhlIGBmb3JgIGxvb3BzIHlvdSBzZWUgYmVsb3cgYWN0dWFsbHkganVzdCBkb24ndCBhcHBseVxuICAvLyB0byBjZXJ0YWluIGlucHV0cy4gRm9yIGluc3RhbmNlLCBpZiB5b3UgZ2l2ZSB0aGlzIGp1c3QgYVxuICAvLyBQb2ludCBnZW9tZXRyeSwgdGhlbiBib3RoIGxvb3BzIGFyZSBzaG9ydC1jaXJjdWl0ZWQgYW5kIGFsbCB3ZSBkb1xuICAvLyBpcyBncmFkdWFsbHkgcmVuYW1lIHRoZSBpbnB1dCB1bnRpbCBpdCdzIGNhbGxlZCAnZ2VvbWV0cnknLlxuICAvL1xuICAvLyBUaGlzIGFsc28gYWltcyB0byBhbGxvY2F0ZSBhcyBmZXcgcmVzb3VyY2VzIGFzIHBvc3NpYmxlOiBqdXN0IGFcbiAgLy8gZmV3IG51bWJlcnMgYW5kIGJvb2xlYW5zLCByYXRoZXIgdGhhbiBhbnkgdGVtcG9yYXJ5IGFycmF5cyBhcyB3b3VsZFxuICAvLyBiZSByZXF1aXJlZCB3aXRoIHRoZSBub3JtYWxpemF0aW9uIGFwcHJvYWNoLlxuICAgIGZvciAoaSA9IDA7IGkgPCBzdG9wOyBpKyspIHtcblxuICAgICAgICBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbiA9IChpc0ZlYXR1cmVDb2xsZWN0aW9uID8gZ2VvanNvbi5mZWF0dXJlc1tpXS5nZW9tZXRyeSA6XG4gICAgICAgIChpc0ZlYXR1cmUgPyBnZW9qc29uLmdlb21ldHJ5IDogZ2VvanNvbikpO1xuICAgICAgICBnZW9tZXRyeVByb3BlcnRpZXMgPSAoaXNGZWF0dXJlQ29sbGVjdGlvbiA/IGdlb2pzb24uZmVhdHVyZXNbaV0ucHJvcGVydGllcyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoaXNGZWF0dXJlID8gZ2VvanNvbi5wcm9wZXJ0aWVzIDoge30pKTtcbiAgICAgICAgaXNHZW9tZXRyeUNvbGxlY3Rpb24gPSAoZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24pID8gZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24udHlwZSA9PT0gJ0dlb21ldHJ5Q29sbGVjdGlvbicgOiBmYWxzZTtcbiAgICAgICAgc3RvcEcgPSBpc0dlb21ldHJ5Q29sbGVjdGlvbiA/IGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLmdlb21ldHJpZXMubGVuZ3RoIDogMTtcblxuICAgICAgICBmb3IgKGcgPSAwOyBnIDwgc3RvcEc7IGcrKykge1xuICAgICAgICAgICAgZ2VvbWV0cnkgPSBpc0dlb21ldHJ5Q29sbGVjdGlvbiA/XG4gICAgICAgICAgICBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbi5nZW9tZXRyaWVzW2ddIDogZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb247XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBudWxsIEdlb21ldHJ5XG4gICAgICAgICAgICBpZiAoZ2VvbWV0cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBmZWF0dXJlSW5kZXgsIGdlb21ldHJ5UHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgZmVhdHVyZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKGdlb21ldHJ5LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgICAgICAgIGNhc2UgJ0xpbmVTdHJpbmcnOlxuICAgICAgICAgICAgY2FzZSAnTXVsdGlQb2ludCc6XG4gICAgICAgICAgICBjYXNlICdQb2x5Z29uJzpcbiAgICAgICAgICAgIGNhc2UgJ011bHRpTGluZVN0cmluZyc6XG4gICAgICAgICAgICBjYXNlICdNdWx0aVBvbHlnb24nOiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZ2VvbWV0cnksIGZlYXR1cmVJbmRleCwgZ2VvbWV0cnlQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXgrKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ0dlb21ldHJ5Q29sbGVjdGlvbic6IHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbWV0cnkuZ2VvbWV0cmllcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhnZW9tZXRyeS5nZW9tZXRyaWVzW2pdLCBmZWF0dXJlSW5kZXgsIGdlb21ldHJ5UHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignVW5rbm93biBHZW9tZXRyeSBUeXBlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGdlb21SZWR1Y2VcbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgdmFsdWVzIHByb3ZpZGVkIGFzIGFyZ3VtZW50cyBkZXBlbmRcbiAqIG9uIHdoZXRoZXIgdGhlIHJlZHVjZSBtZXRob2QgaGFzIGFuIGluaXRpYWxWYWx1ZSBhcmd1bWVudC5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQgdG8gdGhlIHJlZHVjZSBtZXRob2Q6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyBpbml0aWFsVmFsdWUuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgbm90IHByb3ZpZGVkOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIHNlY29uZCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIEBjYWxsYmFjayBnZW9tUmVkdWNlQ2FsbGJhY2tcbiAqIEBwYXJhbSB7Kn0gcHJldmlvdXNWYWx1ZSBUaGUgYWNjdW11bGF0ZWQgdmFsdWUgcHJldmlvdXNseSByZXR1cm5lZCBpbiB0aGUgbGFzdCBpbnZvY2F0aW9uXG4gKiBvZiB0aGUgY2FsbGJhY2ssIG9yIGluaXRpYWxWYWx1ZSwgaWYgc3VwcGxpZWQuXG4gKiBAcGFyYW0ge0dlb21ldHJ5fSBjdXJyZW50R2VvbWV0cnkgVGhlIGN1cnJlbnQgRmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gY3VycmVudEluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LlN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjdXJyZW50UHJvcGVydGllcyBUaGUgY3VycmVudCBmZWF0dXJlIHByb3BlcnRpZXMgYmVpbmcgcHJvY2Vzc2VkLlxuICovXG5cbi8qKlxuICogUmVkdWNlIGdlb21ldHJ5IGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5yZWR1Y2UoKS5cbiAqXG4gKiBAbmFtZSBnZW9tUmVkdWNlXG4gKiBAcGFyYW0ge0dlb21ldHJ5fEZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50R2VvbWV0cnksIGZlYXR1cmVJbmRleCwgY3VycmVudFByb3BlcnRpZXMpXG4gKiBAcGFyYW0geyp9IFtpbml0aWFsVmFsdWVdIFZhbHVlIHRvIHVzZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgdGhlIGNhbGxiYWNrLlxuICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSB0aGF0IHJlc3VsdHMgZnJvbSB0aGUgcmVkdWN0aW9uLlxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtmb286ICdiYXInfSksXG4gKiAgICAgdHVyZi5wb2ludChbMzYsIDUzXSwge2hlbGxvOiAnd29ybGQnfSlcbiAqIF0pO1xuICpcbiAqIHR1cmYuZ2VvbVJlZHVjZShmZWF0dXJlcywgZnVuY3Rpb24gKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRHZW9tZXRyeSwgZmVhdHVyZUluZGV4LCBjdXJyZW50UHJvcGVydGllcykge1xuICogICAvLz1wcmV2aW91c1ZhbHVlXG4gKiAgIC8vPWN1cnJlbnRHZW9tZXRyeVxuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqICAgLy89Y3VycmVudFByb3BlcnRpZXNcbiAqICAgcmV0dXJuIGN1cnJlbnRHZW9tZXRyeVxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGdlb21SZWR1Y2UoZ2VvanNvbiwgY2FsbGJhY2ssIGluaXRpYWxWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gaW5pdGlhbFZhbHVlO1xuICAgIGdlb21FYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjdXJyZW50R2VvbWV0cnksIGN1cnJlbnRJbmRleCwgY3VycmVudFByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA9PT0gMCAmJiBpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkgcHJldmlvdXNWYWx1ZSA9IGN1cnJlbnRHZW9tZXRyeTtcbiAgICAgICAgZWxzZSBwcmV2aW91c1ZhbHVlID0gY2FsbGJhY2socHJldmlvdXNWYWx1ZSwgY3VycmVudEdlb21ldHJ5LCBjdXJyZW50SW5kZXgsIGN1cnJlbnRQcm9wZXJ0aWVzKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJldmlvdXNWYWx1ZTtcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgZmxhdHRlbkVhY2hcbiAqXG4gKiBAY2FsbGJhY2sgZmxhdHRlbkVhY2hDYWxsYmFja1xuICogQHBhcmFtIHtGZWF0dXJlfSBjdXJyZW50RmVhdHVyZSBUaGUgY3VycmVudCBmbGF0dGVuZWQgZmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LiBTdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZVN1YkluZGV4IFRoZSBzdWJpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LiBTdGFydHMgYXQgaW5kZXggMCBhbmQgaW5jcmVhc2VzIGlmIHRoZSBmbGF0dGVuZWQgZmVhdHVyZSB3YXMgYSBtdWx0aS1nZW9tZXRyeS5cbiAqL1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBmbGF0dGVuZWQgZmVhdHVyZXMgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvXG4gKiBBcnJheS5mb3JFYWNoLlxuICpcbiAqIEBuYW1lIGZsYXR0ZW5FYWNoXG4gKiBAcGFyYW0ge0dlb21ldHJ5fEZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgICAgdHVyZi5wb2ludChbMjYsIDM3XSwge2ZvbzogJ2Jhcid9KSxcbiAqICAgICB0dXJmLm11bHRpUG9pbnQoW1s0MCwgMzBdLCBbMzYsIDUzXV0sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmZsYXR0ZW5FYWNoKGZlYXR1cmVzLCBmdW5jdGlvbiAoY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gKiAgIC8vPWN1cnJlbnRGZWF0dXJlXG4gKiAgIC8vPWZlYXR1cmVJbmRleFxuICogICAvLz1mZWF0dXJlU3ViSW5kZXhcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBmbGF0dGVuRWFjaChnZW9qc29uLCBjYWxsYmFjaykge1xuICAgIGdlb21FYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChnZW9tZXRyeSwgZmVhdHVyZUluZGV4LCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIC8vIENhbGxiYWNrIGZvciBzaW5nbGUgZ2VvbWV0cnlcbiAgICAgICAgdmFyIHR5cGUgPSAoZ2VvbWV0cnkgPT09IG51bGwpID8gbnVsbCA6IGdlb21ldHJ5LnR5cGU7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIG51bGw6XG4gICAgICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgICAgY2FzZSAnTGluZVN0cmluZyc6XG4gICAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICAgICAgY2FsbGJhY2soZmVhdHVyZShnZW9tZXRyeSwgcHJvcGVydGllcyksIGZlYXR1cmVJbmRleCwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZ2VvbVR5cGU7XG5cbiAgICAgICAgLy8gQ2FsbGJhY2sgZm9yIG11bHRpLWdlb21ldHJ5XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdNdWx0aVBvaW50JzpcbiAgICAgICAgICAgIGdlb21UeXBlID0gJ1BvaW50JztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdNdWx0aUxpbmVTdHJpbmcnOlxuICAgICAgICAgICAgZ2VvbVR5cGUgPSAnTGluZVN0cmluZyc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgICAgICAgIGdlb21UeXBlID0gJ1BvbHlnb24nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBnZW9tZXRyeS5jb29yZGluYXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChjb29yZGluYXRlLCBmZWF0dXJlU3ViSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBnZW9tID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGdlb21UeXBlLFxuICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZGluYXRlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2FsbGJhY2soZmVhdHVyZShnZW9tLCBwcm9wZXJ0aWVzKSwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBmbGF0dGVuUmVkdWNlXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHZhbHVlcyBwcm92aWRlZCBhcyBhcmd1bWVudHMgZGVwZW5kXG4gKiBvbiB3aGV0aGVyIHRoZSByZWR1Y2UgbWV0aG9kIGhhcyBhbiBpbml0aWFsVmFsdWUgYXJndW1lbnQuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkIHRvIHRoZSByZWR1Y2UgbWV0aG9kOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgaW5pdGlhbFZhbHVlLlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIG5vdCBwcm92aWRlZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBzZWNvbmQgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBAY2FsbGJhY2sgZmxhdHRlblJlZHVjZUNhbGxiYWNrXG4gKiBAcGFyYW0geyp9IHByZXZpb3VzVmFsdWUgVGhlIGFjY3VtdWxhdGVkIHZhbHVlIHByZXZpb3VzbHkgcmV0dXJuZWQgaW4gdGhlIGxhc3QgaW52b2NhdGlvblxuICogb2YgdGhlIGNhbGxiYWNrLCBvciBpbml0aWFsVmFsdWUsIGlmIHN1cHBsaWVkLlxuICogQHBhcmFtIHtGZWF0dXJlfSBjdXJyZW50RmVhdHVyZSBUaGUgY3VycmVudCBGZWF0dXJlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlSW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVTdWJJbmRleCBUaGUgc3ViaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAgYW5kIGluY3JlYXNlcyBpZiB0aGUgZmxhdHRlbmVkIGZlYXR1cmUgd2FzIGEgbXVsdGktZ2VvbWV0cnkuXG4gKi9cblxuLyoqXG4gKiBSZWR1Y2UgZmxhdHRlbmVkIGZlYXR1cmVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5yZWR1Y2UoKS5cbiAqXG4gKiBAbmFtZSBmbGF0dGVuUmVkdWNlXG4gKiBAcGFyYW0ge0dlb21ldHJ5fEZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpXG4gKiBAcGFyYW0geyp9IFtpbml0aWFsVmFsdWVdIFZhbHVlIHRvIHVzZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgdGhlIGNhbGxiYWNrLlxuICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSB0aGF0IHJlc3VsdHMgZnJvbSB0aGUgcmVkdWN0aW9uLlxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtmb286ICdiYXInfSksXG4gKiAgICAgdHVyZi5tdWx0aVBvaW50KFtbNDAsIDMwXSwgWzM2LCA1M11dLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdHVyZi5mbGF0dGVuUmVkdWNlKGZlYXR1cmVzLCBmdW5jdGlvbiAocHJldmlvdXNWYWx1ZSwgY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gKiAgIC8vPXByZXZpb3VzVmFsdWVcbiAqICAgLy89Y3VycmVudEZlYXR1cmVcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIC8vPWZlYXR1cmVTdWJJbmRleFxuICogICByZXR1cm4gY3VycmVudEZlYXR1cmVcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBmbGF0dGVuUmVkdWNlKGdlb2pzb24sIGNhbGxiYWNrLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICBmbGF0dGVuRWFjaChnZW9qc29uLCBmdW5jdGlvbiAoY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gICAgICAgIGlmIChmZWF0dXJlSW5kZXggPT09IDAgJiYgZmVhdHVyZVN1YkluZGV4ID09PSAwICYmIGluaXRpYWxWYWx1ZSA9PT0gdW5kZWZpbmVkKSBwcmV2aW91c1ZhbHVlID0gY3VycmVudEZlYXR1cmU7XG4gICAgICAgIGVsc2UgcHJldmlvdXNWYWx1ZSA9IGNhbGxiYWNrKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZXZpb3VzVmFsdWU7XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIHNlZ21lbnRFYWNoXG4gKlxuICogQGNhbGxiYWNrIHNlZ21lbnRFYWNoQ2FsbGJhY2tcbiAqIEBwYXJhbSB7RmVhdHVyZTxMaW5lU3RyaW5nPn0gY3VycmVudFNlZ21lbnQgVGhlIGN1cnJlbnQgc2VnbWVudCBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGUgYXJyYXksIHN0YXJ0cyBhdCBpbmRleCAwLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVTdWJJbmRleCBUaGUgc3ViaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAgYW5kIGluY3JlYXNlcyBmb3IgZWFjaCBpdGVyYXRpbmcgbGluZSBzZWdtZW50LlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgMi12ZXJ0ZXggbGluZSBzZWdtZW50IGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5mb3JFYWNoKClcbiAqIChNdWx0aSlQb2ludCBnZW9tZXRyaWVzIGRvIG5vdCBjb250YWluIHNlZ21lbnRzIHRoZXJlZm9yZSB0aGV5IGFyZSBpZ25vcmVkIGR1cmluZyB0aGlzIG9wZXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0ZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV8R2VvbWV0cnl9IGdlb2pzb24gYW55IEdlb0pTT05cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKGN1cnJlbnRTZWdtZW50LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleClcbiAqIEByZXR1cm5zIHt2b2lkfVxuICogQGV4YW1wbGVcbiAqIHZhciBwb2x5Z29uID0gdHVyZi5wb2x5Z29uKFtbWy01MCwgNV0sIFstNDAsIC0xMF0sIFstNTAsIC0xMF0sIFstNDAsIDVdLCBbLTUwLCA1XV1dKTtcbiAqXG4gKiAvLyBJdGVyYXRlIG92ZXIgR2VvSlNPTiBieSAyLXZlcnRleCBzZWdtZW50c1xuICogdHVyZi5zZWdtZW50RWFjaChwb2x5Z29uLCBmdW5jdGlvbiAoY3VycmVudFNlZ21lbnQsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gKiAgIC8vPSBjdXJyZW50U2VnbWVudFxuICogICAvLz0gZmVhdHVyZUluZGV4XG4gKiAgIC8vPSBmZWF0dXJlU3ViSW5kZXhcbiAqIH0pO1xuICpcbiAqIC8vIENhbGN1bGF0ZSB0aGUgdG90YWwgbnVtYmVyIG9mIHNlZ21lbnRzXG4gKiB2YXIgdG90YWwgPSAwO1xuICogdmFyIGluaXRpYWxWYWx1ZSA9IDA7XG4gKiB0dXJmLnNlZ21lbnRFYWNoKHBvbHlnb24sIGZ1bmN0aW9uICgpIHtcbiAqICAgICB0b3RhbCsrO1xuICogfSwgaW5pdGlhbFZhbHVlKTtcbiAqL1xuZnVuY3Rpb24gc2VnbWVudEVhY2goZ2VvanNvbiwgY2FsbGJhY2spIHtcbiAgICBmbGF0dGVuRWFjaChnZW9qc29uLCBmdW5jdGlvbiAoZmVhdHVyZSwgZmVhdHVyZUluZGV4KSB7XG4gICAgICAgIHZhciBmZWF0dXJlU3ViSW5kZXggPSAwO1xuICAgICAgICAvLyBFeGNsdWRlIG51bGwgR2VvbWV0cmllc1xuICAgICAgICBpZiAoIWZlYXR1cmUuZ2VvbWV0cnkpIHJldHVybjtcbiAgICAgICAgLy8gKE11bHRpKVBvaW50IGdlb21ldHJpZXMgZG8gbm90IGNvbnRhaW4gc2VnbWVudHMgdGhlcmVmb3JlIHRoZXkgYXJlIGlnbm9yZWQgZHVyaW5nIHRoaXMgb3BlcmF0aW9uLlxuICAgICAgICB2YXIgdHlwZSA9IGZlYXR1cmUuZ2VvbWV0cnkudHlwZTtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdQb2ludCcgfHwgdHlwZSA9PT0gJ011bHRpUG9pbnQnKSByZXR1cm47XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgMi12ZXJ0ZXggbGluZSBzZWdtZW50c1xuICAgICAgICBjb29yZFJlZHVjZShmZWF0dXJlLCBmdW5jdGlvbiAocHJldmlvdXNDb29yZHMsIGN1cnJlbnRDb29yZCkge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTZWdtZW50ID0gbGluZVN0cmluZyhbcHJldmlvdXNDb29yZHMsIGN1cnJlbnRDb29yZF0sIGZlYXR1cmUucHJvcGVydGllcyk7XG4gICAgICAgICAgICBjYWxsYmFjayhjdXJyZW50U2VnbWVudCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgICAgICAgICAgZmVhdHVyZVN1YkluZGV4Kys7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudENvb3JkO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3Igc2VnbWVudFJlZHVjZVxuICpcbiAqIFRoZSBmaXJzdCB0aW1lIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSB2YWx1ZXMgcHJvdmlkZWQgYXMgYXJndW1lbnRzIGRlcGVuZFxuICogb24gd2hldGhlciB0aGUgcmVkdWNlIG1ldGhvZCBoYXMgYW4gaW5pdGlhbFZhbHVlIGFyZ3VtZW50LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCB0byB0aGUgcmVkdWNlIG1ldGhvZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIGluaXRpYWxWYWx1ZS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBub3QgcHJvdmlkZWQ6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgc2Vjb25kIGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogQGNhbGxiYWNrIHNlZ21lbnRSZWR1Y2VDYWxsYmFja1xuICogQHBhcmFtIHsqfSBbcHJldmlvdXNWYWx1ZV0gVGhlIGFjY3VtdWxhdGVkIHZhbHVlIHByZXZpb3VzbHkgcmV0dXJuZWQgaW4gdGhlIGxhc3QgaW52b2NhdGlvblxuICogb2YgdGhlIGNhbGxiYWNrLCBvciBpbml0aWFsVmFsdWUsIGlmIHN1cHBsaWVkLlxuICogQHBhcmFtIHtGZWF0dXJlPExpbmVTdHJpbmc+fSBbY3VycmVudFNlZ21lbnRdIFRoZSBjdXJyZW50IHNlZ21lbnQgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IFtjdXJyZW50SW5kZXhdIFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LiBTdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW2N1cnJlbnRTdWJJbmRleF0gVGhlIHN1YmluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuIFN0YXJ0cyBhdCBpbmRleCAwIGFuZCBpbmNyZWFzZXMgZm9yIGVhY2ggaXRlcmF0aW5nIGxpbmUgc2VnbWVudC5cbiAqL1xuXG4vKipcbiAqIFJlZHVjZSAyLXZlcnRleCBsaW5lIHNlZ21lbnQgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvIEFycmF5LnJlZHVjZSgpXG4gKiAoTXVsdGkpUG9pbnQgZ2VvbWV0cmllcyBkbyBub3QgY29udGFpbiBzZWdtZW50cyB0aGVyZWZvcmUgdGhleSBhcmUgaWdub3JlZCBkdXJpbmcgdGhpcyBvcGVyYXRpb24uXG4gKlxuICogQHBhcmFtIHtGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfEdlb21ldHJ5fSBnZW9qc29uIGFueSBHZW9KU09OXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50U2VnbWVudCwgY3VycmVudEluZGV4KVxuICogQHBhcmFtIHsqfSBbaW5pdGlhbFZhbHVlXSBWYWx1ZSB0byB1c2UgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIHRoZSBjYWxsYmFjay5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICogQGV4YW1wbGVcbiAqIHZhciBwb2x5Z29uID0gdHVyZi5wb2x5Z29uKFtbWy01MCwgNV0sIFstNDAsIC0xMF0sIFstNTAsIC0xMF0sIFstNDAsIDVdLCBbLTUwLCA1XV1dKTtcbiAqXG4gKiAvLyBJdGVyYXRlIG92ZXIgR2VvSlNPTiBieSAyLXZlcnRleCBzZWdtZW50c1xuICogdHVyZi5zZWdtZW50UmVkdWNlKHBvbHlnb24sIGZ1bmN0aW9uIChwcmV2aW91c1NlZ21lbnQsIGN1cnJlbnRTZWdtZW50LCBjdXJyZW50SW5kZXgsIGN1cnJlbnRTdWJJbmRleCkge1xuICogICAvLz0gcHJldmlvdXNTZWdtZW50XG4gKiAgIC8vPSBjdXJyZW50U2VnbWVudFxuICogICAvLz0gY3VycmVudEluZGV4XG4gKiAgIC8vPSBjdXJyZW50U3ViSW5kZXhcbiAqICAgcmV0dXJuIGN1cnJlbnRTZWdtZW50XG4gKiB9KTtcbiAqXG4gKiAvLyBDYWxjdWxhdGUgdGhlIHRvdGFsIG51bWJlciBvZiBzZWdtZW50c1xuICogdmFyIGluaXRpYWxWYWx1ZSA9IDBcbiAqIHZhciB0b3RhbCA9IHR1cmYuc2VnbWVudFJlZHVjZShwb2x5Z29uLCBmdW5jdGlvbiAocHJldmlvdXNWYWx1ZSkge1xuICogICAgIHByZXZpb3VzVmFsdWUrKztcbiAqICAgICByZXR1cm4gcHJldmlvdXNWYWx1ZTtcbiAqIH0sIGluaXRpYWxWYWx1ZSk7XG4gKi9cbmZ1bmN0aW9uIHNlZ21lbnRSZWR1Y2UoZ2VvanNvbiwgY2FsbGJhY2ssIGluaXRpYWxWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gaW5pdGlhbFZhbHVlO1xuICAgIHNlZ21lbnRFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjdXJyZW50U2VnbWVudCwgY3VycmVudEluZGV4LCBjdXJyZW50U3ViSW5kZXgpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA9PT0gMCAmJiBpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkgcHJldmlvdXNWYWx1ZSA9IGN1cnJlbnRTZWdtZW50O1xuICAgICAgICBlbHNlIHByZXZpb3VzVmFsdWUgPSBjYWxsYmFjayhwcmV2aW91c1ZhbHVlLCBjdXJyZW50U2VnbWVudCwgY3VycmVudEluZGV4LCBjdXJyZW50U3ViSW5kZXgpO1xuICAgIH0pO1xuICAgIHJldHVybiBwcmV2aW91c1ZhbHVlO1xufVxuXG4vKipcbiAqIENyZWF0ZSBGZWF0dXJlXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7R2VvbWV0cnl9IGdlb21ldHJ5IEdlb0pTT04gR2VvbWV0cnlcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wZXJ0aWVzIFByb3BlcnRpZXNcbiAqIEByZXR1cm5zIHtGZWF0dXJlfSBHZW9KU09OIEZlYXR1cmVcbiAqL1xuZnVuY3Rpb24gZmVhdHVyZShnZW9tZXRyeSwgcHJvcGVydGllcykge1xuICAgIGlmIChnZW9tZXRyeSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ05vIGdlb21ldHJ5IHBhc3NlZCcpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzIHx8IHt9LFxuICAgICAgICBnZW9tZXRyeTogZ2VvbWV0cnlcbiAgICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBMaW5lU3RyaW5nXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXk8QXJyYXk8bnVtYmVyPj59IGNvb3JkaW5hdGVzIExpbmUgQ29vcmRpbmF0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wZXJ0aWVzIFByb3BlcnRpZXNcbiAqIEByZXR1cm5zIHtGZWF0dXJlPExpbmVTdHJpbmc+fSBHZW9KU09OIExpbmVTdHJpbmcgRmVhdHVyZVxuICovXG5mdW5jdGlvbiBsaW5lU3RyaW5nKGNvb3JkaW5hdGVzLCBwcm9wZXJ0aWVzKSB7XG4gICAgaWYgKCFjb29yZGluYXRlcykgdGhyb3cgbmV3IEVycm9yKCdObyBjb29yZGluYXRlcyBwYXNzZWQnKTtcbiAgICBpZiAoY29vcmRpbmF0ZXMubGVuZ3RoIDwgMikgdGhyb3cgbmV3IEVycm9yKCdDb29yZGluYXRlcyBtdXN0IGJlIGFuIGFycmF5IG9mIHR3byBvciBtb3JlIHBvc2l0aW9ucycpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ0ZlYXR1cmUnLFxuICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzIHx8IHt9LFxuICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgdHlwZTogJ0xpbmVTdHJpbmcnLFxuICAgICAgICAgICAgY29vcmRpbmF0ZXM6IGNvb3JkaW5hdGVzXG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjb29yZEVhY2g6IGNvb3JkRWFjaCxcbiAgICBjb29yZFJlZHVjZTogY29vcmRSZWR1Y2UsXG4gICAgcHJvcEVhY2g6IHByb3BFYWNoLFxuICAgIHByb3BSZWR1Y2U6IHByb3BSZWR1Y2UsXG4gICAgZmVhdHVyZUVhY2g6IGZlYXR1cmVFYWNoLFxuICAgIGZlYXR1cmVSZWR1Y2U6IGZlYXR1cmVSZWR1Y2UsXG4gICAgY29vcmRBbGw6IGNvb3JkQWxsLFxuICAgIGdlb21FYWNoOiBnZW9tRWFjaCxcbiAgICBnZW9tUmVkdWNlOiBnZW9tUmVkdWNlLFxuICAgIGZsYXR0ZW5FYWNoOiBmbGF0dGVuRWFjaCxcbiAgICBmbGF0dGVuUmVkdWNlOiBmbGF0dGVuUmVkdWNlLFxuICAgIHNlZ21lbnRFYWNoOiBzZWdtZW50RWFjaCxcbiAgICBzZWdtZW50UmVkdWNlOiBzZWdtZW50UmVkdWNlXG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9ub2RlX21vZHVsZXMvQHR1cmYvbWV0YS9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gM1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgY29vcmRFYWNoID0gcmVxdWlyZSgnQHR1cmYvbWV0YScpLmNvb3JkRWFjaDtcblxuLyoqXG4gKiBUYWtlcyBhIHNldCBvZiBmZWF0dXJlcywgY2FsY3VsYXRlcyB0aGUgYmJveCBvZiBhbGwgaW5wdXQgZmVhdHVyZXMsIGFuZCByZXR1cm5zIGEgYm91bmRpbmcgYm94LlxuICpcbiAqIEBuYW1lIGJib3hcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZTxhbnk+fSBnZW9qc29uIGlucHV0IGZlYXR1cmVzXG4gKiBAcmV0dXJucyB7QXJyYXk8bnVtYmVyPn0gYmJveCBleHRlbnQgaW4gW21pblgsIG1pblksIG1heFgsIG1heFldIG9yZGVyXG4gKiBAZXhhbXBsZVxuICogdmFyIGxpbmUgPSB0dXJmLmxpbmVTdHJpbmcoW1stNzQsIDQwXSwgWy03OCwgNDJdLCBbLTgyLCAzNV1dKTtcbiAqIHZhciBiYm94ID0gdHVyZi5iYm94KGxpbmUpO1xuICogdmFyIGJib3hQb2x5Z29uID0gdHVyZi5iYm94UG9seWdvbihiYm94KTtcbiAqXG4gKiAvL2FkZFRvTWFwXG4gKiB2YXIgYWRkVG9NYXAgPSBbbGluZSwgYmJveFBvbHlnb25dXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGdlb2pzb24pIHtcbiAgICB2YXIgYmJveCA9IFtJbmZpbml0eSwgSW5maW5pdHksIC1JbmZpbml0eSwgLUluZmluaXR5XTtcbiAgICBjb29yZEVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGNvb3JkKSB7XG4gICAgICAgIGlmIChiYm94WzBdID4gY29vcmRbMF0pIGJib3hbMF0gPSBjb29yZFswXTtcbiAgICAgICAgaWYgKGJib3hbMV0gPiBjb29yZFsxXSkgYmJveFsxXSA9IGNvb3JkWzFdO1xuICAgICAgICBpZiAoYmJveFsyXSA8IGNvb3JkWzBdKSBiYm94WzJdID0gY29vcmRbMF07XG4gICAgICAgIGlmIChiYm94WzNdIDwgY29vcmRbMV0pIGJib3hbM10gPSBjb29yZFsxXTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmJveDtcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9AdHVyZi9iYm94L2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJzb3VyY2VSb290IjoiIn0=