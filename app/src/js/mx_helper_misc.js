import { FlashItem } from "./icon_flash";
import { getArrayDistinct } from "./array_stat/index.js";
import {
  isLanguageObject,
  isEmpty,
  isPromise,
  isElement,
  isString,
  isArray,
  isObject,
  isBoolean,
  isArrayOfString,
  isBase64img,
  isValidType,
  isNumeric,
  isJson,
} from "./is_test_mapx/index.js";

import { UAParser } from "ua-parser-js";

import copy from "fast-copy";
import { settings, data as mx_storage } from "./mx.js";
import { modalSelectSource } from "./select_auto/modals";
import { isSourceId } from "./is_test";
import { el, tt } from "./el_mapx";
import { cancelFrame, onNextFrame } from "./animation_frame";
import { moduleLoad } from "./modules_loader_async";
import { getDictItem } from "./language";
import { readCookie } from "./mx_helper_cookies";
import { modalDialog } from "./mx_helper_modal";

/**
 * Test if Shiny is up
 * @returns {Boolean} true if ready
 */
export function isShinyReady() {
  return !!window?.Shiny?.shinyapp?.$socket?.readyState;
}

/**
 * Performs a linear interpolation between minVal and maxVal, based on the normalized value of v
 * (clamped between fromScale and toScale).
 *
 * @param {number} fromScale - The minimum value of the scale.
 * @param {number} toScale - The maximum value of the scale
 * @param {number} minVal - The minimum value.
 * @param {number} maxVal - The maximum value .
 * @param {number} v - The value to interpolate.
 * @returns {number} The interpolated value.
 */
export function lerp(fromScale, toScale, minVal, maxVal, v) {
  if (fromScale === toScale) {
    return fromScale;
  }
  const clampedV = Math.max(minVal, Math.min(maxVal, v));
  const normalizedV = (clampedV - minVal) / (maxVal - minVal);
  return fromScale + normalizedV * (toScale - fromScale);
}

/**
 * Coerse value to boolean, e.g. from url query string;
 * @param {String|Boolean} value Value coercible to boolean.
 * @return {Boolean}
 */
export function asBoolean(value) {
  if (isBoolean(value)) {
    return value;
  }

  if (value === "false" || value === "FALSE") {
    return false;
  }
  if (value === "true" || value === "TRUE") {
    return true;
  }
  throw new Error("Value can't be coerced to boolean");
}

/**
 * Moves the given element to a new position by applying the specified CSS styles.
 * @param {HTMLElement} el - The element to be moved.
 * @param {Object} style - The CSS styles to be applied to the element.
 * @param {number} [duration=200] - The duration of the animation in milliseconds.
 * @returns {void}
 */
export function moveEl(el, style, duration = 300) {
  const oldStyle = getComputedStyle(el);
  if (el._move_el) {
    return;
  }
  el._move_el = true;
  for (const key in style) {
    const v = oldStyle[key];
    el.style[key] = v;
  }

  el.style.transition = `all ${duration}ms cubic-bezier(0.68, -0.6, 0.32, 1.6)`;

  for (const key in style) {
    el.style[key] = style[key];
  }

  setTimeout(() => {
    el.style.transition = "";
    delete el._move_el;
  }, duration);
}

/**
 * File selector hack
 * -> file input "cancel" event do not exists.
 * -> use focus on window to get the info that the dialog is gone
 * -> out array will be empty in case of cancel, but amall delay is added
 * @param {Object} opt options
 * @parm {boolean} opt.multiple Multiple file allowed
 * @returns {Promise<array>} array of files selected
 */
export function fileSelector(opt) {
  const conf = Object.assign({}, { multiple: true }, opt);

  const out = [];
  return new Promise((resolve) => {
    const elFile = el("input", {
      type: "file",
      style: {
        display: "none",
      },
      multiple: conf.multiple,
      on: {
        change: (e) => {
          out.push(...e.target.files);
          resolve(out);
        },
      },
    });
    document.body.appendChild(elFile);
    elFile.click();

    window.addEventListener("focus", clear, { once: true });

    function clear() {
      /**
       * Focus event is sent before change event on file input
       * wait a bit before resolving  in case of cancel only
       */
      setTimeout(() => {
        elFile.remove();
        resolve(out);
      }, 4e3);
    }
  });
}

/**
 * File select + parse json, same option as fileSelector
 * @return {Promise<array>}
 */
export async function fileSelectorJSON(opt) {
  const files = await fileSelector(opt);
  const out = [];

  for (const file of files) {
    const text = await textFileLoader(file);
    const data = JSON.parse(text);
    out.push(data);
  }
  return out;
}

/**
 * Helper to read the file as text
 * @param {File} file to read
 * @return {Promise<string>} result
 */
function textFileLoader(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(reader.result);
      });
      reader.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Generic prevent function
 * @param {Event} e - event, if any;
 *
 */
export function prevent(e) {
  if (e instanceof Event) {
    e.preventDefault();
    e.stopPropagation();
  }
}

/**
 * Convert form values to object, using default object key and value
 * @param {Element} elForm Form data
 * @return {Object}
 */
export function updateObjectWithForm(data, elForm, useClone = true) {
  if (useClone) {
    data = copy(data);
  }
  if (!isElement(elForm)) {
    return data;
  }
  for (const key in data) {
    const elInput = elForm.querySelector(`[name=${key}]`);
    if (!elInput) {
      console.warn(
        `Form parsing issue : expected key ${key} not found in form names`,
      );
      continue;
    }
    const type = typeof data[key];

    switch (type) {
      case "boolean":
        data[key] = !!elInput.checked;
        break;
      case "number":
        data[key] = elInput.value * 1;
        break;
      case "string":
      default:
        data[key] = elInput.value;
    }
  }

  return data;
}

/**
 * Fill mising value of target with source object
 * NOTE: Similar to Object.assign, with handling of  "empty" values for each types ('',{},[],null,undefined, ...)
 * @param {Object} target Target object to update
 * @param {Object} source Source entries
 * @return {Object} Update target
 */
export function updateIfEmpty(target, source) {
  if (!target) {
    target = {};
  }

  /**
   * Transfer values from source
   */
  for (const k in source) {
    const noTarget = isEmpty(target[k]);
    if (noTarget) {
      target[k] = source[k];
    }
  }
  return target;
}

/**
 * Update title based on settings
 * @param {string|object} title Title (optional)
 */
export function updateTitle(title) {
  const def = settings.title;
  title = title || settings?.project?.title;
  if (isLanguageObject(title)) {
    title = title[settings.language] || title[settings.languages[0]];
  }
  document.title = title || def;
}

/**
 * Set app busy mode
 * @param {Object} opt
 * @param {Boolean} opt.back
 * @param {Boolean} opt.icon
 */
export function setBusy(enable) {
  if (enable === true) {
    document.body.style.cursor = "progress";
  } else {
    document.body.style.cursor = "auto";
  }
}

/**
 * Retrieve nested item from object/array
 * @param {Object|Array} obj
 * @param {String|Array} path dot separated or array of string
 * @param {*} def default value ( if result undefined )
 * @note http://jsfiddle.net/Jw8XB/1/
 * @returns {*}
 */
export function path(obj, path, def) {
  const isDefaultMissing = typeof def === "undefined";
  const isPathString = isString(path);
  const isPathArray = isArrayOfString(path);

  if (isDefaultMissing) {
    def = null;
  }

  if (!isPathString && !isPathArray) {
    return out(def);
  }
  if (isPathString) {
    path = path.split(".");
  }
  for (let i = 0, iL = path.length; i < iL; i++) {
    if (!obj || !isObject(obj)) {
      return out(def);
    }
    obj = obj[path[i]];
  }

  if (isEmpty(obj)) {
    return out(def);
  }

  return out(obj);

  function out(obj) {
    if (
      !isDefaultMissing &&
      obj !== null &&
      def !== null &&
      typeof obj !== "undefined" &&
      obj.constructor !== def.constructor
    ) {
      obj = def.constructor(obj);
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

  if (!type || typeof enable === "undefined") {
    return;
  }

  if (enable && !hasClickHandler) {
    settings.clickHandlers.push(type);
  }
  if (!enable && hasClickHandler) {
    settings.clickHandlers.splice(posClickHandler, 1);
  }
  return settings.clickHandlers;
}

export function getClickHandlers() {
  return settings.clickHandlers;
}

/**
 * All member should be true or truthy
 *
 * @param {Array} a input array
 * @example all([null,0,"a",true]) === false
 * @example all([1,true,{},"a",0]) === false
 * @example all([" ",1,"a",true]) === true
 * @return {Boolean}
 */
export function all(a) {
  if (a.length === 0) {
    return false;
  }
  for (const i of a) {
    const b = Boolean(i);
    if (b === false) {
      return false;
    }
  }
  return true;
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
  a.forEach(function (o, i) {
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
 * @param {Object} opt Options,
 * @param {Boolean} opt.encodeURIComponent Encode
 * @return {String} parsed string
 */
export function parseTemplate(template, data, opt) {
  opt = Object.assign(
    {
      encodeURIComponent: false,
    },
    opt,
  );
  return template.replace(/{{([^{}]+)}}/g, (_, key) => {
    let txt = isEmpty(data[key]) ? "" : data[key];
    if (opt.encodeURIComponent) {
      txt = encodeURIComponent(txt);
    }
    return txt;
  });
}

/**
 * Flash an icon
 * @param {String} icon fontawesome name
 */
export function itemFlash(icon) {
  new FlashItem(icon);
}

export function itemFlashSave() {
  new FlashItem("floppy-o");
}

/**
 * Fill with zeros
 * @param {Number} n Number
 * @param {Number} p Number of digit
 * @param {String} c Value instead of zeros
 * @note https://stackoverflow.com/questions/1267283/how-can-i-pad-a-value-with-leading-zeros
 */
export function paddy(n, p, c) {
  var pad_char = typeof c !== "undefined" ? c : "0";
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

/**
 * Get the correct css transform function
 */
export function cssTransformFun() {
  return (function () {
    /* Create dummy div to explore style */
    if (typeof document === "undefined") {
      return;
    }

    var style = document.createElement("div").style;

    if (undefined !== style.WebkitTransform) {
      return "WebkitTransform";
    } else if (undefined !== style.MozTransform) {
      return "MozTransform ";
    } else if (undefined !== style.OTransform) {
      return "OTransform";
    } else if (undefined !== style.msTransform) {
      return "msTransform ";
    } else if (undefined !== style.WebkitTransform) {
      return "WebkitTransform";
    } else {
      return "transform";
    }
  })();
}
export var cssTransform = cssTransformFun();

export function uiToggleBtn(o) {
  o.label =
    isString(o.label) || isElement(o.label) ? o.label : JSON.stringify(o.label);
  const noLabel = isEmpty(o.label);
  const label = noLabel ? "" : o.label;
  const onChange = o.onChange || function () {};
  const data = o.data || {};
  const checked = o.checked || false;
  const id = makeId();
  const elInput = el("input", {
    class: "check-toggle-input",
    id: id,
    type: "checkbox",
    on: { click: onChange },
    dataset: data,
  });

  const elLabel = el(
    "label",
    {
      class: `check-toggle-label ${
        o.labelBoxed ? "check-toggle-label-boxed" : ""
      }`,
      for: id,
    },
    label,
  );

  elInput.checked = checked;

  const elContainer = el("div", { class: "check-toggle" }, [elInput, elLabel]);

  if (noLabel) {
    getDictItem("noValue")
      .then((na) => {
        elLabel.innerText = na;
      })
      .catch(console.error);
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
  var classContainer = "fold-container";
  var classContent = "fold-content";
  var classScroll = "mx-scroll-styled";
  var classLabel = "fold-label";
  var classSwitch = "fold-switch";
  var classSwitchCaret = "fold-caret";
  var id = makeId();
  var type = o.type || "caret";

  if (!content) {
    return;
  }
  open = open || false;
  label = label || "";
  labelKey = labelKey || label;
  var elInput = document.createElement("input");
  if (onChange) {
    elInput.onchange = onChange;
  }
  elInput.setAttribute("type", "checkbox");
  var elContainer = document.createElement("div");
  var elContent = document.createElement("div");
  var elLabel = document.createElement("label");
  elContainer.classList.add(classContainer);
  elContent.classList.add(classContent);
  elContent.classList.add(classScroll);
  elLabel.classList.add(classLabel);

  if (o.labelClass) {
    elLabel.classList.add(o.labelClass);
  }
  elLabel.setAttribute("for", id);
  elInput.id = id;
  elInput.classList.add(classSwitch);
  if (type === "caret") {
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
  var el = document.createElement("div");
  el.innerHTML = text;
  return el.children[0];
}

/**
 * Dom element to text
 * @param {Element} dom Dom element to convert
 * @return {String}
 */
export function domToText(dom) {
  var el = document.createElement("div");
  el.appendChild(dom);
}

/**
 * Converts an HTTP URL to HTTPS.
 * @param {string} urlString - The URL to convert.
 * @returns {string} The converted URL, or the original URL if not valid or already HTTPS.
 */
export function toHttps(urlString) {
  try {
    const url = new URL(urlString);
    url.protocol = "https:";
    return url.toString();
  } catch (error) {
    console.warn("Invalid URL provided:", error.message);
    return urlString;
  }
}

/**
 * Performs a deep merge of objects and returns new object. Does not modify
 * TODO: replace with deltaMerge ? (mx_helper_utils_json/utils_json)
 * objects (immutable) and merges arrays via concatenation.
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 *
 */
export function mergeDeep(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return source;
  }
  for (const key in source) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isArray(targetValue) && isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  }
  return target;
}

/**
 * Convert a simple object to an HTML list
 * @param {Object} o Options
 * @param {Object} o.data Object to convert
 * @param {String} o.id of element to fill (optional)
 * @param {String} o.classValue Group item additional class (optional)
 * @return {Element} Html ul element
 */
export function objectToHTML(config) {
  const { data: obj, id } = config;
  const classGroup = "list-group";
  const classGroupItem = "list-group-item";
  let classGroupItemValue = ["list-group-item-member"];
  let classValue;

  if (classValue) {
    classGroupItemValue = [...classGroupItemValue, ...classValue];
  }

  const html = makeUl(obj);

  if (id) {
    document.getElementById(id).appendChild(html);
  } else {
    return html;
  }

  function makeUl(li) {
    const keys = [];

    const ul = el("ul", {
      class: classGroup,
    });

    const isAnObject = isObject(li);
    const isAnArray = isArray(li);

    if (isAnObject) {
      keys = Object.keys(li);
    }

    if (isAnArray) {
      keys = [...li.keys()];
    }

    keys.forEach((k) => {
      const l = isAnArray ? k + 1 : k;
      const elLi = makeLi(li[k], l);
      ul.appendChild(elLi);
    });

    return ul;
  }

  function makeLi(it, ti) {
    const li = el("li", {
      class: classGroupItem,
    });
    const content = el("div");

    if (isObject(it) || isArray(it)) {
      content.appendChild(
        uiFold({
          content: makeUl(it),
          label: ti,
          open: false,
        }),
      );
    } else {
      content.innerHTML = `
        <div>
        <span class='list-group-title'>
        ${ti}
        </span>
        <span>
        ${it}
        </span></div>
        `;
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

/**
 * Round a number up to the nearest multiple of 5.
 *
 * @param {number} value - The number to round up.
 * @param {number} target - The nearst integer.
 * @returns {number} The rounded value.
 *
 * @example
 * const result = roundToNext(121.5);
 * console.log(result); // 125
 */
export function roundToNext(value, nearest = 5) {
  return Math.ceil(value / nearest) * nearest;
}

export function formatZeros(num, n) {
  if (typeof num !== "number") {
    return num;
  }
  num = round(num, n);
  num = num + "" || "0";
  n = n || 3;
  let a = num.split(".");
  let b = a[1];
  if (!b) {
    b = "";
  }
  for (var i = 0; b.length < n; i++) {
    b = b + "0";
  }
  return a[0] + "." + b;
}

/**
 * Replace unicode char by string
 * @param {string} txt String to convert
 * @note come from http://stackoverflow.com/questions/17267329/converting-unicode-character-to-string-format
 */
export function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
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
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
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
 * Debounces a function that returns a promise. The function will be invoked after the specified delay has elapsed
 * since the last time the debounced function was invoked. If the debounced function is invoked before the delay has
 * elapsed, the previous call will be cancelled and its promise will not resolve or reject.
 *
 * @export
 * @param {Function} fn - The function to debounce. This function should return a promise.
 * @param {number} [delay=200] - The number of milliseconds to delay invocation of the function.
 * @returns {Function} - Returns a new debounced version of the provided function.
 *
 * @example
 * const debouncedFetch = debouncePromise(fetchData, 300);
 * debouncedFetch().then(data => console.log(data));
 */
export function debouncePromise(fn, delay = 200) {
  let timerId;
  let pendingResolve;
  let pendingReject;
  let pendingPromise;

  return function (...args) {
    clearTimeout(timerId);

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }

    timerId = setTimeout(async () => {
      try {
        const result = await fn(...args);
        pendingResolve(result);
      } catch (error) {
        pendingReject(error);
      } finally {
        pendingPromise = null;
      }
    }, delay);

    return pendingPromise;
  };
}

/**
 * Throttles a function by delaying its execution.
 *
 * @param {Function} func - The function to be throttled.
 * @param {number} delay - The amount of time in milliseconds that the function should be throttled.
 * @returns {Function} - The throttled function.
 */
export function throttle(func, delay) {
  let timeout = null; // Now each throttled function will have its own timer
  return function (...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        func.apply(this, args);
        timeout = null; // Once function is executed, reset timeout
      }, delay);
    }
  };
}

/**
 * Throttles a function using animation frame.
 *
 * @param {Function} func - The function to be throttled.
 * @returns {Function} - The throttled function.
 */
export function throttleFrame(func) {
  const frame = { id: null };
  return function (...args) {
    cancelFrame(frame.id);
    frame.id = onNextFrame(() => {
      func.apply(this, args);
    });
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
    " " +
    toString(view.target) +
    " " +
    toString(view.data.abstract);

  str = str.replace(/[^0-9a-zA-Z]+/g, ";").split(";");
  str = getArrayDistinct(str);
  return str.join(" ");
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
  o.type = o.type ? o.type : "get";
  o.maxWait = o.maxWait ? o.maxWait : 20000; // in ms
  o.onError = o.onError
    ? o.onError
    : function (er) {
        throw new Error(er);
      };
  o.onTimeout = o.onTimeout
    ? o.onTimeout
    : function () {
        throw new Error(
          "Send ajax: max wait reached after " + o.maxWait + "[ms]",
        );
      };

  o.onSuccess = o.onSuccess || console.log;
  o.onMessage = o.onMessage || function () {};
  o.onComplete = o.onComplete || function () {};
  o.beforeSend = o.beforeSend || function () {};

  /* Set thet timer  */
  o.timer = setTimeout(function () {
    o.xhr.abort();
    o.onTimeout();
    o.onComplete();
  }, o.maxWait);

  /* open get/post/<method> with provided url */
  o.xhr.open(o.type, o.url);

  /* set the on progress function */
  if (o.onProgress) {
    o.xhr.upload.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        o.onProgress(e.loaded / e.total);
      }
    });
  }

  o.xhr.onreadystatechange = function () {
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
export async function getCSV(o) {
  const csvjson = await moduleLoad("csvjson");
  sendAjax({
    type: "get",
    url: o.url,
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Accept", "text/csv; charset=utf-8");
    },
    onSuccess: function (res) {
      if (res) {
        const data = csvjson.toObject(res);
        o.onSuccess(data);
      }
    },
    onError: o.onError || console.error,
    onComplete: o.onComplete || null,
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
    type: "post",
    url: o.url,
    data: o.data,
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Accept", "application/json, text/javascript");
    },
    onSuccess: o.onSuccess || console.log,
    onMessage: o.onMessage || console.log,
    onError: o.onError,
    onComplete: o.onComplete,
    onProgress: o.onProgress,
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
  o.onSuccess = o.onSuccess || function () {};
  o.onError = o.onError || function () {};
  o.onTimeout = o.onTimeout || function () {};
  o.onMessage = o.onMessage || function () {};
  o.onComplete = o.onComplete || function () {};

  sendAjax({
    maxWait: o.maxWait || 1e3 * 60 * 60,
    type: "get",
    url: o.url,
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Accept", "application/json, text/javascript");
      xhr.setRequestHeader("Accept", "application/json, text/javascript");
    },
    onMessage: function (res) {
      if (res) {
        o.onMessage(res);
      }
    },
    onSuccess: function (res) {
      if (res) {
        o.onSuccess(res);
      }
    },
    onTimeout: function (res) {
      if (res) {
        o.onTimeout(res);
      }
    },
    onError: o.onError,
    onComplete: o.onComplete,
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
    type: "get",
    url: o.url,
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Accept", "application/xml");
    },
    onSuccess: function (res) {
      if (res) {
        o.onSuccess(parseXml(res));
      }
    },
    onError: o.onError,
    onComplete: o.onComplete,
  });
}

/**
 * Create a random ASCII string of given length
 * @param {integer} n - The length of the string. If not set, a UUID will be returned.
 * @param {boolean} lowercase - Return a lowercase string
 * @returns {string} A random ASCII string or a UUID.
 */
export function makeId(n, lowercase = false) {
  let out = "";

  if (!n) {
    out = crypto.randomUUID();
  } else {
    const array = new Uint8Array(n);
    window.crypto.getRandomValues(array);
    out = array.reduce((acc, byte) => {
      const code = byte % 62;
      let charCode;
      if (code < 10) {
        // Numeric (0-9)
        charCode = code + 48;
      } else if (code < 36) {
        // Uppercase Alphabet (A-Z)
        charCode = code + 55;
      } else {
        // Lowercase Alphabet (a-z)
        charCode = code + 61;
      }
      return acc + String.fromCharCode(charCode);
    }, "");
  }
  if (lowercase) {
    return out.toLowerCase();
  } else {
    return out;
  }
}

/**
 * Convert an object to a blob, then to a URL
 * @param {Object} object to stringify and convert
 */
export function objectToUrl(object) {
  var blob = new Blob([JSON.stringify(object)], { type: "application/json" });

  return window.URL.createObjectURL(blob);
}

/** Create a worker
 * @param fun {function} function to evalute by the worker
 */
export function createWorker(fun) {
  // convert input function to string
  fun = fun.toString();
  fun = fun.substring(fun.indexOf("{") + 1, fun.lastIndexOf("}"));
  // Make a blob
  var blob = new Blob([fun], {
    type: "application/javascript",
  });
  // convert as url for new worker
  var blobUrl = URL.createObjectURL(blob);

  // return new worker
  return new Worker(blobUrl);
}

export function doPar(o) {
  var fun = o.fun || function () {};
  var data = o.data || {};
  var script = o.script || undefined;
  var s = "";
  var mm = {
    message: o.onMessage || console.log,
    progress: o.onProgress || console.log,
    end: o.onEnd || console.log,
  };

  if (script) {
    s = "importScripts('" + self.origin + "/" + script + "');";
  }
  var m =
    "var sendMessage = " +
    function (m) {
      postMessage({ message: m });
    } +
    ";";
  var p =
    "var sendProgress= " +
    function (m) {
      postMessage({ progress: m });
    } +
    ";";
  var e =
    "var sendEnd= " +
    function (m) {
      postMessage({ end: m });
    } +
    ";";
  var d = "var data= " + JSON.stringify(data) + ";";

  fun = fun.toString();
  fun = fun.substring(fun.indexOf("{") + 1, fun.lastIndexOf("}"));

  var b = s + d + m + p + e + fun;

  var blob = new Blob([b], {
    type: "application/javascript",
  });

  var blobUrl = URL.createObjectURL(blob);
  var ww = new Worker(blobUrl);

  ww.onmessage = function (e) {
    var m = e.data;
    for (var k in m) {
      mm[k](m[k]);
    }
  };

  return;
}

/** Toggle button disabled state and warning or danger bootstrap classes
 * @param {Object} r options
 * @param {String} r.id Id of the button to toggle
 * @param {boolean} r.warning Use warning state instead of danger
 */
export function buttonToggle(r) {
  const elBtn = document.getElementById(r.id);
  if (!isElement(elBtn)) {
    return;
  }
  const c = elBtn.classList;

  if (r.disable === true) {
    c.add("btn-danger");
    c.remove("btn-warning");
    c.remove("btn-default");
    elBtn.setAttribute("disabled", true);
  } else if (r.warning === true) {
    c.add("btn-warning");
    c.remove("btn-danger");
    c.remove("btn-default");
    elBtn.removeAttribute("disabled");
  } else {
    c.add("btn-default");
    c.remove("btn-danger");
    c.remove("btn-warning");
    elBtn.removeAttribute("disabled");
  }
}

/**
 * Simple enable / disable button handler
 * @param {Element} elBtn  Button element
 * @param {Boolean} enable Enable or disable
 */
export function buttonEnable(elBtn, enable) {
  if (enable) {
    elBtn.classList.remove("disabled-with-events");
    elBtn.removeAttribute("disabled");
  } else {
    elBtn.classList.add("disabled-with-events");
    elBtn.setAttribute("disabled", true);
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
    if (el.tagName === "INPUT") {
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
  const hasShiny = isShinyReady();
  const elInput = document.getElementById(o.id);

  if (!isElement(elInput)) {
    return;
  }

  if (isBoolean(o.disabled)) {
    if (o.disabled) {
      elInput.setAttribute("disabled", true);
    } else {
      elInput.removeAttribute("disabled");
    }
  }
  if (isBoolean(o.checked)) {
    elInput.checked = o.checked;
    if (hasShiny) {
      Shiny.onInputChange(o.id, elInput.checked);
    }
  }
}

/**
 * Show select source edit modal
 */
export async function showSelectSourceEdit(opt) {
  const idSource = await modalSelectSource({
    disable_large: false,
    readable: false,
    editable: true,
    add_views: true,
    add_global: false,
    types: ["vector", "tabular", "join"],
  });
  if (isSourceId(idSource)) {
    Shiny.onInputChange(opt.id, { idSource: idSource, update: Date.now() });
  }
}

/**
 * btn control helper
 */

export function showSelectProject() {
  var val = {
    time: new Date(),
    value: "showProject",
  };
  Shiny.onInputChange("btn_control", val);
}

export function showSelectLanguage() {
  var val = {
    time: new Date(),
    value: "showLanguage",
  };
  Shiny.onInputChange("btn_control", val);
}

export function showLogin() {
  var val = {
    time: new Date(),
    value: "showLogin",
  };
  Shiny.onInputChange("btn_control", val);
}

/**
 * convert b64 to utf8
 * @param {string} str String to convert
 * @note  taken from http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 */
export function b64_to_utf8(str) {
  str = str.replace(/\s/g, "");
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
  var pairs = window.location.search.substring(1).split("&"),
    obj = {},
    pair,
    i,
    key,
    value;

  for (i in pairs) {
    if (pairs[i] === "") {
      continue;
    }

    pair = pairs[i].split("=");
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
  const isWrong = str.search(/^__/) > -1;
  const ext = str.toLowerCase().match(/.[a-z0-9]+$/);

  if (!isWrong && ext && ext instanceof Array) {
    return ext[0];
  }

  return "";
}

/**
 * Simple timer class.
 * Provides methods to start and stop a timer and measure elapsed time.
 */
export class Timer {
  constructor() {
    this.startTime = 0;
  }

  /**
   * Starts the timer.
   */
  start() {
    this.startTime = window.performance.now();
  }

  /**
   * Stops the timer and returns the elapsed time in milliseconds.
   * @return {number} The elapsed time since the timer was started.
   */
  stop() {
    return window.performance.now() - this.startTime;
  }
}

/**
 * Estimate memory size of object
 * @note https://gist.github.com/zensh/4975495
 * @param {Object} object to evaluate
 * @param {Boolean} humanReadable Output the result in formated text with units bytes; KiB; MiB, etc.. instead of bytes
 */
export async function getSizeOf(obj, humanReadable) {
  humanReadable = Boolean(humanReadable);
  const sizeOf = await moduleLoad("size-of");
  const size = obj instanceof File ? obj.size : await sizeOf(obj);
  if (!humanReadable) {
    return size;
  }
  return formatByteSize(size);
}

/**
 * Format byte to human readable value
 */
export function formatByteSize(bytes) {
  if (bytes < 1024) {
    return bytes + " bytes";
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(3) + " KiB";
  } else if (bytes < 1073741824) {
    return (bytes / 1048576).toFixed(3) + " MiB";
  } else {
    return (bytes / 1073741824).toFixed(3) + " GiB";
  }
}
/**
 * File size checker
 * @param {File||Object||String} file File or geojson to test
 * @param {Object} opt Options
 * @param {Boolean} opt.showModal Display a modal panel to warn the user
 * @return {Promise<Boolean>} Is the file below limit =
 */
export async function isUploadFileSizeValid(file, opt) {
  opt = Object.assign({}, { showModal: true }, opt);
  const sizeMax = settings.api.upload_size_max;
  const isFile = file instanceof File;
  const isData = file && !isFile;

  if (!isFile && !isData) {
    throw new Error("maxSizeFileTest : input is not a file or data");
  }

  const size = await getSizeOf(file, false);
  const sizeOk = size <= sizeMax;

  if (sizeOk) {
    return true;
  }
  if (opt.showModal) {
    const sizeHuman = formatByteSize(sizeMax);
    await modalDialog({
      title: tt("api_upload_file_max_size_exceeded_title"),
      id: "modal_max_size_exceeded",
      content: tt("api_upload_file_max_size_exceeded", {
        tooltip: false,
        data: { size: sizeHuman },
      }),
    });
  }
  return sizeOk;
}

/**
 * Smooth scroll
 * @note https://stackoverflow.com/questions/17722497/scroll-smoothly-to-specific-element-on-page
 * @param {Object} opt options
 * @param {Element} opt.el Element to scroll on
 * @param {Number} opt.from Starting point in px
 * @param {Number} opt.to Ending point in px
 * @param {String} opt.axis x (left) or y (top) ;
 * @param {Number} opt.during Duration in ms for 1000 px
 * @param {String} opt.using Easing function name
 * @param {Number} opt.timeout Set a timeout before moving. Default to 0;
 * @param {Function} opt.emergencyStop Function called during animation. If return true, animation is stoped.
 */
const scrollToBreaks = {
  idTimeout: 0,
  idFrame: 0,
};
export function scrollFromTo(opt) {
  opt = Object.assign({}, opt);

  let start, time, percent, duration, easing, bodyDim;
  const diff = opt.to - opt.from;
  const axis = opt.axis || "y";
  const stop = opt.emergencyStop instanceof Function ? opt.emergencyStop : null;

  if (opt.using && opt.using.constructor === Function) {
    easing = opt.using;
  } else {
    easing = easingFun({
      type: opt.using || "easeInOut",
      power: 2,
    });
  }

  return new Promise((resolve) => {
    /*
     * Cancel previous timeout
     */

    clearTimeout(scrollToBreaks.idTimeout);

    if (stop && stop()) {
      return resolve(true);
    }

    /*
     * Cancel previous frame request
     */

    cancelFrame(scrollToBreaks.idFrame);

    scrollToBreaks.idTimeout = setTimeout(() => {
      if (axis === "y") {
        bodyDim = document.body.clientHeight || 800;
      }
      if (axis === "x") {
        bodyDim = document.body.clientWidth || 800;
      }
      if (!diff || diff === 0) {
        resolve(true);
      } else if (opt.jump === true || Math.abs(diff) > bodyDim * 11) {
        // instant scroll
        if (axis === "y") {
          opt.el.scrollTop = opt.to;
        }
        if (axis === "x") {
          opt.el.scrollLeft = opt.to;
        }

        resolve(true);
      } else {
        duration = opt.during || 1000;

        scrollToBreaks.idFrame = onNextFrame(step);

        function step(timestamp) {
          if (!start) {
            start = timestamp;
          }

          time = timestamp - start;
          percent = easing(Math.min(time / duration, 1));

          if (axis === "y") {
            opt.el.scrollTop = opt.from + diff * percent;
          }

          if (axis === "x") {
            opt.el.scrollLeft = opt.from + diff * percent;
          }

          if (time < duration && !(stop && stop())) {
            scrollToBreaks.idFrame = onNextFrame(step);
          } else {
            resolve(true);
          }
        }
      }
    }, opt.timeout || 0);
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
    easeIn: function (power) {
      return function (t) {
        return Math.pow(t, power);
      };
    },
    easeOut: function (power) {
      return function (t) {
        return 1 - Math.abs(Math.pow(t - 1, power));
      };
    },
    easeInOut: function (power) {
      return function (t) {
        return t < 0.5
          ? opt.easeIn(power)(t * 2) / 2
          : opt.easeOut(power)(t * 2 - 1) / 2 + 0.5;
      };
    },
  };

  return opt[o.type](o.power);
}

/**
 * Test if undefined
 * @param {Object|Function}
 */
export function exists(x) {
  return typeof x === "undefined";
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
 * @param {String} m.message Message to print
 * @param {String} m.msg (alias)
 */
export function jsDebugMsg(m) {
  console.log(m.message || m.msg);
}

/**
 *  Add or remove a class depending on enable option. The element has a class, ex. "hidden" and this will remove the class if m.enable is true.
 * @param {Object} m Options
 * @param {String} m.id Element id
 * @param {String} m.class Element class
 * @param {String} m.hideClass Class to remove if enabled is true
 * @param {Boolean} m.hide Hide add hideClass to given element
 * @param {Boolean} m.disable Add disabled attr to element
 * @param {Boolean} m.focus Focus
 */
export function hide(m) {
  if (!m || !(m.class || m.id)) {
    return;
  }

  const element = isEmpty(m.id)
    ? document.querySelector(`.${m.class}`)
    : document.getElementById(m.id);

  if (!m.hideClass) {
    m.hideClass = "mx-hide";
  }
  if (m.hide === undefined) {
    m.hide = true;
  }
  if (m.hide === undefined) {
    m.disable = true;
  }

  if (isElement(element)) {
    if (m.hide) {
      element.classList.add(m.hideClass);
    } else {
      element.classList.remove(m.hideClass);
    }
    if (m.disable) {
      element.setAttribute("disabled", true);
    } else {
      element.removeAttribute("disabled");
    }
  }
  if (m.focus) {
    element.focus();
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
    o.class = "mx-hide";
  }
  if (!o.action) {
    o.action = "toggle";
  }

  if (!isArray(o.class)) {
    o.class = o.class.split(/\s+/);
  }

  if (isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelectorAll(o.selector);
  }

  forEachEl({
    els: el,
    callback: classAction,
  });

  function classAction(el) {
    if (el && o.action) {
      o.class.forEach(function (cl) {
        hasClass = el.classList.contains(cl);
        if (hasClass && (o.action === "remove" || o.action === "toggle")) {
          el.classList.remove(cl);
        }

        if (!hasClass && (o.action === "add" || o.action === "toggle")) {
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
  if (isElement(o.els)) {
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
  return Object.keys(obj).map(function (key) {
    if (asTable) {
      return { key: key, value: obj[key] };
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
  if (isElement(o.selector)) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }
  while (el.parentElement && !el.classList.contains(o.class)) {
    el = el.parentElement;
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
  var text = o.text !== undefined ? o.text : "";

  lScreen = document.querySelector(".loading-screen");
  lScreenBack = document.querySelector(".loading-screen-background");
  lScreenContainer = document.querySelector(".loading-container");

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
    lBody = document.querySelector("body");
    lScreen = document.createElement("div");
    lScreenBack = document.createElement("div");
    lScreen.className = "loading-screen";
    lScreenBack.className = "loading-screen-background";
    lScreenContainer = document.createElement("div");
    lScreenContainer.className = "loading-container";
    lScreen.appendChild(lScreenContainer);
    lBody.appendChild(lScreenBack);
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
    if (lItem) {
      lItem.remove();
    }
  } else {
    pBarIn.style.width = percent + "%";
    if (isPromise(text)) {
      text
        .then((t) => {
          pBarTxt.innerHTML = t;
        })
        .catch(console.warn);
    }
    if (isString(text)) {
      pBarTxt.innerHTML = text;
    }
  }

  lItems = lScreenContainer.getElementsByClassName("loading-item");

  if (lItems.length === 0) {
    progressScreen({ enable: false });
  }
}

/**
 * Clone an object
 * @param {Object|Array} Source to clone
 */
export function clone(obj) {
  //return structuredClone(obj);
  return copy(obj);
}

/**
 * This function "flattens" a DOM element by moving any child nodes of block-level elements
 * to the parent level, effectively removing the block-level elements while preserving the
 * order and hierarchy of other elements and text nodes.
 *
 * Example:
 * <div><p>test</p></div> --> <p>test</p>
 * <h3>test <b>bold</b></h3> --> <h3>test<b>bold</b></h3>
 * <h1>title<h2>sub</h2></h1> --> <h1>title</h1><h2>sub</h2>
 *
 * @param {HTMLElement} element - The element within which to flatten block-level elements.
 */
const BLOCK_ELEMENTS = [
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
];

export function flattenBlockElements(element) {
  const children = Array.from(
    element.querySelectorAll(BLOCK_ELEMENTS.join(",")),
  );

  for (const child of children) {
    const container = child.parentElement;
    if (container === element || !BLOCK_ELEMENTS.includes(container.tagName)) {
      continue;
    }

    while (container.firstChild) {
      container.before(container.firstChild);
    }

    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Estimate the natural content size of a div element without constraints.
 *
 * @param {HTMLElement} divElement - The div element to measure.
 * @returns {Object} An object containing the width and height of the content.
 *
 * @example
 * const divElement = document.querySelector("#yourDivId");
 * const size = getContentSize(divElement);
 * console.log(`Width: ${size.width}, Height: ${size.height}`);
 */
export function getContentSize(divElement) {
  const elClone = divElement.cloneNode(true);
  Object.assign(elClone.style, {
    visibility: "hidden",
    position: "absolute",
    left: 0,
    top: 0,
    width: "fit-content",
    height: "fit-content",
    overflow: "visible",
    zIndex: 1000,
  });
  document.body.appendChild(elClone);
  const { width, height } = elClone.getBoundingClientRect();
  document.body.removeChild(elClone);
  return { width, height };
}

/**
 * Get the padding values of an element as numbers.
 *
 * @param {HTMLElement} element - The element to get padding from.
 * @returns {Object} An object with the padding values for top, right, bottom, and left.
 *
 * @example
 * const divElement = document.querySelector("#yourDivId");
 * const padding = getPadding(divElement);
 * console.log(padding);
 */
export function getPadding(element) {
  const style = window.getComputedStyle(element);
  return {
    top: parseFloat(style.paddingTop),
    right: parseFloat(style.paddingRight),
    bottom: parseFloat(style.paddingBottom),
    left: parseFloat(style.paddingLeft),
  };
}

/**
 * Clone a given node and its descendants, while removing
 * all "id", "for" attributes, and event listeners.
 *
 * @param {Node} node - The node to be cloned.
 * @returns {Node} - The cloned node without
 *  "id", "for" attributes, and listeners.
 */
export function cloneNodeClean(node) {
  const clonedNode = node.cloneNode(true);
  cleanNode(clonedNode);
  return clonedNode;
}
/**
 * Recursively remove 'id', 'for' attributes from a given
 * node and its descendants.
 *
 * @param {Node} node - The node to be cleaned.
 */
export function cleanNode(node) {
  if (node.nodeType === 1) {
    // Check if node is of type Element
    // Remove 'id' and 'for' attributes
    node.removeAttribute("id");
    node.removeAttribute("for");
  }

  // Recurse on child nodes
  for (let i = 0; i < node.childNodes.length; i++) {
    cleanNode(node.childNodes[i]);
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
  return new Promise(function (resolve, reject) {
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
    tagToRemove = ["input"];
    for (var i = 0; i < tagToRemove.length; i++) {
      elClone.querySelectorAll(tagToRemove[i]).forEach(function (x) {
        x.remove();
      });
    }

    var addStyle = "padding:0px;margin:0px" + (o.style ? ";" + o.style : "");
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

    var url = buildSvgImageUrl(data);

    elClone.remove();

    // resolve promise
    setImage(url, resolve, reject);

    /**
     * functions
     */

    function buildSvgImageUrl(svg) {
      const b64 = utf8_to_b64(svg);
      return "data:image/svg+xml;base64," + b64;
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
      return getArrayDistinct(result).join(" ");
    }

    // looping through the element's children
    function readStyles(els) {
      var res = els.reduce(function (styles, el) {
        styles.push(getRules(el));
        styles = styles.concat(readStyles(toArray(el.children)));
        return styles;
      }, []);
      return getArrayDistinct(res).join(" ");
    }

    function setImage(url, resolve, reject) {
      var image = new Image();
      image.crossOrigin = "Anonymous";
      image.onload = function () {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.width = elCloneRect.width * o.scale;
        canvas.height = elCloneRect.height * o.scale;
        ctx.scale(o.scale, o.scale);
        ctx.drawImage(this, 0, 0);
        var data = canvas.toDataURL();
        resolve(data);
      };
      image.onerror = function (e) {
        reject(e);
      };
      image.src = url;
    }
  });
}

export function injectHead(items) {
  var s = items.scripts || [];
  var c = items.css || [];

  if (!mx_storage.headItems) {
    mx_storage.headItems = {};
  }

  s.forEach(function (i) {
    if (!mx_storage.headItems[i]) {
      mx_storage.headItems[i] = true;
      var script = document.createElement("script");
      script.src = i;
      script.async = false;
      document.head.appendChild(script);
    }
  });

  c.forEach(function (i) {
    if (!mx_storage.headItems[i]) {
      mx_storage.headItems[i] = true;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = i;
      document.head.appendChild(link);
    }
  });
}

export function getBrowserData() {
  const userAgentData = new UAParser().getResult();
  const lang = navigator.language;
  return {
    language: lang.substring(0, 2),
    cookies: readCookie(),
    userAgent: userAgentData,
    timeZone: new Date().toString().replace(/.*[(](.*)[)].*/, "$1"),
    hasLocalStorage: !!window.sessionStorage,
    hasSessionStorage: !!window.sessionStorage,
    hasGeolocation: !!navigator.geolocation,
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
  document.execCommand("copy");
  itemFlash("clipboard");
}

export function shareTwitter(id) {
  var elText = document.getElementById(id);
  if (!elText) {
    return;
  }
  var url = elText.value || elText.innerHTML || "";
  // Opens a pop-up with twitter sharing dialog
  var shareURL = "https://twitter.com/share?"; //url base
  //params
  var params = {
    url: url,
    text: "Shared from MapX",
    hashtags: "mapx",
  };

  for (var prop in params) {
    shareURL += "&" + prop + "=" + encodeURIComponent(params[prop]);
  }

  window.open(
    shareURL,
    "",
    "left=0,top=0,width=550,height=450,personalbar=0,toolbar=0,scrollbars=0,resizable=0",
  );

  itemFlash("twitter");
}

export function updateLogScroll(selector) {
  selector = selector || ".mx-logs";
  const elLogs =
    selector instanceof Element ? selector : document.querySelector(selector);
  if (!elLogs) {
    return;
  }
  const rect = elLogs.getBoundingClientRect();
  elLogs.scrollTop = rect.height;
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
      case "end":
        on.end(msg);
        break;
      case "progress":
        on.progress(msg);
        break;
      case "message":
        on.message(msg);
        break;
      case "error":
        on.error(msg);
        break;
      case "warning":
        on.warning(msg);
        break;
      case "result":
        on.result(msg);
        break;
      default:
        on.default(msg);
    }
    updateLogScroll(".mx-logs");
  }

  function cleanMsg(res) {
    res = res + "";
    res.split("\t\n").forEach(function (m) {
      if (m) {
        if (isNumeric(m)) {
          m = m * 100;
          addMsg(m, "progress");
        } else {
          if (isJson(m)) {
            m = JSON.parse(m);
          }
          const isAnObject = isObject(m);
          const msg = isAnObject ? m.message || m.msg : m;
          const type = m.type || "default";

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
export async function urlToImageBase64(url) {
  let out = "";

  try {
    if (isBase64img(url)) {
      return url;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`URL ${url}: status ${res.status}`);
    }
    const blob = await res.blob();
    const validType = isValidType(blob.type, "image");
    if (!validType) {
      throw new Error(`No valid image type ${blob.type}`);
    }
    img.src = URL.createObjectURL(blob);
    await waitImg(img);
    out = convertToBase64(img);
  } catch (e) {
    console.warn("base64 converter issue:", e);
  } finally {
    return out;
  }

  /**
   * Helpers
   */
  async function convertToBase64(img) {
    const dpr = window.devicePixelRatio;
    const elCanvas = el("canvas");
    const width = img.width;
    const height = img.height;
    elCanvas.width = width * dpr;
    elCanvas.height = height * dpr;
    elCanvas.style.width = width + "px";
    elCanvas.style.height = height + "px";
    const ctx = elCanvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.drawImage(img, 0, 0);
    return elCanvas.toDataURL("image/png");
  }

  function waitImg(img) {
    return new Promise((resolve) => {
      img.onload = () => {
        resolve(true);
      };
    });
  }
}

