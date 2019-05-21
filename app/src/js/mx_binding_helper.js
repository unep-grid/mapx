/*jshint esversion: 6 , node: true */

$(document).on('shiny:connected', function() {

  /*
  * Input
  */
  Shiny.onInputChange('browserData',mx.helpers.getBrowserData());

  /**
  * General bindings
  */
  Shiny.addCustomMessageHandler("mxUpdateLanguage", mx.helpers.updateLanguage);
  Shiny.addCustomMessageHandler("mxSetCookie",mx.helpers.writeCookie);
  Shiny.addCustomMessageHandler('mxModal', mx.helpers.modal);
  Shiny.addCustomMessageHandler('mxSetTemplates', mx.helpers.setTemplates);
  Shiny.addCustomMessageHandler('mxSetElementAttribute', mx.helpers.setElementAttribute);
  Shiny.addCustomMessageHandler("mxSetImageAttributes", mx.helpers.setImageAttributes);
  Shiny.addCustomMessageHandler("mxUiHide", mx.helpers.hide);
  Shiny.addCustomMessageHandler("mxValidateMetadataModal", mx.helpers.validateMetadataModal);
  Shiny.addCustomMessageHandler("mxObjToState", mx.helpers.objToState);
  Shiny.addCustomMessageHandler("mxUpdateText", mx.helpers.updateText);
  Shiny.addCustomMessageHandler("mxEpsgBuildSearchBox", mx.helpers.epsgBuildSearchBox);
  Shiny.addCustomMessageHandler("mxWmsBuildQueryUi", mx.helpers.wmsBuildQueryUi);
  Shiny.addCustomMessageHandler("mxJsDebugMsg", mx.helpers.jsDebugMsg);
  Shiny.addCustomMessageHandler("mxButtonToggle", mx.helpers.buttonToggle);
  Shiny.addCustomMessageHandler("mxJsonToObj", mx.helpers.jsonToObj);
  Shiny.addCustomMessageHandler("mxJsonToHtml", mx.helpers.objectToHTML);
  Shiny.addCustomMessageHandler("mxProgress",mx.helpers.progressScreen);
  Shiny.addCustomMessageHandler("mxRenderUserProjectsList",mx.helpers.renderUserProjectsList);
  Shiny.addCustomMessageHandler("mxInjectHead",mx.helpers.injectHead);
  Shiny.addCustomMessageHandler("mxUpdateSelectizeItems",mx.helpers.updateSelectizeItems);
  Shiny.addCustomMessageHandler("mxInitSelectizeAll",mx.helpers.initSelectizeAll);
  Shiny.addCustomMessageHandler('mxFlashIcon', mx.helpers.iconFlash);


  /**
  * Mapx map and view related binding
  */
  Shiny.addCustomMessageHandler("mglUpdateViewsBadges", mx.helpers.updateViewsBadges);
  Shiny.addCustomMessageHandler('mglRenderViewsList', mx.helpers.renderViewsList ); 
  Shiny.addCustomMessageHandler('mglSetFilter', mx.helpers.setFilter );
  Shiny.addCustomMessageHandler('mglSetHighlightedCountries', mx.helpers.setHighlightedCountries);
  Shiny.addCustomMessageHandler('mglAddLayer',  mx.helpers.addLayer );
  Shiny.addCustomMessageHandler('mglFlyTo', mx.helpers.flyTo );
  Shiny.addCustomMessageHandler('mglSyncAllMaps', mx.helpers.syncAll );
  Shiny.addCustomMessageHandler('mglSetSourcesFromViews',mx.helpers.setViewsList );
  Shiny.addCustomMessageHandler('mglRemoveView', mx.helpers.removeView );
  Shiny.addCustomMessageHandler('mglGetLocalForageData', mx.helpers.getLocalForageData );
  Shiny.addCustomMessageHandler('mglAddView', mx.helpers.addView );
  Shiny.addCustomMessageHandler('mglReadStory', mx.helpers.storyRead );
  Shiny.addCustomMessageHandler('mglReset', mx.helpers.reset );
  Shiny.addCustomMessageHandler('mglSetUserData', mx.helpers.setUserData );
  Shiny.addCustomMessageHandler('mglHandlerDownloadVectorSource', mx.helpers.handlerDownloadVectorSource);
  Shiny.addCustomMessageHandler('mglGetOverlapAnalysis', mx.helpers.getOverlapAnalysis);
  Shiny.addCustomMessageHandler('mglGetValidateSourceGeom', mx.helpers.getValidateSourceGeom);
  Shiny.addCustomMessageHandler('mglInit', mx.helpers.initMapx );
  
  /**
  * Jed comands binding
  */
  Shiny.addCustomMessageHandler('jedInit',mx.helpers.jedInit);
  Shiny.addCustomMessageHandler('jedUpdate',mx.helpers.jedUpdate);
  Shiny.addCustomMessageHandler('jedTriggerGetValidation',mx.helpers.jedGetValidationById);
  Shiny.addCustomMessageHandler('jedTriggerGetValues',mx.helpers.jedGetValuesById);

});





