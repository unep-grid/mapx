var mx = {};
mx.util = {};
mx.listener = {};
mx.language = "en";
mx.templates = {};



/** 
 * Date utils
 * Experimental date support for most common cases:
 * if number, return a formated date, if it's a string, return a number
 * @param {string|number} val input value
 * @return {date}
 */
mx.util.date = function(val){

  var d =  new Date(val);
  var out = val;

  if( val.constructor == Number ){
    out = d.toLocaleDateString();
  }else{
    out = d.getTime();
  }

  return out;

};


/**
 * Round at given decimal
 * @param n Number to round
 * @param d Exponent. By default = 3
 */
mx.util.round = function(n,d){
  d=d?d:6;
  var e = Math.pow(10,d);
  return Math.round(n*e)/e ;
};

/**
 * Replace unicode char by string
 * @param {sring} txt String to convert
 * @note come from http://stackoverflow.com/questions/17267329/converting-unicode-character-to-string-format
 */
mx.util.unicodeToChar = function(text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function(match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
};

/** 
 * Set template : compile and store result
 *  @param {object} o Options
 * @param {string} o.id Name of the function
 * @param {string} o.template html string for legend
 */
mx.util.setTemplates = function(o) {
  console.log("Generate templates");
  for( var id in o ){
    template = mx.util.unicodeToChar(o[id]);
    mx.templates[id] = doT.template(template);
  }
};

/**
 *  * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If 
 * @note https://davidwalsh.name/javascript-debounce-function
 * @param func {function} function to evaluate
 * @param wait {integer} number of millisecond to wait
 * @param immedate {boolean} immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
mx.util.debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Convert input to string
 * @param {Object} i Input object
 */
mx.util.toString =  function(i){
  return JSON.stringify(i);
};



/**
 * Get uniques meta word from view.
 */
mx.util.getDistinctIndexWords =  function(view){
  if(!view) return;
  /*
   * index = abstract + date + target 
   */
  var str = 
    view.date_modified + " " +
    mx.util.toString( view.target ) + " " +
    mx.util.toString( view.data.abstract ) ;

  str = str.replace(/[^0-9a-zA-Z]+/g,";").split(";") ;
  str = mx.util.getArrayStat({arr:str,stat:"distinct"});
  return str.join(" ") ;
};




/**
 * Send Ajax
 * @note https://codepen.io/malyw/pen/vExwoK
 * @param {Object} o options
 * @param {String} o.type set/get
 * @param {String} o.url url to use
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 * @param {Function} o.beforeSend Function to call before sending ajax
 * @param {Boolean} o.useCache Use browser cache. Default is true, except for localhost
 * @param {integer} o.maxWait Maximum wainting time. Default = 5000 ms
 */
mx.util.sendAjax = function(o) {
  var xhr = new XMLHttpRequest();
  o.type = o.type ? o.type : "get";
  o.maxWait = o.maxWait ? o.maxWait : 5000; // in ms
  o.useCache = o.useCache === undefined ? window.location.hostname !== "localhost" : o.useCache;
  o.url = o.useCache ? o.url + '?' + new Date().getTime() : o.url;
  o.onError = o.onError ? o.onError : console.log;
  o.onSuccess = o.onSuccess ? o.onSuccess : console.log;
  o.onComplete = o.onComplete ? o.onComplete : function() {};
  o.beforeSend = o.beforeSend ? o.beforeSend : function() {};
  o.timer = setTimeout(function() { // if xhr won't finish after timeout-> trigger fail
    xhr.abort();
    o.onError();
    o.onComplete();
  }, o.maxWait);
  xhr.open(o.type, o.url);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      clearTimeout(o.timer);
      if (xhr.status === 200 || xhr.status === 0) {
        o.onSuccess(xhr.responseText);
        o.onComplete();
      } else {
        o.onError(xhr.responseText);
        o.onComplete();
      }
    }
  };
  o.beforeSend(xhr);
  xhr.send();
};


/**
 * Get JSON
 * @param {Object} o options
 * @param {String} o.url url pointing to the json
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 * @param {Boolean} o.useCache Use browser cache, default true, except for localhost
 */
mx.util.getJSON = function(o) {
  this.sendAjax({
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
    },
    onSuccess: function(res) {
      if(res){
        o.onSuccess(JSON.parse(res));
      }
    },
    onError: o.onError,
    onComplete: o.onCcomplete,
    useCache: o.useCache
  });
};


/* Get stat of an array
 * @param {object} o options
 * @param {array} o.arr Numeric array
 * @param {string} o.stat Stat string : min, max, mean, median, distinct. Default = max;
 */
mx.util.getArrayStat = function(o){

  o.arr = o.arr.constructor == Array ? o.arr : [];
  o.stat =  o.stat ? o.stat : "max";

  opt = {
    "min" : function(a){ 
      return Math.min.apply(null, a);
    },
    "max" : function(a){ 
      return Math.max.apply(null, a);
    },
    "mean":function(a){
      var sum = a.reduce(function(a, b){ return b += a ; });
      return sum / a.length;
    },
    "median":function(a){
      a.sort(function(a, b){ return a - b ; });
      return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2;
    },
    "distinct":function(a){
      var obj = {};
      var res = [];
      var it;
      var isNum = typeof a[0] == "number";
      if(a.length>0){
        a.forEach(function(x){
          obj[x]=x;
        });

        for( it in obj ){
          if(isNum) it = it * 1;
          res.push(it);
        }
      }
      return res;
    }
  };

  return(opt[o.stat](o.arr));

};


/**
 * Generate a random hsla color string, with fixed saturation and lightness
 * @param {number} opacity opacity from 0 to 1
 * @param {number} random value from 0 to 1
 * @param {number} saturation from 0 to 100
 * @param {number} lightness from 0 to 100
 */
mx.util.randomHsl = function(opacity, random, saturation, lightness) {
  if (!opacity) opacity = 1;
  if (!saturation) saturation = 100;
  if (!lightness) lightness = 50;
  if (!random) random = Math.random();
  res = "hsla(" + (random * 360) +
    ", " + saturation + "% " +
    ", " + lightness + "% " +
    ", " + opacity + ")";
  return res;
};


/**
 * Create random asci strint of given length
 * @param {integer} length of the string
 */
mx.util.makeId = function(n) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  n = n * 1 > 0 ? n * 1 : 5;

  for (var i = 0; i < n; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};


/** Create a worker
 * @param fun {function} function to evalute by the worker
 */
mx.util.createWorker = function(fun) {
  // convert input function to string
  fun = fun.toString();
  fun = fun
    .substring(
      fun.indexOf("{") + 1,
      fun.lastIndexOf("}")
    );
  // Make a blob
  var blob = new Blob(
    [fun], {
      type: "application/javascript"
    }
  );
  // convert as url for new worker
  var blobUrl = URL.createObjectURL(blob);

  // return new worker
  return (new Worker(blobUrl));
};

/** Toggle button disabled state and warning or danger bootstrap classes
 * @param {Object} r options
 * @param {String} r.id Id of the button to toggle
 * @param {boolean} r.warning Use warning state instead of danger
 */
mx.util.buttonToggle = function(r) {
  if (r.disable === true) {
    $("#" + r.id)
      .addClass("btn-danger")
      .removeClass("btn-default")
      .removeClass("btn-warning")
      .attr("disabled", true);
  } else if (r.warming === true) {
    $("#" + r.id)
      .addClass("btn-warning")
      .removeClass("btn-default")
      .removeClass("btn-danger")
      .attr("disabled", false);
  } else {
    $("#" + r.id)
      .addClass("btn-default")
      .removeClass("btn-danger")
      .removeClass("btn-warning")
      .attr("disabled", false);
  }
};
/**
 * Update element content
 * @param {object} o Object 
 * @param {string} o.id Id of the element
 * @param {string} o.txt Replacement text
 */
mx.util.updateText = function(o) {
  el = document.getElementById(o.id);
  if (el) {
    str = o.txt.toString();
    el.innerHTML = mx.util.b64_to_utf8(str);
  }
};

/** 
 * convert b64 to utf8
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
mx.util.b64_to_utf8 = function(str) {
  str = str.replace(/\s/g, '');
  return decodeURIComponent(escape(window.atob(str)));
};

/** 
 * convert utf8 to b64
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
mx.util.utf8_to_b64 = function(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
};



/**
 * Split a string in n parts
 * @param {string} String to split
 * @param {number} Length of the chunk
 * @note taken from http://stackoverflow.com/questions/7033639/split-large-string-in-n-size-chunks-in-javascript
 */
mx.util.chunkString = function(str, size) {
  var numChunks = Math.ceil(str.length / size),
    chunks = new Array(numChunks);

  for(var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
};

/**
 * Test if undefined
 * @param {Object|Function}
 */
mx.util.exists = function(x){
  return typeof(x) == "undefined";
};


/** Translate text in element based on "[data-lang_key]" id and a json key-value pair dictionnary
 * @param {Object} m 
 * @param {Object} m.dict dictionary
 * @param {element} m.el Target element. If omitted, the whole document will be translated.
 * @example
 * mx.util.setLanguage({dict:[{id:"hello","fr":"Bonjour",en:"Hello"}]})
 */
mx.util.setLanguage = function(m) {

  if(!m) m = {};

  if (m.dict) {
    window.dict = m.dict;
  } else {
    m.dict = window.dict;
  }

  if (!m.dict) return;

  var i, els, el, id, doc, label, found, setLabel = {};
  langDefault = m.default ? m.default : "en";
  lang = m.lang ? m.lang : mx.language ? mx.language : langDefault;

  // set value selector

  setValue = {
    "tooltip": function(el) {
      el.setAttribute("aria-label", label);
      if (el.className.indexOf("hint--") == -1) {
        el.className += " hint--left";
      }
    },
    "placeholder": function(el) {
      el.setAttribute("placeholder", label);
    },
    "text": function(el) {
      el.innerHTML = label;
    }
  };

  // fetch all elements with data-lang_key attr 
  doc = m.el ? m.el : document;

  els = doc.querySelectorAll("[data-lang_key]");
  for (i = 0; i < els.length; i++) {
    el = els[i];

    if (mx.util.isElement(el)) {

      id = el.dataset.lang_key;
      type = el.dataset.lang_type;
      if (!type) type = "text";
      isPlaceholder = !!el.dataset.lang_key_placeholder;
      found = false;
      for (j = 0; j < m.dict.length; j++) {
        if (!found) {
          if (m.dict[j].id == id) {
            found = true;
            label = m.dict[j][lang];
            if (!label) {
              // if label no in dict, take the default
              label = m.dict[j][langDefault];
              if (!label) {
                // if no label in default language, use id.
                label = id;
              }
            }
          }
        }
      }

      setValue[type](el);
    }

  }
};


/**
 * Get value from the dictionary for a given key and language. Fallback to "def"
 * @param {string} key Key to look for in the dictionnary
 * @param {string} lang  Two letters language code
 * @param {string} def Two lettters language code. Fallback to "en"
 */
mx.util.getLanguage = function(key, lang, def) {

  var v, keys = [];
  var dict = window.dict;
  if (!dict) return;
  if (!def) def = "en";
  if (!lang) lang = def;

  keys = key.constructor = Array ? key : keys.push(key);

  res = [];

  for (var k = 0; k < keys.length; k++) {
    key = keys[k];
    for (var i = 0; i < dict.length; i++) {
      if (dict[i].id === key) {
        v = dict[i][lang];
        if (!v) v = dict[i][def];
        res.push(v);
      }
    }
  }

  return (res);
};

/**
* Get language value from an object path.
* @param {Object} o Options
* @param {string} o.lang Selected language two letter code. Default = mx.language
* @param {Array} o.langs Array of other language code. Default = mx.languages
* @param {string} o.defaultKey Default key if no other value found. Default = "noData"
* @param {Object} o.obj Object containing the value
* @param {String} o.path Path to the value container. Eg. "data.title"
*/
mx.util.getLanguageFromObjectPath = function(o){
  o.lang = o.lang ? o.lang : mx.language;
  o.langs = o.langs ? o.langs : mx.util.objectToArray(mx.languages);
  o.defaultKey = o.defaultKey ? o.defaultKey : "noData";
  var out = path( o.obj, o.path + "." + o.lang );
  if( !out ){
    for( var i = 0; i < o.langs.length ; i++ ){
      if( ! out ){
        out  = path( o.obj, o.path + "." + o.langs[i] );
      }
    }
    if( ! out ) out = mx.util.getLanguage([ o.defaultKey ],o.lang);
  }
  return(out);
};


/**
* Check language code for the view item and control fallback
* @param {object} o options
* @param {object} o.obj object to check
* @param {string} o.path path to the string to check
* @param {string} o.language language code expected
* @param {array} o.languages code for fallback
* @example
*     mx.util.checkLanguage({
*         obj : it,
*         path : "data.title", 
*         language : "fr",
*         languages :  ["en","de","ru"]
*     })
*/
mx.util.checkLanguage = function(o){
  
  var langs = o.languages ? o.languages: mx.util.objectToArray(mx.languages);
  var lang = o.language ? o.language: mx.language ? mx.language: langs[0];
  var out = lang;
  var found = false;

  function test(){
    found = !!path( o.obj, o.path + "." + lang ) ;
  }

  test();

  if( !found ){
    for( var l in langs ){
        lang = langs[l];
        test();
        if(found) return lang ;
    }
  }

  return out;

};



/** Convert json string to object with given name on window
 * @param {Object} m Options
 * @param {String} m.json to parse
 * @param {String} m.name to name new object
 */
mx.util.jsonToObj = function(m) {
  window[m.name] = JSON.parse(m.json);
};

/** Used for shiny to print a message in js console. Usefull when the R console is not visible
 * @param{Object} m Options
 * @param {String} m.msg Message to print
 */

mx.util.jsDebugMsg = function(m) {
  console.log(m.msg);
};


/** Add or remove a class depending on enable option. The element has a class, ex. "hidden" and this will remove the class if m.enable is true.
 * @param {Object} m Options
 * @param {String} m.element Element id
 * @param {String} m.hideClass Class to remove if enabled is true
 * @param {Boolean} m.hide Hide add hideClass to given element
 * @param {Boolean} m.disable Add disabled attr to element
 */
mx.util.hide = function(m) {
  var element, prefix;

  if (!m || !(m.class || m.id)) return;
  if (!m.hideClass) m.hideClass = "mx-hide";
  if (m.hide === undefined) m.hide = true;
  if (m.hide === undefined) m.disable = true;

  prefix = (m.id === undefined) ? "." : "#";


  if (m.id) {
    element = prefix + m.id;
  } else {
    element = prefix + m.class;
  }

  var $el = $(element);

  if ($el.length > 0) {
    if (m.hide) {
      $el.addClass(m.hideClass);
    } else {
      $el.removeClass(m.hideClass);
    }
    if (m.disable) {
      $el.attr("disabled", true);
    } else {
      $el.attr("disabled", false);
    }
  }
  /* else{*/
  //return;
  //console.log("mx.util.hide: element " + element + " not found.");
  /*}*/
};


/** Simple tab system using classes
 * @param {string} classGroup Class of tab group 
 * @param {string} classItem Class of tab item to show
 * @param {string} classHide Class to apply for hiding
 */
mx.util.tabEnable = function(classGroup, classItem, classHide) {
  g = document.querySelectorAll("." + classGroup);
  if (!classHide) classHide = "mx-hide";
  if (g.length > 0) {
    for (i = 0; i < g.length; i++) {
      c = g[i].className.split(" ");
      posItem = c.indexOf(classItem);
      posHide = c.indexOf(classHide);
      if (posItem > 0) {
        if (posHide > 0) {
          c.splice(posHide, 1);
        } else {
          c.push(classHide);
        }
      } else {
        if (posHide == -1) c.push(classHide);
      }
      g[i].className = c.join(" ");
    }
  }
};




/**
 * Check if an object is a html element
 * @param obj Object to test
 */
mx.util.isElement = function(obj) {
  return obj instanceof Node;
};


/**
 * Class handling : add, remove and toggle
 * @param o {object} options
 * @param o.selector {string|element} selector of element to handle or element eg. #test, .test
 * @param o.class {string} class name to process. By default, "mx-hide"
 * @param o.action {string} action to use : add, remove or toggle
 */
mx.util.classAction = function(o) {
  var el, idx, oldCl, hasClass;

  if (!o.class) o.class = "mx-hide";

  if (mx.util.isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }

  if (el && o.action) {
    oldCl = el.className.split(" ");
    idx = oldCl.indexOf(o.class);
    hasClass = idx > -1;

    if (hasClass && (o.action == "remove" || o.action == "toggle")) {
      oldCl.splice(idx, 1);
    }

    if (!hasClass && (o.action == "add" || o.action == "toggle")) {
      oldCl.push(o.class);
    }

    el.className = oldCl.join(" ");

  }
};


/**
 * Enable drag listener on id
 * @param {object} o Options
 * @param {string} o.id Div id to move
 * @param {array} o.enableClass class to use as draggable area
 * @param {array} o.disableClass Array of class on with drag is not listen
 */
mx.util.draggable = function(o) {
  var el = document.getElementById(o.id);
  var x, y, x_to, y_to, isDragArea;

  if (!o.enableClass) o.enableClass = "mx-modal-drag-enable";

  mx.listener[o.id] = {};

  /**
   * mouse down + move : chage element coordinate
   */
  mx.listener[o.id].mousemove = mx.util.debounce(function(event) {
    event.preventDefault();
    el.style.margin = "initial";
    el.style.left = x + event.clientX - x_to + 'px';
    el.style.top = y + event.clientY - y_to + 'px';
  });

  /*
   * mouse up :  remove "up" and "move" listener
   */
  mx.listener[o.id].mouseup = function(event) {
    event.preventDefault();
    window.removeEventListener('mousemove', mx.listener[o.id].mousemove, false);
    window.removeEventListener('mouseup', mx.listener[o.id].mouseup, false);
  };

  /**
   * mouse down : if it's draggable
   */
  mx.listener[o.id].mousedown = function(event) {

    isDragArea = event.target.className.indexOf(o.enableClass) > -1;

    if (isDragArea) {

      event.preventDefault();

      x = el.offsetLeft;
      y = el.offsetTop;
      x_to = event.clientX;
      y_to = event.clientY;

      window.addEventListener('mousemove', mx.listener[o.id].mousemove, false);
      window.addEventListener('mouseup', mx.listener[o.id].mouseup, false);

    }
  };

  el.addEventListener('mousedown', mx.listener[o.id].mousedown, false);

};

/**
 * Apply function on HTMLCollection
 * @param {Object} o options
 * @param {Object} o.els HTMLCollection egl div.children
 * @param {Function} o.callback Function to apply. Argument = element
 *
 */
mx.util.forEachEl = function(o){
 Array.prototype.forEach.call( o.els, o.callback );
};

/**
* Get an object content an push it in an array
* @param {object} obj Object to convert
* @return {array}
*/
mx.util.objectToArray = function( obj ){
  return Object.keys(obj).map(function (key) { return obj[key]; });
};


/**
 * Parent finder
 * @param {Object} o options;
 * @param {Element|string} o.selector Element or selector string;
 * @param {String} o.class Class of the parent 
 */
mx.util.parentFinder = function(o) {
  var el;
  if (o.selector instanceof Node) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }

  while ((el = el.parentElement) && !el.classList.contains(o.class));
  return el;
};

/**
 * Handle sort event on list
 * 
 * Class for ul : sort-li-container
 * Class for li : sort-li-item
 * Class for handle : sort-li-handle (should be at first level in li);
 *
 * @param {Object} o options
 * @param {Element|String} o.selector Selector string or element for the ul root
 * @param {Function} o.callback Function to call after sort
 */
mx.util.sortable = function(o){
  if (o.selector instanceof Node) {
    ulRoot = o.selector;
  } else {
    ulRoot = document.querySelector(o.selector);
  }
  var body = document.querySelector("body");
  var liHandle,
    liFrom,
    liTo,
    liNext,
    liSet,
    liGhost,
    classFrom = "mx-sort-li-item",
    classHandle = "mx-sort-li-handle";

  function setPos(el, l, t) {
    l = l + "px";
    t = t + "px";
    el.style.left = l;
    el.style.top = t;
  }


  function areTouching(a, b) {
    var rectA = a.getBoundingClientRect();
    var rectB = b.getBoundingClientRect();
    var overlaps =
      rectA.top < rectB.bottom &&
      rectA.bottom > rectB.top &&
      rectA.right > rectB.left &&
      rectA.left < rectB.right;
    return overlaps;
  }


  function isValidHandle(el) {
    return el.classList.contains(classHandle);
  }
  function isValidLi(el) {
    return el.classList.contains(classFrom);
  }
  /**
   * mouse move
   */
  function onMouseMove(e) {

    liTo = e.target;
    setPos(liGhost, e.clientX, e.clientY);

    if (isValidLi(liTo)) {
      e.preventDefault();
      var rect = liTo.getBoundingClientRect();
      liNext = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      liSet = liNext && liTo.nextSibling || liTo;
      ulRoot.insertBefore(liFrom, liSet);
    }

    if (!areTouching(liGhost, body)) {
      onMouseUp(e);
    }

  }

  /*
   * mouse up 
   */
  function onMouseUp(e) {
    e.preventDefault();
    liFrom.classList.remove("mx-sort-li-dim");
    liGhost.remove();
    o.callback();
    window.removeEventListener('mousemove', onMouseMove, false);
    window.removeEventListener('mouseup', onMouseUp, false);
  }

  /**
   * mouse down
   */
  function onMouseDown(e) {
    elHandle = e.target;
    liFrom = mx.util.parentFinder({
      selector : elHandle,
      class : classFrom
    });

    if (isValidHandle(elHandle) && liFrom) {
      e.preventDefault();
      liGhost = liFrom.cloneNode(true);
      liFromStyle = liGhost.style;
      liFromRect = liFrom.getBoundingClientRect();
      liGhost.classList.add("mx-sort-li-ghost");
      liFrom.classList.add("mx-sort-li-dim");
      ulRoot.appendChild(liGhost);
      onMouseMove(e);
      window.addEventListener('mousemove', onMouseMove, false);
      window.addEventListener('mouseup', onMouseUp, false);
    }

  }

  ulRoot.addEventListener('mousedown', onMouseDown, false);



};


/**
 * Sortable list
 * Modified from http://jsfiddle.net/RubaXa/zLq5J/6/
 * @param {Object} o options
 * @param {Element} o.elRoot Element to listen too
 * @param {Function} o.onUpdate Function to call after updating
 */
mx.util.sortable_old = function(o){

  var body, dragEl, nextEl, handleEl, ghostEl, emptyEl;

  rootEl =  o.elRoot;
  onUpdate =  o.onUpdate ? o.onUpdate : console.log;

  body = document.getElementsByTagName("body")[0];

  mx.util.forEachEl({
    els : rootEl.children,
    callback : function(el){
      el.draggable = true;
    }
  });

  function onDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'move';
    var target = evt.target;
    if (target && target !== dragEl && target.nodeName == 'LI') {
      var rect = target.getBoundingClientRect();
      var next = (evt.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      rootEl.insertBefore(dragEl, next && target.nextSibling || target);
      mx.util.classAction({
        selector : dragEl,
        class : "mx-dragged-ghost",
        action : "add"
      });
    }
  }

  function onDragEnd(evt) {
    evt.preventDefault();
    mx.util.classAction({
      selector : dragEl,
      class : "mx-dragged-ghost",
      action : "remove"
    });
    rootEl.removeEventListener('dragover', onDragOver, false);
    rootEl.removeEventListener('dragend', onDragEnd, false);
    ghostEl.remove();
    if (nextEl !== dragEl.nextSibling) {
      onUpdate(dragEl);
    }
  }


  onDragStart =  function(evt) {
    isGrip = handleEl.className.indexOf("mx-grip") > -1 ;
    if(!isGrip){
      evt.preventDefault();
    }else{
      dragEl = evt.target;
      nextEl = dragEl.nextSibling;

      ghostEl = document.createElement("span");
      ghostEl.innerHTML="";
      body.appendChild(ghostEl);

      evt.dataTransfer.setDragImage(ghostEl, 0, 0);

      setTimeout(function(){
        ghostEl.style.display = "none";
      },0);

      evt.dataTransfer.setData("text/plain", dragEl.id);

      rootEl.addEventListener('dragover', onDragOver, false);
      rootEl.addEventListener('dragend', onDragEnd, false);
    }
  };

  rootEl.addEventListener("mousedown",function(e){
    handleEl = e.target;
  },false);

  rootEl.addEventListener('dragstart',onDragStart, false);

  return onDragStart ;
};


/**
 * Set element attributes
 * @param {object} o options
 * @param {string} o.selector element selector
 * @param {string} o.atr attribute name
 * @param {string} o.val value
 */
mx.util.setElementAttribute = function(o) {
  var el = document.getElementById(o.selector);
  if (el) {
    el.setAttribute(o.atr, o.val);
  }
};

/**
 * Set image attr
 * @param {object} o options
 * @param {string} o.id image id
 * @param {object} o.atr images attributes
 */
mx.util.setImageAttributes = function(o) {
  var img = document.getElementById(o.id);

  if (img) {
    for (var a in o.atr) {
      img.setAttribute(a, o.atr[a]);
    }
  }
};


/**
 * Create and manage multiple progression bar
 * @param {Object} o Options
 * @param {boolean} o.enable Enable the screen 
 * @param {string} o.id Identifier of the given item
 * @param {number} o.percent Progress bar percentage
 * @param {string} o.text Optional text
 */
mx.util.progressScreen =  function(o) {

  id = o.id;
  enable = o.enable !== undefined ? o.enable : false;
  percent = o.percent !== undefined ? o.percent : 0;
  text = o.text !== undefined ? o.text : "";

  lScreen = document.querySelector(".loading-screen");

  if (!enable) {
    if (lScreen) lScreen.remove();
    return;
  }

  if (!id || !percent || !text) return;

  if (!lScreen && enable) {
    lBody = document.querySelector("body");
    lScreen = document.createElement("div");
    lScreen.className = "loading-screen";
    lScreenContainer = document.createElement("div");
    lScreenContainer.className = "loading-container";
    lScreen.appendChild(lScreenContainer);
    lBody.appendChild(lScreen);
  }

  lItem = document.getElementById(id);

  if (!lItem) {
    lItem = document.createElement("div");
    lItem.className = "loading-item";
    lItem.setAttribute("id", id);
    pBarIn = document.createElement("div");
    pBarIn.className = "loading-bar-in";
    pBarOut = document.createElement("div");
    pBarOut.className = "loading-bar-out";
    pBarTxt = document.createElement("div");
    pBarTxt.className = "loading-bar-txt";
    pBarOut.appendChild(pBarIn);
    lItem.appendChild(pBarTxt);
    lItem.appendChild(pBarOut);
    lScreenContainer.appendChild(lItem);
  } else {
    pBarIn = lItem.getElementsByClassName("loading-bar-in")[0];
    pBarTxt = lItem.getElementsByClassName("loading-bar-txt")[0];
  }

  if (percent >= 100) {
    lItem = document.getElementById(id);
    if (lItem) lItem.remove();
  } else {
    pBarIn.style.width = percent + "%";
    pBarTxt.innerHTML = text;
  }

  lItems = lScreenContainer.getElementsByClassName("loading-item");

  if (lItems.length === 0) mx.util.progressScreen({enable:false});

};


/**
 * htmlToData 
 * @param {Object} o Options
 * @param {String|Element} o.selector Selector
 * @param {Number} o.scale Scale factor for output sizing
 * @param {Function} o.callback Callback function with one param : canvas
 */
mx.util.htmlToData =  function(o) {
  var el, elClone, elRect, tagToRemove;

  var out = {
    svg : "",
    png : "",
    canvas : ""
  };

  if (o.selector instanceof Node) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }
  if(!o.scale) o.scale=1;
  /**
   * Clone element and clean it. 
   * Some elements like input seems to break the SVG. Not Sure why.
   * Remove them is the way. Replace them by another tag does not work.
   */
  elClone = el.cloneNode(true);
  tagToRemove = ["input"];
  for(var i = 0 ; i < tagToRemove.length ; i++){
    elClone
      .querySelectorAll(tagToRemove[i])
      .forEach(function(x){
        x.remove();
      });
  }

  elClone.style.margin = 0;
  elClone.style.padding = 0;
  el.parentElement.appendChild(elClone);
  elCloneRect = elClone.getBoundingClientRect();
  /**
   * SVG create
   */

  var data =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + elCloneRect.width*o.scale + "' height='" +elCloneRect.height*o.scale + "'>" +
    "<defs>" +
    "<style type='text/css'>" +
    readStyles([elClone]) +
    "</style>" +
    "</defs>" +
    "<foreignObject width='100%' height='100%'>" +
    "<div xmlns='http://www.w3.org/1999/xhtml'>" +
    elClone.outerHTML +
    "</div>" +
    "</foreignObject>" +
    "</svg>";

  elClone.remove();
  url = buildSvgImageUrl(data);
  setImage(url, o.callback);

  /**
   * functions
   */

  function buildSvgImageUrl(svg) {
    b64 = mx.util.utf8_to_b64(svg);
    return "data:image/svg+xml;base64," + b64;
  }

  /**
   * Css steal : krasimir/css-steal
   */ 

  // elements to array
  function toArray(obj, ignoreFalsy) {
    var arr = [], i;
    for (i = 0; i < obj.length; i++) {
      if (!ignoreFalsy || obj[i]) {
        arr[i] = obj[i];
      }
    }
    return arr;
  }

  // looping through the styles and matching
  function getRules(el) {
    var sheets = document.styleSheets, result = [];
    el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector;
    for (var i in sheets) {
      var rules = sheets[i].rules || sheets[i].cssRules;
      for (var r in rules) {
        if (el.matches(rules[r].selectorText)) {
          result.push(rules[r].cssText);
        }
      }
    }
    return mx.util.getArrayStat({arr:result,stat:"distinct"}).join(" ");
  }

  // looping through the element's children
  function  readStyles(els) {
    var res = els.reduce(function (styles, el) {
      styles.push(getRules(el));
      styles = styles.concat(readStyles(toArray(el.children)));
      return styles;  
    }, []);

    return mx.util.getArrayStat({arr:res,stat:"distinct"}).join(" ");
  }

  function setImage(url, callback) {
    var image = new Image();

    image.onload = function() {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext("2d");
      canvas.width = elCloneRect.width * o.scale;
      canvas.height = elCloneRect.height * o.scale;
      ctx.scale(o.scale, o.scale);
      ctx.drawImage(this, 0, 0);
      out = {
        png :  canvas.toDataURL(),
        svg : url,
        canvas : canvas
      };
      callback(out);
    };

    image.src = url;
  }

};






/* mx can be called from a place where Shiny does not exists.*/
if( typeof(Shiny) != "undefined" ){
  /** 
   * Add Shiny bling bling binding dinging dong
   */
  Shiny.addCustomMessageHandler('mxSetTemplates', mx.util.setTemplates);
  Shiny.addCustomMessageHandler('mxDebugMsg', function(x){console.log(x);});
  Shiny.addCustomMessageHandler('mxSetElementAttribute', mx.util.setElementAttribute);
  Shiny.addCustomMessageHandler("mxSetImageAttributes", mx.util.setImageAttributes);
  Shiny.addCustomMessageHandler("mxUiHide", mx.util.hide);
  Shiny.addCustomMessageHandler("mxUpdateText", mx.util.updateText);
  Shiny.addCustomMessageHandler("mxJsDebugMsg", mx.util.jsDebugMsg);
  Shiny.addCustomMessageHandler("mxButtonToggle", mx.util.buttonToggle);
  Shiny.addCustomMessageHandler("mxSetLanguage", mx.util.setLanguage);
  Shiny.addCustomMessageHandler("mxJsonToObj", mx.util.jsonToObj);
  Shiny.addCustomMessageHandler("mxProgress",mx.util.progressScreen);
}


