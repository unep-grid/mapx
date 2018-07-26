/* jshint esversion:6 */
import * as mx from './mx_init.js';

export function el(type, ...opt) {
  var el = document.createElement(type);
  var item;
  opt.forEach(o => {
    if (o && o instanceof Object) {
      Object.keys(o).forEach(a => {
        item = o[a];
        if( a == "on" && item instanceof Array && typeof(item[0]) === "string" && typeof(item[1]) === "function"){
          el.addEventListener(item[0],item[1]);
        }else{
          el.setAttribute(a, o[a]);
        }});
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
