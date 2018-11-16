/*jshint esversion: 6 , node: true */
//'use strict';
//import * as mx from './mx.js';

$(document).on('shiny:connected', function(event) {

  /*
  * Input
  */
  Shiny.onInputChange('browserData',mx.helpers.getBrowserData());

  /*
  * Output
  */

  Shiny.addCustomMessageHandler('mglInit', mx.helpers.initMapx );
  Shiny.addCustomMessageHandler("mxUpdateLanguage", mx.helpers.updateLanguage);
  Shiny.addCustomMessageHandler("mglUpdateAllViewsSourceMetadata",
    mx.helpers.updateAllViewsSourceMetadata
  );
  Shiny.addCustomMessageHandler("mxSetCookie",mx.helpers.writeCookie);
  Shiny.addCustomMessageHandler('mxModal', mx.helpers.modal);
  Shiny.addCustomMessageHandler('mxSetTemplates', mx.helpers.setTemplates);
  Shiny.addCustomMessageHandler('mxSetElementAttribute', mx.helpers.setElementAttribute);
  Shiny.addCustomMessageHandler("mxSetImageAttributes", mx.helpers.setImageAttributes);
  Shiny.addCustomMessageHandler("mxUiHide", mx.helpers.hide);
  Shiny.addCustomMessageHandler("mxObjToState", mx.helpers.objToState);
  Shiny.addCustomMessageHandler("mxUpdateText", mx.helpers.updateText);
  Shiny.addCustomMessageHandler("mxEpsgBuildSearchBox", mx.helpers.epsgBuildSearchBox);
  Shiny.addCustomMessageHandler("mxJsDebugMsg", mx.helpers.jsDebugMsg);
  Shiny.addCustomMessageHandler("mxButtonToggle", mx.helpers.buttonToggle);
  Shiny.addCustomMessageHandler("mxJsonToObj", mx.helpers.jsonToObj);
  Shiny.addCustomMessageHandler("mxJsonToHtml", mx.helpers.objectToHTML);
  Shiny.addCustomMessageHandler("mxProgress",mx.helpers.progressScreen);
  Shiny.addCustomMessageHandler("mxRenderUserProjectsList",mx.helpers.renderUserProjectsList);
  Shiny.addCustomMessageHandler("mxInjectHead",mx.helpers.injectHead);
  Shiny.addCustomMessageHandler("mxUpdateSelectizeItems",mx.helpers.updateSelectizeItems);
  Shiny.addCustomMessageHandler('mglRenderViewsList', mx.helpers.renderViewsList ); 
  Shiny.addCustomMessageHandler('mglSetFilter', mx.helpers.setFilter );
  Shiny.addCustomMessageHandler('mglAddLayer',  mx.helpers.addLayer );
  Shiny.addCustomMessageHandler('mglFlyTo', mx.helpers.flyTo );
  Shiny.addCustomMessageHandler('mxFlashIcon', mx.helpers.iconFlash);
  Shiny.addCustomMessageHandler('mglSyncAllMaps', mx.helpers.syncAll );
  Shiny.addCustomMessageHandler('jedInit',mx.helpers.jedRender);
  Shiny.addCustomMessageHandler('jedUpdate',mx.helpers.jedUpdate);
  Shiny.addCustomMessageHandler('mglSetSourcesFromViews',mx.helpers.setViewsList );
  Shiny.addCustomMessageHandler('mglRemoveView', mx.helpers.removeView );
  Shiny.addCustomMessageHandler('mglGetLocalForageData', mx.helpers.getLocalForageData );
  Shiny.addCustomMessageHandler('mglAddView', mx.helpers.addView );
  Shiny.addCustomMessageHandler('mglReadStory', mx.helpers.storyRead );
  Shiny.addCustomMessageHandler('mglReset', mx.helpers.reset );
  Shiny.addCustomMessageHandler('mglSetUserData', mx.helpers.setUserData );
  Shiny.addCustomMessageHandler('mglHandlerDownloadVectorSource', mx.helpers.handlerDownloadVectorSource);
  Shiny.addCustomMessageHandler('mglGetOverlapAnalysis', mx.helpers.getOverlapAnalysis);


  //Shiny.addCustomMessageHandler('mglTriggerUploadForm', mx.helpers.triggerUploadForm);

});





