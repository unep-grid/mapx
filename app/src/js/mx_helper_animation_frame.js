
var idDefault = 0;

var nf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };

/**
 * Do something on next frame
 * @param {Function} cb Callback function to execute on next animation frame
 */
export function onNextFrame(cb) {
  idDefault = nf(cb);
  return idDefault;
}

var cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
/**
 * Cancel a requested frame id
 * @param {Number} frame number
 */
export function cancelFrame(id) {
  cf(id||idDefault);
}
