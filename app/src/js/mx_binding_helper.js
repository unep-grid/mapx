import { geoserver } from "./geoserver/index.js";
import { ws_tools } from "./mx.js";

$(document).on("shiny:connected", function () {
  const h = mx.helpers;

  /**
   * Set init query parameters
   */
  h.setQueryParametersInit();
  input("urlSearchQuery", h.getQueryParametersInit());
  input("browserData", h.getBrowserData());

  /**
   * General bindings
   */

  bind("mxShowSelectSourceEdit", h.showSelectSourceEdit);
  bind("mxSetCookie", h.writeCookie);
  bind("mxModal", h.modal);
  bind("mxSetElementAttribute", h.setElementAttribute);
  bind("mxSetImageAttributes", h.setImageAttributes);
  bind("mxUiHide", h.hide);
  bind("mxValidateMetadataModal", h.validateMetadataModal);
  bind("mxSetQueryParametersUpdate", h.setQueryParametersUpdate);
  bind("mxUpdateText", h.updateText);
  bind("mxEpsgBuildSearchBox", h.epsgBuildSearchBox);
  bind("mxWmsBuildQueryUi", h.wmsBuildQueryUi);
  bind("mxJsDebugMsg", h.jsDebugMsg);
  bind("mxButtonToggle", h.buttonToggle);
  bind("mxJsonToObj", h.jsonToObj);
  bind("mxJsonToHtml", h.objectToHTML);
  bind("mxProgress", h.progressScreen);
  bind("mxRenderUserProjectsList", h.renderUserProjectsList);
  bind("mxInjectHead", h.injectHead);
  bind("mxUpdateSelectizeItems", h.updateSelectizeItems);
  bind("mxInitSelectizeAll", h.initSelectizeAll);
  bind("mxFlashIcon", h.itemFlash);
  bind("mxUpdateSettings", h.updateSettings);
  bind("mxUpdateCheckboxInput", h.updateCheckboxInput);
  bind("mxNotify", h.shinyNotify);
  bind("mxGeoserverRebuild", geoserver.rebuild);
  bind("mxEditTable", ws_tools.getCb("edit_table"));
  bind("mxGeomTools", ws_tools.getCb("geometry_tools"));
  /**
   * Mapx map and view related binding
   */
  bind("mglUpdateViewsBadges", h.updateViewsBadges);
  bind("mglRenderViewsList", h.viewsListRenderNew);
  bind("mglSetFilter", h.setFilter);
  bind("mglSetHighlightedCountries", h.setHighlightedCountries);
  bind("mglAddLayer", h.addLayer);
  bind("mglFlyTo", h.flyTo);
  bind("mglSetMapProjection", h.setMapProjection);
  bind("mglSetTheme", h.setTheme);
  bind("mglSyncAllMaps", h.syncAll);
  bind("mglUpdateViewsList", h.updateViewsList);
  bind("mglRemoveView", h.viewDelete);
  bind("mglGetLocalForageData", h.getLocalForageData);
  bind("mglUpdateView", h.viewsListUpdateSingle);
  bind("mglReadStory", h.storyRead);
  bind("mglReset", h.viewsCloseAll);
  bind("mglGetOverlapAnalysis", h.getOverlapAnalysis);
  bind("mglGetValidateSourceGeom", h.getValidateSourceGeom);
  bind("mglGetSourceStatModal", h.getSourceVtSummaryUI);
  bind("mglGetProjectViewsState", h.getProjectViewsState);
  bind("mglUpdateProject", h.updateProject);
  bind("mglGetProjectViewsCollections", h.getProjectViewsCollectionsShiny);
  bind("mglInit", h.initMapx);

  /**
   * Jed comands binding
   */
  bind("jedInit", h.jedInit);
  bind("jedUpdate", h.jedUpdate);
  bind("jedTriggerGetValidation", h.jedGetValidationById);
  bind("jedTriggerGetValues", h.jedGetValuesById);

  function input(id, cb) {
    return Shiny.onInputChange(id, cb);
  }
  function bind(id, cb) {
    return Shiny.addCustomMessageHandler(id, cb);
  }
});
