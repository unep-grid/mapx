import { isShinyReady } from "./mx_helper_misc.js";

/**
 * Switch user :)
 *
 * @param {Object} opt Options
 * @param {Number} opt.id Id of the target user
 *
 */
export function switchUser(opt) {
  const hasShiny = isShinyReady();
  if (!hasShiny) {
    return;
  }
  if (!opt) {
    opt = {};
  }
  if (typeof opt === "number") {
    opt = {
      id: opt,
    };
  }
  Shiny.onInputChange("switchUser", opt);
}
