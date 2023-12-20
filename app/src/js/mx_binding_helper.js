import { epsgBuildSearchBox } from "./epsgio/index.js";
import { geoserver } from "./geoserver/index.js";
import {
  addLayer,
  getLocalForageData,
  initMapx,
  setFilter,
  setHighlightedCountries,
  setMapPos,
  setMapProjection,
  setTheme,
  shinyNotify,
  syncAll,
  updateProject,
  updateViewsList,
  viewDelete,
  viewsCloseAll,
} from "./map_helpers/index.js";
import { ws_tools, helpers as h } from "./mx.js";
import { writeCookie } from "./mx_helper_cookies.js";
import { renderUserProjectsList } from "./mx_helper_list_projects.js";
import { validateMetadataModal } from "./metadata/validation.js";
import {
  buttonToggle,
  getBrowserData,
  hide,
  injectHead,
  itemFlash,
  jsDebugMsg,
  jsonToObj,
  objectToHTML,
  progressScreen,
  setElementAttribute,
  setImageAttributes,
  showSelectSourceEdit,
  updateText,
  updateCheckboxInput,
} from "./mx_helper_misc.js";
import { modal } from "./mx_helper_modal.js";
import {
  initSelectizeAll,
  updateSelectizeItems,
} from "./mx_helper_selectize.js";
import { updateSettings } from "./mx_helper_settings.js";
import {
  getQueryParametersInit,
  setQueryParametersUpdate,
} from "./url_utils/url_utils.js";
import { wmsBuildQueryUi } from "./wms/ui.js";
import { project } from "./mx.js";
import { updateViewsBadges } from "./badges/index.js";
import {
  viewsListRenderNew,
  viewsListUpdateSingle,
} from "./views_list_manager";
import { storyRead } from "./story_map/index.js";
import { getOverlapAnalysis } from "./mx_helper_overlap_tool.js";
import { getValidateSourceGeom } from "./mx_helper_validate_geom_tool.js";
import { getSourceVtSummaryUI } from "./mx_helper_source_summary.js";
import { getProjectViewsState } from "./mx_helper_views_state_shiny.js";
import {
  jedGetValidationById,
  jedGetValuesById,
  jedInit,
  jedUpdate,
} from "./json_editor";
import { modalSourceJoin } from "./source/joins/instance.js";

$(document).on("shiny:connected", mapxBindings);

/**
 * MapX client - Shiny bindings
 */
function mapxBindings() {
  /**
   * Set init query parameters
   */
  h.setQueryParametersInit();
  input("urlSearchQuery", getQueryParametersInit());
  input("browserData", getBrowserData());

  /**
   * General bindings
   */
  bind("mxShowSelectSourceEdit", showSelectSourceEdit);
  bind("mxSetCookie", writeCookie);
  bind("mxModal", modal);
  bind("mxSetElementAttribute", setElementAttribute);
  bind("mxSetImageAttributes", setImageAttributes);
  bind("mxUiHide", hide);
  bind("mxValidateMetadataModal", validateMetadataModal);
  bind("mxSetQueryParametersUpdate", setQueryParametersUpdate);
  bind("mxUpdateText", updateText);
  bind("mxEpsgBuildSearchBox", epsgBuildSearchBox);
  bind("mxWmsBuildQueryUi", wmsBuildQueryUi);
  bind("mxJsDebugMsg", jsDebugMsg);
  bind("mxButtonToggle", buttonToggle);
  bind("mxJsonToObj", jsonToObj);
  bind("mxJsonToHtml", objectToHTML);
  bind("mxProgress", progressScreen);
  bind("mxRenderUserProjectsList", renderUserProjectsList);
  bind("mxInjectHead", injectHead);
  bind("mxUpdateSelectizeItems", updateSelectizeItems);
  bind("mxInitSelectizeAll", initSelectizeAll);
  bind("mxFlashIcon", itemFlash);
  bind("mxUpdateSettings", updateSettings);
  bind("mxUpdateCheckboxInput", updateCheckboxInput);
  bind("mxNotify", shinyNotify);
  bind("mxGeoserverRebuild", geoserver.rebuild);
  bind("mxJoinEditor", modalSourceJoin);
  bind("mxEditTable", ws_tools.getCb("edit_table"));
  bind("mxGeomTools", ws_tools.getCb("geometry_tools"));
  bind("mxUploader", ws_tools.getCb("uploader"));
  bind("mxProjectAdd", project.create);
  /**
   * Mapx map and view related binding
   */
  bind("mglViewsCloseAll", viewsCloseAll);
  bind("mglReset", viewsCloseAll);
  bind("mglUpdateViewsBadges", updateViewsBadges);
  bind("mglRenderViewsList", viewsListRenderNew);
  bind("mglSetFilter", setFilter);
  bind("mglSetHighlightedCountries", setHighlightedCountries);
  bind("mglAddLayer", addLayer);
  bind("mglSetMapPos", setMapPos);
  bind("mglSetMapProjection", setMapProjection);
  bind("mglSetTheme", setTheme);
  bind("mglSyncAllMaps", syncAll);
  bind("mglUpdateViewsList", updateViewsList);
  bind("mglRemoveView", viewDelete);
  bind("mglGetLocalForageData", getLocalForageData);
  bind("mglUpdateView", viewsListUpdateSingle);
  bind("mglReadStory", storyRead);
  bind("mglGetOverlapAnalysis", getOverlapAnalysis);
  bind("mglGetValidateSourceGeom", getValidateSourceGeom);
  bind("mglGetSourceStatModal", getSourceVtSummaryUI);
  bind("mglGetProjectViewsState", getProjectViewsState);
  bind("mglUpdateProject", updateProject);
  bind("mglInit", initMapx);

  /**
   * Jed comands binding
   */
  bind("jedInit", jedInit);
  bind("jedUpdate", jedUpdate);
  bind("jedTriggerGetValidation", jedGetValidationById);
  bind("jedTriggerGetValues", jedGetValuesById);

  function input(id, cb) {
    return Shiny.onInputChange(id, cb);
  }
  function bind(id, cb) {
    return Shiny.addCustomMessageHandler(id, cb);
  }
}
