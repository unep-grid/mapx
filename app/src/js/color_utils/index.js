/**
 * Generate a random hsla color string, with fixed saturation and lightness
 * @param {number} opacity opacity from 0 to 1
 * @param {number} random value from 0 to 1
 * @param {number} saturation from 0 to 100
 * @param {number} lightness from 0 to 100
 */
export function randomHsl(opacity, random, saturation, lightness) {
  if (opacity === undefined) {
    opacity = 1;
  }
  if (saturation === undefined) {
    saturation = 100;
  }
  if (lightness === undefined) {
    lightness = 50;
  }
  if (random < 0 || random > 1 || random === undefined) {
    random = Math.random();
  }
  var res =
    'hsla(' +
    random * 360 +
    ', ' +
    saturation +
    '% ' +
    ', ' +
    lightness +
    '% ' +
    ', ' +
    opacity +
    ')';
  return res;
}

/**
 * convert hex to rgb or rgba
 * @param {string} hex Hex color
 * @param {number} opacity Value of opacity, from 0 to 1
 */
export function hex2rgba(hex, opacity) {
  var h = hex.replace('#', '');
  var rgba = 'rgba';
  var rgb = 'rgb';
  var out = '';
  var i;
  h = h.match(new RegExp('(.{' + h.length / 3 + '})', 'g'));

  for (i = 0; i < h.length; i++) {
    h[i] = parseInt(h[i].length === 1 ? h[i] + h[i] : h[i], 16);
  }

  if (typeof opacity !== 'undefined') {
    if (opacity > 1) {
      opacity = 1;
    }
    if (opacity < 0) {
      opacity = 0;
    }
    h.push(opacity);
    rgb = rgba;
  }

  return rgb + '(' + h.join(',') + ')';
}

/**
 * convert rgb|a to hex
 * @param {string} rgba string
 */
export function rgba2hex(rgb) {
  rgb = rgb.match(
    /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
  );
  return rgb && rgb.length === 4
    ? '#' +
        ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
        ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
        ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2)
    : '';
}
/**
 * convert any color to obj with key alpha and hex color
 * @param {string} color string. e.g. hsl(10%,10%,0)
 * @param {Boolean} heyOnly return only the hex code
 */
export function color2obj(color, hexOnly) {
  var alpha;
  var col;
  var out = {
    alpha: 1,
    color: '#000'
  };
  var div = document.createElement('div');
  div.style.color = color;
  col = div.style.color;
  if (col) {
    alpha = col.split(', ')[3];
    if (alpha) {
      out.alpha = alpha.replace(')', '') * 1;
    }
    out.color = rgba2hex(col);
  }
  if (hexOnly) {
    out = out.color;
  }
  return out;
}

/**
 * Scale an center value to get a hex color inside bounds
 * @param {Object} o Options
 * @param {Number} o.val Value
 * @param {Number} o.min Minimum value of the scale
 * @param {Number} o.max Maximum value of the scale
 * @param {Number} o.colMin Minimum hue in the 0-1 range
 * @param {Number} o.colMax Maximum hue in the 0-1 range
 * @example
 * var start =  window.performance.now();
 * for(var i=0;i<3000;i++){
 * colorLinear({min:-450,max:3000,val:i,colMin:0,colMax:0.5})
 * }
 * console.log("done in "+(window.performance.now()-start)/1000 +" [s]");
 */
export function colorLinear(o) {
  var valMin = o.min * 1 || 0;
  var valMax = o.max * 1 || 0;
  var colMin = o.colMin * 1 || 0;
  var colMax = o.colMax * 1 || 1;
  var val = o.val;
  var col;
  var isRandom = valMin === valMax;
  if (!isRandom) {
    col = (val - valMin) / (valMax - valMin);
  }
  col = col * (colMax - colMin);
  col = randomHsl(1, col);
  return color2obj(col, true);
}
