/* jshint esversion:6 */

export function el(type, ...opt) {
  var el = document.createElement(type);
  var item;
  opt.forEach(o => {
    if (o && o instanceof Object) {
      Object.keys(o).forEach(a => {
        item = o[a];
        if( a == "on" && item instanceof Array && typeof(item[0]) === "string" && typeof(item[1]) === "function"){
          el.addEventListener(item[0],item[1]);
        }else if( a == "innerText" && typeof item == "string" ){
          el.innerText = item;
        }else if( (a == "dataset" || a == "style") && typeof item == "object" ){
          Object.keys(item).forEach(i => {
            el[a][i] = item[i];
          }); 
        }else if( a == "class" && item instanceof Array ){
          item.forEach(c => el.classList.add(c));
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
