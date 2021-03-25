export {el};

const config = {
  listeners: [],
  debug: true,
  interval: null
};

/**
 * clean listeners at interval
 */
function el(tagName, ...opt) {
  var item;

  if (!config.interval) {
    config.interval = setInterval(cleanListeners, 1e4);
    window.el_config = config;
  }

  /**
   * Create element
   */
  var elOut = document.createElement(tagName);

  /**
   * Compute options
   */
  opt.forEach((o) => {
    /**
     * Object part el("div",{Object})
     */
    if (isObject(o) && !isArray(o)) {
      const keys = Object.keys(o);
      keys.forEach((k) => {
        item = o[k];
        if (
          k === 'on' &&
          isArray(item) &&
          isString(item[0]) &&
          isFunction(item[1])
        ) {
          /**
          * If array = allow third item as listener option
          */ 
          elOut.addEventListener(item[0], item[1], item[2]);
          elOut.dataset.el_id_listener = Math.random().toString(32);
          /**
           * Keep track of listener
           */
          config.listeners.push({
            target: elOut,
            tagName: item[0],
            listener: item[1]
          });
        } else if (k === 'on' && isObject(item)) {
          Object.keys(item).forEach((i) => {
            if (isFunction(item[i])) {
              elOut.addEventListener(i, item[i]);
              elOut.dataset.el_id_listener = Math.random().toString(32);
              /**
               * Keep track of listener
               */
              config.listeners.push({
                target: elOut,
                tagName: i,
                listener: item[i]
              });
            }
          });
        } else if (k === 'innerText' && isString(item)) {
          elOut.innerText = item;
        } else if ((k === 'dataset' || k === 'style') && isObject(item)) {
          Object.keys(item).forEach((i) => {
            elOut[k][i] = item[i];
          });
        } else if (k === 'class' && isArray(item)) {
          item.forEach((c) => elOut.classList.add(c));
        } else if (
          tagName === 'input' &&
          k === 'checked' &&
          o.type === 'checkbox'
        ) {
          elOut.checked = item === true;
        } else {
          elOut.setAttribute(k, o[k]);
        }
      });
    }
    /**
     * Array part el("div",[Array])
     */
    if (isArray(o)) {
      o.forEach((elChildren) => {
        if (isElement(elChildren)) {
          elOut.appendChild(elChildren);
        }
      });
    }
    /**
     * Element part el("div",>Element>)
     */
    if (isElement(o)) {
      elOut.appendChild(o);
    }
    /**
     * HTML part el("div",>Element>)
     */
    if (isPromise(o)) {
      o.then(setContent);
    } else {
      setContent(o);
    }
  });

  return elOut;

  function setContent(str) {
    if (isHTML(str) || tagName === 'style') {
      elOut.innerHTML = str;
    } else if (isString(str)) {
      elOut.innerText = str;
    }
  }
}

/**
 * Test if entry is an aray
 * @param {Array} item
 */
function isObject(item) {
  return !!item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Test if entry is an aray
 * @param {Array} item array
 */
function isArray(item) {
  return !!item && typeof item === 'object' && Array.isArray(item);
}

/**
 * Test if string contain HTML
 * @param {String} str string to test
 * @note https://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not#answer-36773193
 */
function isHTML(str) {
  return isString(str) && /(<([^>]+)>)/i.test(str);
}

/**
 * Test if it's a promise
 * @param {Promise} prom Promise to test
 */
function isPromise(prom) {
  return prom instanceof Promise;
}

/**
 * Test if entry is string
 * @param {String} str string to test
 */
function isString(str) {
  return typeof str === 'string';
}
/**
 * Test if entry is function
 * @param {Function} fun Function to test
 */
function isFunction(fun) {
  return fun instanceof Function;
}

/**
 * Check if an object is a html element
 * @param {Object} obj object to test
 */
function isElement(obj) {
  return obj instanceof Element || obj instanceof DocumentFragment;
}

/**
 * Automatically remove listeners
 */
function cleanListeners() {
  let cL = config.listeners.length;
  if (cL < 1) {
    return;
  }
  while (--cL) {
    const l = config.listeners[cL];
    if (!l) {
      return;
    }
    const id = l.target.dataset.el_id_listener;
    /**
     * use query select instead of contains : contains seems to fail in some browser
     */
    const s = document.body.querySelector(`[data-el_id_listener="${id}"]`);
    if (!s) {
      config.listeners.pop();
      l.target.removeEventListener(l.tagName, l.listener);
    }
  }
}
