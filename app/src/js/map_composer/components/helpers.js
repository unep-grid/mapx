export {unitConvert, debounce, onNextFrame, cancelFrame};

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this,
      args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

let idDefault = 0;

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

let cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
/**
 * Cancel a requested frame id
 * @param {Number} frame number
 */
function cancelFrame(id) {
  cf(id || idDefault);
}

/**
 * Convert length unit. mm <-> px <-> in
 */
function unitConvert(opt) {
  const v = opt.value || 0;
  const dpi = opt.dpi;
  const unitFrom = opt.unitFrom || 'px';
  const unitTo = opt.unitTo || 'px';

  if (unitFrom === unitTo) {
    return v;
  }

  return {
    in: {
      px: v * dpi,
      mm: v * 25.4
    },
    mm: {
      px: (v / 25.4) * dpi,
      in: v / 25.4
    },
    px: {
      mm: (v / dpi) * 25.4,
      in: v / dpi
    }
  }[unitFrom][unitTo];
}
