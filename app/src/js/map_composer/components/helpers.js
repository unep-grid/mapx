import { el } from "../../el_mapx";
import { isEmpty } from "../../is_test";

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
 * @param {number} opt.dpi - DPI value for the conversion. Required for conversions involving pixels. Default to 96.
 * @param {string} opt.unitFrom - The unit of the given value ("mm", "px", or "in"). Defaults to "px".
 * @param {string} opt.unitTo - The unit to convert the value to ("mm", "px", or "in"). Defaults to "px".
 * @returns {number} The converted value.
 */
export function unitConvert(opt) {
  opt = Object.assign(
    {},
    { value: null, dpi: getDpi(), unitFrom: "px", unitTo: "px" },
    opt
  );

  if (isEmpty(opt.value)) {
    throw new Error("unitConvert: missing value");
  }

  if (opt.unitFrom === opt.unitTo) {
    return opt.value;
  }

  const dpi = opt.dpi;
  const v = opt.value;
  const unitFrom = opt.unitFrom || "px";
  const unitTo = opt.unitTo || "px";

  const convert = {
    in: {
      px: v * dpi,
      mm: v * 25.4,
      in: v,
    },
    mm: {
      px: (v / 25.4) * dpi,
      in: v / 25.4,
      mm: v,
    },
    px: {
      mm: (v / dpi) * 25.4,
      in: v / dpi,
      px: v,
    },
  };

  return convert[unitFrom][unitTo];
}

/**
 * Estimates the screen's dots per inch (DPI)
 * @returns {number} Estimated DPI.
 */
const dpiDef = {
  dpr: 0,
  raw: 0,
};
export function getDpi(useDpr = false) {
  const id = useDpr ? "dpr" : "raw";
  const cache = dpiDef[id];

  if (cache) {
    return cache;
  }

  const elInch = el("div", {
    style: {
      position: "absolute",
      top: "-2in",
      left: "-2in",
      width: "1in",
      height: "1in",
    },
  });
  document.body.appendChild(elInch);
  const widthPixel = elInch.getBoundingClientRect().width;
  const dpi = useDpr ? window.devicePixelRatio * widthPixel : widthPixel;
  dpiDef[id] = dpi;
  elInch.remove();
  return dpi;
}
