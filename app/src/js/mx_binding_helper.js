/*jshint esversion: 6 , node: true */

$(document).on('shiny:connected', function() {
  const h = mx.helpers;

  /**
   * Set init query parameters
   */
  h.setQueryParametersInit();
  Shiny.onInputChange('urlSearchQuery',h.getQueryParametersInit());
  Shiny.onInputChange('browserData',h.getBrowserData());

  /**
  * General bindings
  */

  //Shiny.addCustomMessageHandler("mxUpdateLanguage", h.updateLanguage);
  Shiny.addCustomMessageHandler("mxSetCookie",h.writeCookie);
  Shiny.addCustomMessageHandler('mxModal', h.modal);
  Shiny.addCustomMessageHandler('mxSetElementAttribute', h.setElementAttribute);
  Shiny.addCustomMessageHandler("mxSetImageAttributes", h.setImageAttributes);
  Shiny.addCustomMessageHandler("mxUiHide", h.hide);
  Shiny.addCustomMessageHandler("mxValidateMetadataModal", h.validateMetadataModal);
  Shiny.addCustomMessageHandler("mxSetQueryParametersUpdate", h.setQueryParametersUpdate);
  Shiny.addCustomMessageHandler("mxUpdateText", h.updateText);
  Shiny.addCustomMessageHandler("mxEpsgBuildSearchBox", h.epsgBuildSearchBox);
  Shiny.addCustomMessageHandler("mxWmsBuildQueryUi", h.wmsBuildQueryUi);
  Shiny.addCustomMessageHandler("mxJsDebugMsg", h.jsDebugMsg);
  Shiny.addCustomMessageHandler("mxButtonToggle", h.buttonToggle);
  Shiny.addCustomMessageHandler("mxJsonToObj", h.jsonToObj);
  Shiny.addCustomMessageHandler("mxJsonToHtml", h.objectToHTML);
  Shiny.addCustomMessageHandler("mxProgress",h.progressScreen);
  Shiny.addCustomMessageHandler("mxRenderUserProjectsList",h.renderUserProjectsList);
  Shiny.addCustomMessageHandler("mxInjectHead",h.injectHead);
  Shiny.addCustomMessageHandler("mxUpdateSelectizeItems",h.updateSelectizeItems);
  Shiny.addCustomMessageHandler("mxInitSelectizeAll",h.initSelectizeAll);
  Shiny.addCustomMessageHandler('mxFlashIcon', h.itemFlash);
  //Shiny.addCustomMessageHandler('mxUpdateSettingsUser', h.updateSettingsUser );
  Shiny.addCustomMessageHandler('mxUpdateSettings', h.updateSettings );
  Shiny.addCustomMessageHandler('mxUpdateCheckboxInput', h.updateCheckboxInput );
  Shiny.addCustomMessageHandler('mxNotify', h.shinyNotify);
  
  /**
  * Mapx map and view related binding
  */
  Shiny.addCustomMessageHandler("mglUpdateViewsBadges", h.updateViewsBadges);
  Shiny.addCustomMessageHandler('mglRenderViewsList', h.viewsListRenderNew );
  Shiny.addCustomMessageHandler('mglSetFilter', h.setFilter );
  Shiny.addCustomMessageHandler('mglSetHighlightedCountries', h.setHighlightedCountries);
  Shiny.addCustomMessageHandler('mglAddLayer',  h.addLayer );
  Shiny.addCustomMessageHandler('mglFlyTo', h.flyTo );
  Shiny.addCustomMessageHandler('mglSetMapProjection', h.setMapProjection);
  Shiny.addCustomMessageHandler('mglSyncAllMaps', h.syncAll );
  Shiny.addCustomMessageHandler('mglUpdateViewsList',h.updateViewsList);
  Shiny.addCustomMessageHandler('mglRemoveView', h.viewDelete );
  Shiny.addCustomMessageHandler('mglGetLocalForageData', h.getLocalForageData );
  Shiny.addCustomMessageHandler('mglUpdateView', h.viewsListUpdateSingle );
  Shiny.addCustomMessageHandler('mglReadStory', h.storyRead );
  Shiny.addCustomMessageHandler('mglReset', h.viewsCloseAll );
  Shiny.addCustomMessageHandler('mglHandlerDownloadVectorSource', h.handlerDownloadVectorSource);
  Shiny.addCustomMessageHandler('mglGetOverlapAnalysis', h.getOverlapAnalysis);
  Shiny.addCustomMessageHandler('mglGetValidateSourceGeom', h.getValidateSourceGeom);
  Shiny.addCustomMessageHandler('mglGetSourceStatModal', h.getSourceVtSummaryUI);
  Shiny.addCustomMessageHandler('mglGetProjectViewsState', h.getProjectViewsState);
  Shiny.addCustomMessageHandler("mglUpdateProject", h.updateProject);
  Shiny.addCustomMessageHandler('mglGetProjectViewsCollections', h.getProjectViewsCollectionsShiny);
  Shiny.addCustomMessageHandler('mglInit', h.initMapx );

  /**
  * Jed comands binding
  */
  Shiny.addCustomMessageHandler('jedInit',h.jedInit);
  Shiny.addCustomMessageHandler('jedUpdate',h.jedUpdate);
  Shiny.addCustomMessageHandler('jedTriggerGetValidation',h.jedGetValidationById);
  Shiny.addCustomMessageHandler('jedTriggerGetValues',h.jedGetValuesById);

});





