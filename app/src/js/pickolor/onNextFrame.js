


export {onNext,cancel};


var nf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };


var cf =
  window.cancelAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.msCancelAnimationFrame ||
  window.oCancelAnimationFrame;

/**
 * Do something on next frame
 * @param {Function} cb Callback function to execute on next animation frame
 */
function onNext(cb) {
  return nf(cb);
}
function cancel(id) {
  return cf(id);
}
