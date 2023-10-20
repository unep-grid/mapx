import { isEmpty } from "../is_test";

let idDefault = 0;

let cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

let nf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function (callback) {
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
  if (id > 0) {
    cf(id);
  }
}

/**
 * Wait next frame async
 * @return {Promise} next frame;
 */
let idFrame = 0;
function waitFrameAsync() {
  cancelFrame(idFrame);
  return new Promise((r) => {
    return (idFrame = nf(r));
  });
}

/**
 * Wait async
 * @param {Number} t ms to wait
 * @param {Function} cb Optional
 * @param {Any} value Value to return default = true
 * @return {Promise<boolean>}
 */
function waitTimeoutAsync(t, cb, value) {
  return new Promise((r) => {
    setTimeout(() => {
      let out = isEmpty(value) ? true : value;
      if (cb instanceof Function) {
        cb(out);
      }
      r(out);
    }, t || 1);
  });
}

export { onNextFrame, cancelFrame, waitFrameAsync, waitTimeoutAsync };
