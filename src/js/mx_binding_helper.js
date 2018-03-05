/*jshint esversion: 6 , node: true */
//'use strict';
import * as mx from './mx_init.js';

$(document).on('shiny:connected', function(event) {

  /*
  * Input
  */
  Shiny.onInputChange('cookies', mx.helpers.readCookie());

  /*
  * Output
  */

  Shiny.addCustomMessageHandler('mglInit', mx.helpers.initMapx );
  Shiny.addCustomMessageHandler("mxUpdateLanguage", mx.helpers.updateLanguage);
  Shiny.addCustomMessageHandler("mxSetCookie",mx.helpers.writeCookie);
  Shiny.addCustomMessageHandler('mxModal', mx.helpers.modal);
  Shiny.addCustomMessageHandler('mxSetTemplates', mx.helpers.setTemplates);
  Shiny.addCustomMessageHandler('mxSetElementAttribute', mx.helpers.setElementAttribute);
  Shiny.addCustomMessageHandler("mxSetImageAttributes", mx.helpers.setImageAttributes);
  Shiny.addCustomMessageHandler("mxUiHide", mx.helpers.hide);
  Shiny.addCustomMessageHandler("mxUpdateText", mx.helpers.updateText);
  Shiny.addCustomMessageHandler("mxJsDebugMsg", mx.helpers.jsDebugMsg);
  Shiny.addCustomMessageHandler("mxButtonToggle", mx.helpers.buttonToggle);
  Shiny.addCustomMessageHandler("mxJsonToObj", mx.helpers.jsonToObj);
  Shiny.addCustomMessageHandler("mxJsonToHtml", mx.helpers.objectToHTML);
  Shiny.addCustomMessageHandler("mxProgress",mx.helpers.progressScreen);
  Shiny.addCustomMessageHandler("mxInjectHead",mx.helpers.injectHead);
  Shiny.addCustomMessageHandler("mxUpdateSelectizeItems",mx.helpers.updateSelectizeItems);
  Shiny.addCustomMessageHandler('mglRenderViewsList', mx.helpers.renderViewsList ); 
  Shiny.addCustomMessageHandler('mglSetFilter', mx.helpers.setFilter );
  Shiny.addCustomMessageHandler('mglAddLayer',  mx.helpers.addLayer );
  Shiny.addCustomMessageHandler('mglFlyTo', mx.helpers.flyTo );
  Shiny.addCustomMessageHandler('mglSyncAllMaps', mx.helpers.syncAll );
  Shiny.addCustomMessageHandler('jedInit',mx.helpers.jedRender);
  Shiny.addCustomMessageHandler('jedUpdate',mx.helpers.jedUpdate);
  Shiny.addCustomMessageHandler('mglSetSourcesFromViews',mx.helpers.setSourcesFromViews );
  Shiny.addCustomMessageHandler('mglRemoveView', mx.helpers.removeView );
  Shiny.addCustomMessageHandler('mglGetLocalForageData', mx.helpers.getLocalForageData );
  Shiny.addCustomMessageHandler('mglAddView', mx.helpers.addView );
  Shiny.addCustomMessageHandler('mglReadStory', mx.helpers.storyRead );
  Shiny.addCustomMessageHandler('mglReset', mx.helpers.reset );
  Shiny.addCustomMessageHandler('mglSetUserData', mx.helpers.setUserData );
});





