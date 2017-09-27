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
      timerStart();
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

    // set a message with summary
    var logMessage = " geojson validation " + " n errors = " + errors.length + " n warnings = " + warnings.length + " done in" + timerLapString();

    console.log(fileName + " summary :  " + logMessage);

    // send message
    postMessage({
      progress: 60,
      message: logMessage
    });

    // validation : warnings
    if (warnings.length > 0) {
      warningMsg = warnings.length + " warning message(s) found. Check the console for more info";
      postMessage({
        progress: 75,
        msssage: warningMsg
      });
      warnings.forEach(function (x) {
        console.log({ file: fileName, warnings: JSON.stringify(x) });
      });
    }
    // varlidation: errors
    if (errors.length > 0) {
      errorMsg = errors.length + " errors found. check the console for more info";
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
      message: "Geom type is " + geomTypes + ". Found in " + timerLapString()
    });

    /*    // if more than one type, return an error*/
    //if ( geomTypes.length>1 ) {
    //var msg = "Multi geometry not yet implemented";

    //postMessage({
    //progress: 100,
    //msssage: msg,
    //errorMessage: fileName + ": " + msg
    //});

    //console.log({
    //"errors": fileName + ": " + msg + ".(" + geomTypes + ")"
    //});
    //return;
    /*}*/

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
      message: " extent (" + extent + ") found in " + timerLapString()
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
      message: "Add layer",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMzQxNmJkYmYyNzc0NjE1NGFhNGQiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvanMvbXhfaGVscGVyX21hcF9kcmFnZHJvcC53b3JrZXIuanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMvZ2VvanNvbmhpbnQvbm9kZV9tb2R1bGVzL2pzb25saW50LWxpbmVzL2xpYi9qc29ubGludC5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vbW9kdWxlLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9vYmplY3QuanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL2dlb2pzb25oaW50L2xpYi9yaHIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2pzL214X2hlbHBlcl9zdGF0LmpzIiwid2VicGFjazovLy8uL3NyYy9qcy9teF9oZWxwZXJfY29sb3JzLmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9AdHVyZi9tZXRhL2luZGV4LmpzIiwid2VicGFjazovLy8uL25vZGVfbW9kdWxlcy9AdHVyZi9iYm94L2luZGV4LmpzIl0sIm5hbWVzIjpbImdlb2pzb25oaW50Iiwic3RhdCIsImNvbG9yIiwidHlwZVN3aXRjaGVyIiwicG9zdE1lc3NhZ2UiLCJwcm9ncmVzcyIsIm1lc3NhZ2UiLCJvbm1lc3NhZ2UiLCJlIiwiZXJyb3JNc2ciLCJ3YXJuaW5nTXNnIiwiZGF0IiwiZGF0YSIsImdKc29uIiwiZmlsZU5hbWUiLCJmaWxlVHlwZSIsInRpbWVyVmFsIiwidGltZXJTdGFydCIsIkRhdGUiLCJ0aW1lckxhcCIsImxhcCIsInRpbWVyTGFwU3RyaW5nIiwibWVzc2FnZXMiLCJoaW50IiwiZXJyb3JzIiwiZmlsdGVyIiwieCIsImxldmVsIiwid2FybmluZ3MiLCJsb2dNZXNzYWdlIiwibGVuZ3RoIiwiY29uc29sZSIsImxvZyIsIm1zc3NhZ2UiLCJmb3JFYWNoIiwiZmlsZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJlcnJvck1lc3NhZ2UiLCJnZW9tVHlwZXMiLCJmZWF0dXJlcyIsIm1hcCIsImdlb21ldHJ5IiwidHlwZSIsInVuZGVmaW5lZCIsInYiLCJpIiwicyIsImluZGV4T2YiLCJmIiwiY29vcmRpbmF0ZXMiLCJhdHRyaWJ1dGVzIiwicCIsInRtcCIsImluaXQiLCJwcm9wIiwicHVzaCIsImdldEFycmF5U3RhdCIsImFyciIsImV4dGVudCIsIk1hdGgiLCJyb3VuZCIsImlkIiwiaWRTb3VyY2UiLCJyYW4iLCJyYW5kb20iLCJjb2xBIiwicmFuZG9tSHNsIiwiY29sQiIsInR5cCIsImR1bW15U3R5bGUiLCJsYXllciIsImdlb2pzb24iLCJlcnIiLCJjbG9uZUFycmF5IiwiY2xvbmUiLCJvIiwiY29uc3RydWN0b3IiLCJBcnJheSIsInBlcmNlbnRpbGUiLCJsZW5fbyIsImxlbiIsInNvcnROdW1iZXIiLCJhIiwiYiIsIm9wdCIsIm1heCIsIkluZmluaXR5IiwicG9wIiwibWluIiwic3VtIiwibWVkaWFuIiwicmVzdWx0Iiwic29ydCIsImluZGV4IiwiZmxvb3IiLCJmcmFjdGlvbiIsInF1YW50aWxlcyIsInJlcyIsIm4iLCJyIiwiY29sTmFtZXMiLCJPYmplY3QiLCJrZXlzIiwidGFibGUiLCJ2YWwiLCJwcmV2VmFsIiwiY29sTmFtZSIsImoiLCJqTCIsImlMIiwiaGV4MnJnYmEiLCJyZ2JhMmhleCIsImNvbG9yMm9iaiIsImNvbG9yTGluZWFyIiwib3BhY2l0eSIsInNhdHVyYXRpb24iLCJsaWdodG5lc3MiLCJoZXgiLCJoIiwicmVwbGFjZSIsInJnYmEiLCJyZ2IiLCJvdXQiLCJtYXRjaCIsIlJlZ0V4cCIsInBhcnNlSW50Iiwiam9pbiIsInRvU3RyaW5nIiwic2xpY2UiLCJoZXhPbmx5IiwiYWxwaGEiLCJjb2wiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdHlsZSIsInNwbGl0IiwidmFsTWluIiwidmFsTWF4IiwiY29sTWluIiwiY29sTWF4IiwiaXNSYW5kb20iXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7QUM3REE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FB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QUM5QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtEQUErRDtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYjtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNB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LFNBQVM7QUFDVDtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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SjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFNBQVM7QUFDcEIsV0FBVyxPQUFPO0FBQ2xCLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG9DQUFvQztBQUNwQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLHFCQUFxQjtBQUNoQyxXQUFXLE9BQU87QUFDbEIsYUFBYSxvQkFBb0I7QUFDakM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG9DQUFvQztBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQ3R6QkE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLCtCQUErQjtBQUMxQyxhQUFhLGNBQWM7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EiLCJmaWxlIjoiMzQxNmJkYmYyNzc0NjE1NGFhNGQud29ya2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMjQ3KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCAzNDE2YmRiZjI3NzQ2MTU0YWE0ZCIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcbi8vIG1vZHVsZSBpZCA9IDIwNVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKiBqc2hpbnQgZXN2ZXJzaW9uIDogNiovXG4vLyBJbXBvcnRhdGlvbiBvZiBoZWxwZXJzXG5cbmltcG9ydCAqIGFzIGdlb2pzb25oaW50IGZyb20gXCJnZW9qc29uaGludFwiO1xuaW1wb3J0IHsgZmVhdHVyZUVhY2gsIHByb3BFYWNoIH0gZnJvbSBcIkB0dXJmL21ldGFcIjtcbmltcG9ydCBiYm94IGZyb20gXCJAdHVyZi9iYm94XCI7XG5pbXBvcnQgKiBhcyBzdGF0IGZyb20gJy4vbXhfaGVscGVyX3N0YXQuanMnO1xuaW1wb3J0ICogYXMgY29sb3IgZnJvbSAnLi9teF9oZWxwZXJfY29sb3JzLmpzJztcblxuXG4vLyBnZW9qc29uIHR5cGUgdG8gbWFwYm94IGdsIHR5cGVcbnZhciB0eXBlU3dpdGNoZXIgPSB7XG4gIFwiUG9pbnRcIjogXCJjaXJjbGVcIixcbiAgXCJNdWx0aVBvaW50XCI6IFwibGluZVwiLFxuICBcIkxpbmVTdHJpbmdcIjogXCJsaW5lXCIsXG4gIFwiTXVsdGlMaW5lU3RyaW5nXCI6IFwibGluZVwiLFxuICBcIlBvbHlnb25cIjogXCJmaWxsXCIsXG4gIFwiTXVsdGlQb2x5Z29uXCI6IFwiZmlsbFwiLFxuICBcIkdlb21ldHJ5Q29sbGVjdGlvblwiOiBcImZpbGxcIlxufTtcblxuXG5cblxuXG4vLyBJbml0YWwgbWVzc2FnZVxucG9zdE1lc3NhZ2Uoe1xuICBwcm9ncmVzczogMCxcbiAgbWVzc2FnZTogXCJzdGFydFwiXG59KTtcblxuXG4vLyBoYW5kbGUgbWVzc2FnZSBzZW5kIGZyb20gdGhlIG1haW4gdGhyZWFkXG5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gIHRyeSB7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXNhdGlvbiA6IHNldCBsb2NhbCBoZWxwZXIgYW5kIHZhcmlhYmxlc1xuICAgICAqL1xuXG4gICAgLy8gaW5pdCB2YXJpYWJsZXNcbiAgICB2YXIgZXJyb3JNc2cgPSBcIlwiO1xuICAgIHZhciB3YXJuaW5nTXNnID0gXCJcIjtcbiAgICB2YXIgZGF0ID0gZS5kYXRhO1xuICAgIHZhciBnSnNvbiA9IGRhdC5kYXRhO1xuICAgIHZhciBmaWxlTmFtZSA9IGRhdC5maWxlTmFtZTtcbiAgICB2YXIgZmlsZVR5cGUgPSBkYXQuZmlsZVR5cGU7XG5cblxuICAgIC8vIHNldCBiYXNpYyB0aW1pbmcgZnVuY3Rpb25cbiAgICB2YXIgdGltZXJWYWwgPSAwO1xuXG4gICAgLy8gc3RhcnQgdGltZXJcbiAgICB2YXIgdGltZXJTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGltZXJWYWwgPSBuZXcgRGF0ZSgpO1xuICAgIH07XG5cbiAgICAvLyBnaXZlIGludGVybWVkaWF0ZSB0aW1lLCByZXNldCB0aW1lclxuICAgIHZhciB0aW1lckxhcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhcCA9IG5ldyBEYXRlKCkgLSB0aW1lclZhbDtcbiAgICAgIHRpbWVyU3RhcnQoKTtcbiAgICAgIHJldHVybiBsYXA7XG4gICAgfTtcblxuICAgIC8vIHByaW50YWJsZSB2ZXJzaW9uIG9mIHRpbWVyTGHDqFxuICAgIHZhciB0aW1lckxhcFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFwiIFwiICsgdGltZXJMYXAoKSArIFwiIG1zIFwiO1xuICAgIH07XG5cbiAgICAvLyBzdGFydCB0aW1lclxuICAgIHRpbWVyU3RhcnQoKTtcblxuXG4gICAgLyoqXG4gICAgICogdmFsaWRhdGlvbiA6IGdlb2pzb24gdmFsaWRhdGlvbiB3aXRoIGdlb2pzb25oaW50XG4gICAgICovXG5cbiAgICAvLyBWYWxpZGF0aW9uLiBJcyB0aGF0IGEgdmFsaWQgZ2VvanNvbiA/XG4gICAgdmFyIG1lc3NhZ2VzID0gZ2VvanNvbmhpbnQuaGludChnSnNvbik7XG4gICAgLy8gZXh0cmFjdCBlcnJvcnNcbiAgICB2YXIgZXJyb3JzID0gbWVzc2FnZXMuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgcmV0dXJuIHgubGV2ZWwgPT0gXCJlcnJvclwiO1xuICAgIH0pO1xuICAgIC8vIGV4dHJhY3QgbWVzc2FnZVxuICAgIHZhciB3YXJuaW5ncyA9IG1lc3NhZ2VzLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgIHJldHVybiB4LmxldmVsID09IFwibWVzc2FnZVwiO1xuICAgIH0pO1xuXG4gICAgLy8gc2V0IGEgbWVzc2FnZSB3aXRoIHN1bW1hcnlcbiAgICB2YXIgbG9nTWVzc2FnZSA9IFwiIGdlb2pzb24gdmFsaWRhdGlvbiBcIiArXG4gICAgICBcIiBuIGVycm9ycyA9IFwiICsgZXJyb3JzLmxlbmd0aCArXG4gICAgICBcIiBuIHdhcm5pbmdzID0gXCIgKyB3YXJuaW5ncy5sZW5ndGggKyBcIiBkb25lIGluXCIgK1xuICAgICAgdGltZXJMYXBTdHJpbmcoKTtcblxuICAgIGNvbnNvbGUubG9nKGZpbGVOYW1lICsgXCIgc3VtbWFyeSA6ICBcIiArIGxvZ01lc3NhZ2UpO1xuXG4gICAgLy8gc2VuZCBtZXNzYWdlXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgcHJvZ3Jlc3M6IDYwLFxuICAgICAgbWVzc2FnZTogbG9nTWVzc2FnZVxuICAgIH0pO1xuXG4gICAgLy8gdmFsaWRhdGlvbiA6IHdhcm5pbmdzXG4gICAgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcbiAgICAgIHdhcm5pbmdNc2cgPSB3YXJuaW5ncy5sZW5ndGggKyBcIiB3YXJuaW5nIG1lc3NhZ2UocykgZm91bmQuIENoZWNrIHRoZSBjb25zb2xlIGZvciBtb3JlIGluZm9cIjtcbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgcHJvZ3Jlc3M6IDc1LFxuICAgICAgICBtc3NzYWdlOiB3YXJuaW5nTXNnXG4gICAgICB9KTtcbiAgICAgIHdhcm5pbmdzLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICBjb25zb2xlLmxvZyh7ZmlsZTpmaWxlTmFtZSx3YXJuaW5nczpKU09OLnN0cmluZ2lmeSh4KX0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIHZhcmxpZGF0aW9uOiBlcnJvcnNcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVycm9yTXNnID0gZXJyb3JzLmxlbmd0aCArIFwiIGVycm9ycyBmb3VuZC4gY2hlY2sgdGhlIGNvbnNvbGUgZm9yIG1vcmUgaW5mb1wiO1xuICAgICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgICBwcm9ncmVzczogMTAwLFxuICAgICAgICBtZXNzYWdlOiBlcnJvck1zZyxcbiAgICAgICAgZXJyb3JNZXNzYWdlOiBlcnJvck1zZ1xuICAgICAgfSk7XG5cbiAgICAgIGVycm9ycy5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgY29uc29sZS5sb2coe2ZpbGU6ZmlsZU5hbWUsZXJyb3JzOnh9KTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXZvaWQgbXVsdGkgdHlwZSA6IHdlIGRvbid0IGhhbmRsZSB0aGVtIGZvciBub3dcbiAgICAgKi9cblxuICAgIHZhciBnZW9tVHlwZXMgPSBbXTtcbiAgICBpZiggZ0pzb24uZmVhdHVyZXMgKXtcbiAgICAgIC8vIGFycmF5IG9mIHR5cGVzIGluIGRhdGFcbiAgICAgIGdlb21UeXBlcyAgPSBnSnNvbi5mZWF0dXJlc1xuICAgICAgICAubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgIGlmKHguZ2VvbWV0cnkgJiYgeC5nZW9tZXRyeS50eXBlKXtcbiAgICAgICAgICAgIHJldHVybiB4Lmdlb21ldHJ5LnR5cGU7XG4gICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyBcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uKHYsaSxzKXtcbiAgICAgICAgcmV0dXJuIHMuaW5kZXhPZih2KSA9PT0gaSAmJiB2ICE9PSB1bmRlZmluZWQ7XG4gICAgICB9KTtcbiAgICB9ZWxzZXtcbiAgICAgIGdlb21UeXBlcyA9IFtnSnNvbi5nZW9tZXRyeS50eXBlXTtcbiAgICB9XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICBwcm9ncmVzczogOTAsXG4gICAgICBtZXNzYWdlOiBcIkdlb20gdHlwZSBpcyBcIiArIGdlb21UeXBlcyArIFwiLiBGb3VuZCBpbiBcIiArIHRpbWVyTGFwU3RyaW5nKClcbiAgICB9KTtcblxuLyogICAgLy8gaWYgbW9yZSB0aGFuIG9uZSB0eXBlLCByZXR1cm4gYW4gZXJyb3IqL1xuICAgIC8vaWYgKCBnZW9tVHlwZXMubGVuZ3RoPjEgKSB7XG4gICAgICAvL3ZhciBtc2cgPSBcIk11bHRpIGdlb21ldHJ5IG5vdCB5ZXQgaW1wbGVtZW50ZWRcIjtcblxuICAgICAgLy9wb3N0TWVzc2FnZSh7XG4gICAgICAgIC8vcHJvZ3Jlc3M6IDEwMCxcbiAgICAgICAgLy9tc3NzYWdlOiBtc2csXG4gICAgICAgIC8vZXJyb3JNZXNzYWdlOiBmaWxlTmFtZSArIFwiOiBcIiArIG1zZ1xuICAgICAgLy99KTtcblxuICAgICAgLy9jb25zb2xlLmxvZyh7XG4gICAgICAgIC8vXCJlcnJvcnNcIjogZmlsZU5hbWUgKyBcIjogXCIgKyBtc2cgKyBcIi4oXCIgKyBnZW9tVHlwZXMgKyBcIilcIlxuICAgICAgLy99KTtcbiAgICAgIC8vcmV0dXJuO1xuICAgIC8qfSovXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgZmVhdHVyZXMgd2l0aG91dCBnZW9tXG4gICAgICogaGFjayByZWxhdGVkIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9UdXJmanMvdHVyZi9pc3N1ZXMvODUzXG4gICAgICogRGVsZXRlIHRoaXMgYmxvY2suXG4gICAgICovXG5cbiAgICBmZWF0dXJlRWFjaChnSnNvbixmdW5jdGlvbihmLGkpe1xuICAgICAgaWYoZi5nZW9tZXRyeT09PW51bGwpe1xuICAgICAgICBmLmdlb21ldHJ5PXtcbiAgICAgICAgICB0eXBlOiBnZW9tVHlwZXNbMF0sXG4gICAgICAgICAgY29vcmRpbmF0ZXM6IFtdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAqIEdldCB0YWJsZSBvZiBhbGwgYXR0cmlidXRlcy4gXG4gICAgKi9cbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBwO1xuICAgIGF0dHJpYnV0ZXMudG1wID0ge307XG4gICAgYXR0cmlidXRlcy5pbml0ID0gZmFsc2U7XG4gICAgcHJvcEVhY2goZ0pzb24sXG4gICAgICBmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgLy8gaW5pdCBhdHRyaWJ1dGVzIHdpdGggZW1wdHkgYXJyYXlcbiAgICAgICAgaWYoIWF0dHJpYnV0ZXMuaW5pdCl7XG4gICAgICAgICAgZm9yKHAgaW4gcHJvcCl7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnRtcFtwXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhdHRyaWJ1dGVzLmluaXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFxuICAgICAgICBmb3IocCBpbiBwcm9wKXtcbiAgICAgICAgICBpZihhdHRyaWJ1dGVzLnRtcFtwXSAmJiBwcm9wW3BdKXtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMudG1wW3BdLnB1c2gocHJvcFtwXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgICAgIFxuICAgIGZvcihwIGluIGF0dHJpYnV0ZXMudG1wKXtcbiAgICAgIGF0dHJpYnV0ZXNbcF0gPSBzdGF0LmdldEFycmF5U3RhdCh7XG4gICAgICAgIGFyciA6IGF0dHJpYnV0ZXMudG1wW3BdLFxuICAgICAgICBzdGF0IDogXCJkaXN0aW5jdFwiXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgZGVsZXRlIGF0dHJpYnV0ZXMudG1wO1xuICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmluaXQ7XG5cblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnQgOiBnZXQgZXh0ZW50IHVzaW5nIGEgVHVyZiBiYm94XG4gICAgICovXG5cbiAgICB2YXIgZXh0ZW50ID0gYmJveChnSnNvbik7XG5cbiAgICAvLyBRdWljayBleHRlbnQgdmFsaWRhdGlvbiBcbiAgICBpZiAoXG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50WzBdKSA+IDE4MCB8fCBNYXRoLnJvdW5kKGV4dGVudFswXSkgPCAtMTgwIHx8XG4gICAgICAgIE1hdGgucm91bmQoZXh0ZW50WzFdKSA+IDkwIHx8IE1hdGgucm91bmQoZXh0ZW50WzFdKSA8IC05MCB8fFxuICAgICAgICBNYXRoLnJvdW5kKGV4dGVudFsyXSkgPiAxODAgfHwgTWF0aC5yb3VuZChleHRlbnRbMl0pIDwgLTE4MCB8fFxuICAgICAgICBNYXRoLnJvdW5kKGV4dGVudFszXSkgPiA5MCB8fCBNYXRoLnJvdW5kKGV4dGVudFszXSkgPCAtOTBcbiAgICAgICApIHtcbiAgICAgIFxuICAgICAgZXJyb3JNc2cgPSBmaWxlTmFtZSArIFwiIDogZXh0ZW50IHNlZW1zIHRvIGJlIG91dCBvZiByYW5nZTogXCIgKyBleHRlbnQ7XG5cbiAgICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgICAgcHJvZ3Jlc3M6IDEwMCxcbiAgICAgICAgbXNzc2FnZTogZXJyb3JNc2csXG4gICAgICAgIGVycm9yTWVzc2FnZTogZXJyb3JNc2dcbiAgICAgIH0pO1xuXG4gICAgICBjb25zb2xlLmxvZyh7XG4gICAgICAgIFwiZXJyb3JzXCI6IGVycm9yTXNnXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICBwcm9ncmVzczogODAsXG4gICAgICBtZXNzYWdlOiBcIiBleHRlbnQgKFwiICsgZXh0ZW50ICtcIikgZm91bmQgaW4gXCIgKyB0aW1lckxhcFN0cmluZygpXG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogU2V0IGRlZmF1bHQgZm9yIGEgbmV3IGxheWVyXG4gICAgICovXG5cbiAgICAvLyBTZXQgcmFuZG9tIGlkIGZvciBzb3VyY2UgYW5kIGxheWVyXG4gICAgdmFyIGlkID0gXCJNWC1EUk9QLVwiICsgZmlsZU5hbWUgO1xuICAgIHZhciBpZFNvdXJjZSA9IGlkICsgXCItU1JDXCI7XG4gICAgLy8gU2V0IHJhbmRvbSBjb2xvclxuICAgIHZhciByYW4gPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciBjb2xBID0gY29sb3IucmFuZG9tSHNsKDAuMywgcmFuKTtcbiAgICB2YXIgY29sQiA9IGNvbG9yLnJhbmRvbUhzbCgwLjksIHJhbik7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCB0eXBlIGZyb20gZ2VvanNvbiB0eXBlXG4gICAgdmFyIHR5cCA9IHR5cGVTd2l0Y2hlcltnZW9tVHlwZXNbMF1dO1xuXG4gICAgLy8gU2V0IHVwIGRlZmF1bHQgc3R5bGVcbiAgICB2YXIgZHVtbXlTdHlsZSA9IHtcbiAgICAgIFwiY2lyY2xlXCI6IHtcbiAgICAgICAgXCJpZFwiOiBpZCxcbiAgICAgICAgXCJzb3VyY2VcIjogaWRTb3VyY2UsXG4gICAgICAgIFwidHlwZVwiOiB0eXAsXG4gICAgICAgIFwicGFpbnRcIjoge1xuICAgICAgICAgIFwiY2lyY2xlLWNvbG9yXCI6IGNvbEEsXG4gICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6MTAsXG4gICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6MSxcbiAgICAgICAgICBcImNpcmNsZS1zdHJva2UtY29sb3JcIjpjb2xCXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcImZpbGxcIjoge1xuICAgICAgICBcImlkXCI6IGlkLFxuICAgICAgICBcInNvdXJjZVwiOiBpZFNvdXJjZSxcbiAgICAgICAgXCJ0eXBlXCI6IHR5cCxcbiAgICAgICAgXCJwYWludFwiOiB7XG4gICAgICAgICAgXCJmaWxsLWNvbG9yXCI6IGNvbEEsXG4gICAgICAgICAgXCJmaWxsLW91dGxpbmUtY29sb3JcIjogY29sQlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJsaW5lXCI6IHtcbiAgICAgICAgXCJpZFwiOiBpZCxcbiAgICAgICAgXCJzb3VyY2VcIjogaWRTb3VyY2UsXG4gICAgICAgIFwidHlwZVwiOiB0eXAsXG4gICAgICAgIFwicGFpbnRcIjoge1xuICAgICAgICAgIFwibGluZS1jb2xvclwiOiBjb2xBLFxuICAgICAgICAgIFwibGluZS13aWR0aFwiOiAxMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgcHJvZ3Jlc3M6IDk5LFxuICAgICAgbWVzc2FnZTogXCJBZGQgbGF5ZXJcIixcbiAgICAgIGlkOiBpZCxcbiAgICAgIGV4dGVudDogZXh0ZW50LFxuICAgICAgYXR0cmlidXRlcyA6IGF0dHJpYnV0ZXMsXG4gICAgICBsYXllcjogZHVtbXlTdHlsZVt0eXBdLFxuICAgICAgZ2VvanNvbiA6IGdKc29uXG4gICAgfSk7XG4gIH1cblxuICBjYXRjaChlcnIpIHtcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgIHBvc3RNZXNzYWdlKHtcbiAgICAgIHByb2dyZXNzOiAxMDAsXG4gICAgICBlcnJvck1lc3NhZ2UgOiBcIkFuIGVycm9yIG9jY3VyZWQsIGNoZWNrIHRoZSBjb25zb2xlXCJcbiAgICB9KTtcbiAgfVxufTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2pzL214X2hlbHBlcl9tYXBfZHJhZ2Ryb3Aud29ya2VyLmpzIiwidmFyIGpzb25saW50ID0gcmVxdWlyZSgnanNvbmxpbnQtbGluZXMnKSxcbiAgZ2VvanNvbkhpbnRPYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xuXG4vKipcbiAqIEBhbGlhcyBnZW9qc29uaGludFxuICogQHBhcmFtIHsoc3RyaW5nfG9iamVjdCl9IEdlb0pTT04gZ2l2ZW4gYXMgYSBzdHJpbmcgb3IgYXMgYW4gb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5ub0R1cGxpY2F0ZU1lbWJlcnM9dHJ1ZV0gZm9yYmlkIHJlcGVhdGVkXG4gKiBwcm9wZXJ0aWVzLiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGZvciBzdHJpbmcgaW5wdXQsIGJlY2F1c2VkIHBhcnNlZFxuICogT2JqZWN0cyBjYW5ub3QgaGF2ZSBkdXBsaWNhdGUgcHJvcGVydGllcy5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucHJlY2lzaW9uV2FybmluZz10cnVlXSB3YXJuIGlmIEdlb0pTT04gY29udGFpbnNcbiAqIHVubmVjZXNzYXJ5IGNvb3JkaW5hdGUgcHJlY2lzaW9uLlxuICogQHJldHVybnMge0FycmF5PE9iamVjdD59IGFuIGFycmF5IG9mIGVycm9yc1xuICovXG5mdW5jdGlvbiBoaW50KHN0ciwgb3B0aW9ucykge1xuXG4gICAgdmFyIGdqLCBlcnJvcnMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygc3RyID09PSAnb2JqZWN0Jykge1xuICAgICAgICBnaiA9IHN0cjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBnaiA9IGpzb25saW50LnBhcnNlKHN0cik7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoID0gZS5tZXNzYWdlLm1hdGNoKC9saW5lIChcXGQrKS8pO1xuICAgICAgICAgICAgdmFyIGxpbmVOdW1iZXIgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xuICAgICAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlciAtIDEsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBlXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgbWVzc2FnZTogJ0V4cGVjdGVkIHN0cmluZyBvciBvYmplY3QgYXMgaW5wdXQnLFxuICAgICAgICAgICAgbGluZTogMFxuICAgICAgICB9XTtcbiAgICB9XG5cbiAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KGdlb2pzb25IaW50T2JqZWN0LmhpbnQoZ2osIG9wdGlvbnMpKTtcblxuICAgIHJldHVybiBlcnJvcnM7XG59XG5cbm1vZHVsZS5leHBvcnRzLmhpbnQgPSBoaW50O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9ub2RlX21vZHVsZXMvZ2VvanNvbmhpbnQvbGliL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSAyNDhcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyogcGFyc2VyIGdlbmVyYXRlZCBieSBqaXNvbiAwLjQuMTcgKi9cbi8qXG4gIFJldHVybnMgYSBQYXJzZXIgb2JqZWN0IG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuXG4gIFBhcnNlcjoge1xuICAgIHl5OiB7fVxuICB9XG5cbiAgUGFyc2VyLnByb3RvdHlwZToge1xuICAgIHl5OiB7fSxcbiAgICB0cmFjZTogZnVuY3Rpb24oKSxcbiAgICBzeW1ib2xzXzoge2Fzc29jaWF0aXZlIGxpc3Q6IG5hbWUgPT0+IG51bWJlcn0sXG4gICAgdGVybWluYWxzXzoge2Fzc29jaWF0aXZlIGxpc3Q6IG51bWJlciA9PT4gbmFtZX0sXG4gICAgcHJvZHVjdGlvbnNfOiBbLi4uXSxcbiAgICBwZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXl0ZXh0LCB5eWxlbmcsIHl5bGluZW5vLCB5eSwgeXlzdGF0ZSwgJCQsIF8kKSxcbiAgICB0YWJsZTogWy4uLl0sXG4gICAgZGVmYXVsdEFjdGlvbnM6IHsuLi59LFxuICAgIHBhcnNlRXJyb3I6IGZ1bmN0aW9uKHN0ciwgaGFzaCksXG4gICAgcGFyc2U6IGZ1bmN0aW9uKGlucHV0KSxcblxuICAgIGxleGVyOiB7XG4gICAgICAgIEVPRjogMSxcbiAgICAgICAgcGFyc2VFcnJvcjogZnVuY3Rpb24oc3RyLCBoYXNoKSxcbiAgICAgICAgc2V0SW5wdXQ6IGZ1bmN0aW9uKGlucHV0KSxcbiAgICAgICAgaW5wdXQ6IGZ1bmN0aW9uKCksXG4gICAgICAgIHVucHV0OiBmdW5jdGlvbihzdHIpLFxuICAgICAgICBtb3JlOiBmdW5jdGlvbigpLFxuICAgICAgICBsZXNzOiBmdW5jdGlvbihuKSxcbiAgICAgICAgcGFzdElucHV0OiBmdW5jdGlvbigpLFxuICAgICAgICB1cGNvbWluZ0lucHV0OiBmdW5jdGlvbigpLFxuICAgICAgICBzaG93UG9zaXRpb246IGZ1bmN0aW9uKCksXG4gICAgICAgIHRlc3RfbWF0Y2g6IGZ1bmN0aW9uKHJlZ2V4X21hdGNoX2FycmF5LCBydWxlX2luZGV4KSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSxcbiAgICAgICAgbGV4OiBmdW5jdGlvbigpLFxuICAgICAgICBiZWdpbjogZnVuY3Rpb24oY29uZGl0aW9uKSxcbiAgICAgICAgcG9wU3RhdGU6IGZ1bmN0aW9uKCksXG4gICAgICAgIF9jdXJyZW50UnVsZXM6IGZ1bmN0aW9uKCksXG4gICAgICAgIHRvcFN0YXRlOiBmdW5jdGlvbigpLFxuICAgICAgICBwdXNoU3RhdGU6IGZ1bmN0aW9uKGNvbmRpdGlvbiksXG5cbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgcmFuZ2VzOiBib29sZWFuICAgICAgICAgICAob3B0aW9uYWw6IHRydWUgPT0+IHRva2VuIGxvY2F0aW9uIGluZm8gd2lsbCBpbmNsdWRlIGEgLnJhbmdlW10gbWVtYmVyKVxuICAgICAgICAgICAgZmxleDogYm9vbGVhbiAgICAgICAgICAgICAob3B0aW9uYWw6IHRydWUgPT0+IGZsZXgtbGlrZSBsZXhpbmcgYmVoYXZpb3VyIHdoZXJlIHRoZSBydWxlcyBhcmUgdGVzdGVkIGV4aGF1c3RpdmVseSB0byBmaW5kIHRoZSBsb25nZXN0IG1hdGNoKVxuICAgICAgICAgICAgYmFja3RyYWNrX2xleGVyOiBib29sZWFuICAob3B0aW9uYWw6IHRydWUgPT0+IGxleGVyIHJlZ2V4ZXMgYXJlIHRlc3RlZCBpbiBvcmRlciBhbmQgZm9yIGVhY2ggbWF0Y2hpbmcgcmVnZXggdGhlIGFjdGlvbiBjb2RlIGlzIGludm9rZWQ7IHRoZSBsZXhlciB0ZXJtaW5hdGVzIHRoZSBzY2FuIHdoZW4gYSB0b2tlbiBpcyByZXR1cm5lZCBieSB0aGUgYWN0aW9uIGNvZGUpXG4gICAgICAgIH0sXG5cbiAgICAgICAgcGVyZm9ybUFjdGlvbjogZnVuY3Rpb24oeXksIHl5XywgJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucywgWVlfU1RBUlQpLFxuICAgICAgICBydWxlczogWy4uLl0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHthc3NvY2lhdGl2ZSBsaXN0OiBuYW1lID09PiBzZXR9LFxuICAgIH1cbiAgfVxuXG5cbiAgdG9rZW4gbG9jYXRpb24gaW5mbyAoQCQsIF8kLCBldGMuKToge1xuICAgIGZpcnN0X2xpbmU6IG4sXG4gICAgbGFzdF9saW5lOiBuLFxuICAgIGZpcnN0X2NvbHVtbjogbixcbiAgICBsYXN0X2NvbHVtbjogbixcbiAgICByYW5nZTogW3N0YXJ0X251bWJlciwgZW5kX251bWJlcl0gICAgICAgKHdoZXJlIHRoZSBudW1iZXJzIGFyZSBpbmRleGVzIGludG8gdGhlIGlucHV0IHN0cmluZywgcmVndWxhciB6ZXJvLWJhc2VkKVxuICB9XG5cblxuICB0aGUgcGFyc2VFcnJvciBmdW5jdGlvbiByZWNlaXZlcyBhICdoYXNoJyBvYmplY3Qgd2l0aCB0aGVzZSBtZW1iZXJzIGZvciBsZXhlciBhbmQgcGFyc2VyIGVycm9yczoge1xuICAgIHRleHQ6ICAgICAgICAobWF0Y2hlZCB0ZXh0KVxuICAgIHRva2VuOiAgICAgICAodGhlIHByb2R1Y2VkIHRlcm1pbmFsIHRva2VuLCBpZiBhbnkpXG4gICAgbGluZTogICAgICAgICh5eWxpbmVubylcbiAgfVxuICB3aGlsZSBwYXJzZXIgKGdyYW1tYXIpIGVycm9ycyB3aWxsIGFsc28gcHJvdmlkZSB0aGVzZSBtZW1iZXJzLCBpLmUuIHBhcnNlciBlcnJvcnMgZGVsaXZlciBhIHN1cGVyc2V0IG9mIGF0dHJpYnV0ZXM6IHtcbiAgICBsb2M6ICAgICAgICAgKHl5bGxvYylcbiAgICBleHBlY3RlZDogICAgKHN0cmluZyBkZXNjcmliaW5nIHRoZSBzZXQgb2YgZXhwZWN0ZWQgdG9rZW5zKVxuICAgIHJlY292ZXJhYmxlOiAoYm9vbGVhbjogVFJVRSB3aGVuIHRoZSBwYXJzZXIgaGFzIGEgZXJyb3IgcmVjb3ZlcnkgcnVsZSBhdmFpbGFibGUgZm9yIHRoaXMgcGFydGljdWxhciBlcnJvcilcbiAgfVxuKi9cbnZhciBqc29ubGludCA9IChmdW5jdGlvbigpe1xudmFyIG89ZnVuY3Rpb24oayx2LG8sbCl7Zm9yKG89b3x8e30sbD1rLmxlbmd0aDtsLS07b1trW2xdXT12KTtyZXR1cm4gb30sJFYwPVsxLDEyXSwkVjE9WzEsMTNdLCRWMj1bMSw5XSwkVjM9WzEsMTBdLCRWND1bMSwxMV0sJFY1PVsxLDE0XSwkVjY9WzEsMTVdLCRWNz1bMTQsMTgsMjIsMjRdLCRWOD1bMTgsMjJdLCRWOT1bMjIsMjRdO1xudmFyIHBhcnNlciA9IHt0cmFjZTogZnVuY3Rpb24gdHJhY2UoKSB7IH0sXG55eToge30sXG5zeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwiSlNPTlN0cmluZ1wiOjMsXCJTVFJJTkdcIjo0LFwiSlNPTk51bWJlclwiOjUsXCJOVU1CRVJcIjo2LFwiSlNPTk51bGxMaXRlcmFsXCI6NyxcIk5VTExcIjo4LFwiSlNPTkJvb2xlYW5MaXRlcmFsXCI6OSxcIlRSVUVcIjoxMCxcIkZBTFNFXCI6MTEsXCJKU09OVGV4dFwiOjEyLFwiSlNPTlZhbHVlXCI6MTMsXCJFT0ZcIjoxNCxcIkpTT05PYmplY3RcIjoxNSxcIkpTT05BcnJheVwiOjE2LFwie1wiOjE3LFwifVwiOjE4LFwiSlNPTk1lbWJlckxpc3RcIjoxOSxcIkpTT05NZW1iZXJcIjoyMCxcIjpcIjoyMSxcIixcIjoyMixcIltcIjoyMyxcIl1cIjoyNCxcIkpTT05FbGVtZW50TGlzdFwiOjI1LFwiJGFjY2VwdFwiOjAsXCIkZW5kXCI6MX0sXG50ZXJtaW5hbHNfOiB7MjpcImVycm9yXCIsNDpcIlNUUklOR1wiLDY6XCJOVU1CRVJcIiw4OlwiTlVMTFwiLDEwOlwiVFJVRVwiLDExOlwiRkFMU0VcIiwxNDpcIkVPRlwiLDE3Olwie1wiLDE4OlwifVwiLDIxOlwiOlwiLDIyOlwiLFwiLDIzOlwiW1wiLDI0OlwiXVwifSxcbnByb2R1Y3Rpb25zXzogWzAsWzMsMV0sWzUsMV0sWzcsMV0sWzksMV0sWzksMV0sWzEyLDJdLFsxMywxXSxbMTMsMV0sWzEzLDFdLFsxMywxXSxbMTMsMV0sWzEzLDFdLFsxNSwyXSxbMTUsM10sWzIwLDNdLFsxOSwxXSxbMTksM10sWzE2LDJdLFsxNiwzXSxbMjUsMV0sWzI1LDNdXSxcbnBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHl5LCB5eXN0YXRlIC8qIGFjdGlvblsxXSAqLywgJCQgLyogdnN0YWNrICovLCBfJCAvKiBsc3RhY2sgKi8pIHtcbi8qIHRoaXMgPT0geXl2YWwgKi9cblxudmFyICQwID0gJCQubGVuZ3RoIC0gMTtcbnN3aXRjaCAoeXlzdGF0ZSkge1xuY2FzZSAxOlxuIC8vIHJlcGxhY2UgZXNjYXBlZCBjaGFyYWN0ZXJzIHdpdGggYWN0dWFsIGNoYXJhY3RlclxuICAgICAgICAgIHRoaXMuJCA9IHl5dGV4dC5yZXBsYWNlKC9cXFxcKFxcXFx8XCIpL2csIFwiJFwiK1wiMVwiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxuL2csJ1xcbicpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXHIvZywnXFxyJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcdC9nLCdcXHQnKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFx2L2csJ1xcdicpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXGYvZywnXFxmJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcYi9nLCdcXGInKTtcbiAgICAgICAgXG5icmVhaztcbmNhc2UgMjpcbnRoaXMuJCA9IE51bWJlcih5eXRleHQpO1xuYnJlYWs7XG5jYXNlIDM6XG50aGlzLiQgPSBudWxsO1xuYnJlYWs7XG5jYXNlIDQ6XG50aGlzLiQgPSB0cnVlO1xuYnJlYWs7XG5jYXNlIDU6XG50aGlzLiQgPSBmYWxzZTtcbmJyZWFrO1xuY2FzZSA2OlxucmV0dXJuIHRoaXMuJCA9ICQkWyQwLTFdO1xuYnJlYWs7XG5jYXNlIDEzOlxudGhpcy4kID0ge307IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDE0OiBjYXNlIDE5OlxudGhpcy4kID0gJCRbJDAtMV07IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDE1OlxudGhpcy4kID0gWyQkWyQwLTJdLCAkJFskMF1dO1xuYnJlYWs7XG5jYXNlIDE2OlxudGhpcy4kID0ge307IHRoaXMuJFskJFskMF1bMF1dID0gJCRbJDBdWzFdO1xuYnJlYWs7XG5jYXNlIDE3OlxuXG4gICAgICAgICAgICB0aGlzLiQgPSAkJFskMC0yXTtcbiAgICAgICAgICAgIGlmICgkJFskMC0yXVskJFskMF1bMF1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJC5fX2R1cGxpY2F0ZVByb3BlcnRpZXNfXykge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy4kLCAnX19kdXBsaWNhdGVQcm9wZXJ0aWVzX18nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy4kLl9fZHVwbGljYXRlUHJvcGVydGllc19fLnB1c2goJCRbJDBdWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQkWyQwLTJdWyQkWyQwXVswXV0gPSAkJFskMF1bMV07XG4gICAgICAgIFxuYnJlYWs7XG5jYXNlIDE4OlxudGhpcy4kID0gW107IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLiQsICdfX2xpbmVfXycsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLl8kLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KVxuYnJlYWs7XG5jYXNlIDIwOlxudGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgMjE6XG50aGlzLiQgPSAkJFskMC0yXTsgJCRbJDAtMl0ucHVzaCgkJFskMF0pO1xuYnJlYWs7XG59XG59LFxudGFibGU6IFt7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTI6MSwxMzoyLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2fSx7MTpbM119LHsxNDpbMSwxNl19LG8oJFY3LFsyLDddKSxvKCRWNyxbMiw4XSksbygkVjcsWzIsOV0pLG8oJFY3LFsyLDEwXSksbygkVjcsWzIsMTFdKSxvKCRWNyxbMiwxMl0pLG8oJFY3LFsyLDNdKSxvKCRWNyxbMiw0XSksbygkVjcsWzIsNV0pLG8oWzE0LDE4LDIxLDIyLDI0XSxbMiwxXSksbygkVjcsWzIsMl0pLHszOjIwLDQ6JFYwLDE4OlsxLDE3XSwxOToxOCwyMDoxOX0sezM6NSw0OiRWMCw1OjYsNjokVjEsNzozLDg6JFYyLDk6NCwxMDokVjMsMTE6JFY0LDEzOjIzLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2LDI0OlsxLDIxXSwyNToyMn0sezE6WzIsNl19LG8oJFY3LFsyLDEzXSksezE4OlsxLDI0XSwyMjpbMSwyNV19LG8oJFY4LFsyLDE2XSksezIxOlsxLDI2XX0sbygkVjcsWzIsMThdKSx7MjI6WzEsMjhdLDI0OlsxLDI3XX0sbygkVjksWzIsMjBdKSxvKCRWNyxbMiwxNF0pLHszOjIwLDQ6JFYwLDIwOjI5fSx7Mzo1LDQ6JFYwLDU6Niw2OiRWMSw3OjMsODokVjIsOTo0LDEwOiRWMywxMTokVjQsMTM6MzAsMTU6NywxNjo4LDE3OiRWNSwyMzokVjZ9LG8oJFY3LFsyLDE5XSksezM6NSw0OiRWMCw1OjYsNjokVjEsNzozLDg6JFYyLDk6NCwxMDokVjMsMTE6JFY0LDEzOjMxLDE1OjcsMTY6OCwxNzokVjUsMjM6JFY2fSxvKCRWOCxbMiwxN10pLG8oJFY4LFsyLDE1XSksbygkVjksWzIsMjFdKV0sXG5kZWZhdWx0QWN0aW9uczogezE2OlsyLDZdfSxcbnBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgaWYgKGhhc2gucmVjb3ZlcmFibGUpIHtcbiAgICAgICAgdGhpcy50cmFjZShzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bmN0aW9uIF9wYXJzZUVycm9yIChtc2csIGhhc2gpIHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1zZztcbiAgICAgICAgICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gICAgICAgIH1cbiAgICAgICAgX3BhcnNlRXJyb3IucHJvdG90eXBlID0gRXJyb3I7XG5cbiAgICAgICAgdGhyb3cgbmV3IF9wYXJzZUVycm9yKHN0ciwgaGFzaCk7XG4gICAgfVxufSxcbnBhcnNlOiBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgIHZhciBzZWxmID0gdGhpcywgc3RhY2sgPSBbMF0sIHRzdGFjayA9IFtdLCB2c3RhY2sgPSBbbnVsbF0sIGxzdGFjayA9IFtdLCB0YWJsZSA9IHRoaXMudGFibGUsIHl5dGV4dCA9ICcnLCB5eWxpbmVubyA9IDAsIHl5bGVuZyA9IDAsIHJlY292ZXJpbmcgPSAwLCBURVJST1IgPSAyLCBFT0YgPSAxO1xuICAgIHZhciBhcmdzID0gbHN0YWNrLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgbGV4ZXIgPSBPYmplY3QuY3JlYXRlKHRoaXMubGV4ZXIpO1xuICAgIHZhciBzaGFyZWRTdGF0ZSA9IHsgeXk6IHt9IH07XG4gICAgZm9yICh2YXIgayBpbiB0aGlzLnl5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy55eSwgaykpIHtcbiAgICAgICAgICAgIHNoYXJlZFN0YXRlLnl5W2tdID0gdGhpcy55eVtrXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXhlci5zZXRJbnB1dChpbnB1dCwgc2hhcmVkU3RhdGUueXkpO1xuICAgIHNoYXJlZFN0YXRlLnl5LmxleGVyID0gbGV4ZXI7XG4gICAgc2hhcmVkU3RhdGUueXkucGFyc2VyID0gdGhpcztcbiAgICBpZiAodHlwZW9mIGxleGVyLnl5bGxvYyA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsZXhlci55eWxsb2MgPSB7fTtcbiAgICB9XG4gICAgdmFyIHl5bG9jID0gbGV4ZXIueXlsbG9jO1xuICAgIGxzdGFjay5wdXNoKHl5bG9jKTtcbiAgICB2YXIgcmFuZ2VzID0gbGV4ZXIub3B0aW9ucyAmJiBsZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICBpZiAodHlwZW9mIHNoYXJlZFN0YXRlLnl5LnBhcnNlRXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5wYXJzZUVycm9yID0gc2hhcmVkU3RhdGUueXkucGFyc2VFcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykucGFyc2VFcnJvcjtcbiAgICB9XG4gICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgfVxuICAgIF90b2tlbl9zdGFjazpcbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b2tlbjtcbiAgICAgICAgICAgIHRva2VuID0gbGV4ZXIubGV4KCkgfHwgRU9GO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IHNlbGYuc3ltYm9sc19bdG9rZW5dIHx8IHRva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9O1xuICAgIHZhciBzeW1ib2wsIHByZUVycm9yU3ltYm9sLCBzdGF0ZSwgYWN0aW9uLCBhLCByLCB5eXZhbCA9IHt9LCBwLCBsZW4sIG5ld1N0YXRlLCBleHBlY3RlZDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV0pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCB0eXBlb2Ygc3ltYm9sID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gbGV4KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhY3Rpb24gPSB0YWJsZVtzdGF0ZV0gJiYgdGFibGVbc3RhdGVdW3N5bWJvbF07XG4gICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICd1bmRlZmluZWQnIHx8ICFhY3Rpb24ubGVuZ3RoIHx8ICFhY3Rpb25bMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyU3RyID0gJyc7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlcm1pbmFsc19bcF0gJiYgcCA+IFRFUlJPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaCgnXFwnJyArIHRoaXMudGVybWluYWxzX1twXSArICdcXCcnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGV4ZXIuc2hvd1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9ICdQYXJzZSBlcnJvciBvbiBsaW5lICcgKyAoeXlsaW5lbm8gKyAxKSArICc6XFxuJyArIGxleGVyLnNob3dQb3NpdGlvbigpICsgJ1xcbkV4cGVjdGluZyAnICsgZXhwZWN0ZWQuam9pbignLCAnKSArICcsIGdvdCBcXCcnICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyAnXFwnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSAnUGFyc2UgZXJyb3Igb24gbGluZSAnICsgKHl5bGluZW5vICsgMSkgKyAnOiBVbmV4cGVjdGVkICcgKyAoc3ltYm9sID09IEVPRiA/ICdlbmQgb2YgaW5wdXQnIDogJ1xcJycgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArICdcXCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJzZUVycm9yKGVyclN0ciwge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBsZXhlci5tYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogbGV4ZXIueXlsaW5lbm8sXG4gICAgICAgICAgICAgICAgICAgIGxvYzogeXlsb2MsXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICBpZiAoYWN0aW9uWzBdIGluc3RhbmNlb2YgQXJyYXkgJiYgYWN0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyc2UgRXJyb3I6IG11bHRpcGxlIGFjdGlvbnMgcG9zc2libGUgYXQgc3RhdGU6ICcgKyBzdGF0ZSArICcsIHRva2VuOiAnICsgc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGFjdGlvblswXSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBzdGFjay5wdXNoKHN5bWJvbCk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaChsZXhlci55eXRleHQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2gobGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgeXlsZW5nID0gbGV4ZXIueXlsZW5nO1xuICAgICAgICAgICAgICAgIHl5dGV4dCA9IGxleGVyLnl5dGV4dDtcbiAgICAgICAgICAgICAgICB5eWxpbmVubyA9IGxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgIHl5bG9jID0gbGV4ZXIueXlsbG9jO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyaW5nID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBwcmVFcnJvclN5bWJvbDtcbiAgICAgICAgICAgICAgICBwcmVFcnJvclN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgbGVuID0gdGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVsxXTtcbiAgICAgICAgICAgIHl5dmFsLiQgPSB2c3RhY2tbdnN0YWNrLmxlbmd0aCAtIGxlbl07XG4gICAgICAgICAgICB5eXZhbC5fJCA9IHtcbiAgICAgICAgICAgICAgICBmaXJzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICAgICAgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSxcbiAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfY29sdW1uXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW1xuICAgICAgICAgICAgICAgICAgICBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLnJhbmdlWzBdLFxuICAgICAgICAgICAgICAgICAgICBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLnJhbmdlWzFdXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHIgPSB0aGlzLnBlcmZvcm1BY3Rpb24uYXBwbHkoeXl2YWwsIFtcbiAgICAgICAgICAgICAgICB5eXRleHQsXG4gICAgICAgICAgICAgICAgeXlsZW5nLFxuICAgICAgICAgICAgICAgIHl5bGluZW5vLFxuICAgICAgICAgICAgICAgIHNoYXJlZFN0YXRlLnl5LFxuICAgICAgICAgICAgICAgIGFjdGlvblsxXSxcbiAgICAgICAgICAgICAgICB2c3RhY2ssXG4gICAgICAgICAgICAgICAgbHN0YWNrXG4gICAgICAgICAgICBdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufX07XG4vKiBnZW5lcmF0ZWQgYnkgamlzb24tbGV4IDAuMy40ICovXG52YXIgbGV4ZXIgPSAoZnVuY3Rpb24oKXtcbnZhciBsZXhlciA9ICh7XG5cbkVPRjoxLFxuXG5wYXJzZUVycm9yOmZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgIGlmICh0aGlzLnl5LnBhcnNlcikge1xuICAgICAgICAgICAgdGhpcy55eS5wYXJzZXIucGFyc2VFcnJvcihzdHIsIGhhc2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyByZXNldHMgdGhlIGxleGVyLCBzZXRzIG5ldyBpbnB1dFxuc2V0SW5wdXQ6ZnVuY3Rpb24gKGlucHV0LCB5eSkge1xuICAgICAgICB0aGlzLnl5ID0geXkgfHwgdGhpcy55eSB8fCB7fTtcbiAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRoaXMuX2JhY2t0cmFjayA9IHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnl5bGluZW5vID0gdGhpcy55eWxlbmcgPSAwO1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjayA9IFsnSU5JVElBTCddO1xuICAgICAgICB0aGlzLnl5bGxvYyA9IHtcbiAgICAgICAgICAgIGZpcnN0X2xpbmU6IDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IDAsXG4gICAgICAgICAgICBsYXN0X2xpbmU6IDEsXG4gICAgICAgICAgICBsYXN0X2NvbHVtbjogMFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwwXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbi8vIGNvbnN1bWVzIGFuZCByZXR1cm5zIG9uZSBjaGFyIGZyb20gdGhlIGlucHV0XG5pbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaCA9IHRoaXMuX2lucHV0WzBdO1xuICAgICAgICB0aGlzLnl5dGV4dCArPSBjaDtcbiAgICAgICAgdGhpcy55eWxlbmcrKztcbiAgICAgICAgdGhpcy5vZmZzZXQrKztcbiAgICAgICAgdGhpcy5tYXRjaCArPSBjaDtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IGNoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgIGlmIChsaW5lcykge1xuICAgICAgICAgICAgdGhpcy55eWxpbmVubysrO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9saW5lKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbisrO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZVsxXSsrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZSgxKTtcbiAgICAgICAgcmV0dXJuIGNoO1xuICAgIH0sXG5cbi8vIHVuc2hpZnRzIG9uZSBjaGFyIChvciBhIHN0cmluZykgaW50byB0aGUgaW5wdXRcbnVucHV0OmZ1bmN0aW9uIChjaCkge1xuICAgICAgICB2YXIgbGVuID0gY2gubGVuZ3RoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gY2ggKyB0aGlzLl9pbnB1dDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLnl5dGV4dC5zdWJzdHIoMCwgdGhpcy55eXRleHQubGVuZ3RoIC0gbGVuKTtcbiAgICAgICAgLy90aGlzLnl5bGVuZyAtPSBsZW47XG4gICAgICAgIHRoaXMub2Zmc2V0IC09IGxlbjtcbiAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgICAgICB0aGlzLm1hdGNoID0gdGhpcy5tYXRjaC5zdWJzdHIoMCwgdGhpcy5tYXRjaC5sZW5ndGggLSAxKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gMSk7XG5cbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMueXlsaW5lbm8gLT0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgciA9IHRoaXMueXlsbG9jLnJhbmdlO1xuXG4gICAgICAgIHRoaXMueXlsbG9jID0ge1xuICAgICAgICAgICAgZmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcbiAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/XG4gICAgICAgICAgICAgICAgKGxpbmVzLmxlbmd0aCA9PT0gb2xkTGluZXMubGVuZ3RoID8gdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIDogMClcbiAgICAgICAgICAgICAgICAgKyBvbGRMaW5lc1tvbGRMaW5lcy5sZW5ndGggLSBsaW5lcy5sZW5ndGhdLmxlbmd0aCAtIGxpbmVzWzBdLmxlbmd0aCA6XG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiAtIGxlblxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFtyWzBdLCByWzBdICsgdGhpcy55eWxlbmcgLSBsZW5dO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4vLyBXaGVuIGNhbGxlZCBmcm9tIGFjdGlvbiwgY2FjaGVzIG1hdGNoZWQgdGV4dCBhbmQgYXBwZW5kcyBpdCBvbiBuZXh0IGFjdGlvblxubW9yZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4vLyBXaGVuIGNhbGxlZCBmcm9tIGFjdGlvbiwgc2lnbmFscyB0aGUgbGV4ZXIgdGhhdCB0aGlzIHJ1bGUgZmFpbHMgdG8gbWF0Y2ggdGhlIGlucHV0LCBzbyB0aGUgbmV4dCBtYXRjaGluZyBydWxlIChyZWdleCkgc2hvdWxkIGJlIHRlc3RlZCBpbnN0ZWFkLlxucmVqZWN0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2JhY2t0cmFjayA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUVycm9yKCdMZXhpY2FsIGVycm9yIG9uIGxpbmUgJyArICh0aGlzLnl5bGluZW5vICsgMSkgKyAnLiBZb3UgY2FuIG9ubHkgaW52b2tlIHJlamVjdCgpIGluIHRoZSBsZXhlciB3aGVuIHRoZSBsZXhlciBpcyBvZiB0aGUgYmFja3RyYWNraW5nIHBlcnN1YXNpb24gKG9wdGlvbnMuYmFja3RyYWNrX2xleGVyID0gdHJ1ZSkuXFxuJyArIHRoaXMuc2hvd1Bvc2l0aW9uKCksIHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxuICAgICAgICAgICAgICAgIHRva2VuOiBudWxsLFxuICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMueXlsaW5lbm9cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuLy8gcmV0YWluIGZpcnN0IG4gY2hhcmFjdGVycyBvZiB0aGUgbWF0Y2hcbmxlc3M6ZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgdGhpcy51bnB1dCh0aGlzLm1hdGNoLnNsaWNlKG4pKTtcbiAgICB9LFxuXG4vLyBkaXNwbGF5cyBhbHJlYWR5IG1hdGNoZWQgaW5wdXQsIGkuZS4gZm9yIGVycm9yIG1lc3NhZ2VzXG5wYXN0SW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIChwYXN0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpICsgcGFzdC5zdWJzdHIoLTIwKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcblxuLy8gZGlzcGxheXMgdXBjb21pbmcgaW5wdXQsIGkuZS4gZm9yIGVycm9yIG1lc3NhZ2VzXG51cGNvbWluZ0lucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPCAyMCkge1xuICAgICAgICAgICAgbmV4dCArPSB0aGlzLl9pbnB1dC5zdWJzdHIoMCwgMjAtbmV4dC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV4dC5zdWJzdHIoMCwyMCkgKyAobmV4dC5sZW5ndGggPiAyMCA/ICcuLi4nIDogJycpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcblxuLy8gZGlzcGxheXMgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiB3aGVyZSB0aGUgbGV4aW5nIGVycm9yIG9jY3VycmVkLCBpLmUuIGZvciBlcnJvciBtZXNzYWdlc1xuc2hvd1Bvc2l0aW9uOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHByZSA9IHRoaXMucGFzdElucHV0KCk7XG4gICAgICAgIHZhciBjID0gbmV3IEFycmF5KHByZS5sZW5ndGggKyAxKS5qb2luKFwiLVwiKTtcbiAgICAgICAgcmV0dXJuIHByZSArIHRoaXMudXBjb21pbmdJbnB1dCgpICsgXCJcXG5cIiArIGMgKyBcIl5cIjtcbiAgICB9LFxuXG4vLyB0ZXN0IHRoZSBsZXhlZCB0b2tlbjogcmV0dXJuIEZBTFNFIHdoZW4gbm90IGEgbWF0Y2gsIG90aGVyd2lzZSByZXR1cm4gdG9rZW5cbnRlc3RfbWF0Y2g6ZnVuY3Rpb24gKG1hdGNoLCBpbmRleGVkX3J1bGUpIHtcbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbGluZXMsXG4gICAgICAgICAgICBiYWNrdXA7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgIC8vIHNhdmUgY29udGV4dFxuICAgICAgICAgICAgYmFja3VwID0ge1xuICAgICAgICAgICAgICAgIHl5bGluZW5vOiB0aGlzLnl5bGluZW5vLFxuICAgICAgICAgICAgICAgIHl5bGxvYzoge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5maXJzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5eXRleHQ6IHRoaXMueXl0ZXh0LFxuICAgICAgICAgICAgICAgIG1hdGNoOiB0aGlzLm1hdGNoLFxuICAgICAgICAgICAgICAgIG1hdGNoZXM6IHRoaXMubWF0Y2hlcyxcbiAgICAgICAgICAgICAgICBtYXRjaGVkOiB0aGlzLm1hdGNoZWQsXG4gICAgICAgICAgICAgICAgeXlsZW5nOiB0aGlzLnl5bGVuZyxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHRoaXMub2Zmc2V0LFxuICAgICAgICAgICAgICAgIF9tb3JlOiB0aGlzLl9tb3JlLFxuICAgICAgICAgICAgICAgIF9pbnB1dDogdGhpcy5faW5wdXQsXG4gICAgICAgICAgICAgICAgeXk6IHRoaXMueXksXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uU3RhY2s6IHRoaXMuY29uZGl0aW9uU3RhY2suc2xpY2UoMCksXG4gICAgICAgICAgICAgICAgZG9uZTogdGhpcy5kb25lXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICBiYWNrdXAueXlsbG9jLnJhbmdlID0gdGhpcy55eWxsb2MucmFuZ2Uuc2xpY2UoMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgaWYgKGxpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGluZW5vICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnl5bGxvYyA9IHtcbiAgICAgICAgICAgIGZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcbiAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxuICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID9cbiAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5sZW5ndGggLSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5tYXRjaCgvXFxyP1xcbj8vKVswXS5sZW5ndGggOlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uICsgbWF0Y2hbMF0ubGVuZ3RoXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMueXl0ZXh0ICs9IG1hdGNoWzBdO1xuICAgICAgICB0aGlzLm1hdGNoICs9IG1hdGNoWzBdO1xuICAgICAgICB0aGlzLm1hdGNoZXMgPSBtYXRjaDtcbiAgICAgICAgdGhpcy55eWxlbmcgPSB0aGlzLnl5dGV4dC5sZW5ndGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFt0aGlzLm9mZnNldCwgdGhpcy5vZmZzZXQgKz0gdGhpcy55eWxlbmddO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21vcmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYmFja3RyYWNrID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xuICAgICAgICB0b2tlbiA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHRoaXMsIHRoaXMueXksIHRoaXMsIGluZGV4ZWRfcnVsZSwgdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSAmJiB0aGlzLl9pbnB1dCkge1xuICAgICAgICAgICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYmFja3RyYWNrKSB7XG4gICAgICAgICAgICAvLyByZWNvdmVyIGNvbnRleHRcbiAgICAgICAgICAgIGZvciAodmFyIGsgaW4gYmFja3VwKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trXSA9IGJhY2t1cFtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gcnVsZSBhY3Rpb24gY2FsbGVkIHJlamVjdCgpIGltcGx5aW5nIHRoZSBuZXh0IHJ1bGUgc2hvdWxkIGJlIHRlc3RlZCBpbnN0ZWFkLlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4vLyByZXR1cm4gbmV4dCBtYXRjaCBpbiBpbnB1dFxubmV4dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2lucHV0KSB7XG4gICAgICAgICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbWF0Y2gsXG4gICAgICAgICAgICB0ZW1wTWF0Y2gsXG4gICAgICAgICAgICBpbmRleDtcbiAgICAgICAgaWYgKCF0aGlzLl9tb3JlKSB7XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX2N1cnJlbnRSdWxlcygpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0ZW1wTWF0Y2ggPSB0aGlzLl9pbnB1dC5tYXRjaCh0aGlzLnJ1bGVzW3J1bGVzW2ldXSk7XG4gICAgICAgICAgICBpZiAodGVtcE1hdGNoICYmICghbWF0Y2ggfHwgdGVtcE1hdGNoWzBdLmxlbmd0aCA+IG1hdGNoWzBdLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5iYWNrdHJhY2tfbGV4ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnRlc3RfbWF0Y2godGVtcE1hdGNoLCBydWxlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9iYWNrdHJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTsgLy8gcnVsZSBhY3Rpb24gY2FsbGVkIHJlamVjdCgpIGltcGx5aW5nIGEgcnVsZSBNSVNtYXRjaC5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsc2U6IHRoaXMgaXMgYSBsZXhlciBydWxlIHdoaWNoIGNvbnN1bWVzIGlucHV0IHdpdGhvdXQgcHJvZHVjaW5nIGEgdG9rZW4gKGUuZy4gd2hpdGVzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMub3B0aW9ucy5mbGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHRva2VuID0gdGhpcy50ZXN0X21hdGNoKG1hdGNoLCBydWxlc1tpbmRleF0pO1xuICAgICAgICAgICAgaWYgKHRva2VuICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsc2U6IHRoaXMgaXMgYSBsZXhlciBydWxlIHdoaWNoIGNvbnN1bWVzIGlucHV0IHdpdGhvdXQgcHJvZHVjaW5nIGEgdG9rZW4gKGUuZy4gd2hpdGVzcGFjZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW5wdXQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoJ0xleGljYWwgZXJyb3Igb24gbGluZSAnICsgKHRoaXMueXlsaW5lbm8gKyAxKSArICcuIFVucmVjb2duaXplZCB0ZXh0LlxcbicgKyB0aGlzLnNob3dQb3NpdGlvbigpLCB7XG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIixcbiAgICAgICAgICAgICAgICB0b2tlbjogbnVsbCxcbiAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLnl5bGluZW5vXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHJldHVybiBuZXh0IG1hdGNoIHRoYXQgaGFzIGEgdG9rZW5cbmxleDpmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciByID0gdGhpcy5uZXh0KCk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxleCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gYWN0aXZhdGVzIGEgbmV3IGxleGVyIGNvbmRpdGlvbiBzdGF0ZSAocHVzaGVzIHRoZSBuZXcgbGV4ZXIgY29uZGl0aW9uIHN0YXRlIG9udG8gdGhlIGNvbmRpdGlvbiBzdGFjaylcbmJlZ2luOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcbiAgICB9LFxuXG4vLyBwb3AgdGhlIHByZXZpb3VzbHkgYWN0aXZlIGxleGVyIGNvbmRpdGlvbiBzdGF0ZSBvZmYgdGhlIGNvbmRpdGlvbiBzdGFja1xucG9wU3RhdGU6ZnVuY3Rpb24gcG9wU3RhdGUoKSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxO1xuICAgICAgICBpZiAobiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLnBvcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbMF07XG4gICAgICAgIH1cbiAgICB9LFxuXG4vLyBwcm9kdWNlIHRoZSBsZXhlciBydWxlIHNldCB3aGljaCBpcyBhY3RpdmUgZm9yIHRoZSBjdXJyZW50bHkgYWN0aXZlIGxleGVyIGNvbmRpdGlvbiBzdGF0ZVxuX2N1cnJlbnRSdWxlczpmdW5jdGlvbiBfY3VycmVudFJ1bGVzKCkge1xuICAgICAgICBpZiAodGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggJiYgdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW3RoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxXV0ucnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW1wiSU5JVElBTFwiXS5ydWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbi8vIHJldHVybiB0aGUgY3VycmVudGx5IGFjdGl2ZSBsZXhlciBjb25kaXRpb24gc3RhdGU7IHdoZW4gYW4gaW5kZXggYXJndW1lbnQgaXMgcHJvdmlkZWQgaXQgcHJvZHVjZXMgdGhlIE4tdGggcHJldmlvdXMgY29uZGl0aW9uIHN0YXRlLCBpZiBhdmFpbGFibGVcbnRvcFN0YXRlOmZ1bmN0aW9uIHRvcFN0YXRlKG4pIHtcbiAgICAgICAgbiA9IHRoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoIC0gMSAtIE1hdGguYWJzKG4gfHwgMCk7XG4gICAgICAgIGlmIChuID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrW25dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwiSU5JVElBTFwiO1xuICAgICAgICB9XG4gICAgfSxcblxuLy8gYWxpYXMgZm9yIGJlZ2luKGNvbmRpdGlvbilcbnB1c2hTdGF0ZTpmdW5jdGlvbiBwdXNoU3RhdGUoY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuYmVnaW4oY29uZGl0aW9uKTtcbiAgICB9LFxuXG4vLyByZXR1cm4gdGhlIG51bWJlciBvZiBzdGF0ZXMgY3VycmVudGx5IG9uIHRoZSBzdGFja1xuc3RhdGVTdGFja1NpemU6ZnVuY3Rpb24gc3RhdGVTdGFja1NpemUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aDtcbiAgICB9LFxub3B0aW9uczoge30sXG5wZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXkseXlfLCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsWVlfU1RBUlQpIHtcbnZhciBZWVNUQVRFPVlZX1NUQVJUO1xuc3dpdGNoKCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMpIHtcbmNhc2UgMDovKiBza2lwIHdoaXRlc3BhY2UgKi9cbmJyZWFrO1xuY2FzZSAxOnJldHVybiA2XG5icmVhaztcbmNhc2UgMjp5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMSx5eV8ueXlsZW5nLTIpOyByZXR1cm4gNFxuYnJlYWs7XG5jYXNlIDM6cmV0dXJuIDE3XG5icmVhaztcbmNhc2UgNDpyZXR1cm4gMThcbmJyZWFrO1xuY2FzZSA1OnJldHVybiAyM1xuYnJlYWs7XG5jYXNlIDY6cmV0dXJuIDI0XG5icmVhaztcbmNhc2UgNzpyZXR1cm4gMjJcbmJyZWFrO1xuY2FzZSA4OnJldHVybiAyMVxuYnJlYWs7XG5jYXNlIDk6cmV0dXJuIDEwXG5icmVhaztcbmNhc2UgMTA6cmV0dXJuIDExXG5icmVhaztcbmNhc2UgMTE6cmV0dXJuIDhcbmJyZWFrO1xuY2FzZSAxMjpyZXR1cm4gMTRcbmJyZWFrO1xuY2FzZSAxMzpyZXR1cm4gJ0lOVkFMSUQnXG5icmVhaztcbn1cbn0sXG5ydWxlczogWy9eKD86XFxzKykvLC9eKD86KC0/KFswLTldfFsxLTldWzAtOV0rKSkoXFwuWzAtOV0rKT8oW2VFXVstK10/WzAtOV0rKT9cXGIpLywvXig/OlwiKD86XFxcXFtcXFxcXCJiZm5ydFxcL118XFxcXHVbYS1mQS1GMC05XXs0fXxbXlxcXFxcXDAtXFx4MDlcXHgwYS1cXHgxZlwiXSkqXCIpLywvXig/OlxceykvLC9eKD86XFx9KS8sL14oPzpcXFspLywvXig/OlxcXSkvLC9eKD86LCkvLC9eKD86OikvLC9eKD86dHJ1ZVxcYikvLC9eKD86ZmFsc2VcXGIpLywvXig/Om51bGxcXGIpLywvXig/OiQpLywvXig/Oi4pL10sXG5jb25kaXRpb25zOiB7XCJJTklUSUFMXCI6e1wicnVsZXNcIjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxM10sXCJpbmNsdXNpdmVcIjp0cnVlfX1cbn0pO1xucmV0dXJuIGxleGVyO1xufSkoKTtcbnBhcnNlci5sZXhlciA9IGxleGVyO1xuZnVuY3Rpb24gUGFyc2VyICgpIHtcbiAgdGhpcy55eSA9IHt9O1xufVxuUGFyc2VyLnByb3RvdHlwZSA9IHBhcnNlcjtwYXJzZXIuUGFyc2VyID0gUGFyc2VyO1xucmV0dXJuIG5ldyBQYXJzZXI7XG59KSgpO1xuXG5cbmlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG5leHBvcnRzLnBhcnNlciA9IGpzb25saW50O1xuZXhwb3J0cy5QYXJzZXIgPSBqc29ubGludC5QYXJzZXI7XG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4ganNvbmxpbnQucGFyc2UuYXBwbHkoanNvbmxpbnQsIGFyZ3VtZW50cyk7IH07XG5leHBvcnRzLm1haW4gPSBmdW5jdGlvbiBjb21tb25qc01haW4oYXJncykge1xuICAgIGlmICghYXJnc1sxXSkge1xuICAgICAgICBjb25zb2xlLmxvZygnVXNhZ2U6ICcrYXJnc1swXSsnIEZJTEUnKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgICB2YXIgc291cmNlID0gcmVxdWlyZSgnZnMnKS5yZWFkRmlsZVN5bmMocmVxdWlyZSgncGF0aCcpLm5vcm1hbGl6ZShhcmdzWzFdKSwgXCJ1dGY4XCIpO1xuICAgIHJldHVybiBleHBvcnRzLnBhcnNlci5wYXJzZShzb3VyY2UpO1xufTtcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiByZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBleHBvcnRzLm1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDEpKTtcbn1cbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9nZW9qc29uaGludC9ub2RlX21vZHVsZXMvanNvbmxpbnQtbGluZXMvbGliL2pzb25saW50LmpzXG4vLyBtb2R1bGUgaWQgPSAyNDlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtb2R1bGUpIHtcclxuXHRpZighbW9kdWxlLndlYnBhY2tQb2x5ZmlsbCkge1xyXG5cdFx0bW9kdWxlLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKCkge307XHJcblx0XHRtb2R1bGUucGF0aHMgPSBbXTtcclxuXHRcdC8vIG1vZHVsZS5wYXJlbnQgPSB1bmRlZmluZWQgYnkgZGVmYXVsdFxyXG5cdFx0aWYoIW1vZHVsZS5jaGlsZHJlbikgbW9kdWxlLmNoaWxkcmVuID0gW107XHJcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kdWxlLCBcImxvYWRlZFwiLCB7XHJcblx0XHRcdGVudW1lcmFibGU6IHRydWUsXHJcblx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIG1vZHVsZS5sO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2R1bGUsIFwiaWRcIiwge1xyXG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxyXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBtb2R1bGUuaTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRtb2R1bGUud2VicGFja1BvbHlmaWxsID0gMTtcclxuXHR9XHJcblx0cmV0dXJuIG1vZHVsZTtcclxufTtcclxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gKHdlYnBhY2spL2J1aWxkaW4vbW9kdWxlLmpzXG4vLyBtb2R1bGUgaWQgPSAyNTBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDI1MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgcmlnaHRIYW5kUnVsZSA9IHJlcXVpcmUoJy4vcmhyJyk7XG5cbi8qKlxuICogQGFsaWFzIGdlb2pzb25oaW50XG4gKiBAcGFyYW0geyhzdHJpbmd8b2JqZWN0KX0gR2VvSlNPTiBnaXZlbiBhcyBhIHN0cmluZyBvciBhcyBhbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLm5vRHVwbGljYXRlTWVtYmVycz10cnVlXSBmb3JiaWQgcmVwZWF0ZWRcbiAqIHByb3BlcnRpZXMuIFRoaXMgaXMgb25seSBhdmFpbGFibGUgZm9yIHN0cmluZyBpbnB1dCwgYmVjYXVzZWQgcGFyc2VkXG4gKiBPYmplY3RzIGNhbm5vdCBoYXZlIGR1cGxpY2F0ZSBwcm9wZXJ0aWVzLlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5wcmVjaXNpb25XYXJuaW5nPXRydWVdIHdhcm4gaWYgR2VvSlNPTiBjb250YWluc1xuICogdW5uZWNlc3NhcnkgY29vcmRpbmF0ZSBwcmVjaXNpb24uXG4gKiBAcmV0dXJucyB7QXJyYXk8T2JqZWN0Pn0gYW4gYXJyYXkgb2YgZXJyb3JzXG4gKi9cbmZ1bmN0aW9uIGhpbnQoZ2osIG9wdGlvbnMpIHtcblxuICAgIHZhciBlcnJvcnMgPSBbXTtcbiAgICB2YXIgcHJlY2lzaW9uV2FybmluZ0NvdW50ID0gMDtcbiAgICB2YXIgbWF4UHJlY2lzaW9uV2FybmluZ3MgPSAxMDtcbiAgICB2YXIgbWF4UHJlY2lzaW9uID0gNjtcblxuICAgIGZ1bmN0aW9uIHJvb3QoXykge1xuXG4gICAgICAgIGlmICgoIW9wdGlvbnMgfHwgb3B0aW9ucy5ub0R1cGxpY2F0ZU1lbWJlcnMgIT09IGZhbHNlKSAmJlxuICAgICAgICAgICBfLl9fZHVwbGljYXRlUHJvcGVydGllc19fKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0FuIG9iamVjdCBjb250YWluZWQgZHVwbGljYXRlIG1lbWJlcnMsIG1ha2luZyBwYXJzaW5nIGFtYmlnb3VzOiAnICsgXy5fX2R1cGxpY2F0ZVByb3BlcnRpZXNfXy5qb2luKCcsICcpLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcXVpcmVkUHJvcGVydHkoXywgJ3R5cGUnLCAnc3RyaW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHlwZXNbXy50eXBlXSkge1xuICAgICAgICAgICAgdmFyIGV4cGVjdGVkVHlwZSA9IHR5cGVzTG93ZXJbXy50eXBlLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICAgICAgaWYgKGV4cGVjdGVkVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRXhwZWN0ZWQgJyArIGV4cGVjdGVkVHlwZSArICcgYnV0IGdvdCAnICsgXy50eXBlICsgJyAoY2FzZSBzZW5zaXRpdmUpJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgdHlwZSAnICsgXy50eXBlICsgJyBpcyB1bmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF8pIHtcbiAgICAgICAgICAgIHR5cGVzW18udHlwZV0oXyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBldmVyeUlzKF8sIHR5cGUpIHtcbiAgICAgICAgLy8gbWFrZSBhIHNpbmdsZSBleGNlcHRpb24gYmVjYXVzZSB0eXBlb2YgbnVsbCA9PT0gJ29iamVjdCdcbiAgICAgICAgcmV0dXJuIF8uZXZlcnkoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHggIT09IG51bGwgJiYgdHlwZW9mIHggPT09IHR5cGU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcXVpcmVkUHJvcGVydHkoXywgbmFtZSwgdHlwZSkge1xuICAgICAgICBpZiAodHlwZW9mIF9bbmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdcIicgKyBuYW1lICsgJ1wiIG1lbWJlciByZXF1aXJlZCcsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KF9bbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1wiJyArIG5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiIG1lbWJlciBzaG91bGQgYmUgYW4gYXJyYXksIGJ1dCBpcyBhbiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICh0eXBlb2YgX1tuYW1lXSkgKyAnIGluc3RlYWQnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcgJiYgX1tuYW1lXSAmJiBfW25hbWVdLmNvbnN0cnVjdG9yLm5hbWUgIT09ICdPYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdcIicgKyBuYW1lICtcbiAgICAgICAgICAgICAgICAgICAgJ1wiIG1lbWJlciBzaG91bGQgYmUgJyArICh0eXBlKSArXG4gICAgICAgICAgICAgICAgICAgICcsIGJ1dCBpcyBhbiAnICsgKF9bbmFtZV0uY29uc3RydWN0b3IubmFtZSkgKyAnIGluc3RlYWQnLFxuICAgICAgICAgICAgICAgIGxpbmU6IF8uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgJiYgdHlwZW9mIF9bbmFtZV0gIT09IHR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1wiJyArIG5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAnXCIgbWVtYmVyIHNob3VsZCBiZSAnICsgKHR5cGUpICtcbiAgICAgICAgICAgICAgICAgICAgJywgYnV0IGlzIGFuICcgKyAodHlwZW9mIF9bbmFtZV0pICsgJyBpbnN0ZWFkJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNmZWF0dXJlLWNvbGxlY3Rpb24tb2JqZWN0c1xuICAgIGZ1bmN0aW9uIEZlYXR1cmVDb2xsZWN0aW9uKGZlYXR1cmVDb2xsZWN0aW9uKSB7XG4gICAgICAgIGNycyhmZWF0dXJlQ29sbGVjdGlvbik7XG4gICAgICAgIGJib3goZmVhdHVyZUNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoZmVhdHVyZUNvbGxlY3Rpb24ucHJvcGVydGllcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ZlYXR1cmVDb2xsZWN0aW9uIG9iamVjdCBjYW5ub3QgY29udGFpbiBhIFwicHJvcGVydGllc1wiIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZUNvbGxlY3Rpb24uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmZWF0dXJlQ29sbGVjdGlvbi5jb29yZGluYXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ZlYXR1cmVDb2xsZWN0aW9uIG9iamVjdCBjYW5ub3QgY29udGFpbiBhIFwiY29vcmRpbmF0ZXNcIiBtZW1iZXInLFxuICAgICAgICAgICAgICAgIGxpbmU6IGZlYXR1cmVDb2xsZWN0aW9uLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkoZmVhdHVyZUNvbGxlY3Rpb24sICdmZWF0dXJlcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoZmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZXMsICdvYmplY3QnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdFdmVyeSBmZWF0dXJlIG11c3QgYmUgYW4gb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZUNvbGxlY3Rpb24uX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZlYXR1cmVDb2xsZWN0aW9uLmZlYXR1cmVzLmZvckVhY2goRmVhdHVyZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjcG9zaXRpb25zXG4gICAgZnVuY3Rpb24gcG9zaXRpb24oXywgbGluZSkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoXykpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ3Bvc2l0aW9uIHNob3VsZCBiZSBhbiBhcnJheSwgaXMgYSAnICsgKHR5cGVvZiBfKSArXG4gICAgICAgICAgICAgICAgICAgICcgaW5zdGVhZCcsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfXyB8fCBsaW5lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdwb3NpdGlvbiBtdXN0IGhhdmUgMiBvciBtb3JlIGVsZW1lbnRzJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ3Bvc2l0aW9uIHNob3VsZCBub3QgaGF2ZSBtb3JlIHRoYW4gMyBlbGVtZW50cycsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfXyB8fCBsaW5lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWV2ZXJ5SXMoXywgJ251bWJlcicpKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdlYWNoIGVsZW1lbnQgaW4gYSBwb3NpdGlvbiBtdXN0IGJlIGEgbnVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5wcmVjaXNpb25XYXJuaW5nKSB7XG4gICAgICAgICAgICBpZiAocHJlY2lzaW9uV2FybmluZ0NvdW50ID09PSBtYXhQcmVjaXNpb25XYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIHByZWNpc2lvbldhcm5pbmdDb3VudCArPSAxO1xuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICd0cnVuY2F0ZWQgd2FybmluZ3M6IHdlXFwndmUgZW5jb3VudGVyZWQgY29vcmRpbmF0ZSBwcmVjaXNpb24gd2FybmluZyAnICsgbWF4UHJlY2lzaW9uV2FybmluZ3MgKyAnIHRpbWVzLCBubyBtb3JlIHdhcm5pbmdzIHdpbGwgYmUgcmVwb3J0ZWQnLFxuICAgICAgICAgICAgICAgICAgICBsZXZlbDogJ21lc3NhZ2UnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBfLl9fbGluZV9fIHx8IGxpbmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlY2lzaW9uV2FybmluZ0NvdW50IDwgbWF4UHJlY2lzaW9uV2FybmluZ3MpIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goZnVuY3Rpb24obnVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcmVjaXNpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVjaW1hbFN0ciA9IFN0cmluZyhudW0pLnNwbGl0KCcuJylbMV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWNpbWFsU3RyICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVjaXNpb24gPSBkZWNpbWFsU3RyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZWNpc2lvbiA+IG1heFByZWNpc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlY2lzaW9uV2FybmluZ0NvdW50ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdwcmVjaXNpb24gb2YgY29vcmRpbmF0ZXMgc2hvdWxkIGJlIHJlZHVjZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsOiAnbWVzc2FnZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfXyB8fCBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9zaXRpb25BcnJheShjb29yZHMsIHR5cGUsIGRlcHRoLCBsaW5lKSB7XG4gICAgICAgIGlmIChsaW5lID09PSB1bmRlZmluZWQgJiYgY29vcmRzLl9fbGluZV9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxpbmUgPSBjb29yZHMuX19saW5lX187XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9zaXRpb24oY29vcmRzLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVwdGggPT09IDEgJiYgdHlwZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdMaW5lYXJSaW5nJykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb29yZHNbY29vcmRzLmxlbmd0aCAtIDFdKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnYSBudW1iZXIgd2FzIGZvdW5kIHdoZXJlIGEgY29vcmRpbmF0ZSBhcnJheSBzaG91bGQgaGF2ZSBiZWVuIGZvdW5kOiB0aGlzIG5lZWRzIHRvIGJlIG5lc3RlZCBtb3JlIGRlZXBseScsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvb3Jkcy5sZW5ndGggPCA0KSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIExpbmVhclJpbmcgb2YgY29vcmRpbmF0ZXMgbmVlZHMgdG8gaGF2ZSBmb3VyIG9yIG1vcmUgcG9zaXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb29yZHMubGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgIChjb29yZHNbY29vcmRzLmxlbmd0aCAtIDFdLmxlbmd0aCAhPT0gY29vcmRzWzBdLmxlbmd0aCB8fFxuICAgICAgICAgICAgICAgICAgICAhY29vcmRzW2Nvb3Jkcy5sZW5ndGggLSAxXS5ldmVyeShmdW5jdGlvbihwb3MsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29vcmRzWzBdW2luZGV4XSA9PT0gcG9zO1xuICAgICAgICAgICAgICAgIH0pKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAndGhlIGZpcnN0IGFuZCBsYXN0IHBvc2l0aW9ucyBpbiBhIExpbmVhclJpbmcgb2YgY29vcmRpbmF0ZXMgbXVzdCBiZSB0aGUgc2FtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lJyAmJiBjb29yZHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIGxpbmUgbmVlZHMgdG8gaGF2ZSB0d28gb3IgbW9yZSBjb29yZGluYXRlcyB0byBiZSB2YWxpZCcsXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29vcmRzKSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdhIG51bWJlciB3YXMgZm91bmQgd2hlcmUgYSBjb29yZGluYXRlIGFycmF5IHNob3VsZCBoYXZlIGJlZW4gZm91bmQ6IHRoaXMgbmVlZHMgdG8gYmUgbmVzdGVkIG1vcmUgZGVlcGx5JyxcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gY29vcmRzLm1hcChmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvc2l0aW9uQXJyYXkoYywgdHlwZSwgZGVwdGggLSAxLCBjLl9fbGluZV9fIHx8IGxpbmUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cy5zb21lKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JzKF8pIHtcbiAgICAgICAgaWYgKCFfLmNycykgcmV0dXJuO1xuICAgICAgICB2YXIgZGVmYXVsdENSU05hbWUgPSAndXJuOm9nYzpkZWY6Y3JzOk9HQzoxLjM6Q1JTODQnO1xuICAgICAgICBpZiAodHlwZW9mIF8uY3JzID09PSAnb2JqZWN0JyAmJiBfLmNycy5wcm9wZXJ0aWVzICYmIF8uY3JzLnByb3BlcnRpZXMubmFtZSA9PT0gZGVmYXVsdENSU05hbWUpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnb2xkLXN0eWxlIGNycyBtZW1iZXIgaXMgbm90IHJlY29tbWVuZGVkLCB0aGlzIG9iamVjdCBpcyBlcXVpdmFsZW50IHRvIHRoZSBkZWZhdWx0IGFuZCBzaG91bGQgYmUgcmVtb3ZlZCcsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ29sZC1zdHlsZSBjcnMgbWVtYmVyIGlzIG5vdCByZWNvbW1lbmRlZCcsXG4gICAgICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBiYm94KF8pIHtcbiAgICAgICAgaWYgKCFfLmJib3gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShfLmJib3gpKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoXy5iYm94LCAnbnVtYmVyJykpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdlYWNoIGVsZW1lbnQgaW4gYSBiYm94IG1lbWJlciBtdXN0IGJlIGEgbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5iYm94Ll9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShfLmJib3gubGVuZ3RoID09PSA0IHx8IF8uYmJveC5sZW5ndGggPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnYmJveCBtdXN0IGNvbnRhaW4gNCBlbGVtZW50cyAoZm9yIDJEKSBvciA2IGVsZW1lbnRzIChmb3IgM0QpJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogXy5iYm94Ll9fbGluZV9fXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnYmJveCBtZW1iZXIgbXVzdCBiZSBhbiBhcnJheSBvZiBudW1iZXJzLCBidXQgaXMgYSAnICsgKHR5cGVvZiBfLmJib3gpLFxuICAgICAgICAgICAgbGluZTogXy5fX2xpbmVfX1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZW9tZXRyeVNlbWFudGljcyhnZW9tKSB7XG4gICAgICAgIGlmIChnZW9tLnByb3BlcnRpZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdnZW9tZXRyeSBvYmplY3QgY2Fubm90IGNvbnRhaW4gYSBcInByb3BlcnRpZXNcIiBtZW1iZXInLFxuICAgICAgICAgICAgICAgIGxpbmU6IGdlb20uX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZW9tLmdlb21ldHJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnZ2VvbWV0cnkgb2JqZWN0IGNhbm5vdCBjb250YWluIGEgXCJnZW9tZXRyeVwiIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZ2VvbS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdlb20uZmVhdHVyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdnZW9tZXRyeSBvYmplY3QgY2Fubm90IGNvbnRhaW4gYSBcImZlYXR1cmVzXCIgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBnZW9tLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNwb2ludFxuICAgIGZ1bmN0aW9uIFBvaW50KHBvaW50KSB7XG4gICAgICAgIGNycyhwb2ludCk7XG4gICAgICAgIGJib3gocG9pbnQpO1xuICAgICAgICBnZW9tZXRyeVNlbWFudGljcyhwb2ludCk7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShwb2ludCwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uKHBvaW50LmNvb3JkaW5hdGVzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNwb2x5Z29uXG4gICAgZnVuY3Rpb24gUG9seWdvbihwb2x5Z29uKSB7XG4gICAgICAgIGNycyhwb2x5Z29uKTtcbiAgICAgICAgYmJveChwb2x5Z29uKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KHBvbHlnb24sICdjb29yZGluYXRlcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBpZiAoIXBvc2l0aW9uQXJyYXkocG9seWdvbi5jb29yZGluYXRlcywgJ0xpbmVhclJpbmcnLCAyKSkge1xuICAgICAgICAgICAgICAgIHJpZ2h0SGFuZFJ1bGUocG9seWdvbiwgZXJyb3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9nZW9qc29uLm9yZy9nZW9qc29uLXNwZWMuaHRtbCNtdWx0aXBvbHlnb25cbiAgICBmdW5jdGlvbiBNdWx0aVBvbHlnb24obXVsdGlQb2x5Z29uKSB7XG4gICAgICAgIGNycyhtdWx0aVBvbHlnb24pO1xuICAgICAgICBiYm94KG11bHRpUG9seWdvbik7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShtdWx0aVBvbHlnb24sICdjb29yZGluYXRlcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBpZiAoIXBvc2l0aW9uQXJyYXkobXVsdGlQb2x5Z29uLmNvb3JkaW5hdGVzLCAnTGluZWFyUmluZycsIDMpKSB7XG4gICAgICAgICAgICAgICAgcmlnaHRIYW5kUnVsZShtdWx0aVBvbHlnb24sIGVycm9ycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBodHRwOi8vZ2VvanNvbi5vcmcvZ2VvanNvbi1zcGVjLmh0bWwjbGluZXN0cmluZ1xuICAgIGZ1bmN0aW9uIExpbmVTdHJpbmcobGluZVN0cmluZykge1xuICAgICAgICBjcnMobGluZVN0cmluZyk7XG4gICAgICAgIGJib3gobGluZVN0cmluZyk7XG4gICAgICAgIGlmICghcmVxdWlyZWRQcm9wZXJ0eShsaW5lU3RyaW5nLCAnY29vcmRpbmF0ZXMnLCAnYXJyYXknKSkge1xuICAgICAgICAgICAgcG9zaXRpb25BcnJheShsaW5lU3RyaW5nLmNvb3JkaW5hdGVzLCAnTGluZScsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI211bHRpbGluZXN0cmluZ1xuICAgIGZ1bmN0aW9uIE11bHRpTGluZVN0cmluZyhtdWx0aUxpbmVTdHJpbmcpIHtcbiAgICAgICAgY3JzKG11bHRpTGluZVN0cmluZyk7XG4gICAgICAgIGJib3gobXVsdGlMaW5lU3RyaW5nKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KG11bHRpTGluZVN0cmluZywgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uQXJyYXkobXVsdGlMaW5lU3RyaW5nLmNvb3JkaW5hdGVzLCAnTGluZScsIDIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI211bHRpcG9pbnRcbiAgICBmdW5jdGlvbiBNdWx0aVBvaW50KG11bHRpUG9pbnQpIHtcbiAgICAgICAgY3JzKG11bHRpUG9pbnQpO1xuICAgICAgICBiYm94KG11bHRpUG9pbnQpO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkobXVsdGlQb2ludCwgJ2Nvb3JkaW5hdGVzJywgJ2FycmF5JykpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uQXJyYXkobXVsdGlQb2ludC5jb29yZGluYXRlcywgJycsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gR2VvbWV0cnlDb2xsZWN0aW9uKGdlb21ldHJ5Q29sbGVjdGlvbikge1xuICAgICAgICBjcnMoZ2VvbWV0cnlDb2xsZWN0aW9uKTtcbiAgICAgICAgYmJveChnZW9tZXRyeUNvbGxlY3Rpb24pO1xuICAgICAgICBpZiAoIXJlcXVpcmVkUHJvcGVydHkoZ2VvbWV0cnlDb2xsZWN0aW9uLCAnZ2VvbWV0cmllcycsICdhcnJheScpKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZXJ5SXMoZ2VvbWV0cnlDb2xsZWN0aW9uLmdlb21ldHJpZXMsICdvYmplY3QnKSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBnZW9tZXRyaWVzIGFycmF5IGluIGEgR2VvbWV0cnlDb2xsZWN0aW9uIG11c3QgY29udGFpbiBvbmx5IGdlb21ldHJ5IG9iamVjdHMnLFxuICAgICAgICAgICAgICAgICAgICBsaW5lOiBnZW9tZXRyeUNvbGxlY3Rpb24uX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChnZW9tZXRyeUNvbGxlY3Rpb24uZ2VvbWV0cmllcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdHZW9tZXRyeUNvbGxlY3Rpb24gd2l0aCBhIHNpbmdsZSBnZW9tZXRyeSBzaG91bGQgYmUgYXZvaWRlZCBpbiBmYXZvciBvZiBzaW5nbGUgcGFydCBvciBhIHNpbmdsZSBvYmplY3Qgb2YgbXVsdGktcGFydCB0eXBlJyxcbiAgICAgICAgICAgICAgICAgICAgbGluZTogZ2VvbWV0cnlDb2xsZWN0aW9uLmdlb21ldHJpZXMuX19saW5lX19cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdlb21ldHJ5Q29sbGVjdGlvbi5nZW9tZXRyaWVzLmZvckVhY2goZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdHZW9tZXRyeUNvbGxlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0dlb21ldHJ5Q29sbGVjdGlvbiBzaG91bGQgYXZvaWQgbmVzdGVkIGdlb21ldHJ5IGNvbGxlY3Rpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBnZW9tZXRyeUNvbGxlY3Rpb24uZ2VvbWV0cmllcy5fX2xpbmVfX1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcm9vdChnZW9tZXRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBGZWF0dXJlKGZlYXR1cmUpIHtcbiAgICAgICAgY3JzKGZlYXR1cmUpO1xuICAgICAgICBiYm94KGZlYXR1cmUpO1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZ2VvanNvbi9kcmFmdC1nZW9qc29uL2Jsb2IvbWFzdGVyL21pZGRsZS5ta2QjZmVhdHVyZS1vYmplY3RcbiAgICAgICAgaWYgKGZlYXR1cmUuaWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgdHlwZW9mIGZlYXR1cmUuaWQgIT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICB0eXBlb2YgZmVhdHVyZS5pZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZSBcImlkXCIgbWVtYmVyIG11c3QgaGF2ZSBhIHN0cmluZyBvciBudW1iZXIgdmFsdWUnLFxuICAgICAgICAgICAgICAgIGxpbmU6IGZlYXR1cmUuX19saW5lX19cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmZWF0dXJlLmZlYXR1cmVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnRmVhdHVyZSBvYmplY3QgY2Fubm90IGNvbnRhaW4gYSBcImZlYXR1cmVzXCIgbWVtYmVyJyxcbiAgICAgICAgICAgICAgICBsaW5lOiBmZWF0dXJlLl9fbGluZV9fXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmVhdHVyZS5jb29yZGluYXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ZlYXR1cmUgb2JqZWN0IGNhbm5vdCBjb250YWluIGEgXCJjb29yZGluYXRlc1wiIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZlYXR1cmUudHlwZSAhPT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0dlb0pTT04gZmVhdHVyZXMgbXVzdCBoYXZlIGEgdHlwZT1mZWF0dXJlIG1lbWJlcicsXG4gICAgICAgICAgICAgICAgbGluZTogZmVhdHVyZS5fX2xpbmVfX1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWlyZWRQcm9wZXJ0eShmZWF0dXJlLCAncHJvcGVydGllcycsICdvYmplY3QnKTtcbiAgICAgICAgaWYgKCFyZXF1aXJlZFByb3BlcnR5KGZlYXR1cmUsICdnZW9tZXRyeScsICdvYmplY3QnKSkge1xuICAgICAgICAgICAgLy8gaHR0cDovL2dlb2pzb24ub3JnL2dlb2pzb24tc3BlYy5odG1sI2ZlYXR1cmUtb2JqZWN0c1xuICAgICAgICAgICAgLy8gdG9sZXJhdGUgbnVsbCBnZW9tZXRyeVxuICAgICAgICAgICAgaWYgKGZlYXR1cmUuZ2VvbWV0cnkpIHJvb3QoZmVhdHVyZS5nZW9tZXRyeSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHlwZXMgPSB7XG4gICAgICAgIFBvaW50OiBQb2ludCxcbiAgICAgICAgRmVhdHVyZTogRmVhdHVyZSxcbiAgICAgICAgTXVsdGlQb2ludDogTXVsdGlQb2ludCxcbiAgICAgICAgTGluZVN0cmluZzogTGluZVN0cmluZyxcbiAgICAgICAgTXVsdGlMaW5lU3RyaW5nOiBNdWx0aUxpbmVTdHJpbmcsXG4gICAgICAgIEZlYXR1cmVDb2xsZWN0aW9uOiBGZWF0dXJlQ29sbGVjdGlvbixcbiAgICAgICAgR2VvbWV0cnlDb2xsZWN0aW9uOiBHZW9tZXRyeUNvbGxlY3Rpb24sXG4gICAgICAgIFBvbHlnb246IFBvbHlnb24sXG4gICAgICAgIE11bHRpUG9seWdvbjogTXVsdGlQb2x5Z29uXG4gICAgfTtcblxuICAgIHZhciB0eXBlc0xvd2VyID0gT2JqZWN0LmtleXModHlwZXMpLnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXJyKSB7XG4gICAgICAgIHByZXZbY3Vyci50b0xvd2VyQ2FzZSgpXSA9IGN1cnI7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIHt9KTtcblxuICAgIGlmICh0eXBlb2YgZ2ogIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGdqID09PSBudWxsIHx8XG4gICAgICAgIGdqID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByb290IG9mIGEgR2VvSlNPTiBvYmplY3QgbXVzdCBiZSBhbiBvYmplY3QuJyxcbiAgICAgICAgICAgIGxpbmU6IDBcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgfVxuXG4gICAgcm9vdChnaik7XG5cbiAgICBlcnJvcnMuZm9yRWFjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgaWYgKHt9Lmhhc093blByb3BlcnR5LmNhbGwoZXJyLCAnbGluZScpICYmIGVyci5saW5lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBlcnIubGluZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVycm9ycztcbn1cblxubW9kdWxlLmV4cG9ydHMuaGludCA9IGhpbnQ7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9nZW9qc29uaGludC9saWIvb2JqZWN0LmpzXG4vLyBtb2R1bGUgaWQgPSAyNTNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiZnVuY3Rpb24gcmFkKHgpIHtcbiAgICByZXR1cm4geCAqIE1hdGguUEkgLyAxODA7XG59XG5cbmZ1bmN0aW9uIGlzUmluZ0Nsb2Nrd2lzZSAoY29vcmRzKSB7XG4gICAgdmFyIGFyZWEgPSAwO1xuICAgIGlmIChjb29yZHMubGVuZ3RoID4gMikge1xuICAgICAgICB2YXIgcDEsIHAyO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIHAxID0gY29vcmRzW2ldO1xuICAgICAgICAgICAgcDIgPSBjb29yZHNbaSArIDFdO1xuICAgICAgICAgICAgYXJlYSArPSByYWQocDJbMF0gLSBwMVswXSkgKiAoMiArIE1hdGguc2luKHJhZChwMVsxXSkpICsgTWF0aC5zaW4ocmFkKHAyWzFdKSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZWEgPj0gMDtcbn1cblxuZnVuY3Rpb24gaXNQb2x5UkhSIChjb29yZHMpIHtcbiAgICBpZiAoY29vcmRzICYmIGNvb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChpc1JpbmdDbG9ja3dpc2UoY29vcmRzWzBdKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGludGVyaW9yQ29vcmRzID0gY29vcmRzLnNsaWNlKDEsIGNvb3Jkcy5sZW5ndGgpO1xuICAgICAgICBpZiAoIWludGVyaW9yQ29vcmRzLmV2ZXJ5KGlzUmluZ0Nsb2Nrd2lzZSkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByaWdodEhhbmRSdWxlIChnZW9tZXRyeSkge1xuICAgIGlmIChnZW9tZXRyeS50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgICAgcmV0dXJuIGlzUG9seVJIUihnZW9tZXRyeS5jb29yZGluYXRlcyk7XG4gICAgfSBlbHNlIGlmIChnZW9tZXRyeS50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgICByZXR1cm4gZ2VvbWV0cnkuY29vcmRpbmF0ZXMuZXZlcnkoaXNQb2x5UkhSKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmFsaWRhdGVSaWdodEhhbmRSdWxlKGdlb21ldHJ5LCBlcnJvcnMpIHtcbiAgICBpZiAoIXJpZ2h0SGFuZFJ1bGUoZ2VvbWV0cnkpKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdQb2x5Z29ucyBhbmQgTXVsdGlQb2x5Z29ucyBzaG91bGQgZm9sbG93IHRoZSByaWdodC1oYW5kIHJ1bGUnLFxuICAgICAgICAgICAgbGV2ZWw6ICdtZXNzYWdlJyxcbiAgICAgICAgICAgIGxpbmU6IGdlb21ldHJ5Ll9fbGluZV9fXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9nZW9qc29uaGludC9saWIvcmhyLmpzXG4vLyBtb2R1bGUgaWQgPSAyNTRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoganNoaW50IGVzdmVyc2lvbiA6NiAqL1xuXG5cbi8qKiBcbiogQ2xvbmUgYW4gYXJyYXlcbiogQHBhcmFtIHtBcnJheX0gU291cmNlIHRvIGNsb25lXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGNsb25lQXJyYXkoYXJyKXtcbiAgdmFyIGkgPSBhcnIubGVuZ3RoO1xuICB2YXIgY2xvbmUgPSBbXTtcbiAgd2hpbGUoaS0tKSB7IGNsb25lW2ldID0gYXJyW2ldOyB9XG4gIHJldHVybihjbG9uZSk7XG59XG4vKiBHZXQgc3RhdCBvZiBhbiBhcnJheVxuICogQHBhcmFtIHtPYmplY3R9IG8gb3B0aW9uc1xuICogQHBhcmFtIHtBcnJheX0gby5hcnIgTnVtZXJpYyBhcnJheVxuICogQHBhcmFtIHtTdHJpbmd9IG8uc3RhdCBTdGF0IHN0cmluZyA6IG1pbiwgbWF4LCBtZWFuLCBtZWRpYW4sIGRpc3RpbmN0LCBxdWFudGlsZS4gRGVmYXVsdCA9IG1heDtcbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSBvLnBlcmNlbnRpbGUgOiBwZXJjZW50aWxlIHRvIHVzZSBmb3IgcXVhbnRpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFycmF5U3RhdChvKXtcblxuICBpZiggXG4gICAgby5hcnIgPT09IHVuZGVmaW5lZCB8fFxuICAgIG8uYXJyLmNvbnN0cnVjdG9yICE9IEFycmF5IHx8XG4gICAgby5hcnIubGVuZ3RoID09PSAwXG4gICkgcmV0dXJuIFtdO1xuIFxuICBpZihcbiAgICBvLnN0YXQgPT0gXCJxdWFudGlsZVwiICYmXG4gICAgby5wZXJjZW50aWxlICYmIFxuICAgIG8ucGVyY2VudGlsZS5jb25zdHJ1Y3RvciA9PSBBcnJheVxuICApIG8uc3RhdCA9IFwicXVhbnRpbGVzXCI7XG5cbiAgdmFyIGFyciA9IGNsb25lQXJyYXkoIG8uYXJyICk7XG4gIHZhciBzdGF0ID0gIG8uc3RhdCA/IG8uc3RhdCA6IFwibWF4XCI7XG4gIHZhciBsZW5fbyA9IGFyci5sZW5ndGg7XG4gIHZhciBsZW4gPSBsZW5fbztcblxuICBmdW5jdGlvbiBzb3J0TnVtYmVyKGEsYikge1xuICAgIHJldHVybiBhIC0gYjtcbiAgfVxuXG4gIHZhciBvcHQgPSB7XG4gICAgXCJtYXhcIiA6IGZ1bmN0aW9uKCl7IFxuICAgICAgdmFyIG1heCA9IC1JbmZpbml0eSA7XG4gICAgICB2YXIgdiA9IDAgO1xuICAgICAgd2hpbGUgKCBsZW4tLSApe1xuICAgICAgICB2ID0gYXJyLnBvcCgpO1xuICAgICAgICBpZiAoIHYgPiBtYXggKSB7XG4gICAgICAgICAgbWF4ID0gdjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1heDtcbiAgICB9LFxuICAgIFwibWluXCIgOiBmdW5jdGlvbigpeyBcbiAgICAgIHZhciBtaW4gPSBJbmZpbml0eTtcbiAgICAgIHdoaWxlKCBsZW4tLSApe1xuICAgICAgICB2YXIgdiA9IGFyci5wb3AoKTtcbiAgICAgICAgaWYgKHYgPCBtaW4pe1xuICAgICAgICAgIG1pbiA9IHY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBtaW47XG4gICAgfSxcbiAgICBcInN1bVwiOmZ1bmN0aW9uKCl7XG4gICAgICB2YXIgc3VtID0gMDsgXG4gICAgICB3aGlsZSggbGVuLS0gKXsgXG4gICAgICAgIHN1bSArPSBhcnIucG9wKCkgO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1bSA7XG4gICAgfSxcbiAgICBcIm1lYW5cIjpmdW5jdGlvbigpe1xuICAgICAgdmFyIHN1bSA9IGdldEFycmF5U3RhdCh7XG4gICAgICAgIHN0YXQgOiBcInN1bVwiLFxuICAgICAgICBhcnIgOiBhcnJcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHN1bSAvIGxlbl9vO1xuICAgIH0sXG4gICAgXCJtZWRpYW5cIjpmdW5jdGlvbigpe1xuICAgICAgdmFyIG1lZGlhbiA9IGdldEFycmF5U3RhdCh7XG4gICAgICAgIHN0YXQgOiBcInF1YW50aWxlXCIsXG4gICAgICAgIGFyciA6IGFycixcbiAgICAgICAgcGVyY2VudGlsZSA6IDUwXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBtZWRpYW47XG4gICAgfSxcbiAgICBcInF1YW50aWxlXCI6ZnVuY3Rpb24oKXtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICBhcnIuc29ydChzb3J0TnVtYmVyKTtcbiAgICAgIG8ucGVyY2VudGlsZSA9IG8ucGVyY2VudGlsZT8gby5wZXJjZW50aWxlIDogNTA7XG4gICAgICB2YXIgaW5kZXggPSBvLnBlcmNlbnRpbGUvMTAwICogKGFyci5sZW5ndGgtMSk7XG4gICAgICBpZiAoTWF0aC5mbG9vcihpbmRleCkgPT0gaW5kZXgpIHtcbiAgICAgICAgcmVzdWx0ID0gYXJyW2luZGV4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpID0gTWF0aC5mbG9vcihpbmRleCk7XG4gICAgICAgIHZhciBmcmFjdGlvbiA9IGluZGV4IC0gaTtcbiAgICAgICAgcmVzdWx0ID0gYXJyW2ldICsgKGFycltpKzFdIC0gYXJyW2ldKSAqIGZyYWN0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFwicXVhbnRpbGVzXCI6ZnVuY3Rpb24oKXtcbiAgICAgIHZhciBxdWFudGlsZXMgPSB7fTtcbiAgICAgIG8ucGVyY2VudGlsZS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICB2YXIgcmVzID0gIGdldEFycmF5U3RhdCh7XG4gICAgICAgICAgc3RhdCA6IFwicXVhbnRpbGVcIixcbiAgICAgICAgICBhcnIgOiBhcnIsXG4gICAgICAgICAgcGVyY2VudGlsZSA6IHhcbiAgICAgICAgfSk7XG4gICAgICAgIHF1YW50aWxlc1t4XSA9IHJlczsgIFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcXVhbnRpbGVzO1xuICAgIH0sXG4gICAgXCJkaXN0aW5jdFwiOmZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbiA9IHt9LCByID0gW107XG5cbiAgICAgIHdoaWxlKCBsZW4tLSApIFxuICAgICAge1xuICAgICAgICBpZiAoICFuW2FycltsZW5dXSApXG4gICAgICAgIHtcbiAgICAgICAgICBuW2FycltsZW5dXSA9IHRydWU7IFxuICAgICAgICAgIHIucHVzaChhcnJbbGVuXSk7IFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9LFxuICAgIFwiZnJlcXVlbmN5XCI6ZnVuY3Rpb24oKXtcbiAgICAgIHZhciBjb2xOYW1lcyA9IG8uY29sTmFtZXM7XG4gICAgICBpZihjb2xOYW1lcy5jb25zdHJ1Y3RvciAhPSBBcnJheSkgdGhyb3coXCJjb2xuYW1lcyBtdXN0IGJlIGFycmF5XCIpO1xuICAgICAgaWYoY29sTmFtZXMubGVuZ3RoPT0wKSBjb2xOYW1lcyA9IE9iamVjdC5rZXlzKGFyclsxXSk7XG4gICAgICB2YXIgdGFibGUgPSB7fTtcbiAgICAgIHZhciB2YWwscHJldlZhbDtcbiAgICAgIHZhciBjb2xOYW1lO1xuXG4gICAgICBmb3IodmFyIGo9MCxqTD1jb2xOYW1lcy5sZW5ndGg7ajxqTDtqKyspe1xuICAgICAgICBjb2xOYW1lID0gY29sTmFtZXNbal07XG4gICAgICAgIHRhYmxlW2NvbE5hbWVdID0ge307XG4gICAgICAgIGZvcih2YXIgaT0wLGlMPWFyci5sZW5ndGg7aTxpTDtpKyspe1xuICAgICAgICAgIHZhbCA9IGFycltpXVtjb2xOYW1lXXx8bnVsbDtcbiAgICAgICAgICB0YWJsZVtjb2xOYW1lXVt2YWxdPXRhYmxlW2NvbE5hbWVdW3ZhbF0rMXx8MTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRhYmxlO1xuICAgIH0sXG4gICAgXCJzdW1CeVwiOmZ1bmN0aW9uKCl7XG5cbiAgICAgIHZhciBjb2xOYW1lcyA9IG8uY29sTmFtZXM7XG4gICAgICBpZihjb2xOYW1lcy5jb25zdHJ1Y3RvciAhPSBBcnJheSkgdGhyb3coXCJjb2xuYW1lcyBtdXN0IGJlIGFycmF5XCIpO1xuICAgICAgaWYoY29sTmFtZXMubGVuZ3RoPT0wKSBjb2xOYW1lcyA9IE9iamVjdC5rZXlzKGFyclsxXSk7XG4gICAgICB2YXIgdGFibGUgPSB7fTtcbiAgICAgIHZhciB2YWwscHJldlZhbDtcbiAgICAgIHZhciBjb2xOYW1lO1xuICAgICAgZm9yKHZhciBqPTAsakw9Y29sTmFtZXMubGVuZ3RoO2o8akw7aisrKXtcbiAgICAgICAgY29sTmFtZT1jb2xOYW1lc1tqXTtcbiAgICAgICAgZm9yKHZhciBpPTAsaUw9YXJyLmxlbmd0aDtpPGlMO2krKyl7XG4gICAgICAgICAgdmFsPWFycltpXVtjb2xOYW1lXXx8MDtcbiAgICAgICAgICBwcmV2VmFsPXRhYmxlW2NvbE5hbWVdIHx8IDA7XG4gICAgICAgICAgdGFibGVbY29sTmFtZV09IHByZXZWYWwgKyB2YWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0YWJsZTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuKG9wdFtzdGF0XShvKSk7XG5cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9qcy9teF9oZWxwZXJfc3RhdC5qcyIsIi8qIGpzaGludCBlc3ZlcnNpb246NiovXG5cbi8qKlxuICogR2VuZXJhdGUgYSByYW5kb20gaHNsYSBjb2xvciBzdHJpbmcsIHdpdGggZml4ZWQgc2F0dXJhdGlvbiBhbmQgbGlnaHRuZXNzXG4gKiBAcGFyYW0ge251bWJlcn0gb3BhY2l0eSBvcGFjaXR5IGZyb20gMCB0byAxXG4gKiBAcGFyYW0ge251bWJlcn0gcmFuZG9tIHZhbHVlIGZyb20gMCB0byAxXG4gKiBAcGFyYW0ge251bWJlcn0gc2F0dXJhdGlvbiBmcm9tIDAgdG8gMTAwXG4gKiBAcGFyYW0ge251bWJlcn0gbGlnaHRuZXNzIGZyb20gMCB0byAxMDBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUhzbChvcGFjaXR5LCByYW5kb20sIHNhdHVyYXRpb24sIGxpZ2h0bmVzcykge1xuICBpZiAob3BhY2l0eSA9PT0gdW5kZWZpbmVkKSBvcGFjaXR5ID0gMTtcbiAgaWYgKHNhdHVyYXRpb24gPT09IHVuZGVmaW5lZCkgc2F0dXJhdGlvbiA9IDEwMDtcbiAgaWYgKGxpZ2h0bmVzcyA9PSB1bmRlZmluZWQpIGxpZ2h0bmVzcyA9IDUwO1xuICBpZiAocmFuZG9tIDwgMCB8fCByYW5kb20gPiAxIHx8IHJhbmRvbSA9PT0gdW5kZWZpbmVkKSByYW5kb20gPSBNYXRoLnJhbmRvbSgpO1xuICB2YXIgcmVzID0gXCJoc2xhKFwiICsgKHJhbmRvbSAqIDM2MCkgK1xuICAgIFwiLCBcIiArIHNhdHVyYXRpb24gKyBcIiUgXCIgK1xuICAgIFwiLCBcIiArIGxpZ2h0bmVzcyArIFwiJSBcIiArXG4gICAgXCIsIFwiICsgb3BhY2l0eSArIFwiKVwiO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbi8qKlxuICogY29udmVydCBoZXggdG8gcmdiIG9yIHJnYmFcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZXggSGV4IGNvbG9yXG4gKiBAcGFyYW0ge251bWJlcn0gb3BhY2l0eSBWYWx1ZSBvZiBvcGFjaXR5LCBmcm9tIDAgdG8gMVxuICovXG5leHBvcnQgZnVuY3Rpb24gaGV4MnJnYmEoaGV4LCBvcGFjaXR5KSB7XG5cbiAgdmFyIGggPSBoZXgucmVwbGFjZShcIiNcIiwgXCJcIik7XG4gIHZhciByZ2JhID0gIFwicmdiYVwiO1xuICB2YXIgcmdiID0gIFwicmdiXCI7XG4gIHZhciBvdXQgPSBcIlwiO1xuICB2YXIgaTtcbiAgaCA9IGgubWF0Y2gobmV3IFJlZ0V4cChcIigue1wiICsgaC5sZW5ndGggLyAzICsgXCJ9KVwiLCBcImdcIikpO1xuXG4gIGZvciAoIGkgPSAwOyBpIDwgaC5sZW5ndGg7IGkrKyApIHtcbiAgICBoW2ldID0gcGFyc2VJbnQoaFtpXS5sZW5ndGggPT0gMSA/IGhbaV0gKyBoW2ldIDogaFtpXSwgMTYpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcGFjaXR5ICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICBpZihvcGFjaXR5PjEpIG9wYWNpdHk9MTtcbiAgICBpZihvcGFjaXR5PDApIG9wYWNpdHk9MDtcbiAgICBoLnB1c2gob3BhY2l0eSk7XG4gICAgcmdiID0gcmdiYTtcbiAgfVxuXG4gIHJldHVybiByZ2IgKyBcIihcIiArIGguam9pbihcIixcIikgKyBcIilcIjtcbn1cblxuLyoqXG4gKiBjb252ZXJ0IHJnYnxhIHRvIGhleFxuICogQHBhcmFtIHtzdHJpbmd9IHJnYmEgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZ2JhMmhleChyZ2Ipe1xuXG4gIHJnYiA9IHJnYi5tYXRjaCgvXnJnYmE/W1xccytdP1xcKFtcXHMrXT8oXFxkKylbXFxzK10/LFtcXHMrXT8oXFxkKylbXFxzK10/LFtcXHMrXT8oXFxkKylbXFxzK10/L2kpO1xuICByZXR1cm4gKHJnYiAmJiByZ2IubGVuZ3RoID09PSA0KSA/IFwiI1wiICtcbiAgICAoXCIwXCIgKyBwYXJzZUludChyZ2JbMV0sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpICtcbiAgICAoXCIwXCIgKyBwYXJzZUludChyZ2JbMl0sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpICtcbiAgICAoXCIwXCIgKyBwYXJzZUludChyZ2JbM10sMTApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpIDogJyc7XG59XG4vKipcbiAqIGNvbnZlcnQgYW55IGNvbG9yIHRvIG9iaiB3aXRoIGtleSBhbHBoYSBhbmQgaGV4IGNvbG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gY29sb3Igc3RyaW5nLiBlLmcuIGhzbCgxMCUsMTAlLDApXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGhleU9ubHkgcmV0dXJuIG9ubHkgdGhlIGhleCBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcjJvYmooY29sb3IsaGV4T25seSl7XG4gIHZhciBhbHBoYTtcbiAgdmFyIGNvbDtcbiAgdmFyIG91dCA9IHtcbiAgICBhbHBoYSA6IDEsXG4gICAgY29sb3I6IFwiIzAwMFwiXG4gIH07XG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBkaXYuc3R5bGUuY29sb3IgPSBjb2xvcjtcbiAgY29sID0gZGl2LnN0eWxlLmNvbG9yO1xuICBpZihjb2wpe1xuICAgIGFscGhhID0gY29sLnNwbGl0KFwiLCBcIilbM107XG4gICAgaWYoYWxwaGEpe1xuICAgICAgb3V0LmFscGhhID0gYWxwaGEucmVwbGFjZShcIlxcKVwiLCcnKSoxO1xuICAgIH1cbiAgICBvdXQuY29sb3IgPSByZ2JhMmhleChjb2wpO1xuICB9XG4gIGlmKGhleE9ubHkpe1xuICAgb3V0ID0gb3V0LmNvbG9yO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuKiBTY2FsZSBhbiBjZW50ZXIgdmFsdWUgdG8gZ2V0IGEgaGV4IGNvbG9yIGluc2lkZSBib3VuZHNcbiogQHBhcmFtIHtPYmplY3R9IG8gT3B0aW9uc1xuKiBAcGFyYW0ge051bWJlcn0gby52YWwgVmFsdWUgXG4qIEBwYXJhbSB7TnVtYmVyfSBvLm1pbiBNaW5pbXVtIHZhbHVlIG9mIHRoZSBzY2FsZSBcbiogQHBhcmFtIHtOdW1iZXJ9IG8ubWF4IE1heGltdW0gdmFsdWUgb2YgdGhlIHNjYWxlIFxuKiBAcGFyYW0ge051bWJlcn0gby5jb2xNaW4gTWluaW11bSBodWUgaW4gdGhlIDAtMSByYW5nZSBcbiogQHBhcmFtIHtOdW1iZXJ9IG8uY29sTWF4IE1heGltdW0gaHVlIGluIHRoZSAwLTEgcmFuZ2VcbiogQGV4YW1wbGUgXG4qIHZhciBzdGFydCA9ICB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4qIGZvcih2YXIgaT0wO2k8MzAwMDtpKyspe1xuKiBjb2xvckxpbmVhcih7bWluOi00NTAsbWF4OjMwMDAsdmFsOmksY29sTWluOjAsY29sTWF4OjAuNX0pXG4qIH1cbiogY29uc29sZS5sb2coXCJkb25lIGluIFwiKyh3aW5kb3cucGVyZm9ybWFuY2Uubm93KCktc3RhcnQpLzEwMDAgK1wiIFtzXVwiKTtcbiovXG5leHBvcnQgZnVuY3Rpb24gY29sb3JMaW5lYXIobyl7XG4gIHZhciB2YWxNaW4gPSBvLm1pbioxfHwwO1xuICB2YXIgdmFsTWF4ID0gby5tYXgqMXx8MDtcbiAgdmFyIGNvbE1pbiA9IG8uY29sTWluKjF8fDA7XG4gIHZhciBjb2xNYXggPSBvLmNvbE1heCoxfHwxO1xuICB2YXIgdmFsID0gby52YWw7XG4gIHZhciBjb2w7XG4gIHZhciBpc1JhbmRvbSA9IHZhbE1pbiA9PSB2YWxNYXg7XG4gIGlmKCFpc1JhbmRvbSl7XG4gICAgY29sID0gKHZhbC12YWxNaW4pLyh2YWxNYXgtdmFsTWluKTtcbiAgfVxuICBjb2wgPSBjb2wqKGNvbE1heC1jb2xNaW4pO1xuICBjb2wgPSByYW5kb21Ic2woMSxjb2wpO1xuICByZXR1cm4gY29sb3Iyb2JqKGNvbCx0cnVlKTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9qcy9teF9oZWxwZXJfY29sb3JzLmpzIiwiLyoqXG4gKiBDYWxsYmFjayBmb3IgY29vcmRFYWNoXG4gKlxuICogQGNhbGxiYWNrIGNvb3JkRWFjaENhbGxiYWNrXG4gKiBAcGFyYW0ge0FycmF5PG51bWJlcj59IGN1cnJlbnRDb29yZCBUaGUgY3VycmVudCBjb29yZGluYXRlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBjb29yZEluZGV4IFRoZSBjdXJyZW50IGluZGV4IG9mIHRoZSBjb29yZGluYXRlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIFN0YXJ0cyBhdCBpbmRleCAwLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgY3VycmVudCBpbmRleCBvZiB0aGUgZmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZVN1YkluZGV4IFRoZSBjdXJyZW50IHN1YkluZGV4IG9mIHRoZSBmZWF0dXJlIGJlaW5nIHByb2Nlc3NlZC5cbiAqL1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBjb29yZGluYXRlcyBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkuZm9yRWFjaCgpXG4gKlxuICogQG5hbWUgY29vcmRFYWNoXG4gKiBAcGFyYW0ge0ZlYXR1cmVDb2xsZWN0aW9ufEdlb21ldHJ5fEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChjdXJyZW50Q29vcmQsIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KVxuICogQHBhcmFtIHtib29sZWFufSBbZXhjbHVkZVdyYXBDb29yZD1mYWxzZV0gd2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgZmluYWwgY29vcmRpbmF0ZSBvZiBMaW5lYXJSaW5ncyB0aGF0IHdyYXBzIHRoZSByaW5nIGluIGl0cyBpdGVyYXRpb24uXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtcImZvb1wiOiBcImJhclwifSksXG4gKiAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtcImhlbGxvXCI6IFwid29ybGRcIn0pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmNvb3JkRWFjaChmZWF0dXJlcywgZnVuY3Rpb24gKGN1cnJlbnRDb29yZCwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpIHtcbiAqICAgLy89Y3VycmVudENvb3JkXG4gKiAgIC8vPWNvb3JkSW5kZXhcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIC8vPWZlYXR1cmVTdWJJbmRleFxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGNvb3JkRWFjaChnZW9qc29uLCBjYWxsYmFjaywgZXhjbHVkZVdyYXBDb29yZCkge1xuICAgIC8vIEhhbmRsZXMgbnVsbCBHZW9tZXRyeSAtLSBTa2lwcyB0aGlzIEdlb0pTT05cbiAgICBpZiAoZ2VvanNvbiA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHZhciBmZWF0dXJlSW5kZXgsIGdlb21ldHJ5SW5kZXgsIGosIGssIGwsIGdlb21ldHJ5LCBzdG9wRywgY29vcmRzLFxuICAgICAgICBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbixcbiAgICAgICAgd3JhcFNocmluayA9IDAsXG4gICAgICAgIGNvb3JkSW5kZXggPSAwLFxuICAgICAgICBpc0dlb21ldHJ5Q29sbGVjdGlvbixcbiAgICAgICAgdHlwZSA9IGdlb2pzb24udHlwZSxcbiAgICAgICAgaXNGZWF0dXJlQ29sbGVjdGlvbiA9IHR5cGUgPT09ICdGZWF0dXJlQ29sbGVjdGlvbicsXG4gICAgICAgIGlzRmVhdHVyZSA9IHR5cGUgPT09ICdGZWF0dXJlJyxcbiAgICAgICAgc3RvcCA9IGlzRmVhdHVyZUNvbGxlY3Rpb24gPyBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aCA6IDE7XG5cbiAgICAvLyBUaGlzIGxvZ2ljIG1heSBsb29rIGEgbGl0dGxlIHdlaXJkLiBUaGUgcmVhc29uIHdoeSBpdCBpcyB0aGF0IHdheVxuICAgIC8vIGlzIGJlY2F1c2UgaXQncyB0cnlpbmcgdG8gYmUgZmFzdC4gR2VvSlNPTiBzdXBwb3J0cyBtdWx0aXBsZSBraW5kc1xuICAgIC8vIG9mIG9iamVjdHMgYXQgaXRzIHJvb3Q6IEZlYXR1cmVDb2xsZWN0aW9uLCBGZWF0dXJlcywgR2VvbWV0cmllcy5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGhhcyB0aGUgcmVzcG9uc2liaWxpdHkgb2YgaGFuZGxpbmcgYWxsIG9mIHRoZW0sIGFuZCB0aGF0XG4gICAgLy8gbWVhbnMgdGhhdCBzb21lIG9mIHRoZSBgZm9yYCBsb29wcyB5b3Ugc2VlIGJlbG93IGFjdHVhbGx5IGp1c3QgZG9uJ3QgYXBwbHlcbiAgICAvLyB0byBjZXJ0YWluIGlucHV0cy4gRm9yIGluc3RhbmNlLCBpZiB5b3UgZ2l2ZSB0aGlzIGp1c3QgYVxuICAgIC8vIFBvaW50IGdlb21ldHJ5LCB0aGVuIGJvdGggbG9vcHMgYXJlIHNob3J0LWNpcmN1aXRlZCBhbmQgYWxsIHdlIGRvXG4gICAgLy8gaXMgZ3JhZHVhbGx5IHJlbmFtZSB0aGUgaW5wdXQgdW50aWwgaXQncyBjYWxsZWQgJ2dlb21ldHJ5Jy5cbiAgICAvL1xuICAgIC8vIFRoaXMgYWxzbyBhaW1zIHRvIGFsbG9jYXRlIGFzIGZldyByZXNvdXJjZXMgYXMgcG9zc2libGU6IGp1c3QgYVxuICAgIC8vIGZldyBudW1iZXJzIGFuZCBib29sZWFucywgcmF0aGVyIHRoYW4gYW55IHRlbXBvcmFyeSBhcnJheXMgYXMgd291bGRcbiAgICAvLyBiZSByZXF1aXJlZCB3aXRoIHRoZSBub3JtYWxpemF0aW9uIGFwcHJvYWNoLlxuICAgIGZvciAoZmVhdHVyZUluZGV4ID0gMDsgZmVhdHVyZUluZGV4IDwgc3RvcDsgZmVhdHVyZUluZGV4KyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmVTdWJJbmRleCA9IDA7XG5cbiAgICAgICAgZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24gPSAoaXNGZWF0dXJlQ29sbGVjdGlvbiA/IGdlb2pzb24uZmVhdHVyZXNbZmVhdHVyZUluZGV4XS5nZW9tZXRyeSA6XG4gICAgICAgIChpc0ZlYXR1cmUgPyBnZW9qc29uLmdlb21ldHJ5IDogZ2VvanNvbikpO1xuICAgICAgICBpc0dlb21ldHJ5Q29sbGVjdGlvbiA9IChnZW9tZXRyeU1heWJlQ29sbGVjdGlvbikgPyBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbi50eXBlID09PSAnR2VvbWV0cnlDb2xsZWN0aW9uJyA6IGZhbHNlO1xuICAgICAgICBzdG9wRyA9IGlzR2VvbWV0cnlDb2xsZWN0aW9uID8gZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24uZ2VvbWV0cmllcy5sZW5ndGggOiAxO1xuXG4gICAgICAgIGZvciAoZ2VvbWV0cnlJbmRleCA9IDA7IGdlb21ldHJ5SW5kZXggPCBzdG9wRzsgZ2VvbWV0cnlJbmRleCsrKSB7XG4gICAgICAgICAgICBnZW9tZXRyeSA9IGlzR2VvbWV0cnlDb2xsZWN0aW9uID9cbiAgICAgICAgICAgIGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLmdlb21ldHJpZXNbZ2VvbWV0cnlJbmRleF0gOiBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbjtcblxuICAgICAgICAgICAgLy8gSGFuZGxlcyBudWxsIEdlb21ldHJ5IC0tIFNraXBzIHRoaXMgZ2VvbWV0cnlcbiAgICAgICAgICAgIGlmIChnZW9tZXRyeSA9PT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICBjb29yZHMgPSBnZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICAgICAgICAgIHZhciBnZW9tVHlwZSA9IGdlb21ldHJ5LnR5cGU7XG5cbiAgICAgICAgICAgIHdyYXBTaHJpbmsgPSAoZXhjbHVkZVdyYXBDb29yZCAmJiAoZ2VvbVR5cGUgPT09ICdQb2x5Z29uJyB8fCBnZW9tVHlwZSA9PT0gJ011bHRpUG9seWdvbicpKSA/IDEgOiAwO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKGdlb21UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIG51bGw6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdQb2ludCc6XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soY29vcmRzLCBjb29yZEluZGV4LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCk7XG4gICAgICAgICAgICAgICAgY29vcmRJbmRleCsrO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVTdWJJbmRleCsrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnTGluZVN0cmluZyc6XG4gICAgICAgICAgICBjYXNlICdNdWx0aVBvaW50JzpcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29vcmRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGNvb3Jkc1tqXSwgY29vcmRJbmRleCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBjb29yZEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVTdWJJbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICAgICAgY2FzZSAnTXVsdGlMaW5lU3RyaW5nJzpcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29vcmRzLmxlbmd0aDsgaisrKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgY29vcmRzW2pdLmxlbmd0aCAtIHdyYXBTaHJpbms7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY29vcmRzW2pdW2tdLCBjb29yZEluZGV4LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb29yZEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlU3ViSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29vcmRzLmxlbmd0aDsgaisrKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgY29vcmRzW2pdLmxlbmd0aDsgaysrKVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsID0gMDsgbCA8IGNvb3Jkc1tqXVtrXS5sZW5ndGggLSB3cmFwU2hyaW5rOyBsKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhjb29yZHNbal1ba11bbF0sIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb29yZEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZVN1YkluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdHZW9tZXRyeUNvbGxlY3Rpb24nOlxuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBnZW9tZXRyeS5nZW9tZXRyaWVzLmxlbmd0aDsgaisrKVxuICAgICAgICAgICAgICAgICAgICBjb29yZEVhY2goZ2VvbWV0cnkuZ2VvbWV0cmllc1tqXSwgY2FsbGJhY2ssIGV4Y2x1ZGVXcmFwQ29vcmQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIEdlb21ldHJ5IFR5cGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgY29vcmRSZWR1Y2VcbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgdmFsdWVzIHByb3ZpZGVkIGFzIGFyZ3VtZW50cyBkZXBlbmRcbiAqIG9uIHdoZXRoZXIgdGhlIHJlZHVjZSBtZXRob2QgaGFzIGFuIGluaXRpYWxWYWx1ZSBhcmd1bWVudC5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQgdG8gdGhlIHJlZHVjZSBtZXRob2Q6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyBpbml0aWFsVmFsdWUuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgbm90IHByb3ZpZGVkOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIHNlY29uZCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIEBjYWxsYmFjayBjb29yZFJlZHVjZUNhbGxiYWNrXG4gKiBAcGFyYW0geyp9IHByZXZpb3VzVmFsdWUgVGhlIGFjY3VtdWxhdGVkIHZhbHVlIHByZXZpb3VzbHkgcmV0dXJuZWQgaW4gdGhlIGxhc3QgaW52b2NhdGlvblxuICogb2YgdGhlIGNhbGxiYWNrLCBvciBpbml0aWFsVmFsdWUsIGlmIHN1cHBsaWVkLlxuICogQHBhcmFtIHtBcnJheTxudW1iZXI+fSBjdXJyZW50Q29vcmQgVGhlIGN1cnJlbnQgY29vcmRpbmF0ZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gY29vcmRJbmRleCBUaGUgY3VycmVudCBpbmRleCBvZiB0aGUgY29vcmRpbmF0ZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBTdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBjdXJyZW50IGluZGV4IG9mIHRoZSBmZWF0dXJlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlU3ViSW5kZXggVGhlIGN1cnJlbnQgc3ViSW5kZXggb2YgdGhlIGZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICovXG5cbi8qKlxuICogUmVkdWNlIGNvb3JkaW5hdGVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5yZWR1Y2UoKVxuICpcbiAqIEBuYW1lIGNvb3JkUmVkdWNlXG4gKiBAcGFyYW0ge0ZlYXR1cmVDb2xsZWN0aW9ufEdlb21ldHJ5fEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50Q29vcmQsIGNvb3JkSW5kZXgpXG4gKiBAcGFyYW0geyp9IFtpbml0aWFsVmFsdWVdIFZhbHVlIHRvIHVzZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgdGhlIGNhbGxiYWNrLlxuICogQHBhcmFtIHtib29sZWFufSBbZXhjbHVkZVdyYXBDb29yZD1mYWxzZV0gd2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgZmluYWwgY29vcmRpbmF0ZSBvZiBMaW5lYXJSaW5ncyB0aGF0IHdyYXBzIHRoZSByaW5nIGluIGl0cyBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHZhbHVlIHRoYXQgcmVzdWx0cyBmcm9tIHRoZSByZWR1Y3Rpb24uXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtcImZvb1wiOiBcImJhclwifSksXG4gKiAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtcImhlbGxvXCI6IFwid29ybGRcIn0pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmNvb3JkUmVkdWNlKGZlYXR1cmVzLCBmdW5jdGlvbiAocHJldmlvdXNWYWx1ZSwgY3VycmVudENvb3JkLCBjb29yZEluZGV4LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICogICAvLz1wcmV2aW91c1ZhbHVlXG4gKiAgIC8vPWN1cnJlbnRDb29yZFxuICogICAvLz1jb29yZEluZGV4XG4gKiAgIC8vPWZlYXR1cmVJbmRleFxuICogICAvLz1mZWF0dXJlU3ViSW5kZXhcbiAqICAgcmV0dXJuIGN1cnJlbnRDb29yZDtcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBjb29yZFJlZHVjZShnZW9qc29uLCBjYWxsYmFjaywgaW5pdGlhbFZhbHVlLCBleGNsdWRlV3JhcENvb3JkKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBpbml0aWFsVmFsdWU7XG4gICAgY29vcmRFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjdXJyZW50Q29vcmQsIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KSB7XG4gICAgICAgIGlmIChjb29yZEluZGV4ID09PSAwICYmIGluaXRpYWxWYWx1ZSA9PT0gdW5kZWZpbmVkKSBwcmV2aW91c1ZhbHVlID0gY3VycmVudENvb3JkO1xuICAgICAgICBlbHNlIHByZXZpb3VzVmFsdWUgPSBjYWxsYmFjayhwcmV2aW91c1ZhbHVlLCBjdXJyZW50Q29vcmQsIGNvb3JkSW5kZXgsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICB9LCBleGNsdWRlV3JhcENvb3JkKTtcbiAgICByZXR1cm4gcHJldmlvdXNWYWx1ZTtcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgcHJvcEVhY2hcbiAqXG4gKiBAY2FsbGJhY2sgcHJvcEVhY2hDYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IGN1cnJlbnRQcm9wZXJ0aWVzIFRoZSBjdXJyZW50IHByb3BlcnRpZXMgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS5TdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKi9cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgcHJvcGVydGllcyBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkuZm9yRWFjaCgpXG4gKlxuICogQG5hbWUgcHJvcEVhY2hcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKGN1cnJlbnRQcm9wZXJ0aWVzLCBmZWF0dXJlSW5kZXgpXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgICAgdHVyZi5wb2ludChbMjYsIDM3XSwge2ZvbzogJ2Jhcid9KSxcbiAqICAgICB0dXJmLnBvaW50KFszNiwgNTNdLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdHVyZi5wcm9wRWFjaChmZWF0dXJlcywgZnVuY3Rpb24gKGN1cnJlbnRQcm9wZXJ0aWVzLCBmZWF0dXJlSW5kZXgpIHtcbiAqICAgLy89Y3VycmVudFByb3BlcnRpZXNcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gcHJvcEVhY2goZ2VvanNvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgaTtcbiAgICBzd2l0Y2ggKGdlb2pzb24udHlwZSkge1xuICAgIGNhc2UgJ0ZlYXR1cmVDb2xsZWN0aW9uJzpcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGdlb2pzb24uZmVhdHVyZXNbaV0ucHJvcGVydGllcywgaSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAnRmVhdHVyZSc6XG4gICAgICAgIGNhbGxiYWNrKGdlb2pzb24ucHJvcGVydGllcywgMCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBwcm9wUmVkdWNlXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHZhbHVlcyBwcm92aWRlZCBhcyBhcmd1bWVudHMgZGVwZW5kXG4gKiBvbiB3aGV0aGVyIHRoZSByZWR1Y2UgbWV0aG9kIGhhcyBhbiBpbml0aWFsVmFsdWUgYXJndW1lbnQuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkIHRvIHRoZSByZWR1Y2UgbWV0aG9kOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgaW5pdGlhbFZhbHVlLlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIG5vdCBwcm92aWRlZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBzZWNvbmQgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBAY2FsbGJhY2sgcHJvcFJlZHVjZUNhbGxiYWNrXG4gKiBAcGFyYW0geyp9IHByZXZpb3VzVmFsdWUgVGhlIGFjY3VtdWxhdGVkIHZhbHVlIHByZXZpb3VzbHkgcmV0dXJuZWQgaW4gdGhlIGxhc3QgaW52b2NhdGlvblxuICogb2YgdGhlIGNhbGxiYWNrLCBvciBpbml0aWFsVmFsdWUsIGlmIHN1cHBsaWVkLlxuICogQHBhcmFtIHsqfSBjdXJyZW50UHJvcGVydGllcyBUaGUgY3VycmVudCBwcm9wZXJ0aWVzIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlSW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICovXG5cbi8qKlxuICogUmVkdWNlIHByb3BlcnRpZXMgaW4gYW55IEdlb0pTT04gb2JqZWN0IGludG8gYSBzaW5nbGUgdmFsdWUsXG4gKiBzaW1pbGFyIHRvIGhvdyBBcnJheS5yZWR1Y2Ugd29ya3MuIEhvd2V2ZXIsIGluIHRoaXMgY2FzZSB3ZSBsYXppbHkgcnVuXG4gKiB0aGUgcmVkdWN0aW9uLCBzbyBhbiBhcnJheSBvZiBhbGwgcHJvcGVydGllcyBpcyB1bm5lY2Vzc2FyeS5cbiAqXG4gKiBAbmFtZSBwcm9wUmVkdWNlXG4gKiBAcGFyYW0ge0ZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50UHJvcGVydGllcywgZmVhdHVyZUluZGV4KVxuICogQHBhcmFtIHsqfSBbaW5pdGlhbFZhbHVlXSBWYWx1ZSB0byB1c2UgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIHRoZSBjYWxsYmFjay5cbiAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgdGhhdCByZXN1bHRzIGZyb20gdGhlIHJlZHVjdGlvbi5cbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLnByb3BSZWR1Y2UoZmVhdHVyZXMsIGZ1bmN0aW9uIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50UHJvcGVydGllcywgZmVhdHVyZUluZGV4KSB7XG4gKiAgIC8vPXByZXZpb3VzVmFsdWVcbiAqICAgLy89Y3VycmVudFByb3BlcnRpZXNcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIHJldHVybiBjdXJyZW50UHJvcGVydGllc1xuICogfSk7XG4gKi9cbmZ1bmN0aW9uIHByb3BSZWR1Y2UoZ2VvanNvbiwgY2FsbGJhY2ssIGluaXRpYWxWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gaW5pdGlhbFZhbHVlO1xuICAgIHByb3BFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjdXJyZW50UHJvcGVydGllcywgZmVhdHVyZUluZGV4KSB7XG4gICAgICAgIGlmIChmZWF0dXJlSW5kZXggPT09IDAgJiYgaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHByZXZpb3VzVmFsdWUgPSBjdXJyZW50UHJvcGVydGllcztcbiAgICAgICAgZWxzZSBwcmV2aW91c1ZhbHVlID0gY2FsbGJhY2socHJldmlvdXNWYWx1ZSwgY3VycmVudFByb3BlcnRpZXMsIGZlYXR1cmVJbmRleCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZXZpb3VzVmFsdWU7XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGZlYXR1cmVFYWNoXG4gKlxuICogQGNhbGxiYWNrIGZlYXR1cmVFYWNoQ2FsbGJhY2tcbiAqIEBwYXJhbSB7RmVhdHVyZTxhbnk+fSBjdXJyZW50RmVhdHVyZSBUaGUgY3VycmVudCBmZWF0dXJlIGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlSW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICovXG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGZlYXR1cmVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0b1xuICogQXJyYXkuZm9yRWFjaC5cbiAqXG4gKiBAbmFtZSBmZWF0dXJlRWFjaFxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAoY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleClcbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgdHVyZi5wb2ludChbMjYsIDM3XSwge2ZvbzogJ2Jhcid9KSxcbiAqICAgdHVyZi5wb2ludChbMzYsIDUzXSwge2hlbGxvOiAnd29ybGQnfSlcbiAqIF0pO1xuICpcbiAqIHR1cmYuZmVhdHVyZUVhY2goZmVhdHVyZXMsIGZ1bmN0aW9uIChjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4KSB7XG4gKiAgIC8vPWN1cnJlbnRGZWF0dXJlXG4gKiAgIC8vPWZlYXR1cmVJbmRleFxuICogfSk7XG4gKi9cbmZ1bmN0aW9uIGZlYXR1cmVFYWNoKGdlb2pzb24sIGNhbGxiYWNrKSB7XG4gICAgaWYgKGdlb2pzb24udHlwZSA9PT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAgIGNhbGxiYWNrKGdlb2pzb24sIDApO1xuICAgIH0gZWxzZSBpZiAoZ2VvanNvbi50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2FsbGJhY2soZ2VvanNvbi5mZWF0dXJlc1tpXSwgaSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGZlYXR1cmVSZWR1Y2VcbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgdmFsdWVzIHByb3ZpZGVkIGFzIGFyZ3VtZW50cyBkZXBlbmRcbiAqIG9uIHdoZXRoZXIgdGhlIHJlZHVjZSBtZXRob2QgaGFzIGFuIGluaXRpYWxWYWx1ZSBhcmd1bWVudC5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQgdG8gdGhlIHJlZHVjZSBtZXRob2Q6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyBpbml0aWFsVmFsdWUuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgbm90IHByb3ZpZGVkOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIHNlY29uZCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIEBjYWxsYmFjayBmZWF0dXJlUmVkdWNlQ2FsbGJhY2tcbiAqIEBwYXJhbSB7Kn0gcHJldmlvdXNWYWx1ZSBUaGUgYWNjdW11bGF0ZWQgdmFsdWUgcHJldmlvdXNseSByZXR1cm5lZCBpbiB0aGUgbGFzdCBpbnZvY2F0aW9uXG4gKiBvZiB0aGUgY2FsbGJhY2ssIG9yIGluaXRpYWxWYWx1ZSwgaWYgc3VwcGxpZWQuXG4gKiBAcGFyYW0ge0ZlYXR1cmV9IGN1cnJlbnRGZWF0dXJlIFRoZSBjdXJyZW50IEZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS5TdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKi9cblxuLyoqXG4gKiBSZWR1Y2UgZmVhdHVyZXMgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvIEFycmF5LnJlZHVjZSgpLlxuICpcbiAqIEBuYW1lIGZlYXR1cmVSZWR1Y2VcbiAqIEBwYXJhbSB7R2VvbWV0cnl8RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGEgbWV0aG9kIHRoYXQgdGFrZXMgKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgpXG4gKiBAcGFyYW0geyp9IFtpbml0aWFsVmFsdWVdIFZhbHVlIHRvIHVzZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgdGhlIGNhbGxiYWNrLlxuICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSB0aGF0IHJlc3VsdHMgZnJvbSB0aGUgcmVkdWN0aW9uLlxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICB0dXJmLnBvaW50KFsyNiwgMzddLCB7XCJmb29cIjogXCJiYXJcIn0pLFxuICogICB0dXJmLnBvaW50KFszNiwgNTNdLCB7XCJoZWxsb1wiOiBcIndvcmxkXCJ9KVxuICogXSk7XG4gKlxuICogdHVyZi5mZWF0dXJlUmVkdWNlKGZlYXR1cmVzLCBmdW5jdGlvbiAocHJldmlvdXNWYWx1ZSwgY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCkge1xuICogICAvLz1wcmV2aW91c1ZhbHVlXG4gKiAgIC8vPWN1cnJlbnRGZWF0dXJlXG4gKiAgIC8vPWZlYXR1cmVJbmRleFxuICogICByZXR1cm4gY3VycmVudEZlYXR1cmVcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBmZWF0dXJlUmVkdWNlKGdlb2pzb24sIGNhbGxiYWNrLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICBmZWF0dXJlRWFjaChnZW9qc29uLCBmdW5jdGlvbiAoY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCkge1xuICAgICAgICBpZiAoZmVhdHVyZUluZGV4ID09PSAwICYmIGluaXRpYWxWYWx1ZSA9PT0gdW5kZWZpbmVkKSBwcmV2aW91c1ZhbHVlID0gY3VycmVudEZlYXR1cmU7XG4gICAgICAgIGVsc2UgcHJldmlvdXNWYWx1ZSA9IGNhbGxiYWNrKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgpO1xuICAgIH0pO1xuICAgIHJldHVybiBwcmV2aW91c1ZhbHVlO1xufVxuXG4vKipcbiAqIEdldCBhbGwgY29vcmRpbmF0ZXMgZnJvbSBhbnkgR2VvSlNPTiBvYmplY3QuXG4gKlxuICogQG5hbWUgY29vcmRBbGxcbiAqIEBwYXJhbSB7R2VvbWV0cnl8RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZX0gZ2VvanNvbiBhbnkgR2VvSlNPTiBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxBcnJheTxudW1iZXI+Pn0gY29vcmRpbmF0ZSBwb3NpdGlvbiBhcnJheVxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICB0dXJmLnBvaW50KFszNiwgNTNdLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdmFyIGNvb3JkcyA9IHR1cmYuY29vcmRBbGwoZmVhdHVyZXMpO1xuICogLy89IFtbMjYsIDM3XSwgWzM2LCA1M11dXG4gKi9cbmZ1bmN0aW9uIGNvb3JkQWxsKGdlb2pzb24pIHtcbiAgICB2YXIgY29vcmRzID0gW107XG4gICAgY29vcmRFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjb29yZCkge1xuICAgICAgICBjb29yZHMucHVzaChjb29yZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvb3Jkcztcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgZ2VvbUVhY2hcbiAqXG4gKiBAY2FsbGJhY2sgZ2VvbUVhY2hDYWxsYmFja1xuICogQHBhcmFtIHtHZW9tZXRyeX0gY3VycmVudEdlb21ldHJ5IFRoZSBjdXJyZW50IGdlb21ldHJ5IGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBjdXJyZW50SW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuIFN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBjdXJyZW50UHJvcGVydGllcyBUaGUgY3VycmVudCBmZWF0dXJlIHByb3BlcnRpZXMgYmVpbmcgcHJvY2Vzc2VkLlxuICovXG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGVhY2ggZ2VvbWV0cnkgaW4gYW55IEdlb0pTT04gb2JqZWN0LCBzaW1pbGFyIHRvIEFycmF5LmZvckVhY2goKVxuICpcbiAqIEBuYW1lIGdlb21FYWNoXG4gKiBAcGFyYW0ge0dlb21ldHJ5fEZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmV9IGdlb2pzb24gYW55IEdlb0pTT04gb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChjdXJyZW50R2VvbWV0cnksIGZlYXR1cmVJbmRleCwgY3VycmVudFByb3BlcnRpZXMpXG4gKiBAZXhhbXBsZVxuICogdmFyIGZlYXR1cmVzID0gdHVyZi5mZWF0dXJlQ29sbGVjdGlvbihbXG4gKiAgICAgdHVyZi5wb2ludChbMjYsIDM3XSwge2ZvbzogJ2Jhcid9KSxcbiAqICAgICB0dXJmLnBvaW50KFszNiwgNTNdLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdHVyZi5nZW9tRWFjaChmZWF0dXJlcywgZnVuY3Rpb24gKGN1cnJlbnRHZW9tZXRyeSwgZmVhdHVyZUluZGV4LCBjdXJyZW50UHJvcGVydGllcykge1xuICogICAvLz1jdXJyZW50R2VvbWV0cnlcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIC8vPWN1cnJlbnRQcm9wZXJ0aWVzXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gZ2VvbUVhY2goZ2VvanNvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgaSwgaiwgZywgZ2VvbWV0cnksIHN0b3BHLFxuICAgICAgICBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbixcbiAgICAgICAgaXNHZW9tZXRyeUNvbGxlY3Rpb24sXG4gICAgICAgIGdlb21ldHJ5UHJvcGVydGllcyxcbiAgICAgICAgZmVhdHVyZUluZGV4ID0gMCxcbiAgICAgICAgaXNGZWF0dXJlQ29sbGVjdGlvbiA9IGdlb2pzb24udHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbiAgICAgICAgaXNGZWF0dXJlID0gZ2VvanNvbi50eXBlID09PSAnRmVhdHVyZScsXG4gICAgICAgIHN0b3AgPSBpc0ZlYXR1cmVDb2xsZWN0aW9uID8gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGggOiAxO1xuXG4gIC8vIFRoaXMgbG9naWMgbWF5IGxvb2sgYSBsaXR0bGUgd2VpcmQuIFRoZSByZWFzb24gd2h5IGl0IGlzIHRoYXQgd2F5XG4gIC8vIGlzIGJlY2F1c2UgaXQncyB0cnlpbmcgdG8gYmUgZmFzdC4gR2VvSlNPTiBzdXBwb3J0cyBtdWx0aXBsZSBraW5kc1xuICAvLyBvZiBvYmplY3RzIGF0IGl0cyByb290OiBGZWF0dXJlQ29sbGVjdGlvbiwgRmVhdHVyZXMsIEdlb21ldHJpZXMuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaGFzIHRoZSByZXNwb25zaWJpbGl0eSBvZiBoYW5kbGluZyBhbGwgb2YgdGhlbSwgYW5kIHRoYXRcbiAgLy8gbWVhbnMgdGhhdCBzb21lIG9mIHRoZSBgZm9yYCBsb29wcyB5b3Ugc2VlIGJlbG93IGFjdHVhbGx5IGp1c3QgZG9uJ3QgYXBwbHlcbiAgLy8gdG8gY2VydGFpbiBpbnB1dHMuIEZvciBpbnN0YW5jZSwgaWYgeW91IGdpdmUgdGhpcyBqdXN0IGFcbiAgLy8gUG9pbnQgZ2VvbWV0cnksIHRoZW4gYm90aCBsb29wcyBhcmUgc2hvcnQtY2lyY3VpdGVkIGFuZCBhbGwgd2UgZG9cbiAgLy8gaXMgZ3JhZHVhbGx5IHJlbmFtZSB0aGUgaW5wdXQgdW50aWwgaXQncyBjYWxsZWQgJ2dlb21ldHJ5Jy5cbiAgLy9cbiAgLy8gVGhpcyBhbHNvIGFpbXMgdG8gYWxsb2NhdGUgYXMgZmV3IHJlc291cmNlcyBhcyBwb3NzaWJsZToganVzdCBhXG4gIC8vIGZldyBudW1iZXJzIGFuZCBib29sZWFucywgcmF0aGVyIHRoYW4gYW55IHRlbXBvcmFyeSBhcnJheXMgYXMgd291bGRcbiAgLy8gYmUgcmVxdWlyZWQgd2l0aCB0aGUgbm9ybWFsaXphdGlvbiBhcHByb2FjaC5cbiAgICBmb3IgKGkgPSAwOyBpIDwgc3RvcDsgaSsrKSB7XG5cbiAgICAgICAgZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24gPSAoaXNGZWF0dXJlQ29sbGVjdGlvbiA/IGdlb2pzb24uZmVhdHVyZXNbaV0uZ2VvbWV0cnkgOlxuICAgICAgICAoaXNGZWF0dXJlID8gZ2VvanNvbi5nZW9tZXRyeSA6IGdlb2pzb24pKTtcbiAgICAgICAgZ2VvbWV0cnlQcm9wZXJ0aWVzID0gKGlzRmVhdHVyZUNvbGxlY3Rpb24gPyBnZW9qc29uLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGlzRmVhdHVyZSA/IGdlb2pzb24ucHJvcGVydGllcyA6IHt9KSk7XG4gICAgICAgIGlzR2VvbWV0cnlDb2xsZWN0aW9uID0gKGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uKSA/IGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uLnR5cGUgPT09ICdHZW9tZXRyeUNvbGxlY3Rpb24nIDogZmFsc2U7XG4gICAgICAgIHN0b3BHID0gaXNHZW9tZXRyeUNvbGxlY3Rpb24gPyBnZW9tZXRyeU1heWJlQ29sbGVjdGlvbi5nZW9tZXRyaWVzLmxlbmd0aCA6IDE7XG5cbiAgICAgICAgZm9yIChnID0gMDsgZyA8IHN0b3BHOyBnKyspIHtcbiAgICAgICAgICAgIGdlb21ldHJ5ID0gaXNHZW9tZXRyeUNvbGxlY3Rpb24gP1xuICAgICAgICAgICAgZ2VvbWV0cnlNYXliZUNvbGxlY3Rpb24uZ2VvbWV0cmllc1tnXSA6IGdlb21ldHJ5TWF5YmVDb2xsZWN0aW9uO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgbnVsbCBHZW9tZXRyeVxuICAgICAgICAgICAgaWYgKGdlb21ldHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZmVhdHVyZUluZGV4LCBnZW9tZXRyeVByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChnZW9tZXRyeS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdQb2ludCc6XG4gICAgICAgICAgICBjYXNlICdMaW5lU3RyaW5nJzpcbiAgICAgICAgICAgIGNhc2UgJ011bHRpUG9pbnQnOlxuICAgICAgICAgICAgY2FzZSAnUG9seWdvbic6XG4gICAgICAgICAgICBjYXNlICdNdWx0aUxpbmVTdHJpbmcnOlxuICAgICAgICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzoge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGdlb21ldHJ5LCBmZWF0dXJlSW5kZXgsIGdlb21ldHJ5UHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgZmVhdHVyZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdHZW9tZXRyeUNvbGxlY3Rpb24nOiB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGdlb21ldHJ5Lmdlb21ldHJpZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZ2VvbWV0cnkuZ2VvbWV0cmllc1tqXSwgZmVhdHVyZUluZGV4LCBnZW9tZXRyeVByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5kZXgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gR2VvbWV0cnkgVHlwZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBnZW9tUmVkdWNlXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHZhbHVlcyBwcm92aWRlZCBhcyBhcmd1bWVudHMgZGVwZW5kXG4gKiBvbiB3aGV0aGVyIHRoZSByZWR1Y2UgbWV0aG9kIGhhcyBhbiBpbml0aWFsVmFsdWUgYXJndW1lbnQuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkIHRvIHRoZSByZWR1Y2UgbWV0aG9kOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgaW5pdGlhbFZhbHVlLlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogSWYgYW4gaW5pdGlhbFZhbHVlIGlzIG5vdCBwcm92aWRlZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBzZWNvbmQgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBAY2FsbGJhY2sgZ2VvbVJlZHVjZUNhbGxiYWNrXG4gKiBAcGFyYW0geyp9IHByZXZpb3VzVmFsdWUgVGhlIGFjY3VtdWxhdGVkIHZhbHVlIHByZXZpb3VzbHkgcmV0dXJuZWQgaW4gdGhlIGxhc3QgaW52b2NhdGlvblxuICogb2YgdGhlIGNhbGxiYWNrLCBvciBpbml0aWFsVmFsdWUsIGlmIHN1cHBsaWVkLlxuICogQHBhcmFtIHtHZW9tZXRyeX0gY3VycmVudEdlb21ldHJ5IFRoZSBjdXJyZW50IEZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS5TdGFydHMgYXQgaW5kZXggMCwgaWYgYW4gaW5pdGlhbFZhbHVlIGlzIHByb3ZpZGVkLCBhbmQgYXQgaW5kZXggMSBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge09iamVjdH0gY3VycmVudFByb3BlcnRpZXMgVGhlIGN1cnJlbnQgZmVhdHVyZSBwcm9wZXJ0aWVzIGJlaW5nIHByb2Nlc3NlZC5cbiAqL1xuXG4vKipcbiAqIFJlZHVjZSBnZW9tZXRyeSBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkucmVkdWNlKCkuXG4gKlxuICogQG5hbWUgZ2VvbVJlZHVjZVxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAocHJldmlvdXNWYWx1ZSwgY3VycmVudEdlb21ldHJ5LCBmZWF0dXJlSW5kZXgsIGN1cnJlbnRQcm9wZXJ0aWVzKVxuICogQHBhcmFtIHsqfSBbaW5pdGlhbFZhbHVlXSBWYWx1ZSB0byB1c2UgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIHRoZSBjYWxsYmFjay5cbiAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgdGhhdCByZXN1bHRzIGZyb20gdGhlIHJlZHVjdGlvbi5cbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICAgIHR1cmYucG9pbnQoWzM2LCA1M10sIHtoZWxsbzogJ3dvcmxkJ30pXG4gKiBdKTtcbiAqXG4gKiB0dXJmLmdlb21SZWR1Y2UoZmVhdHVyZXMsIGZ1bmN0aW9uIChwcmV2aW91c1ZhbHVlLCBjdXJyZW50R2VvbWV0cnksIGZlYXR1cmVJbmRleCwgY3VycmVudFByb3BlcnRpZXMpIHtcbiAqICAgLy89cHJldmlvdXNWYWx1ZVxuICogICAvLz1jdXJyZW50R2VvbWV0cnlcbiAqICAgLy89ZmVhdHVyZUluZGV4XG4gKiAgIC8vPWN1cnJlbnRQcm9wZXJ0aWVzXG4gKiAgIHJldHVybiBjdXJyZW50R2VvbWV0cnlcbiAqIH0pO1xuICovXG5mdW5jdGlvbiBnZW9tUmVkdWNlKGdlb2pzb24sIGNhbGxiYWNrLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICBnZW9tRWFjaChnZW9qc29uLCBmdW5jdGlvbiAoY3VycmVudEdlb21ldHJ5LCBjdXJyZW50SW5kZXgsIGN1cnJlbnRQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmIChjdXJyZW50SW5kZXggPT09IDAgJiYgaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHByZXZpb3VzVmFsdWUgPSBjdXJyZW50R2VvbWV0cnk7XG4gICAgICAgIGVsc2UgcHJldmlvdXNWYWx1ZSA9IGNhbGxiYWNrKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRHZW9tZXRyeSwgY3VycmVudEluZGV4LCBjdXJyZW50UHJvcGVydGllcyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZXZpb3VzVmFsdWU7XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGZsYXR0ZW5FYWNoXG4gKlxuICogQGNhbGxiYWNrIGZsYXR0ZW5FYWNoQ2FsbGJhY2tcbiAqIEBwYXJhbSB7RmVhdHVyZX0gY3VycmVudEZlYXR1cmUgVGhlIGN1cnJlbnQgZmxhdHRlbmVkIGZlYXR1cmUgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVTdWJJbmRleCBUaGUgc3ViaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAgYW5kIGluY3JlYXNlcyBpZiB0aGUgZmxhdHRlbmVkIGZlYXR1cmUgd2FzIGEgbXVsdGktZ2VvbWV0cnkuXG4gKi9cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgZmxhdHRlbmVkIGZlYXR1cmVzIGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0b1xuICogQXJyYXkuZm9yRWFjaC5cbiAqXG4gKiBAbmFtZSBmbGF0dGVuRWFjaFxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAoY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KVxuICogQGV4YW1wbGVcbiAqIHZhciBmZWF0dXJlcyA9IHR1cmYuZmVhdHVyZUNvbGxlY3Rpb24oW1xuICogICAgIHR1cmYucG9pbnQoWzI2LCAzN10sIHtmb286ICdiYXInfSksXG4gKiAgICAgdHVyZi5tdWx0aVBvaW50KFtbNDAsIDMwXSwgWzM2LCA1M11dLCB7aGVsbG86ICd3b3JsZCd9KVxuICogXSk7XG4gKlxuICogdHVyZi5mbGF0dGVuRWFjaChmZWF0dXJlcywgZnVuY3Rpb24gKGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICogICAvLz1jdXJyZW50RmVhdHVyZVxuICogICAvLz1mZWF0dXJlSW5kZXhcbiAqICAgLy89ZmVhdHVyZVN1YkluZGV4XG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gZmxhdHRlbkVhY2goZ2VvanNvbiwgY2FsbGJhY2spIHtcbiAgICBnZW9tRWFjaChnZW9qc29uLCBmdW5jdGlvbiAoZ2VvbWV0cnksIGZlYXR1cmVJbmRleCwgcHJvcGVydGllcykge1xuICAgICAgICAvLyBDYWxsYmFjayBmb3Igc2luZ2xlIGdlb21ldHJ5XG4gICAgICAgIHZhciB0eXBlID0gKGdlb21ldHJ5ID09PSBudWxsKSA/IG51bGwgOiBnZW9tZXRyeS50eXBlO1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBudWxsOlxuICAgICAgICBjYXNlICdQb2ludCc6XG4gICAgICAgIGNhc2UgJ0xpbmVTdHJpbmcnOlxuICAgICAgICBjYXNlICdQb2x5Z29uJzpcbiAgICAgICAgICAgIGNhbGxiYWNrKGZlYXR1cmUoZ2VvbWV0cnksIHByb3BlcnRpZXMpLCBmZWF0dXJlSW5kZXgsIDApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGdlb21UeXBlO1xuXG4gICAgICAgIC8vIENhbGxiYWNrIGZvciBtdWx0aS1nZW9tZXRyeVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnTXVsdGlQb2ludCc6XG4gICAgICAgICAgICBnZW9tVHlwZSA9ICdQb2ludCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTXVsdGlMaW5lU3RyaW5nJzpcbiAgICAgICAgICAgIGdlb21UeXBlID0gJ0xpbmVTdHJpbmcnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICAgICAgICBnZW9tVHlwZSA9ICdQb2x5Z29uJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2VvbWV0cnkuY29vcmRpbmF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoY29vcmRpbmF0ZSwgZmVhdHVyZVN1YkluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZ2VvbSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBnZW9tVHlwZSxcbiAgICAgICAgICAgICAgICBjb29yZGluYXRlczogY29vcmRpbmF0ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGZlYXR1cmUoZ2VvbSwgcHJvcGVydGllcyksIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcbn1cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgZmxhdHRlblJlZHVjZVxuICpcbiAqIFRoZSBmaXJzdCB0aW1lIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSB2YWx1ZXMgcHJvdmlkZWQgYXMgYXJndW1lbnRzIGRlcGVuZFxuICogb24gd2hldGhlciB0aGUgcmVkdWNlIG1ldGhvZCBoYXMgYW4gaW5pdGlhbFZhbHVlIGFyZ3VtZW50LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCB0byB0aGUgcmVkdWNlIG1ldGhvZDpcbiAqICAtIFRoZSBwcmV2aW91c1ZhbHVlIGFyZ3VtZW50IGlzIGluaXRpYWxWYWx1ZS5cbiAqICAtIFRoZSBjdXJyZW50VmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIElmIGFuIGluaXRpYWxWYWx1ZSBpcyBub3QgcHJvdmlkZWQ6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgc2Vjb25kIGVsZW1lbnQgcHJlc2VudCBpbiB0aGUgYXJyYXkuXG4gKlxuICogQGNhbGxiYWNrIGZsYXR0ZW5SZWR1Y2VDYWxsYmFja1xuICogQHBhcmFtIHsqfSBwcmV2aW91c1ZhbHVlIFRoZSBhY2N1bXVsYXRlZCB2YWx1ZSBwcmV2aW91c2x5IHJldHVybmVkIGluIHRoZSBsYXN0IGludm9jYXRpb25cbiAqIG9mIHRoZSBjYWxsYmFjaywgb3IgaW5pdGlhbFZhbHVlLCBpZiBzdXBwbGllZC5cbiAqIEBwYXJhbSB7RmVhdHVyZX0gY3VycmVudEZlYXR1cmUgVGhlIGN1cnJlbnQgRmVhdHVyZSBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gZmVhdHVyZUluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LlN0YXJ0cyBhdCBpbmRleCAwLCBpZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQsIGFuZCBhdCBpbmRleCAxIG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlU3ViSW5kZXggVGhlIHN1YmluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuIFN0YXJ0cyBhdCBpbmRleCAwIGFuZCBpbmNyZWFzZXMgaWYgdGhlIGZsYXR0ZW5lZCBmZWF0dXJlIHdhcyBhIG11bHRpLWdlb21ldHJ5LlxuICovXG5cbi8qKlxuICogUmVkdWNlIGZsYXR0ZW5lZCBmZWF0dXJlcyBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkucmVkdWNlKCkuXG4gKlxuICogQG5hbWUgZmxhdHRlblJlZHVjZVxuICogQHBhcmFtIHtHZW9tZXRyeXxGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfSBnZW9qc29uIGFueSBHZW9KU09OIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAocHJldmlvdXNWYWx1ZSwgY3VycmVudEZlYXR1cmUsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KVxuICogQHBhcmFtIHsqfSBbaW5pdGlhbFZhbHVlXSBWYWx1ZSB0byB1c2UgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIHRoZSBjYWxsYmFjay5cbiAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgdGhhdCByZXN1bHRzIGZyb20gdGhlIHJlZHVjdGlvbi5cbiAqIEBleGFtcGxlXG4gKiB2YXIgZmVhdHVyZXMgPSB0dXJmLmZlYXR1cmVDb2xsZWN0aW9uKFtcbiAqICAgICB0dXJmLnBvaW50KFsyNiwgMzddLCB7Zm9vOiAnYmFyJ30pLFxuICogICAgIHR1cmYubXVsdGlQb2ludChbWzQwLCAzMF0sIFszNiwgNTNdXSwge2hlbGxvOiAnd29ybGQnfSlcbiAqIF0pO1xuICpcbiAqIHR1cmYuZmxhdHRlblJlZHVjZShmZWF0dXJlcywgZnVuY3Rpb24gKHByZXZpb3VzVmFsdWUsIGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICogICAvLz1wcmV2aW91c1ZhbHVlXG4gKiAgIC8vPWN1cnJlbnRGZWF0dXJlXG4gKiAgIC8vPWZlYXR1cmVJbmRleFxuICogICAvLz1mZWF0dXJlU3ViSW5kZXhcbiAqICAgcmV0dXJuIGN1cnJlbnRGZWF0dXJlXG4gKiB9KTtcbiAqL1xuZnVuY3Rpb24gZmxhdHRlblJlZHVjZShnZW9qc29uLCBjYWxsYmFjaywgaW5pdGlhbFZhbHVlKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBpbml0aWFsVmFsdWU7XG4gICAgZmxhdHRlbkVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGN1cnJlbnRGZWF0dXJlLCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICAgICAgICBpZiAoZmVhdHVyZUluZGV4ID09PSAwICYmIGZlYXR1cmVTdWJJbmRleCA9PT0gMCAmJiBpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkgcHJldmlvdXNWYWx1ZSA9IGN1cnJlbnRGZWF0dXJlO1xuICAgICAgICBlbHNlIHByZXZpb3VzVmFsdWUgPSBjYWxsYmFjayhwcmV2aW91c1ZhbHVlLCBjdXJyZW50RmVhdHVyZSwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpO1xuICAgIH0pO1xuICAgIHJldHVybiBwcmV2aW91c1ZhbHVlO1xufVxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBzZWdtZW50RWFjaFxuICpcbiAqIEBjYWxsYmFjayBzZWdtZW50RWFjaENhbGxiYWNrXG4gKiBAcGFyYW0ge0ZlYXR1cmU8TGluZVN0cmluZz59IGN1cnJlbnRTZWdtZW50IFRoZSBjdXJyZW50IHNlZ21lbnQgYmVpbmcgcHJvY2Vzc2VkLlxuICogQHBhcmFtIHtudW1iZXJ9IGZlYXR1cmVJbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlIGFycmF5LCBzdGFydHMgYXQgaW5kZXggMC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBmZWF0dXJlU3ViSW5kZXggVGhlIHN1YmluZGV4IG9mIHRoZSBjdXJyZW50IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkIGluIHRoZVxuICogYXJyYXkuIFN0YXJ0cyBhdCBpbmRleCAwIGFuZCBpbmNyZWFzZXMgZm9yIGVhY2ggaXRlcmF0aW5nIGxpbmUgc2VnbWVudC5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIDItdmVydGV4IGxpbmUgc2VnbWVudCBpbiBhbnkgR2VvSlNPTiBvYmplY3QsIHNpbWlsYXIgdG8gQXJyYXkuZm9yRWFjaCgpXG4gKiAoTXVsdGkpUG9pbnQgZ2VvbWV0cmllcyBkbyBub3QgY29udGFpbiBzZWdtZW50cyB0aGVyZWZvcmUgdGhleSBhcmUgaWdub3JlZCBkdXJpbmcgdGhpcyBvcGVyYXRpb24uXG4gKlxuICogQHBhcmFtIHtGZWF0dXJlQ29sbGVjdGlvbnxGZWF0dXJlfEdlb21ldHJ5fSBnZW9qc29uIGFueSBHZW9KU09OXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIG1ldGhvZCB0aGF0IHRha2VzIChjdXJyZW50U2VnbWVudCwgZmVhdHVyZUluZGV4LCBmZWF0dXJlU3ViSW5kZXgpXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqIEBleGFtcGxlXG4gKiB2YXIgcG9seWdvbiA9IHR1cmYucG9seWdvbihbW1stNTAsIDVdLCBbLTQwLCAtMTBdLCBbLTUwLCAtMTBdLCBbLTQwLCA1XSwgWy01MCwgNV1dXSk7XG4gKlxuICogLy8gSXRlcmF0ZSBvdmVyIEdlb0pTT04gYnkgMi12ZXJ0ZXggc2VnbWVudHNcbiAqIHR1cmYuc2VnbWVudEVhY2gocG9seWdvbiwgZnVuY3Rpb24gKGN1cnJlbnRTZWdtZW50LCBmZWF0dXJlSW5kZXgsIGZlYXR1cmVTdWJJbmRleCkge1xuICogICAvLz0gY3VycmVudFNlZ21lbnRcbiAqICAgLy89IGZlYXR1cmVJbmRleFxuICogICAvLz0gZmVhdHVyZVN1YkluZGV4XG4gKiB9KTtcbiAqXG4gKiAvLyBDYWxjdWxhdGUgdGhlIHRvdGFsIG51bWJlciBvZiBzZWdtZW50c1xuICogdmFyIHRvdGFsID0gMDtcbiAqIHZhciBpbml0aWFsVmFsdWUgPSAwO1xuICogdHVyZi5zZWdtZW50RWFjaChwb2x5Z29uLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgdG90YWwrKztcbiAqIH0sIGluaXRpYWxWYWx1ZSk7XG4gKi9cbmZ1bmN0aW9uIHNlZ21lbnRFYWNoKGdlb2pzb24sIGNhbGxiYWNrKSB7XG4gICAgZmxhdHRlbkVhY2goZ2VvanNvbiwgZnVuY3Rpb24gKGZlYXR1cmUsIGZlYXR1cmVJbmRleCkge1xuICAgICAgICB2YXIgZmVhdHVyZVN1YkluZGV4ID0gMDtcbiAgICAgICAgLy8gRXhjbHVkZSBudWxsIEdlb21ldHJpZXNcbiAgICAgICAgaWYgKCFmZWF0dXJlLmdlb21ldHJ5KSByZXR1cm47XG4gICAgICAgIC8vIChNdWx0aSlQb2ludCBnZW9tZXRyaWVzIGRvIG5vdCBjb250YWluIHNlZ21lbnRzIHRoZXJlZm9yZSB0aGV5IGFyZSBpZ25vcmVkIGR1cmluZyB0aGlzIG9wZXJhdGlvbi5cbiAgICAgICAgdmFyIHR5cGUgPSBmZWF0dXJlLmdlb21ldHJ5LnR5cGU7XG4gICAgICAgIGlmICh0eXBlID09PSAnUG9pbnQnIHx8IHR5cGUgPT09ICdNdWx0aVBvaW50JykgcmV0dXJuO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIDItdmVydGV4IGxpbmUgc2VnbWVudHNcbiAgICAgICAgY29vcmRSZWR1Y2UoZmVhdHVyZSwgZnVuY3Rpb24gKHByZXZpb3VzQ29vcmRzLCBjdXJyZW50Q29vcmQpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U2VnbWVudCA9IGxpbmVTdHJpbmcoW3ByZXZpb3VzQ29vcmRzLCBjdXJyZW50Q29vcmRdLCBmZWF0dXJlLnByb3BlcnRpZXMpO1xuICAgICAgICAgICAgY2FsbGJhY2soY3VycmVudFNlZ21lbnQsIGZlYXR1cmVJbmRleCwgZmVhdHVyZVN1YkluZGV4KTtcbiAgICAgICAgICAgIGZlYXR1cmVTdWJJbmRleCsrO1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRDb29yZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIHNlZ21lbnRSZWR1Y2VcbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgdmFsdWVzIHByb3ZpZGVkIGFzIGFyZ3VtZW50cyBkZXBlbmRcbiAqIG9uIHdoZXRoZXIgdGhlIHJlZHVjZSBtZXRob2QgaGFzIGFuIGluaXRpYWxWYWx1ZSBhcmd1bWVudC5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgcHJvdmlkZWQgdG8gdGhlIHJlZHVjZSBtZXRob2Q6XG4gKiAgLSBUaGUgcHJldmlvdXNWYWx1ZSBhcmd1bWVudCBpcyBpbml0aWFsVmFsdWUuXG4gKiAgLSBUaGUgY3VycmVudFZhbHVlIGFyZ3VtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBwcmVzZW50IGluIHRoZSBhcnJheS5cbiAqXG4gKiBJZiBhbiBpbml0aWFsVmFsdWUgaXMgbm90IHByb3ZpZGVkOlxuICogIC0gVGhlIHByZXZpb3VzVmFsdWUgYXJndW1lbnQgaXMgdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICogIC0gVGhlIGN1cnJlbnRWYWx1ZSBhcmd1bWVudCBpcyB0aGUgdmFsdWUgb2YgdGhlIHNlY29uZCBlbGVtZW50IHByZXNlbnQgaW4gdGhlIGFycmF5LlxuICpcbiAqIEBjYWxsYmFjayBzZWdtZW50UmVkdWNlQ2FsbGJhY2tcbiAqIEBwYXJhbSB7Kn0gW3ByZXZpb3VzVmFsdWVdIFRoZSBhY2N1bXVsYXRlZCB2YWx1ZSBwcmV2aW91c2x5IHJldHVybmVkIGluIHRoZSBsYXN0IGludm9jYXRpb25cbiAqIG9mIHRoZSBjYWxsYmFjaywgb3IgaW5pdGlhbFZhbHVlLCBpZiBzdXBwbGllZC5cbiAqIEBwYXJhbSB7RmVhdHVyZTxMaW5lU3RyaW5nPn0gW2N1cnJlbnRTZWdtZW50XSBUaGUgY3VycmVudCBzZWdtZW50IGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbY3VycmVudEluZGV4XSBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgZWxlbWVudCBiZWluZyBwcm9jZXNzZWQgaW4gdGhlXG4gKiBhcnJheS4gU3RhcnRzIGF0IGluZGV4IDAsIGlmIGFuIGluaXRpYWxWYWx1ZSBpcyBwcm92aWRlZCwgYW5kIGF0IGluZGV4IDEgb3RoZXJ3aXNlLlxuICogQHBhcmFtIHtudW1iZXJ9IFtjdXJyZW50U3ViSW5kZXhdIFRoZSBzdWJpbmRleCBvZiB0aGUgY3VycmVudCBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZCBpbiB0aGVcbiAqIGFycmF5LiBTdGFydHMgYXQgaW5kZXggMCBhbmQgaW5jcmVhc2VzIGZvciBlYWNoIGl0ZXJhdGluZyBsaW5lIHNlZ21lbnQuXG4gKi9cblxuLyoqXG4gKiBSZWR1Y2UgMi12ZXJ0ZXggbGluZSBzZWdtZW50IGluIGFueSBHZW9KU09OIG9iamVjdCwgc2ltaWxhciB0byBBcnJheS5yZWR1Y2UoKVxuICogKE11bHRpKVBvaW50IGdlb21ldHJpZXMgZG8gbm90IGNvbnRhaW4gc2VnbWVudHMgdGhlcmVmb3JlIHRoZXkgYXJlIGlnbm9yZWQgZHVyaW5nIHRoaXMgb3BlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7RmVhdHVyZUNvbGxlY3Rpb258RmVhdHVyZXxHZW9tZXRyeX0gZ2VvanNvbiBhbnkgR2VvSlNPTlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYSBtZXRob2QgdGhhdCB0YWtlcyAocHJldmlvdXNWYWx1ZSwgY3VycmVudFNlZ21lbnQsIGN1cnJlbnRJbmRleClcbiAqIEBwYXJhbSB7Kn0gW2luaXRpYWxWYWx1ZV0gVmFsdWUgdG8gdXNlIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiB0aGUgY2FsbGJhY2suXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqIEBleGFtcGxlXG4gKiB2YXIgcG9seWdvbiA9IHR1cmYucG9seWdvbihbW1stNTAsIDVdLCBbLTQwLCAtMTBdLCBbLTUwLCAtMTBdLCBbLTQwLCA1XSwgWy01MCwgNV1dXSk7XG4gKlxuICogLy8gSXRlcmF0ZSBvdmVyIEdlb0pTT04gYnkgMi12ZXJ0ZXggc2VnbWVudHNcbiAqIHR1cmYuc2VnbWVudFJlZHVjZShwb2x5Z29uLCBmdW5jdGlvbiAocHJldmlvdXNTZWdtZW50LCBjdXJyZW50U2VnbWVudCwgY3VycmVudEluZGV4LCBjdXJyZW50U3ViSW5kZXgpIHtcbiAqICAgLy89IHByZXZpb3VzU2VnbWVudFxuICogICAvLz0gY3VycmVudFNlZ21lbnRcbiAqICAgLy89IGN1cnJlbnRJbmRleFxuICogICAvLz0gY3VycmVudFN1YkluZGV4XG4gKiAgIHJldHVybiBjdXJyZW50U2VnbWVudFxuICogfSk7XG4gKlxuICogLy8gQ2FsY3VsYXRlIHRoZSB0b3RhbCBudW1iZXIgb2Ygc2VnbWVudHNcbiAqIHZhciBpbml0aWFsVmFsdWUgPSAwXG4gKiB2YXIgdG90YWwgPSB0dXJmLnNlZ21lbnRSZWR1Y2UocG9seWdvbiwgZnVuY3Rpb24gKHByZXZpb3VzVmFsdWUpIHtcbiAqICAgICBwcmV2aW91c1ZhbHVlKys7XG4gKiAgICAgcmV0dXJuIHByZXZpb3VzVmFsdWU7XG4gKiB9LCBpbml0aWFsVmFsdWUpO1xuICovXG5mdW5jdGlvbiBzZWdtZW50UmVkdWNlKGdlb2pzb24sIGNhbGxiYWNrLCBpbml0aWFsVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICBzZWdtZW50RWFjaChnZW9qc29uLCBmdW5jdGlvbiAoY3VycmVudFNlZ21lbnQsIGN1cnJlbnRJbmRleCwgY3VycmVudFN1YkluZGV4KSB7XG4gICAgICAgIGlmIChjdXJyZW50SW5kZXggPT09IDAgJiYgaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHByZXZpb3VzVmFsdWUgPSBjdXJyZW50U2VnbWVudDtcbiAgICAgICAgZWxzZSBwcmV2aW91c1ZhbHVlID0gY2FsbGJhY2socHJldmlvdXNWYWx1ZSwgY3VycmVudFNlZ21lbnQsIGN1cnJlbnRJbmRleCwgY3VycmVudFN1YkluZGV4KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJldmlvdXNWYWx1ZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgRmVhdHVyZVxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0dlb21ldHJ5fSBnZW9tZXRyeSBHZW9KU09OIEdlb21ldHJ5XG4gKiBAcGFyYW0ge09iamVjdH0gcHJvcGVydGllcyBQcm9wZXJ0aWVzXG4gKiBAcmV0dXJucyB7RmVhdHVyZX0gR2VvSlNPTiBGZWF0dXJlXG4gKi9cbmZ1bmN0aW9uIGZlYXR1cmUoZ2VvbWV0cnksIHByb3BlcnRpZXMpIHtcbiAgICBpZiAoZ2VvbWV0cnkgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdObyBnZW9tZXRyeSBwYXNzZWQnKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllcyB8fCB7fSxcbiAgICAgICAgZ2VvbWV0cnk6IGdlb21ldHJ5XG4gICAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgTGluZVN0cmluZ1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5PEFycmF5PG51bWJlcj4+fSBjb29yZGluYXRlcyBMaW5lIENvb3JkaW5hdGVzXG4gKiBAcGFyYW0ge09iamVjdH0gcHJvcGVydGllcyBQcm9wZXJ0aWVzXG4gKiBAcmV0dXJucyB7RmVhdHVyZTxMaW5lU3RyaW5nPn0gR2VvSlNPTiBMaW5lU3RyaW5nIEZlYXR1cmVcbiAqL1xuZnVuY3Rpb24gbGluZVN0cmluZyhjb29yZGluYXRlcywgcHJvcGVydGllcykge1xuICAgIGlmICghY29vcmRpbmF0ZXMpIHRocm93IG5ldyBFcnJvcignTm8gY29vcmRpbmF0ZXMgcGFzc2VkJyk7XG4gICAgaWYgKGNvb3JkaW5hdGVzLmxlbmd0aCA8IDIpIHRocm93IG5ldyBFcnJvcignQ29vcmRpbmF0ZXMgbXVzdCBiZSBhbiBhcnJheSBvZiB0d28gb3IgbW9yZSBwb3NpdGlvbnMnKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllcyB8fCB7fSxcbiAgICAgICAgZ2VvbWV0cnk6IHtcbiAgICAgICAgICAgIHR5cGU6ICdMaW5lU3RyaW5nJyxcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZGluYXRlc1xuICAgICAgICB9XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY29vcmRFYWNoOiBjb29yZEVhY2gsXG4gICAgY29vcmRSZWR1Y2U6IGNvb3JkUmVkdWNlLFxuICAgIHByb3BFYWNoOiBwcm9wRWFjaCxcbiAgICBwcm9wUmVkdWNlOiBwcm9wUmVkdWNlLFxuICAgIGZlYXR1cmVFYWNoOiBmZWF0dXJlRWFjaCxcbiAgICBmZWF0dXJlUmVkdWNlOiBmZWF0dXJlUmVkdWNlLFxuICAgIGNvb3JkQWxsOiBjb29yZEFsbCxcbiAgICBnZW9tRWFjaDogZ2VvbUVhY2gsXG4gICAgZ2VvbVJlZHVjZTogZ2VvbVJlZHVjZSxcbiAgICBmbGF0dGVuRWFjaDogZmxhdHRlbkVhY2gsXG4gICAgZmxhdHRlblJlZHVjZTogZmxhdHRlblJlZHVjZSxcbiAgICBzZWdtZW50RWFjaDogc2VnbWVudEVhY2gsXG4gICAgc2VnbWVudFJlZHVjZTogc2VnbWVudFJlZHVjZVxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL0B0dXJmL21ldGEvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIGNvb3JkRWFjaCA9IHJlcXVpcmUoJ0B0dXJmL21ldGEnKS5jb29yZEVhY2g7XG5cbi8qKlxuICogVGFrZXMgYSBzZXQgb2YgZmVhdHVyZXMsIGNhbGN1bGF0ZXMgdGhlIGJib3ggb2YgYWxsIGlucHV0IGZlYXR1cmVzLCBhbmQgcmV0dXJucyBhIGJvdW5kaW5nIGJveC5cbiAqXG4gKiBAbmFtZSBiYm94XG4gKiBAcGFyYW0ge0ZlYXR1cmVDb2xsZWN0aW9ufEZlYXR1cmU8YW55Pn0gZ2VvanNvbiBpbnB1dCBmZWF0dXJlc1xuICogQHJldHVybnMge0FycmF5PG51bWJlcj59IGJib3ggZXh0ZW50IGluIFttaW5YLCBtaW5ZLCBtYXhYLCBtYXhZXSBvcmRlclxuICogQGV4YW1wbGVcbiAqIHZhciBsaW5lID0gdHVyZi5saW5lU3RyaW5nKFtbLTc0LCA0MF0sIFstNzgsIDQyXSwgWy04MiwgMzVdXSk7XG4gKiB2YXIgYmJveCA9IHR1cmYuYmJveChsaW5lKTtcbiAqIHZhciBiYm94UG9seWdvbiA9IHR1cmYuYmJveFBvbHlnb24oYmJveCk7XG4gKlxuICogLy9hZGRUb01hcFxuICogdmFyIGFkZFRvTWFwID0gW2xpbmUsIGJib3hQb2x5Z29uXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChnZW9qc29uKSB7XG4gICAgdmFyIGJib3ggPSBbSW5maW5pdHksIEluZmluaXR5LCAtSW5maW5pdHksIC1JbmZpbml0eV07XG4gICAgY29vcmRFYWNoKGdlb2pzb24sIGZ1bmN0aW9uIChjb29yZCkge1xuICAgICAgICBpZiAoYmJveFswXSA+IGNvb3JkWzBdKSBiYm94WzBdID0gY29vcmRbMF07XG4gICAgICAgIGlmIChiYm94WzFdID4gY29vcmRbMV0pIGJib3hbMV0gPSBjb29yZFsxXTtcbiAgICAgICAgaWYgKGJib3hbMl0gPCBjb29yZFswXSkgYmJveFsyXSA9IGNvb3JkWzBdO1xuICAgICAgICBpZiAoYmJveFszXSA8IGNvb3JkWzFdKSBiYm94WzNdID0gY29vcmRbMV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGJib3g7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9ub2RlX21vZHVsZXMvQHR1cmYvYmJveC9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gNVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9