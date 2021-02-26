let idDefault = 0;

let cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

let nf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };

/**
* Bug in Edge / ie 11;
*/
nf = nf.bind(window);
cf = cf.bind(window);

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
  if(id > 0 ){
    cf(id);
  }
}

export {onNextFrame, cancelFrame};
