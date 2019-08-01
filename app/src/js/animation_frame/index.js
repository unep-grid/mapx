let idDefault = 0;

const cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

const nf =
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
function onNextFrame(cb) {
  idDefault = nf(cb);
  return idDefault;
}

/**
 * Cancel a requested frame id
 * @param {Number} frame number
 */
function cancelFrame(id) {
  cf(id || idDefault);
}

export {onNextFrame, cancelFrame};
