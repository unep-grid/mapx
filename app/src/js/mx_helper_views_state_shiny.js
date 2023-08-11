import { isShinyReady } from "./mx_helper_misc.js";
import { settings } from "./settings";
import { getMapData } from "./map_helpers";

/**
 * Get the current project views state.
 *
 * @param {Object} opt Options
 * @param {String} opt.idProject ID of the project
 * @param {String} opt.idInput Shiny input id. This will trigger an event in Shiny with the state as value
 * @return {Array} State
 */
export function getProjectViewsState(opt) {
  opt = Object.assign(
    {},
    { idProject: settings.project.id, idInput: "projectViewsStates" },
    opt
  );
  const idInput = opt.idInput;
  const isCurrentProject = opt.idProject === settings.project.id;
  const hasShiny = isShinyReady();
  const state = [];
  if (!hasShiny) {
    console.warn("getProjectViewsState : requires Shiny");
    return;
  }
  if (!isCurrentProject) {
    console.warn(
      "getProjectViewsState: project requested is not the current project"
    );
    return;
  }
  const mData = getMapData();
  if (mData.viewsList) {
    if (mData.viewsList.isModeFrozen()) {
      alert("Operation not allowed : remove activated filters");
      return;
    }
    state.push(...mData.viewsList.getState());
    mData.viewsList.setStateOrig(state);
  }
  if (hasShiny) {
    Shiny.onInputChange(idInput, JSON.stringify(state));
  }
  return state;
}
