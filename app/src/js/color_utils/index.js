import chroma from 'chroma-js';


/**
*  TODO: Replace remaining custom functions with method from chroma
*/


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
 * Any color to css : rgb or rgba
 */
export function colorToRgba(color, opacity) {
  const c = chroma(color);
  if (typeof opacity !== 'undefined') {
    return c.alpha(opacity*1).css();
  }
  return c.css();
}


/**
* Validate color
* @param {Any} color
* @return {Boolean} valid
*/
export function validate(color) {
  return chroma.valid(color);
}

/**
 * convert rgb|a to hex
 * @param {string} rgba string
 */
export function rgba2hex(rgb) {
  const c = chroma(rgb);
  return c.hex('rgb');
}
export function colorToHex(color) {
  const c = chroma(color);
  return c.hex('rgb');
}



/**
 * convert any color to obj with key alpha and hex color
 * @param {string} color string. e.g. hsl(10%,10%,0)
 * @param {Boolean} hexOnly return only the hex code
 * @return {Object} Object with two keys : hex color and alpha. e.g. {color:"#000", alpha:0.2}
 */
export function color2obj(color, hexOnly) {
  const c = chroma(color);
  if (hexOnly) {
    return c.hex('rgb');
  }
  return {
    color: c.hex(),
    alpha: c.alpha()
  };
}
