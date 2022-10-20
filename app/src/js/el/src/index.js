import {
  isPromise,
  isObject,
  isElement,
  isArray,
  isString,
  isHTML,
  isFunction
} from './../../is_test';

export {el, svg};

const NSSvg = 'http://www.w3.org/2000/svg';
const config = {
  listeners: [],
  debug: true,
  interval: null
};

function svg(tagName, ...opt) {
  return el(tagName, true, ...opt);
}

/**
 * clean listeners at interval
 */
function el(tagName, ...opt) {
  let item, elOut;

  if (!config.interval) {
    config.interval = setInterval(cleanListeners, 1e4);
    window.el_config = config;
  }
  let svgMode = opt[0] === true;
  /**
   * Create element
   */
  if (svgMode) {
    elOut = document.createElementNS(NSSvg, tagName);
  } else {
    elOut = document.createElement(tagName);
  }

  /**
   * Compute options
   */
  for (const o of opt) {
    /**
     * Object part el("div",{Object})
     */
    if (isObject(o) && !isArray(o)) {
      const keys = Object.keys(o);
      for (const k of keys) {
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
          for (const i in item) {
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
          }
        } else if (k === 'innerText' && isString(item)) {
          elOut.innerText = item;
        } else if ((k === 'dataset' || k === 'style') && isObject(item)) {
          for (const i in item) {
            elOut[k][i] = item[i];
          }
        } else if (k === 'class' && isArray(item)) {
          for (const c of item) {
            elOut.classList.add(c);
          }
        } else if (
          tagName === 'input' &&
          k === 'checked' &&
          o.type === 'checkbox'
        ) {
          elOut.checked = item === true;
        } else if (svgMode) {
          try {
            elOut.setAttributeNS(null, k, o[k]);
          } catch (e) {
            elOut.setAttribute(k, o[k]);
          }
        } else if (o[k]) {
          elOut.setAttribute(k, o[k]);
        }
      }
    }
    /**
     * Array part el("div",[Array])
     */
    if (isArray(o)) {
      for (const elChildren of o) {
        if (isElement(elChildren)) {
          elOut.appendChild(elChildren);
        }
      }
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
      o.then(setContent).catch(console.error);
    } else {
      setContent(o);
    }
  }

  return elOut;

  function setContent(str) {
    if (isHTML(str) || tagName === 'style') {
      elOut.innerHTML = str;
    } else if (isString(str)) {
      if (svgMode) {
        elOut.textContent = str;
      } else {
        if (tagName === 'input') {
          elOut.value = str;
        } else {
          elOut.innerText = str;
        }
      }
    }
  }
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
     * ⚠️  using query select instead of contains : contains seems to fail in some browser
     */
    const s = document.body.querySelector(`[data-el_id_listener="${id}"]`);
    if (!s) {
      config.listeners.pop();
      l.target.removeEventListener(l.tagName, l.listener);
    }
  }
}
