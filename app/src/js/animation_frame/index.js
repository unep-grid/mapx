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
 * Waits for the next animation frame or 1/24 second timeout, whichever comes
 * first, then resolves the promise.
 * @return {Promise<void>} A promise that resolves after the condition is met.
 */
let idFrame = 0;
function waitFrameAsync() {
  cf(idFrame); // Assuming 'cancelAnimationFrame' is defined

  const nextFramePromise = new Promise((resolve) => {
    idFrame = nf(resolve);
  });

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(resolve, 1000 / 24);
  });

  return Promise.race([nextFramePromise, timeoutPromise]);
}

/**
 * Wait async
 * @param {Number} t ms to wait
 * @param {Function} cb Optional
 * @param {Any} value Value to return default = true
 * @return {Promise<boolean>}
 */
function waitTimeoutAsync(t, cb = null, value = true) {
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
