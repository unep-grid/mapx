import { SpotlightManager } from "./spotlight_manager.js";
import { events } from "./../mx.js";
import { getMap } from "./../map_helpers/index.js";

export const spotlightManager = new SpotlightManager();

window.addEventListener("load", () => {
  events.once("mapx_ready", () => {
    const map = getMap();

    spotlightManager.init({
      map: map,
      elIds: {
        toggleMain: "btnOverlapSpotlight",
        selectNum: "selectNLayersOverlap",
        textArea: "txtAreaOverlap",
        textResol: "txtResolOverlap",
        enableCalcArea: "checkEnableOverlapArea",
      },
    });
  });
});
