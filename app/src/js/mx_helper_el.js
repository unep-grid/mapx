/* jshint esversion:6 */
export function el(type, ...opt) {
  var h = mx.helpers;
  var el = document.createElement(type);
  var item;
  opt.forEach(o => {
    /**
    * Object part el("div",{Object})
    */
    if (h.isObject(o)) {
      Object.keys(o).forEach(a => {
        item = o[a];
        if (a == "on" && h.isArray(item) && h.isString(item[0]) && h.isFunction(item[1])) {
          el.addEventListener(item[0], item[1]);
        } else if (a == "innerText" && h.isString(item)) {
          el.innerText = item;
        } else if ((a == "dataset" || a == "style") && h.isObject(item)) {
          Object.keys(item).forEach(i => {
            el[a][i] = item[i];
          });
        } else if (a == "class" && h.isArray(item)) {
          item.forEach(c => el.classList.add(c));
        } else {
          el.setAttribute(a, o[a]);
        }
      });
    }
    /**
    * Array part el("div",[Array])
    */
    if (h.isArray(o)) {
      o.forEach(elChildren => {
        if (h.isElement(elChildren)) {
          el.appendChild(elChildren);
        }
      });
    }
    /**
    * Element part el("div",>Element>)
    */
    if (h.isElement(o)) {
      el.appendChild(o);
    }
    /**
    * HTML part el("div",>Element>)
    */
    if (h.isHTML(o)) {
      el.innerHTML = o;
    }else if (h.isStringRange(o)) {
      el.innerText = o;
    }

  });

  return el;
}


