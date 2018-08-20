
/**
* Build a simple radial progress svg element
* @param {String|Element} selector  : the container selector or element to insert the progress radial
* @param {Object} c config
* @param {Integer} c.radius Radius of the radial input, in pixel
* @param {Integer} c.stroke Width of the stroke in pixel
*/
export function RadialProgress(selector, c) {
  var prog = this;
  var circumference = 2 * c.radius * Math.PI;
  prog.el = {};
  prog.el.container = selector instanceof Node ? selector : document.querySelector(selector);

  if(!prog.el.container) return;

  c.radius = c.radius || 10;
  c.stroke = c.stroke || 3;
  c.height = ( (c.radius + c.stroke) * 2) + "px";
  c.center = ( c.radius + c.stroke ) + "px";
  c.circumference =  circumference + "px";
  c.stroke = ( c.stroke ) + "px";
  c.radius = ( c.radius ) + "px";
  c.strokeColor =  c.strokeColor || mx.settings.colors.mx_ui_text_faded || "rgba(53,53,53,0.5)";
  c.svg = `
    <svg style="transform: rotate(270deg)" height="${c.height}" width="${c.height}">
    <circle r="${c.radius}" cx="${c.center}" cy="${c.center}" fill="transparent" stroke-dashoffset="0px" stroke-dasharray="${c.circumference}" style="stroke-width:${c.stroke};fill:transparent;transform:rotate(0.1deg);stroke: ${c.strokeColor};"></circle>
    </svg>`;

  prog.el.container.innerHTML = c.svg;
  prog.el.circle = prog.el.container.querySelector("circle");
  prog.el.svg = prog.el.container.querySelector("svg");


  prog.destroy = function() {
    prog.el.svg.remove();
  };

  prog.update = function(value) {
    var offset = circumference - (circumference * value);
    prog.el.circle.setAttribute('stroke-dashoffset', offset + 'px');
  };
  prog.update(0);
  return prog;

}
