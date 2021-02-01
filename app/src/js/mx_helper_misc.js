import {IconFlash} from './icon_flash';

/**
 * Retrieve nested item from object/array
 * @param {Object|Array} obj
 * @param {String|Array} path dot separated or array of string
 * @param {*} def default value ( if result undefined )
 * @note http://jsfiddle.net/Jw8XB/1/
 * @returns {*}
 */
export function path(obj, path, def) {
  const h = mx.helpers;
  const hasDefault = !!def;
  let i, iL;

  if (!hasDefault) {
    def = null;
  }
  if (!h.isString(path) && !h.isArrayOfString(path)) {
    return out(def);
  }
  if (h.isString(path)) {
    path = path.split('.');
  }
  for (i = 0, iL = path.length; i < iL; i++) {
    if (!obj || !h.isObject(obj)) {
      return out(def);
    }
    obj = obj[path[i]];
  }

  if (typeof obj === 'undefined' || obj === null) {
    return out(def);
  }

  return out(obj);

  function out(obj) {
    if (hasDefault) {
      if (!obj || obj.constructor !== def.constructor) {
        obj = def.constructor(obj);
      }
    }
    return obj;
  }
}

/**
 * Set click handler mode
 * @param {Object} opt options
 * @param {String} opt.type  Type of handler : dashboard, draw, ...
 * @param {Boolean} opt.enable Enable this handler
 * @return {Array} handlers id
 */
export function setClickHandler(opt) {
  var type = opt.type;
  var enable = opt.enable;
  var toggle = opt.toggle;
  var handlers = getClickHandlers();
  var posClickHandler = handlers.indexOf(type);
  var hasClickHandler = posClickHandler > -1;

  if (toggle) {
    enable = !hasClickHandler;
  }

  if (!type || typeof enable === 'undefined') {
    return;
  }

  if (enable && !hasClickHandler) {
    mx.settings.clickHandlers.push(type);
  }
  if (!enable && hasClickHandler) {
    mx.settings.clickHandlers.splice(posClickHandler, 1);
  }
  return mx.settings.clickHandlers;
}

export function getClickHandlers() {
  return mx.settings.clickHandlers;
}

/**
 * All member should be true, return boolean
 *
 * @param {Array} a input array
 * @example all([null,0,"a",true]) === false
 * @example all(["",1,"a",true]) === true
 * @return {Boolean}
 */
export function all(a) {
  var r = false;
  var l;
  a.forEach(function(o, i) {
    l = Boolean(o);
    r = i === 0 ? l : r && l;
  });
  return r;
}

/**
 * At least member should be true
 * @param {Array} a input array
 * @example any([null,0,"a",true]) === true
 * @example any([null]) === false
 * @return {Boolean}
 */
export function any(a) {
  var r = false;
  var l;
  a.forEach(function(o, i) {
    l = Boolean(o);
    r = i === 0 ? l : r || l;
  });
  return r;
}

/**
 * A is greater than b
 * @param {Number} a A
 * @param {Number} b b
 */
export function greaterThan(a, b) {
  return a > b;
}

/**
 * Check if array a has index named b
 * @param {Array} a Array to test
 * @param {String} b Name to test
 * @example hasIndex([null,0,"a",true],"a") === true
 * @return {Boolean}
 */
export function hasIndex(a, b) {
  return a instanceof Array ? a.indexOf(b) > -1 : false;
}

/**
 * Return the first not empty member
 * @param {Array} a Input array
 * @example firstOf([,"",0,"a"]) === 0
 */
export function firstOf(a) {
  for (var i = 0, iL = a.length; i < iL; i++) {
    if (a[i] === 0 || a[i]) {
      return a[i];
    }
  }
}

/**
 * Simple templating system
 * @param {String} template e.g. "Loading view {{vn}} in {{vl}} "
 * @param {Object} data to update the template with. e.g. {vn:8,vl:10}
 * @param {String} parsed string
 */
export function parseTemplate(template, data) {
  return template.replace(/{{([^{}]+)}}/g, function(matched, key) {
    return data[key];
  });
}

/**
 * Flash an icon
 * @param {String} icon fontawesome name
 */
export function iconFlash(icon) {
  new IconFlash(icon);
}

export function iconFlashSave() {
  new IconFlash('floppy-o');
}

/**
 * Fill with zeros
 * @param {Number} n Number
 * @param {Number} p Number of digit
 * @param {String} c Value instead of zeros
 * @note https://stackoverflow.com/questions/1267283/how-can-i-pad-a-value-with-leading-zeros
 */
export function paddy(n, p, c) {
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

/**
 * Get the correct css transform function
 */
export function cssTransformFun() {
  return (function() {
    /* Create dummy div to explore style */
    if (typeof document === 'undefined') {
      return;
    }

    var style = document.createElement('div').style;

    if (undefined !== style.WebkitTransform) {
      return 'WebkitTransform';
    } else if (undefined !== style.MozTransform) {
      return 'MozTransform ';
    } else if (undefined !== style.OTransform) {
      return 'OTransform';
    } else if (undefined !== style.msTransform) {
      return 'msTransform ';
    } else if (undefined !== style.WebkitTransform) {
      return 'WebkitTransform';
    } else {
      return 'transform';
    }
  })();
}
export var cssTransform = cssTransformFun();

export function uiToggleBtn(o) {
  const h = mx.helpers;
  o.label =
    h.isString(o.label) || h.isElement(o.label)
      ? o.label
      : JSON.stringify(o.label);
  var noLabel = h.isEmpty(o.label);
  var label = noLabel ? '' : o.label;
  var onChange = o.onChange || function() {};
  var data = o.data || {};
  var checked = o.checked || false;
  var id = makeId();
  var elInput, elLabel;

  const elContainer = h.el(
    'div',
    {class: 'check-toggle'},
    (elInput = h.el('input', {
      class: 'check-toggle-input',
      id: id,
      type: 'checkbox',
      on: {click: onChange}
    })),
    (elLabel = h.el(
      'label',
      {
        class: `check-toggle-label ${
          o.labelBoxed ? 'check-toggle-label-boxed' : ''
        }`,
        for: id
      },
      label
    ))
  );

  elInput.checked = checked;

  for (var d in data) {
    elInput.dataset[d] = data[d];
  }

  if (noLabel) {
    h.getDictItem('noValue').then((na) => {
      elLabel.innerText = na;
    });
  }

  return elContainer;
}

/**
 * Create a foldable element
 * @param {Object} o options
 * @param {Element} o.content Element to fold
 * @param {String} o type 'caret' or 'checkbox'
 * @param {String} o.label Label displayed in switch
 * @param {String} o.labelKey Label key for dataset.key_lang
 * @param {String} o.labelClass Label class
 * @param {Boolean} o.open Default state
 */
export function uiFold(o) {
  var content = o.content;
  var label = o.label;
  var labelKey = o.labelKey;
  var open = o.open;
  var onChange = o.onChange;
  var classContainer = 'fold-container';
  var classContent = 'fold-content';
  var classScroll = 'mx-scroll-styled';
  var classLabel = 'fold-label';
  var classSwitch = 'fold-switch';
  var classSwitchCaret = 'fold-caret';
  var id = makeId();
  var type = o.type || 'caret';

  if (!content) {
    return;
  }
  open = open || false;
  label = label || '';
  labelKey = labelKey || label;
  var elInput = document.createElement('input');
  if (onChange) {
    elInput.onchange = onChange;
  }
  elInput.setAttribute('type', 'checkbox');
  var elContainer = document.createElement('div');
  var elContent = document.createElement('div');
  var elLabel = document.createElement('label');
  elContainer.classList.add(classContainer);
  elContent.classList.add(classContent);
  elContent.classList.add(classScroll);
  elLabel.classList.add(classLabel);

  if (o.labelClass) {
    elLabel.classList.add(o.labelClass);
  }
  elLabel.setAttribute('for', id);
  elInput.id = id;
  elInput.classList.add(classSwitch);
  if (type === 'caret') {
    elInput.classList.add(classSwitchCaret);
  }
  elInput.checked = open;
  elLabel.innerHTML = label;
  elLabel.dataset.lang_key = labelKey;

  elContent.appendChild(content);
  elContainer.appendChild(elInput);
  elContainer.appendChild(elLabel);
  elContainer.appendChild(elContent);

  return elContainer;
}

/**
 * String containting html to html elements
 * @param {String} text
 * @return {HTML}
 */
export function textToDom(text) {
  var el = document.createElement('div');
  el.innerHTML = text;
  return el.children[0];
}

/**
 * Dom element to text
 * @param {Element} dom Dom element to convert
 * @return {String}
 */
export function domToText(dom) {
  var el = document.createElement('div');
  el.appendChild(dom);
}

/**
 * Performs a deep merge of objects and returns new object. Does not modify
 * objects (immutable) and merges arrays via concatenation.
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 *
 */
export function mergeDeep(target, source) {
  let output = Object.assign({}, target);
  if (mx.helpers.isObject(target) && mx.helpers.isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (mx.helpers.isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, {[key]: source[key]});
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, {[key]: source[key]});
      }
    });
  }
  return output;
}

/**
 * Convert a simple object to an HTML list
 * @param {Object} o Options
 * @param {Object} o.data Object to convert
 * @param {String} o.id of element to fill (optional)
 * @param {String} o.classValue Group item additional class (optional)
 * @return {Element} Html ul element
 */
export function objectToHTML(o) {
  // if data and id : send by mxJsonToHtml, convert.
  var obj = o.data;
  var id = o.id;
  var classValue;
  var classGroup = 'list-group';
  var classGroupItem = 'list-group-item';
  var classGroupItemValue = ['list-group-item-member'];
  var el = mx.helpers.el;

  if (classValue) {
    classGroupItemValue.concat(classValue);
  }

  var html = makeUl(obj);

  if (id) {
    document.getElementById(id).appendChild(html);
  } else {
    return html;
  }

  function makeUl(li) {
    var l,
      elLi,
      k,
      keys = [];

    var ul = el('ul', {
      class: classGroup
    });

    var isObject = mx.helpers.isObject(li);
    var isArray = mx.helpers.isArray(li);

    if (isObject) {
      keys = Object.keys(li);
    }

    if (isArray) {
      for (var i = 0, iL = li.length; i < iL; i++) {
        keys.push(i);
      }
    }

    for (var j = 0, jL = keys.length; j < jL; j++) {
      k = keys[j];
      l = isArray ? k + 1 : k;
      elLi = makeLi(li);
      ul.appendChild(elLi, l);
    }
    return ul;
  }

  function makeLi(it, ti) {
    var li = el('li', {
      class: classGroupItem
    });
    var content = el('div');

    if (it.constructor === Object || it.constructor === Array) {
      content.appendChild(
        uiFold({
          content: makeUl(it),
          label: ti,
          open: false
        })
      );
    } else {
      content.innerHTML =
        '<div>' +
        "<span class='list-group-title'>" +
        ti +
        '</span>' +
        '<span>' +
        it +
        '</span>' +
        '</div>';
    }

    li.appendChild(content);
    return li;
  }
}

/**
 * Date utils
 * Experimental date support for most common cases:
 * if number, return a formated date, if it's a string, return a number
 * @param {string|number} val input value
 * @return {date}
 */
export function date(val) {
  var d = new Date(val);
  var out = val;

  if (val.constructor === Number) {
    out = d.toLocaleDateString();
  } else {
    out = d.getTime();
  }

  return out;
}

/**
 * Get week number
 * @param {Date} date Optional date
 * @return {Number} week number
 */
export function getWeek(date) {
  date = date instanceof Date ? date : new Date();
  const dateFirstDay = new Date(date.getFullYear(), 0, 1);
  const msByDay = 86400000;
  const deltaDay = (date - dateFirstDay) / msByDay;
  const shiftWeek = dateFirstDay.getDay() + 1;
  return Math.ceil((deltaDay + shiftWeek) / 7);
}

/**
 * Round at given decimal
 * @param n Number to round
 * @param d Exponent. By default = 3
 */
export function round(n, d) {
  d = d ? d : 3;
  var e = Math.pow(10, d);
  return Math.round(n * e) / e;
}

export function formatZeros(num, n) {
  if (typeof num !== 'number') {
    return num;
  }
  num = mx.helpers.round(num, n);
  num = num + '' || '0';
  n = n || 3;
  var a = num.split('.');
  var b = a[1];
  if (!b) {
    b = '';
  }
  for (var i = 0; b.length < n; i++) {
    b = b + '0';
  }
  return a[0] + '.' + b;
}

/**
 * Replace unicode char by string
 * @param {sring} txt String to convert
 * @note come from http://stackoverflow.com/questions/17267329/converting-unicode-character-to-string-format
 */
export function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi, function(match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
  });
}

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
export function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 * Convert input to string
 * @param {Object} i Input object
 */
export function toString(i) {
  return JSON.stringify(i);
}

/**
 * Get uniques meta word from view.
 */
export function getDistinctIndexWords(view) {
  if (!view) {
    return;
  }
  /*
   * index = abstract + date + target
   */
  var str =
    view.date_modified +
    ' ' +
    toString(view.target) +
    ' ' +
    toString(view.data.abstract);

  str = str.replace(/[^0-9a-zA-Z]+/g, ';').split(';');

  str = mx.helpers.getArrayStat({arr: str, stat: 'distinct'});
  return str.join(' ');
}

/**
 * Send Ajax
 * @note https://codepen.io/malyw/pen/vExwoK
 * @param {Object} o options
 * @param {String} o.type set/get
 * @param {String} o.url url to use
 * @param {Object} o.data data to send
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 * @param {Function} o.onProgress Function to call on progress
 * @param {Function} o.onMessage Function to call on progress
 * @param {Function} o.onTimeout Function to call on time out (o.maxWait);
 * @param {Function} o.beforeSend Function to call before sending ajax
 * @param {integer} o.maxWait Maximum wainting time. Default = 5000 ms
 */
export function sendAjax(o) {
  o.xhr = new XMLHttpRequest();
  o.type = o.type ? o.type : 'get';
  o.maxWait = o.maxWait ? o.maxWait : 20000; // in ms
  o.onError = o.onError
    ? o.onError
    : function(er) {
        throw new Error(er);
      };
  o.onTimeout = o.onTimeout
    ? o.onTimeout
    : function() {
        throw new Error(
          'Send ajax: max wait reached after ' + o.maxWait + '[ms]'
        );
      };

  o.onSuccess = o.onSuccess || console.log;
  o.onMessage = o.onMessage || function() {};
  o.onComplete = o.onComplete || function() {};
  o.beforeSend = o.beforeSend || function() {};

  /* Set thet timer  */
  o.timer = setTimeout(function() {
    o.xhr.abort();
    o.onTimeout();
    o.onComplete();
  }, o.maxWait);

  /* open get/post/<method> with provided url */
  o.xhr.open(o.type, o.url);

  /* set the on progress function */
  if (o.onProgress) {
    o.xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        o.onProgress(e.loaded / e.total);
      }
    });
  }

  o.xhr.onreadystatechange = function() {
    if (o.xhr.readyState === 3) {
      o.onMessage(o.xhr.responseText);
    }
    if (o.xhr.readyState === 4) {
      clearTimeout(o.timer);
      if (o.xhr.status === 200 || o.xhr.status === 0) {
        o.onSuccess(o.xhr.responseText);
        o.onComplete();
      } else {
        o.onError(o.xhr.responseText);
        o.onComplete();
      }
    }
  };
  o.beforeSend(o.xhr);
  o.xhr.send(o.data);
  return o;
}

/**
 * Get STRING
 * @param {Object} o options
 * @param {String} o.url url pointing to the json
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function getCSV(o) {
  return import('csvjson').then(function(csvjson) {
    sendAjax({
      type: 'get',
      url: o.url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Accept', 'text/csv; charset=utf-8');
      },
      onSuccess: function(res) {
        if (res) {
          var data = csvjson.toObject(res);
          o.onSuccess(data);
        }
      },
      onError: o.onError,
      onComplete: o.onComplete
    });
  });
}

/**
 * POST data
 * @param {Object} o options
 * @param {String} o.url post url
 * @param {Object} o.data e.g. form data
 * @param {Numeric} o.maxWait max wait in [ms]
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function sendData(o) {
  return sendAjax({
    maxWait: o.maxWait || 1e3 * 60 * 60,
    type: 'post',
    url: o.url,
    data: o.data,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
    },
    onSuccess: o.onSuccess || console.log,
    onMessage: o.onMessage || console.log,
    onError: o.onError,
    onComplete: o.onComplete,
    onProgress: o.onProgress
  });
}

/**
 * Get JSON
 * @param {Object} o options
 * @param {String} o.url url pointing to the json
 * @param {Function} o.onSuccess Function to call on success
 * @param {Numeric} o.maxWait max wait in [ms]
 * @param {Function} o.onMessage Function to call on progress
 * @param {Function} o.onError Function to call on error
 */
export function getJSON(o) {
  o.onSuccess = o.onSuccess || function() {};
  o.onError = o.onError || function() {};
  o.onTimeout = o.onTimeout || function() {};
  o.onMessage = o.onMessage || function() {};
  o.onComplete = o.onComplete || function() {};

  sendAjax({
    maxWait: o.maxWait || 1e3 * 60 * 60,
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
      xhr.setRequestHeader('Accept', 'application/json, text/javascript');
    },
    onMessage: function(res) {
      if (res) {
        o.onMessage(res);
      }
    },
    onSuccess: function(res) {
      if (res) {
        o.onSuccess(res);
      }
    },
    onTimeout: function(res) {
      if (res) {
        o.onTimeout(res);
      }
    },
    onError: o.onError,
    onComplete: o.onComplete
  });
}
/**
 * Get XML
 * @param {Object} o options
 * @param {String} o.url url pointing to the xml
 * @param {Function} o.onSuccess Function to call on success
 * @param {Function} o.onError Function to call on error
 */
export function getXML(o) {
  sendAjax({
    type: 'get',
    url: o.url,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/xml');
    },
    onSuccess: function(res) {
      if (res) {
        o.onSuccess(parseXml(res));
      }
    },
    onError: o.onError,
    onComplete: o.onComplete
  });
}
/**
 * Get Levenshtein distance by Gustaf Andersson
 * @note https://jsperf.com/levenshtein-distance/25
 * @param {string} String a
 * @param {string} String b
 */
export function distance(s, t) {
  if (s === t) {
    return 0;
  }
  var n = s.length,
    m = t.length;
  if (n === 0 || m === 0) {
    return n + m;
  }
  var x = 0,
    y,
    a,
    b,
    c,
    d,
    g,
    h;
  var p = new Array(n);
  for (y = 0; y < n; ) {
    p[y] = ++y;
  }

  for (; x + 3 < m; x += 4) {
    var e1 = t.charCodeAt(x);
    var e2 = t.charCodeAt(x + 1);
    var e3 = t.charCodeAt(x + 2);
    var e4 = t.charCodeAt(x + 3);
    c = x;
    b = x + 1;
    d = x + 2;
    g = x + 3;
    h = x + 4;
    for (y = 0; y < n; y++) {
      var f = s.charCodeAt(y);
      a = p[y];
      if (a < c || b < c) {
        c = a > b ? b + 1 : a + 1;
      } else {
        if (e1 !== f) {
          c++;
        }
      }

      if (c < b || d < b) {
        b = c > d ? d + 1 : c + 1;
      } else {
        if (e2 !== f) {
          b++;
        }
      }

      if (b < d || g < d) {
        d = b > g ? g + 1 : b + 1;
      } else {
        if (e3 !== f) {
          d++;
        }
      }

      if (d < g || h < g) {
        g = d > h ? h + 1 : d + 1;
      } else {
        if (e4 !== f) {
          g++;
        }
      }
      p[y] = h = g;
      g = d;
      d = b;
      b = c;
      c = a;
    }
  }

  for (; x < m; ) {
    var e = t.charCodeAt(x);
    c = x;
    d = ++x;
    for (y = 0; y < n; y++) {
      a = p[y];
      if (a < c || d < c) {
        d = a > d ? d + 1 : a + 1;
      } else {
        if (e !== s.charCodeAt(y)) {
          d = c + 1;
        } else {
          d = c;
        }
      }
      p[y] = d;
      c = a;
    }
    h = d;
  }

  return h;
}

export function distanceScore(a, b) {
  a = a.replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g, '').toLowerCase();
  b = b.replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g, '').toLowerCase();

  a = mx.helpers.cleanDiacritic(a);
  b = mx.helpers.cleanDiacritic(b);

  var l = a.length + b.length;

  return 100 - (distance(a, b) / l) * 100;
}

/**
 * Create random asci strint of given length
 * @param {integer} length of the string
 */
export function makeId(n) {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  n = n * 1 > 0 ? n * 1 : 5;

  for (var i = 0; i < n; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

/**
 * Convert an object to a blob, then to a URL
 * @param {Object} object to stringify and convert
 */
export function objectToUrl(object) {
  var blob = new Blob([JSON.stringify(object)], {type: 'application/json'});

  return window.URL.createObjectURL(blob);
}

/** Create a worker
 * @param fun {function} function to evalute by the worker
 */
export function createWorker(fun) {
  // convert input function to string
  fun = fun.toString();
  fun = fun.substring(fun.indexOf('{') + 1, fun.lastIndexOf('}'));
  // Make a blob
  var blob = new Blob([fun], {
    type: 'application/javascript'
  });
  // convert as url for new worker
  var blobUrl = URL.createObjectURL(blob);

  // return new worker
  return new Worker(blobUrl);
}

export function doPar(o) {
  var fun = o.fun || function() {};
  var data = o.data || {};
  var script = o.script || undefined;
  var s = '';
  var mm = {
    message: o.onMessage || console.log,
    progress: o.onProgress || console.log,
    end: o.onEnd || console.log
  };

  if (script) {
    s = "importScripts('" + self.origin + '/' + script + "');";
  }
  var m =
    'var sendMessage = ' +
    function(m) {
      postMessage({message: m});
    } +
    ';';
  var p =
    'var sendProgress= ' +
    function(m) {
      postMessage({progress: m});
    } +
    ';';
  var e =
    'var sendEnd= ' +
    function(m) {
      postMessage({end: m});
    } +
    ';';
  var d = 'var data= ' + JSON.stringify(data) + ';';

  fun = fun.toString();
  fun = fun.substring(fun.indexOf('{') + 1, fun.lastIndexOf('}'));

  var b = s + d + m + p + e + fun;

  var blob = new Blob([b], {
    type: 'application/javascript'
  });

  var blobUrl = URL.createObjectURL(blob);
  var ww = new Worker(blobUrl);

  ww.onmessage = function(e) {
    var m = e.data;
    for (var k in m) {
      mm[k](m[k]);
    }
  };

  return;
}

/**
 * Create a button containing font awesome stack icon
 * @param {Object} o options
 * @param {Element} o.elContainer Button container
 * @param {Array} o.classes classes to init the stack with
 */
export function StackButton(o) {
  var sb = this;
  sb.config = {
    hidden: o.hidden,
    classHide: 'mx-hide',
    elContainer: o.elContainer,
    classes: o.classes,
    classBase: o.classBase
  };
}

StackButton.prototype.build = function() {
  var elBtn = document.createElement('button');
  var elSpan = document.createElement('span');
  var elFront = document.createElement('i');
  var elBack = document.createElement('i');
  elSpan.appendChild(elFront);
  elSpan.appendChild(elBack);
  elBtn.appendChild(elSpan);
  this.elSpan = elSpan;
  this.elBtn = elBtn;
  this.elFront = elFront;
  this.elBack = elBack;
  if (this.config.elContainer) {
    this.config.elContainer.appendChild(elBtn);
  }
  this.setClasses();
  this.setHidden(this.config.hidden === true);
  return this;
};

StackButton.prototype.setClasses = function(cl) {
  cl = !!cl ? (cl instanceof Array ? cl : [cl]) : this.config.classes;
  var elFront = this.elFront;
  var elBack = this.elBack;
  var elSpan = this.elSpan;
  var elBtn = this.elBtn;
  elSpan.className = 'fa-stack';
  elFront.className = 'fa fa-stack-1x';
  elBack.className = 'fa fa-stack-2x';
  elFront.classList.add(cl[0]);
  elBack.classList.add(cl[1]);
  elBtn.className = cl[2] || this.config.classBase || 'btn btn-default';
  return this;
};
StackButton.prototype.setHidden = function(hide) {
  var elBtn = this.elBtn;
  if (hide === true) {
    elBtn.classList.add(this.config.classHide);
    this.config.hidden = true;
  } else if (hide === false) {
    elBtn.classList.remove(this.config.classHide);
    this.config.hidden = false;
  } else {
    elBtn.classList.toggle(this.config.classHide);
    this.config.hidden = elBtn.classList.contains(this.config.classHide);
  }
  return this;
};

/** Toggle button disabled state and warning or danger bootstrap classes
 * @param {Object} r options
 * @param {String} r.id Id of the button to toggle
 * @param {boolean} r.warning Use warning state instead of danger
 */
export function buttonToggle(r) {
  var elBtn = document.getElementById(r.id);
  if (elBtn) {
    var c = elBtn.classList;

    if (r.disable === true) {
      c.add('btn-danger');
      c.remove('btn-warning');
      c.remove('btn-default');
      elBtn.setAttribute('disabled', true);
    } else if (r.warning === true) {
      c.add('btn-warning');
      c.remove('btn-danger');
      c.remove('btn-default');
      elBtn.removeAttribute('disabled');
    } else {
      c.add('btn-default');
      c.remove('btn-danger');
      c.remove('btn-warning');
      elBtn.removeAttribute('disabled');
    }
  }
}
/**
 * Update element content
 * @param {object} o Object
 * @param {string} o.id Id of the element
 * @param {string} o.txt Replacement text
 */
export function updateText(o) {
  var el = document.getElementById(o.id);
  if (el) {
    var str = o.txt.toString();
    if (el.tagName === 'INPUT') {
      el.value = b64_to_utf8(str);
    } else {
      el.innerHTML = b64_to_utf8(str);
    }
  }
}

/**
 * Update checkbox input values
 * @param {object} o Object
 * @param {string} o.id Id of the element
 * @param {string} o.enabled Enabled
 * @param {string} o.checked Enabled
 */
export function updateCheckboxInput(o) {
  const h = mx.helpers;
  var el = document.getElementById(o.id);
  var altered = false;
  if (h.isElement(el)) {
    if (h.isBoolean(o.disabled)) {
      if (o.disabled) {
        el.setAttribute('disabled', true);
      } else {
        el.removeAttribute('disabled');
      }
    }
    if (h.isBoolean(o.checked)) {
      el.checked = o.checked;
      if (window.Shiny) {
        Shiny.onInputChange(o.id, el.checked);
      }
    }
  }
}

/**
 * convert b64 to utf8
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
export function b64_to_utf8(str) {
  str = str.replace(/\s/g, '');
  return decodeURIComponent(escape(window.atob(str)));
}

/**
 * convert utf8 to b64
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
export function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

export function searchToObject() {
  var pairs = window.location.search.substring(1).split('&'),
    obj = {},
    pair,
    i,
    key,
    value;

  for (i in pairs) {
    if (pairs[i] === '') {
      continue;
    }

    pair = pairs[i].split('=');
    key = decodeURIComponent(pair[0]);
    value = decodeURIComponent(pair[1]);
    try {
      value = JSON.parse(value);
    } catch (err) {}
    obj[key] = value;
  }

  return obj;
}
/**
 * Split a string in n parts
 * @param {string} String to split
 * @param {number} Length of the chunk
 * @note taken from http://stackoverflow.com/questions/7033639/split-large-string-in-n-size-chunks-in-javascript
 */
export function chunkString(str, size) {
  var numChunks = Math.ceil(str.length / size),
    chunks = new Array(numChunks);

  for (var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}

/**
 * Get extention from filename
 * @param {String} str Filename
 */
export function getExtension(str) {
  // "/" represent folder in jsZip and "^__" is prefix for max os x hidden folder. Both case : invalid.
  var isWrong = str.search(/^__/) > -1;
  var ext = str.toLowerCase().match(/.[a-z0-9]+$/);

  if (!isWrong && ext && ext instanceof Array) {
    return ext[0];
  }

  return '';
}

/**
 * Simple timer
 * @method start Start the timer
 * @method stop Start the timer
 * @example
 *  var a = new timer();
 * timer.start();
 * timer.stop();
 */

export function timer() {
  this.start = 0;
  return this;
}

timer.prototype.start = function() {
  this.start = window.performance.now();
};

timer.prototype.stop = function() {
  return window.performance.now() - this.start;
};

/**
 * Estimate memory size of object
 * @note https://gist.github.com/zensh/4975495
 * @param {Object} object to evaluate
 * @param {Boolean} humanReadable Output the result in formated text with units bytes; KiB; MiB, etc.. instead of bytes
 */
export function getSizeOf(obj, humanReadable) {
  const h = mx.helpers;
  var bytes = 0;
  var seenObjects = [];
  humanReadable = humanReadable === undefined ? true : humanReadable;

  return h
    .moduleLoad('size-of')
    .then((s) => {
      return obj instanceof File ? obj.size : s(obj);
    })
    .then((res) => {
      if (!humanReadable) {
        return res;
      } else {
        return formatByteSize(res);
      }
    });
}

/**
 * Format byte to human readable value
 */
export function formatByteSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(3) + ' KiB';
  } else if (bytes < 1073741824) {
    return (bytes / 1048576).toFixed(3) + ' MiB';
  } else {
    return (bytes / 1073741824).toFixed(3) + ' GiB';
  }
}

/**
 * Smooth scroll
 * @note https://stackoverflow.com/questions/17722497/scroll-smoothly-to-specific-element-on-page
 * @param {Object} o options
 * @param {Element} o.el Element to scroll on
 * @param {Number} o.from Starting point in px
 * @param {Number} o.to Ending point in px
 * @param {String} o.axis x (left) or y (top) ;
 * @param {Number} o.during Duration in ms for 1000 px
 * @param {String} o.using Easing function name
 * @param {Number} o.timeout Set a timeout before moving. Default to 0;
 * @param {Function} o.emergencyStop Function called during animation. If return true, animation is stoped.
 */
export function scrollFromTo(o) {
  var start, time, percent, stop, duration, easing, bodyDim;
  var diff = o.to - o.from;
  var axis = o.axis || 'y';

  if (o.using && o.using.constructor === Function) {
    easing = o.using;
  } else {
    easing = easingFun({
      type: o.using || 'easeInOut',
      power: 2
    });
  }

  stop = o.emergencyStop instanceof Function ? o.emergencyStop : null;

  return new Promise(function(resolve) {
    setTimeout(function() {
      mx.helpers.onNextFrame(function() {
        if (axis === 'y') {
          bodyDim = document.body.clientHeight || 800;
        }
        if (axis === 'x') {
          bodyDim = document.body.clientWidth || 800;
        }
        if (!diff || diff === 0) {
          resolve(true);
        } else if (Math.abs(diff) > bodyDim * 1.5) {
          // instant scroll
          if (axis === 'y') {
            o.el.scrollTop = o.to;
          }
          if (axis === 'x') {
            o.el.scrollLeft = o.to;
          }

          resolve(true);
        } else {
          // var duration = (o.during || 1000) * (Math.abs(diff)/1000);
          duration = o.during || 1000;
          // scroll on next frame
          mx.helpers.onNextFrame(function step(timestamp) {
            if (!start) {
              start = timestamp;
            }

            time = timestamp - start;
            percent = easing(Math.min(time / duration, 1));

            if (axis === 'y') {
              o.el.scrollTop = o.from + diff * percent;
            }
            if (axis === 'x') {
              o.el.scrollLeft = o.from + diff * percent;
            }

            if (time < duration && !(stop && stop())) {
              mx.helpers.onNextFrame(step);
            } else {
              resolve(true);
            }
          });
        }
      });
    }, o.timeout || 0);
  });
}
/**
 * x,y to degree
 */
export function xyToDegree(x, y) {
  let result = Math.atan2(y, x);
  if (result < 0) {
    result += 2 * Math.PI;
  }
  return result * (180 / Math.PI);
}

/**
 * Create easing function
 * @note https://gist.github.com/gre/1650294
 * @param {object} o options
 * @param {string} o.type type in "easeIn", "easeOut", "easeInOut",
 * @param {integer} o.power Power of the function
 */
export function easingFun(o) {
  var opt = {
    easeIn: function(power) {
      return function(t) {
        return Math.pow(t, power);
      };
    },
    easeOut: function(power) {
      return function(t) {
        return 1 - Math.abs(Math.pow(t - 1, power));
      };
    },
    easeInOut: function(power) {
      return function(t) {
        return t < 0.5
          ? opt.easeIn(power)(t * 2) / 2
          : opt.easeOut(power)(t * 2 - 1) / 2 + 0.5;
      };
    }
  };

  return opt[o.type](o.power);
}

/**
 * Test if undefined
 * @param {Object|Function}
 */
export function exists(x) {
  return typeof x === 'undefined';
}

/** Convert json string to object with given name on window
 * @param {Object} m Options
 * @param {String} m.json to parse
 * @param {String} m.name to name new object
 */
export function jsonToObj(m) {
  window[m.name] = JSON.parse(m.json);
}

/** Used for shiny to print a message in js console. Usefull when the R console is not visible
 * @param{Object} m Options
 * @param {String} m.msg Message to print
 */

export function jsDebugMsg(m) {
  console.log(m.msg);
}

/** Add or remove a class depending on enable option. The element has a class, ex. "hidden" and this will remove the class if m.enable is true.
 * @param {Object} m Options
 * @param {String} m.element Element id
 * @param {String} m.hideClass Class to remove if enabled is true
 * @param {Boolean} m.hide Hide add hideClass to given element
 * @param {Boolean} m.disable Add disabled attr to element
 */
export function hide(m) {
  var element, prefix;

  if (!m || !(m.class || m.id)) {
    return;
  }
  if (!m.hideClass) {
    m.hideClass = 'mx-hide';
  }
  if (m.hide === undefined) {
    m.hide = true;
  }
  if (m.hide === undefined) {
    m.disable = true;
  }

  prefix = m.id === undefined ? '.' : '#';

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
      $el.attr('disabled', true);
    } else {
      $el.attr('disabled', false);
    }
  }
}


/**
 * Class handling : add, remove and toggle
 * @param o {Object} options
 * @param o.selector {String|Element} selector of element to handle or element eg. #test, .test
 * @param o.class {String|Array} class name to process. By default, "mx-hide"
 * @param o.action {String} action to use : add, remove or toggle
 */
export function classAction(o) {
  var el, hasClass;

  if (!o.class) {
    o.class = 'mx-hide';
  }
  if (!o.action) {
    o.action = 'toggle';
  }

  if (!mx.helpers.isArray(o.class)) {
    o.class = o.class.split(/\s+/);
  }

  if (mx.helpers.isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelectorAll(o.selector);
  }

  forEachEl({
    els: el,
    callback: classAction
  });

  function classAction(el) {
    if (el && o.action) {
      o.class.forEach(function(cl) {
        hasClass = el.classList.contains(cl);
        if (hasClass && (o.action === 'remove' || o.action === 'toggle')) {
          el.classList.remove(cl);
        }

        if (!hasClass && (o.action === 'add' || o.action === 'toggle')) {
          el.classList.add(cl);
        }
      });
    }
  }
}

/**
 * Apply function on HTMLCollection
 * @param {Object} o options
 * @param {Object} o.els HTMLCollection egl div.children
 * @param {Function} o.callback Function to apply. Argument = element, iterator
 *
 */
export function forEachEl(o) {
  if (mx.helpers.isElement(o.els)) {
    o.callback(o.els);
  } else {
    for (var i = 0; i < o.els.length; ++i) {
      o.callback(o.els[i], i);
    }
  }
}

/**
 * Get an object content an push it in an array
 * @param {object} obj Object to convert,
 * @param {Boolean} asTable Produce an array of key-value object like [{key:'id',value:'123'}]
 * @return {array}
 */
export function objectToArray(obj, asTable) {
  asTable = asTable === true || false;
  return Object.keys(obj).map(function(key) {
    if (asTable) {
      return {key: key, value: obj[key]};
    } else {
      return obj[key];
    }
  });
}

/**
 * Parent finder
 * @param {Object} o options;
 * @param {Element|string} o.selector Element or selector string;
 * @param {String} o.class Class of the parent
 */
export function parentFinder(o) {
  var el;
  const h = mx.helpers;
  if (h.isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }
  while (el.parentElement && !el.classList.contains(o.class)) {
    el = el.parentElement;
  }
  return el;
}

export function childRemover(o) {
  var el;
  const h = mx.helpers;
  if (h.isElement(o)) {
    el = o;
  } else if (h.isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }

  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  return el;
}

/**
 * Set element attributes
 * @param {object} o options
 * @param {string} o.selector element selector
 * @param {string} o.atr attribute name
 * @param {string} o.val value
 */
export function setElementAttribute(o) {
  var el = document.getElementById(o.selector);
  if (el) {
    el.setAttribute(o.atr, o.val);
  }
}

/**
 * Set image attr
 * @param {object} o options
 * @param {string} o.id image id
 * @param {object} o.atr images attributes
 */
export function setImageAttributes(o) {
  var img = document.getElementById(o.id);

  if (img) {
    for (var a in o.atr) {
      img.setAttribute(a, o.atr[a]);
    }
  }
}

/**
 * Create and manage multiple progression bar
 * @param {Object} o Options
 * @param {boolean} o.enable Enable the screen
 * @param {string} o.id Identifier of the given item
 * @param {number} o.percent Progress bar percentage
 * @param {string} o.text Optional text
 */
export function progressScreen(o) {
  var lItem, lItems, lScreen, lBody, lScreenBack, lScreenContainer;
  var pBarIn, pBarOut, pBarTxt;
  var id = o.id;
  var enable = o.enable !== undefined ? o.enable : false;
  var percent = o.percent !== undefined ? o.percent : 0;
  var text = o.text !== undefined ? o.text : '';

  lScreen = document.querySelector('.loading-screen');
  lScreenBack = document.querySelector('.loading-screen-background');
  lScreenContainer = document.querySelector('.loading-container');

  if (!enable) {
    if (lScreen) {
      lScreen.remove();
    }
    if (lScreenBack) {
      lScreenBack.remove();
    }
    return;
  }

  if (!id || !percent || !text) {
    return;
  }

  if (!lScreen && enable) {
    lBody = document.querySelector('body');
    lScreen = document.createElement('div');
    lScreenBack = document.createElement('div');
    lScreen.className = 'loading-screen';
    lScreenBack.className = 'loading-screen-background';
    lScreenContainer = document.createElement('div');
    lScreenContainer.className = 'loading-container';
    lScreen.appendChild(lScreenContainer);
    lBody.appendChild(lScreenBack);
    lBody.appendChild(lScreen);
  }

  lItem = document.getElementById(id);

  if (!lItem) {
    lItem = document.createElement('div');
    lItem.className = 'loading-item';
    lItem.setAttribute('id', id);
    pBarIn = document.createElement('div');
    pBarIn.className = 'loading-bar-in';
    pBarOut = document.createElement('div');
    pBarOut.className = 'loading-bar-out';
    pBarTxt = document.createElement('div');
    pBarTxt.className = 'loading-bar-txt';
    pBarOut.appendChild(pBarIn);
    lItem.appendChild(pBarTxt);
    lItem.appendChild(pBarOut);
    lScreenContainer.appendChild(lItem);
  } else {
    pBarIn = lItem.getElementsByClassName('loading-bar-in')[0];
    pBarTxt = lItem.getElementsByClassName('loading-bar-txt')[0];
  }

  if (percent >= 100) {
    lItem = document.getElementById(id);
    if (lItem) {
      lItem.remove();
    }
  } else {
    pBarIn.style.width = percent + '%';
    pBarTxt.innerHTML = text;
  }

  lItems = lScreenContainer.getElementsByClassName('loading-item');

  if (lItems.length === 0) {
    progressScreen({enable: false});
  }
}

/**
 * Clone an object
 * @param {Object|Array} Source to clone
 */
export function clone(obj) {
  var copy;
  if (obj === undefined || obj === null) {
    return {};
  }
  if (obj.constructor === Array) {
    copy = [];
    obj.forEach(function(x, i) {
      copy[i] = clone(x);
    });
    return copy;
  } else if (obj.constructor === Object) {
    copy = {};
    for (var prop in obj) {
      if (!obj.hasOwnProperty(prop)) {
        continue;
      }
      copy[prop] = clone(obj[prop]);
    }
    return copy;
  } else {
    return obj;
  }
}

/**
 * htmlToData
 * @param {Object} o Options
 * @param {String|Element} o.selector Selector
 * @param {Number} o.scale Scale factor for output sizing
 * @param {String} o.style Add style rules to element
 */
export function htmlToData(o) {
  return new Promise(function(resolve, reject) {
    var el, elClone, elCloneRect, tagToRemove;

    if (o.selector instanceof Node) {
      el = o.selector;
    } else {
      el = document.querySelector(o.selector);
    }
    if (!el) {
      resolve(undefined);
    }

    if (!o.scale) {
      o.scale = 1;
    }
    /**
     * Clone element and clean it.
     * Some elements like input seems to break the SVG. Not Sure why.
     * Remove them is the way. Replace them by another tag does not work.
     */
    elClone = el.cloneNode(true);
    tagToRemove = ['input'];
    for (var i = 0; i < tagToRemove.length; i++) {
      elClone.querySelectorAll(tagToRemove[i]).forEach(function(x) {
        x.remove();
      });
    }

    var addStyle = 'padding:0px;margin:0px' + (o.style ? ';' + o.style : '');
    elClone.style = addStyle;
    el.parentElement.appendChild(elClone);
    elCloneRect = elClone.getBoundingClientRect();
    /**
     * SVG create
     */

    var data =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" +
      elCloneRect.width * o.scale +
      "' height='" +
      elCloneRect.height * o.scale +
      "'>" +
      '<defs>' +
      "<style type='text/css'>" +
      readStyles([elClone]) +
      '</style>' +
      '</defs>' +
      "<foreignObject width='100%' height='100%'>" +
      "<div xmlns='http://www.w3.org/1999/xhtml'>" +
      elClone.outerHTML +
      '</div>' +
      '</foreignObject>' +
      '</svg>';

    var url = buildSvgImageUrl(data);

    elClone.remove();

    // resolve promise
    setImage(url, resolve, reject);

    /**
     * functions
     */

    function buildSvgImageUrl(svg) {
      var b64 = mx.helpers.utf8_to_b64(svg);
      return 'data:image/svg+xml;base64,' + b64;
    }

    /**
     * Css steal : krasimir/css-steal
     */

    // elements to array
    function toArray(obj, ignoreFalsy) {
      var arr = [],
        i;
      for (i = 0; i < obj.length; i++) {
        if (!ignoreFalsy || obj[i]) {
          arr[i] = obj[i];
        }
      }
      return arr;
    }

    // looping through the styles and matching
    function getRules(el) {
      var sheets = document.styleSheets,
        result = [];
      el.matches =
        el.matches ||
        el.webkitMatchesSelector ||
        el.mozMatchesSelector ||
        el.msMatchesSelector ||
        el.oMatchesSelector;
      for (var i in sheets) {
        var rules = sheets[i].rules || sheets[i].cssRules;
        for (var r in rules) {
          if (el.matches(rules[r].selectorText)) {
            result.push(rules[r].cssText);
          }
        }
      }
      return mx.helpers.getArrayStat({arr: result, stat: 'distinct'}).join(' ');
    }

    // looping through the element's children
    function readStyles(els) {
      var res = els.reduce(function(styles, el) {
        styles.push(getRules(el));
        styles = styles.concat(readStyles(toArray(el.children)));
        return styles;
      }, []);

      return mx.helpers.getArrayStat({arr: res, stat: 'distinct'}).join(' ');
    }

    function setImage(url, resolve, reject) {
      var image = new Image();
      image.crossOrigin = 'Anonymous';
      image.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = elCloneRect.width * o.scale;
        canvas.height = elCloneRect.height * o.scale;
        ctx.scale(o.scale, o.scale);
        ctx.drawImage(this, 0, 0);
        var data = canvas.toDataURL();
        resolve(data);
      };
      image.onerror = function(e) {
        reject(e);
      };
      image.src = url;
    }
  });
}

export function injectHead(items) {
  var s = items.scripts || [];
  var c = items.css || [];

  if (!mx.data.headItems) {
    mx.data.headItems = {};
  }

  s.forEach(function(i) {
    if (!mx.data.headItems[i]) {
      mx.data.headItems[i] = true;
      var script = document.createElement('script');
      script.src = i;
      script.async = false;
      document.head.appendChild(script);
    }
  });

  c.forEach(function(i) {
    if (!mx.data.headItems[i]) {
      mx.data.headItems[i] = true;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = i;
      document.head.appendChild(link);
    }
  });
}

export function getBrowserData() {
  return {
    language: navigator.language.substr(0, 2),
    cookies: mx.helpers.readCookie(),
    userAgent: navigator.userAgent,
    timeZone: new Date().toString().replace(/.*[(](.*)[)].*/, '$1'),
    hasLocalStorage: !!window.sessionStorage,
    hasSessionStorage: !!window.sessionStorage,
    hasGeolocation: !!navigator.geolocation
  };
}

/**
 * Copy content of a div to clipboard
 *
 * @param {string} id Id of the div to copy
 */
export function copyText(id) {
  var elText = document.getElementById(id);
  if (!elText) {
    return;
  }
  elText.select();
  document.execCommand('copy');
  mx.helpers.iconFlash('clipboard');
}

export function shareTwitter(id) {
  var elText = document.getElementById(id);
  if (!elText) {
    return;
  }
  var url = elText.value || elText.innerHTML || '';
  // Opens a pop-up with twitter sharing dialog
  var shareURL = 'https://twitter.com/share?'; //url base
  //params
  var params = {
    url: url,
    text: 'Shared from MapX',
    //via: "Fred_Moser",
    hashtags: 'mapx'
  };

  for (var prop in params) {
    shareURL += '&' + prop + '=' + encodeURIComponent(params[prop]);
  }

  window.open(
    shareURL,
    '',
    'left=0,top=0,width=550,height=450,personalbar=0,toolbar=0,scrollbars=0,resizable=0'
  );

  mx.helpers.iconFlash('twitter');
}

export function updateLogScroll(selector) {
  selector = selector || '.mx-logs';
  var elLogs =
    selector instanceof Element ? selector : document.querySelector(selector);
  if (!elLogs) {
    return;
  }
  var h = elLogs.getBoundingClientRect();
  elLogs.scrollTop = h.height;
}

export function handleRequestMessage(msg, msgs, on) {
  msgs = msgs || {};
  on = on || {};

  on.message = on.message || console.log;
  on.progress = on.progress || console.log;
  on.timing = on.timing || console.log;
  on.error = on.error || console.log;
  on.warning = on.warning || console.log;
  on.end = on.end || console.log;
  on.result = on.result || console.log;
  on.default = on.default || console.log;

  return cleanMsg(msg);

  function addMsg(msg, type) {
    switch (type) {
      case 'end':
        on.end(msg);
        break;
      case 'progress':
        on.progress(msg);
        break;
      case 'message':
        on.message(msg);
        break;
      case 'error':
        on.error(msg);
        break;
      case 'warning':
        on.warning(msg);
        break;
      case 'result':
        on.result(msg);
        break;
      default:
        on.default(msg);
    }
    updateLogScroll('.mx-logs');
  }

  function cleanMsg(res) {
    res = res + '';
    res.split('\t\n').forEach(function(m) {
      if (m) {
        if (mx.helpers.isNumeric(m)) {
          m = m * 100;
          addMsg(m, 'progress');
        } else {
          if (mx.helpers.isJson(m)) {
            m = JSON.parse(m);
          }

          var isObject = mx.helpers.isObject(m);
          var msg = isObject ? m.msg : m;
          var type = m.type || 'default';

          if (msgs[msg]) {
            return;
          }

          msgs[msg] = true;

          addMsg(msg, type);
        }
      }
    });
  }
}

/**
 * Fetch image and convert to base64
 *
 *
 */
export function urlToImageBase64(url) {
  const h = mx.helpers;
  const def = '';
  if (h.isBase64img(url)) {
    return Promise.resolve(url);
  }
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  return fetch(url)
    .then(function(response) {
      if (response.ok) {
        return response.blob();
      } else {
        throw new Error(`No valid response for url ${url}`);
      }
    })
    .then(function(blob) {
      const validType = h.isValidType(blob.type, 'image');
      if (!validType) {
        throw new Error(`No valid image type ${blob.type}`);
      }
      img.src = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        img.onload = () => {
          const b64 = convertToBase64(img);
          resolve(b64);
        };
      });
    })
    .catch((e) => {
      console.warn(`urlToImageBase64 failed: , ${e.message}`);
      return def;
    });

  /**
   * Helpers
   */
  function convertToBase64(img) {
    const elCanvas = h.el('canvas', {
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    const ctx = elCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return elCanvas.toDataURL('image/png');
  }
}
