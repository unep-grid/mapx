/* jshint esversion:6 */
export {el};

const config = {
  listeners: [],
  observer: null,
  debug: true
};

function el(type, ...opt) {
  var item;
  /**
   * Global listener
   */
  if (!config.observer) {
    config.observer = create_observer();
  }

  /**
   * Create element
   */
  var elOut = document.createElement(type);

  /**
   * Compute options
   */
  opt.forEach((o) => {
    /**
     * Object part el("div",{Object})
     */
    if (isObject(o) && !isArray(o)) {
      Object.keys(o).forEach((a) => {
        item = o[a];
        if (
          a === 'on' &&
          isArray(item) &&
          isString(item[0]) &&
          isFunction(item[1])
        ) {
          elOut.addEventListener(item[0], item[1]);
          config.listeners.push({
            target: elOut,
            type: item[0],
            listener: item[1]
          });
        } else if (a === 'on' && isObject(item)) {
          Object.keys(item).forEach((i) => {
            if (isFunction(item[i])) {
              elOut.addEventListener(i, item[i]);
              config.listeners.push({
                target: elOut,
                type: i,
                listener: item[i]
              });
            }
          });
        } else if (a === 'innerText' && isString(item)) {
          elOut.innerText = item;
        } else if ((a === 'dataset' || a === 'style') && isObject(item)) {
          Object.keys(item).forEach((i) => {
            elOut[a][i] = item[i];
          });
        } else if (a === 'class' && isArray(item)) {
          item.forEach((c) => elOut.classList.add(c));
        } else {
          elOut.setAttribute(a, o[a]);
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
    if (isHTML(str) || type === 'style') {
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
  return obj instanceof Element;
}

/**
 * Automatically remove listeners
 */

function create_observer() {
  const observer = new MutationObserver((m) => {
    let start = performance.now();
    let hadChildRemoved = false;
    let hadFoundListener = false;
    let nListenersRemoved = 0;
    let nNodeRemoved = 0;
    for (let mutation of m) {
      if (mutation.type === 'childList') {
        let nNodeRemovedMutation = mutation.removedNodes.length;
        if (nNodeRemovedMutation) {
          hadChildRemoved = true;
          nNodeRemoved = nNodeRemoved + nNodeRemovedMutation;
          /*
           * Inspect removed nodes
           */
          for (let node of mutation.removedNodes) {
            /*
             * Search for registered listeners
             */
            for (let l of config.listeners) {
              if (node.contains(l.target) && l.type && l.listener) {
                hadFoundListener = true;
                l.target.removeEventListener(l.type, l.listener);
                l._to_remove = true;
              }
            }
          }

          /*
           * Remove found listeners
           */
          if (hadFoundListener) {
            let n = config.listeners.length;
            while (n--) {
              if (config.listeners[n]._to_remove === true) {

                nListenersRemoved ++;
                config.listeners.splice(n, 1);
              }
            }
          }
        }
      }
    }
    /*
     * Debug log
     */
    if (hadChildRemoved && config.debug) {
      const diff = performance.now() - start;
      if (diff > 10) {
        console.warn(`el observer performance issue.
          It took ${Math.round(diff)} ms to finish. 
          Number of listeners removed : ${nListenersRemoved}. 
          Number of listeners left: ${config.listeners.length}. 
          Number of removed nodes : ${nNodeRemoved}`);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  return observer;
}
