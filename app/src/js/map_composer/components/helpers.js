import { el } from "../../el_mapx";

let idDefault = 0;

let cf = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
const nf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function (callback) {
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

/**
 * Cancel a requested frame id
 * @param {Number} frame number
 */
export function cancelFrame(id) {
  cf(id || idDefault);
}

/**
 * Convert between length units: mm, px, and in.
 *
 * @param {Object} opt - Options for the conversion.
 * @param {number} opt.value - The value to convert.
 * @param {number} opt.dpi - DPI value for the conversion. Required for conversions involving pixels.
 * @param {string} opt.unitFrom - The unit of the given value ("mm", "px", or "in"). Defaults to "px".
 * @param {string} opt.unitTo - The unit to convert the value to ("mm", "px", or "in"). Defaults to "px".
 * @returns {number} The converted value.
 */
export function unitConvert(opt) {
  const v = opt.value || 0;
  const dpi = opt.dpi;

  if (!dpi && (opt.unitFrom === "px" || opt.unitTo === "px")) {
    throw new Error("DPI is required for conversions involving pixels.");
  }

  const unitFrom = opt.unitFrom || "px";
  const unitTo = opt.unitTo || "px";

  if (unitFrom === unitTo) {
    return v;
  }

  return {
    in: {
      px: v * dpi,
      mm: v * 25.4,
    },
    mm: {
      px: (v / 25.4) * dpi,
      in: v / 25.4,
    },
    px: {
      mm: (v / dpi) * 25.4,
      in: v / dpi,
    },
  }[unitFrom][unitTo];
}

/**
 * Estimates the screen's dots per inch (DPI) taking into account device pixel ratio.
 * @returns {number} Estimated DPI.
 */
export function getDpi() {
  const elInch = el("div", { style: { width: "1in" } });
  document.body.appendChild(elInch);
  const dpi = elInch.getBoundingClientRect().width * window.devicePixelRatio;
  elInch.remove();
  return dpi;
}
