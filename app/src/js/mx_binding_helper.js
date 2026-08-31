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
  setBoundaryType,
  setTheme,
  shinyNotify,
  syncAll,
  updateProject,
  updateViewsList,
  viewDelete,
  viewsCloseAll,
} from "./map_helpers/index.js";
import { writeCookie } from "./mx_helper_cookies.js";
import { validateMetadataModal } from "./metadata/validation.js";
import {
  buttonToggle,
  getBrowserData,
  hide,
  itemFlash,
  jsDebugMsg,
  jsonToObj,
  objectToHTML,
  progressScreen,
  setElementAttribute,
  setImageAttributes,
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
  setQueryParametersInit,
  setQueryParametersUpdate,
} from "./url_utils/url_utils.js";
import { project, settings } from "./mx.js";
import { updateViewsBadges } from "./badges/index.js";
import {
  viewsListRenderNew,
  viewsListUpdateSingle,
} from "./views_list_manager";
import { storyRead } from "./story_map/index.js";
import { openSourceOverlap } from "./source/overlap";
import { openSourceSettings } from "./source/settings/index.js";
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
import { editTable } from "./source/edit/instance.js";
import { uploadSource } from "./uploader/instance.js";
import { geomTools } from "./source/geometry/instance.js";
import {
  installSourcePickerShinyBridge,
  pickSourceForShiny,
} from "./source/picker/shiny_bridge.js";
import { installRasterUrlShinyBridge } from "./project/raster_url_shiny_bridge.js";

$(document).on("shiny:connected", mapxBindings);

/**
 * MapX client - Shiny bindings
 */
function mapxBindings() {
  const root = document.body;
  const shiny = window.Shiny;
  installSourcePickerShinyBridge({
    root,
    shiny,
  });
  installRasterUrlShinyBridge({ root });
  /**
   * Set init query parameters
   */
  setQueryParametersInit();
  input("urlSearchQuery", getQueryParametersInit());
  input("browserData", getBrowserData());

  /**
   * General bindings
   */
  bind("mxShowSelectSourceEdit", (request) =>
    pickSourceForShiny({
      request,
      root,
      shiny,
      language: settings.language,
    }),
  );
  bind("mxSetCookie", writeCookie);
  bind("mxModal", modal);
  bind("mxSetElementAttribute", setElementAttribute);
  bind("mxSetImageAttributes", setImageAttributes);
  bind("mxUiHide", hide);
  bind("mxValidateMetadataModal", validateMetadataModal);
  bind("mxSetQueryParametersUpdate", setQueryParametersUpdate);
  bind("mxUpdateText", updateText);
  bind("mxEpsgBuildSearchBox", epsgBuildSearchBox);
  bind("mxJsDebugMsg", jsDebugMsg);
  bind("mxButtonToggle", buttonToggle);
  bind("mxJsonToObj", jsonToObj);
  bind("mxJsonToHtml", objectToHTML);
  bind("mxProgress", progressScreen);
  bind("mxProjectList", project.list);
  bind("mxUpdateSelectizeItems", updateSelectizeItems);
  bind("mxInitSelectizeAll", initSelectizeAll);
  bind("mxFlashIcon", itemFlash);
  bind("mxUpdateSettings", updateSettings);
  bind("mxUpdateCheckboxInput", updateCheckboxInput);
  bind("mxNotify", shinyNotify);
  bind("mxGeoserverRebuild", geoserver.rebuild);
  bind("mxJoinEditor", (request) => modalSourceJoin(request, { root }));
  bind("mxEditTable", (request) => editTable({ ...request, root }));
  bind("mxGeomTools", geomTools);
  bind("mxUploader", uploadSource);
  bind("mxProjectAdd", project.create);
  bind("mxProjectManageRoles", project.showRoleMatrix);
  bind("mxProjectTilesReport", project.showTilesReport);
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
  bind("mglSetBoundaryType", setBoundaryType);
  bind("mglSetTheme", setTheme);
  bind("mglSyncAllMaps", syncAll);
  bind("mglUpdateViewsList", updateViewsList);
  bind("mglRemoveView", viewDelete);
  bind("mglGetLocalForageData", getLocalForageData);
  bind("mglUpdateView", viewsListUpdateSingle);
  bind("mglReadStory", storyRead);
  bind("mglOpenSourceOverlap", openSourceOverlap);
  bind("mglOpenSourceSettings", (request) =>
    openSourceSettings({ root, ...request }),
  );
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
