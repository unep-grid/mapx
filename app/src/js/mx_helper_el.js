/* jshint esversion:6 */
import * as mx from './mx_init.js';


function on(type, fun) {
  this.addEventListener(type, fun);
  return this;
}

export function el(type, ...opt) {
  var el = document.createElement(type);
  el.on = on;
  opt.forEach(o => {
    if (o && o instanceof Object) {
      Object.keys(o).forEach(a => el.setAttribute(a, o[a]));
    }
    if (o && o instanceof Node) {
      el.appendChild(o);
    }
    if (o && typeof(o) === "string") {
      el.innerHTML = o;
    }

  });


  return el;
}
