/*jshint esversion: 6 , node: true */
//'use strict';
import * as mx from './mx_init.js';

/**
* Read and evaluate story map
* @param {Object} o o.options
* @param {String} o.id Map id
* @param {String} o.idView View id. If no view is given, fetch one by id
* @param {Object} o.view A view object containing a story in data
* @param {Boolean} o.save Save the given view in localstorage by id
* @param 
*/ 
export function storyRead(o){

  /* Fetch view if not given */
  if(!o.view && o.id && o.idView ){
    var view =  mx.helpers.getViews(o);
    o.view = view;
  }

  /* If no story, quit*/
  if ( !mx.helpers.path(o,"view.data.story") ) {
    console.log("No story to handle, abord");
    return ;
  }
  /* local save : save in localforage instance */
  if( o.save ){
    handleLocalSave(o);      
  }

  /* close last story, stored in mx.data. */
  if(o.close){
    var close = mx.helpers.path(mx.data,"story.store.close");
    if(close instanceof Function){
      close();
    }
    return;
  }

  /**
   * Remvove registered listener
   */
  listenerManager(o,{
    action : 'removeAll'
  });


  o.enable = true;

  /**
   * Check missing and download view
   */
  checkMissingView(o)
    .then(function(){

      /* set id view  */
      o.idView = o.idView || o.view.id;

      /* display story controls */
      mx.helpers.storyController(o);



      /* Save data object */
      mx.data.story = o;

      /* Generate story ui */
      mx.helpers.storyBuild(o);

      /* enable editing */
      if( o.edit  === true ){
        initEditing(o);
      }

      /* Alter wrapper class */
      o.store.classWrapper = mx.helpers.path(o.view,"data.story.settings.class_wrapper");

      if( o.store.classWrapper ){
        initAdaptiveScreen(o);
      }

      /** 
       * Handle key events
       */
      if( ! o.edit ){
        initKeydownListener(o);
      }

      /* Listen to scroll on the main container. */
      storyOnScroll({
        selector: "#story",
        callback: mx.helpers.storyUpdateSlides,
        view: o.view,
        store : o.store,
        enable : o.enable
      });

      /* Set lock map pan to current value */
      mx.helpers.storyControlMapPan({
        recalc : true
      });

    });
}

/**
* Save the view object in local db
* @param {Object} o Story options
*/
function handleLocalSave(o){
  if(mx.data.stories){
    mx.data.stories.setItem(
      o.view.id,
      o.view
    ).then(function(){
      console.log("saved story id" + o.view.id + " with date modified set at " +o.view.date_modified );
    });
  }
}

/**
* Init listener for keydown event on window
# @param {Object} o Story options
*/
function initKeydownListener(o){
  listenerManager(o,{
    action : 'add',
    target : window,
    event : "keydown",
    listener : storyHandleKeyDown 
  });
}

/**
* Init values for screen adaptiveness/scaling function
* @param {Object} o story options
*/
function initAdaptiveScreen(o){

  var classBase = "mx-story-screen"; 
  var classWrapper = "mx-wrapper";
  var classWrapperStory = o.store.classWrapper;
  o.store.elWrapper = document.querySelector("." + classWrapper);

  var mapCanvas = o.store.map.getCanvas();
  o.store.elWrapper.classList.add(classWrapperStory);
  o.store.elWrapper.classList.add(classBase);
  o.store.classesWrapper = [classWrapperStory,classBase];
  mapCanvas.style.position = "relative";
  o.store.elWrapper.style.transform = "";
  o.store.map.resize();

  var elWrapperRect = o.store.elWrapper.getBoundingClientRect();
  var elWrapperHeight = elWrapperRect.height;
  var elWrapperWidth = elWrapperRect.width;

  o.store.setWrapperLayout =  function(o) {

    var w, h, scale, origin;
    var scaleWrapper = Math.min(
      window.innerWidth / elWrapperWidth,
      window.innerHeight / elWrapperHeight
    );
    o.store.scaleWrapper = scaleWrapper;
    o.store.elWrapper.style[mx.helpers.cssTransformFun()] = "translate(-50%, -50%) " + "scale(" + scaleWrapper + ")";

  };

}

/**
* Init editing function
* @param {Options} o story options
*/
function initEditing(o){

  Promise.all([
    System.import('ContentTools'),
    System.import('ContentTools/build/content-tools.min.css')
  ]).then(function(m){
    /*
     * Get ContentTools and set upload logic
     */
    var ContentTools = m[0];
    if(!ContentTools._init){
      ContentTools.IMAGE_UPLOADER = imageUploader;
      ContentTools.StylePalette.add([
        /* Table classes from bootstrap */
        new ContentTools.Style('Table base', 'table', ['table']),
        new ContentTools.Style('Table bordered', 'table-bordered', ['table']),
        new ContentTools.Style('Table striped', 'table-striped', ['table']),
        new ContentTools.Style('Table hover', 'table-hover', ['table']),
        /* custom mapx classes */
        new ContentTools.Style('Image cover', 'mx-image-cover', ['img']),
        new ContentTools.Style('Align right', 'align-right', ['img']),
        new ContentTools.Style('Align left', 'align-left',['img']),
        new ContentTools.Style('Center', 'block-center',['img']),
        new ContentTools.Style('Absolute top', 'absolute-top',['img']),
        new ContentTools.Style('Absolute left', 'absolute-left',['img']),
        new ContentTools.Style('Absolute right', 'absolute-right',['img']),
        new ContentTools.Style('Absolute bottom', 'absolute-bottom',['img']),
        new ContentTools.Style('Absolute 50% top', 'absolute-50-top',['img']),
        new ContentTools.Style('Absolute 50% left', 'absolute-50-left',['img']),
        new ContentTools.Style('Absolute 50% right', 'absolute-50-right',['img']),
        new ContentTools.Style('Absolute 50% bottom', 'absolute-50-bottom',['img'])
      ]);
      ContentTools._init = true;
    }
    /**
     * If not already set, create a new editor instance
     */
    if( !o.store.ct_editor ){

      o.store.ct_editor = ContentTools.EditorApp.get();

      /**
       * Add custom button logic
       */
      var elBtnModalPreview = document.getElementById("btnViewPreviewStory");
      var elBtnModalSave = document.getElementById("btnViewSaveStory");
      var elBtnStoryClose = document.getElementById("btnViewStoryCancel");
      var elModalEditView = document.getElementById("modalViewEdit");
      /**
       * Set a remove function for custom buttons
       */      
      o.store.ct_editor.remove = function(){
        o.store.ct_editor.destroy();      
      };

      /**
       * Init editor
       */
      o.store.ct_editor.init(
        '*[data-editable]', // class of region editable
        'data-name', // name of regions
        null, // fixture test
        true
      );

      /**
       * On start
       */
      o.store.ct_editor.addEventListener('start',function(ev){

        elBtnModalSave.setAttribute("disabled",true);
        elBtnModalPreview.setAttribute("disabled",true);
        elBtnStoryClose.setAttribute("disabled",true);
        elModalEditView.classList.add("mx-hide");
        /* If jed has an story editor, disable it during edition */
        if(jed.editors.storyEdit){
          jed.editors.storyEdit.disable();
        }

      });

      /**
       * On cancel
       */
      o.store.ct_editor.addEventListener('revert', function(ev) {

        elBtnModalSave.removeAttribute("disabled");
        elBtnModalPreview.removeAttribute("disabled");
        elModalEditView.classList.remove("mx-hide");
        elBtnStoryClose.removeAttribute("disabled");
        if(jed.editors.storyEdit){
          jed.editors.storyEdit.enable();
        }     
      });

      /**
       * On save
       */
      o.store.ct_editor.addEventListener('saved', function (ev) {
        var regions;

        elBtnModalSave.removeAttribute("disabled");
        elBtnModalPreview.removeAttribute("disabled");
        elBtnStoryClose.removeAttribute("disabled");
        elModalEditView.classList.remove("mx-hide");
        // Check that something changed
        regions = ev.detail().regions;
        if(jed.editors.storyEdit){
          jed.editors.storyEdit.enable();
        }
        if (Object.keys(regions).length == 0) {
          return;
        }

        if(jed.editors.storyEdit){
          var j = jed.editors.storyEdit;
          this.busy(true);

          for(var k in regions){
            var t =  regions[k];
            var s = k.split(":");
            var step = +s[0];
            var slide = +s[1];
            var lang = mx.settings.language;
            var e = j.getEditor("root.steps."+ step +".slides."+ slide + ".html." + lang);
            if(e && e.setValue){
              e.setValue(t);
            }
          }

          if(mx.data.stories){
            var story = j.getValue();
            var view = o.view;
            view.data.story = story;
            view.date_modified = +(new Date());

            mx.data.stories.setItem(
              o.idView,
              view
            ).then(function(){
              console.log("saved story id" + o.view.id + " with date modified set at " +o.view.date_modified );
            });
          }
          this.busy(false);
        }
      });
    }
  });
}


function imageUploader(dialog) {
  var file, image,url, xhr, height, width, type;

  /**
   * Cancel upload
   */
  dialog.addEventListener('imageuploader.cancelupload', function () {

    if (xhr) {
      xhr.upload.removeEventListener('progress', xhrProgress);
      xhr.removeEventListener('readystatechange', xhrComplete);
      xhr.abort();
    }

    dialog.state('empty');
  });

  /**
   * Clear image
   */
  dialog.addEventListener('imageuploader.clear', function () {
    // Clear the current image
    dialog.clear();
    image = null;
  });

  /**
   * File is loaded
   */
  dialog.addEventListener('imageuploader.fileready', function (ev) {
    var fileReader = new FileReader();
    file = ev.detail().file;
    type = file.type;
    image = new Image();
    fileReader.readAsDataURL(file);
    fileReader.addEventListener('load', function (e) {
      url  = e.target.result;
      image.src = url;
      image.onload = function(){
        width = this.width;
        height = this.height;
        setMaxWidth(1200,function(url,width,height){
          dialog.populate(url,[width,height]);
        });
      };
    });
  });

  /**
   * Insert image
   */
  dialog.addEventListener('imageuploader.save', function () {
    var canvas, ctx, form, blob;
    canvas = document.createElement("canvas");
    canvas.height = height;
    canvas.width = width;
    ctx = canvas.getContext("2d");
    ctx.drawImage(image,0,0);
    ctx.save();
    canvas.toBlob(function(blob){
      var form = new FormData();
      form.append("image",blob);
      form.append("width",width);
      form.append("height",height);   
      form.append("token",mx.helpers.path(mx,"settings.user.token")); 
      form.append("idUser",mx.helpers.path(mx,"settings.user.id")); 

      mx.helpers.sendData({
        url : mx.settings.vtUrlUploadImage,
        data : form,
        onProgress : function(progress){
          dialog.progress( progress * 100 );
        },
        onSuccess : function(data){
          dialog.save(
            data.url,
            data.size,
            {
              'alt': "img",
              'data-ce-max-width': data.size[0]
            });
        },
        onError: function(er){
          mx.helpers.modal({
            title : "Error during the upload",
            content : "An error occured during the upload : " + er,
            styleString : "z-index:11000"
          });
        }
      });

      // Set the dialog state to uploading and reset the progress bar to 0
      dialog.state('uploading');
      dialog.progress(0);
    },type||'image/jpeg', 0.95);
  });

  dialog.addEventListener('imageuploader.rotateccw', function () {

    dialog.busy(true);
    rotateImage(-90);
    dialog.busy(false);
  });

  dialog.addEventListener('imageuploader.rotatecw', function () {
    dialog.busy(true);
    rotateImage(90);
    dialog.busy(false);
  });


  function setMaxWidth(maxWidth,onLoad){
    
    var ratio, scale, canvas, ctx, newWidth, newHeight;
    
    ratio = height / width;
    scale = maxWidth / width;

    if( width <= maxWidth){
      onLoad(url,width,height);
    }else{
      newWidth = maxWidth;
      newHeight = newWidth * ratio;
      canvas = document.createElement('canvas');
      canvas.height = newHeight;
      canvas.width = newWidth;
      ctx = canvas.getContext("2d");
      ctx.save();
      ctx.drawImage(image, 
        0, 0,
        width , height, 
        0, 0, 
        newWidth, newHeight);
      ctx.restore(); 
      url = canvas.toDataURL();
      image.src = url;
      image.onload = function(){
        width = this.width;
        height = this.height; 
        onLoad(url,width,height);
      };    
    }
  }

  function rotateImage(degrees) {
    var angle, canvas, ctx, to_radians, x, y, origWidth,origHeight;
    angle = degrees % 360;
    to_radians = Math.PI / 180;
    canvas = document.createElement('canvas');

    origWidth = width;
    origHeight = height;
    if (angle === 90 || angle === -270 || angle === 270 || angle === -90) {
      width = origHeight;
      height = origWidth;
      x = width / 2;
      y = height / 2;
    } else if (angle === 180) {
      width = origWidth;
      height = origHeight;
      x = width / 2;
      y = height / 2;
    } else {
      width = Math.sqrt(Math.pow(origWidth, 2) + Math.pow(origHeight, 2));
      height = width;
      x = origHeight / 2;
      y = origWidth / 2;
    }

    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * to_radians);
    ctx.drawImage(image, -origWidth/2, -origHeight/2);
    ctx.restore();
    
    url = canvas.toDataURL();
    image.src = url;
    
    image.onload = function(){
      width = this.width;
      height = this.height; 
      dialog.populate(url,[width,height]);
    };
  }

}


/**
* Evaluate missing view and fetch them if needed
*/
function checkMissingView(o){

  var view = o.view;
  var m = mx.maps[o.id];
  var map = m.map;
  /*
   * Check if there is additional views
   */
  return new Promise(function(resolve,reject){

    var viewsStory = mx.helpers.path(view,"data.views");

    if(!viewsStory){
      resolve(true);
    }else{

      var viewsToAdd = [];
      var vtUrlViews = mx.settings.vtUrlViews;

      /**
       * Create a list of view to download
       * ( e.g. if they are from another country )
       */
      viewsStory.forEach(function(vs){
        var found = false;

        m.views.forEach(function(v){
          if( !found ){
            if( v.id == vs.id ){
              found = true;
            }
          }
        });

        if(!found){
          viewsToAdd.push(vs);
        }

      });

      /**
       * Fetch missing view assnychrounously
       */
      if( viewsToAdd.length == 0 ){
        resolve(true);
      }else{
        var viewsAdded = [];
        var vL = viewsToAdd.length ;

        viewsToAdd.forEach(function(v,i){
         
          var url =  vtUrlViews + v.id + "@" + v.pid; 
          console.log(url);

          mx.helpers.getJSON({
            url : url,
            onSuccess : function(view){
              /*
               * Add it to the view list
               */
              m.views = m.views.concat(view);
              /*
               * register source
               */
              mx.helpers.addSourceFromView({
                map : map,
                view : view,
                noLocationCheck : true
              });

              /**
              * Added : resolve if last one
              */
              viewsAdded.push(view);
              if(viewsAdded.length == vL){
                 resolve(true);
              }
            }});

        });
      }

    }

  });
}



/**
* Set scroll data values
* @param {Object} o Options 
* @param {Object} o.scrollData Scroll data to update
* @param {String} o.selector Selector of the scrollable
*/
function setScrollData(o){

  var data = o.onScrollData;
  var elScroll = document.querySelector(o.selector);
  var rectElScroll = elScroll.getBoundingClientRect();
  o.store.elScroll = elScroll;
  data.scaleWrapper = o.store.scaleWrapper;
  data.elScroll = elScroll;
  data.rectElScroll = rectElScroll;
  data.height =  rectElScroll.height;
  data.trigger = rectElScroll.height * 0.5;
  data.distTop = -1;
  data.distStart = elScroll.dataset.start_scroll;
  data.scrollFun  = mx.helpers.cssTransformFun();

}


/**
 * On scroll, do something
 * @param {Object} o Options
 * @param {String|Element} o.selector
 * @param {Function} o.callback Callback function. All options will be provided to this callback function
 */
function storyOnScroll(o) {

  var start,data, posNow, posLast;
  var nf = mx.helpers.onNextFrame;

  /*
   * Store start values
   */
  o.onScrollData = {};

  /*
   * Start loop
   */
  updateLayout();
  loop(); 
    /**
   * Trigger step config
   */
  listenerManager(o,{
    action : 'add',
    target : window,
    event : "resize",
    listener : updateLayout
  });

  function updateLayout(){
    o.store.setWrapperLayout(o);
    setScrollData(o);
    setStepConfig(o);
  }

  /*
   * Loop : run a function if scroll is done on an element
   */
  function loop() {
    if( o.store.enabled ){
      data = o.onScrollData;
      // NOTE: this is weird.  scrollTop does not reflect actual dimension but non scaled ones.
      posNow = data.elScroll.scrollTop * (data.scaleWrapper || 1) ;
      posLast = data.distTop;
      if ( posLast == posNow ) {
        nf(loop);
        return false;
      } else {
        o.onScrollData.distTop = posNow;
      }

      o.callback(o);
      nf(loop);
    }
  }
}

/**
* Set step config : dimention, number, bullets
*/
function setStepConfig(o){

  var data = o.onScrollData;
  var bullet, bullets, config, rect, slides, step, steps, stepName;
  var slideConfig;
  
  /*
   * Set bullet 
   */
  function bulletScrollTo() {
    var dest = this.dataset.step;
    mx.helpers.storyGoTo(dest);
  }

    /*
     * Steps configuration
     */

    data.stepsConfig = [];
    steps = data.elScroll.querySelectorAll(".mx-story-step");
    bullets = document.createElement("div");
    bullets.classList.add("mx-story-step-bullets");
    data.elScroll.appendChild(bullets);

    for (var s = 0; s < steps.length; s++) {

      /*
       * config init
       */
      config = {};
      step = steps[s];
      stepName = step.dataset.step_name;
      rect = step.getBoundingClientRect();
      slides = step.querySelectorAll(".mx-story-slide");
      config.slides = slides;
      config.slidesConfig = [];

      /*
       * Save step dimensions
       */
      config.end = (s+1)*rect.height;
      config.start = config.end - rect.height;
      config.startUnscaled = config.start * (1 / data.scaleWrapper);
      config.height = rect.height;
      config.width = rect.width;

      /*
       * Bullets init
       */
      bullet = document.createElement("div");
      bullet.classList.add("mx-story-step-bullet");
      bullet.dataset.to = config.startUnscaled;
      bullet.dataset.step = s;
      bullet.innerHTML = s+1;
      bullet.classList.add("hint--top");
      bullet.setAttribute("aria-label","Go to step " + (s+1) + ": " + stepName );
      bullets.appendChild(bullet);
      bullet.onclick = bulletScrollTo;
      config.bullet = bullet;

      if (s === 0){
        bullet
          .classList
          .add("mx-story-step-active");
      }

      /*
       * Evaluate slides and save in config
       */
      for (var l = 0; l < slides.length; l++) {
         slideConfig = JSON.parse(
          slides[l]
            .dataset
            .slide_config || '[]'
        );
        config.slidesConfig.push(slideConfig);

      }

      data.stepsConfig.push(config);

    }
    
    /*
    * Save steps config
    */
   o.store.stepsConfig = data.stepsConfig;

    /**
     * Set initial scroll position
     */
   if(o.onScrollData.distStart){
      data.elScroll.scrollTop = o.onScrollData.distStart*1;
    }

}

/*
 * Update slides transform value;
 * @param {Object} o options
 * @param {Object} o.onScrollData Data from onScroll function
 * @param {Object} o.view View object
 */
export function storyUpdateSlides(o) {

  /*
   * Apply style
   */
  var data = o.onScrollData;
  var percent = 0;
  var elsSlides, elSlide ;
  var config;
  var isActive, isInRange,isInRangeAnim, toActivate, toRemove;
  var classActive = "mx-story-step-active";

  for ( var s = 0,sL = data.stepsConfig.length ; s < sL; s++ ) {
      /**
      *   1       2       s       e       5       6
      *   |.......|.......|.......|.......|.......|
      *                t|.......|b
      */
    config = data.stepsConfig[s];
    percent = ( config.end - data.distTop) / ( config.height * 2 ) * 100;
    
    isInRange = percent < 75 && percent >= 25;
    isInRangeAnim = percent < 100 && percent >= 0;
    isActive = data.stepActive == s;
    toActivate = isInRange && !isActive;
    toRemove = !isInRange && isActive;

    /**
    * Update slide animation
    */
    if( isInRangeAnim ){

      elsSlides = config.slides;
       for( var l = 0, lL = config.slides.length; l<lL ; l++ ){
        var slideTransform = mx.helpers.storySetTransform({
          data: config.slidesConfig[l],
          percent: percent
        });
        config
           .slides[l]
           .style[data.scrollFun] = slideTransform;
      }
    }

    /**
    * Play step
    */
    if( toActivate ){
      mx.helpers.storyPlayStep({
        id : 'map_main',
        view : o.view,
        stepNum : s
      });
      data.stepActive = s;

      /**
       * Update bullet values
       */
      for( var b = 0,bL = data.stepsConfig.length ; b < bL; b++){
       
        var bullet = data.stepsConfig[b].bullet;
        if( b <= s ){
          bullet.classList.add("mx-story-step-active");
        }else{
          bullet.classList.remove("mx-story-step-active");
        }
      }
    }
  }
}

/*
 * listen for keydown
 */
function storyHandleKeyDown(event){

  event.preventDefault();
  event.stopPropagation();
  var h = mx.helpers;
  
  switch (event.key) {
    case " ":
      h.storyAutoplay("start");
      break;
    case "ArrowDown":
    case "ArrowRight":
      storyAutoplayStop(true);
      h.storyGoTo("next");
      break;
    case "ArrowUp":
    case "ArrowLeft":
      storyAutoplayStop(true);
      h.storyGoTo("previous");
      break;
    default : 
      return;
  }

}

export function storyGoTo(to,useTimeout,funStop){

  var h = mx.helpers;
  var data = h.path(mx,"data.story");
  if(!data || !data.store || !data.store.stepsConfig) return;
  var steps = h.path(data,"view.data.story.steps");
  var stepsDim = h.path(data,"store.stepsConfig");
  var elStory = data.store.elScroll;
  var start = elStory.scrollTop;
  var stop = 0;
  var timeout = 0;
  var currentStep = h.path(data,"store.currentStep") || 0;
  var step,maxStep, nextStep, previousStep, destStep,duration, easing, easing_p;

  maxStep = steps.length - 1;

  if(isFinite(to)){
    destStep = to >= maxStep ? maxStep : to < 0 ? 0 :to ; 
  }else if(to==="next" || to === "n"){
    nextStep = currentStep + 1;
    destStep = nextStep > maxStep ? 0 : nextStep ;
  }else if(to=="previous" || to === "p"){
    previousStep = currentStep - 1;
    destStep = previousStep < 0 ? maxStep : previousStep;
  }else{
    return;
  }

  stop =  stepsDim[destStep].startUnscaled;
  step = steps[currentStep];

  easing = h.path(step,"autoplay.easing") || "easeIn";
  duration =  h.path(step,"autoplay.duration") || 1000;
  easing_p = h.path(step,"autoplay.easing_power") || 1;

  if(useTimeout){
    timeout = h.path(step,"autoplay.timeout") || 1000;
  }

 return h.scrollFromTo({
    emergencyStop : funStop,
    timeout : timeout,
    el : elStory,
    from : start,
    to : stop,
    during : duration,
    using : h.easingFun({
      type: easing,
      power: easing_p
    })
  }).then(function(){
    return {
      step : destStep,
      end : destStep == maxStep
    };
  });

}

function storyAutoplayStop(stop){  
  var h = mx.helpers;
  var store = h.path(mx.data,"story.store");
  if( store ){
    if( typeof(stop) === "boolean" ){
      store.autoplayStop = stop;
    }
    return store.autoplayStop === true;
  }
}

export function storyAutoplay(cmd){
  var h = mx.helpers;
  var store = h.path(mx.data,"story.store");

  if(store){

    var stop = storyAutoplayStop();

    if( cmd === "start"){
      stop = !stop;
      if( !stop ){
        h.iconFlash("play");
        storyAutoplayStop(false);
      }
    }

    if( stop ){

      storyAutoplayStop(true);
      h.iconFlash("stop");
      return;

    }else{

      h.storyGoTo("next",true,storyAutoplayStop)
        .then(function(res){
          storyAutoplay("continue");
        });
    }
  }
}


/**
* Control map pan during story map
* @param {Object} o options
* @param {Boolean} o.recalc Revaluate the state stored in dataset
* @param {Boolean} o.unlock Unlock map pan
* @param {Boolean} o.toggle Inverse the current state
*/
export function storyControlMapPan(o){
  
  o = o||{};
  var toUnlock = true;
  var liBtn = document.getElementById("btnStoryUnlockMap");
  var btn = liBtn.querySelector("div");
  var story = document.getElementById("story");
  var isUnlock = liBtn.dataset.map_unlock === "on";

  if ( o.recalc ){
    toUnlock = isUnlock;
  } else if (o.unlock || o.toggle && !isUnlock){
    toUnlock = o.unlock;  
  } else {
    toUnlock = liBtn.dataset.map_unlock === "off";
  }

  liBtn.dataset.map_unlock = toUnlock?"on":"off";

  if(toUnlock){
    btn.classList.remove("fa-lock");
    btn.classList.add("fa-unlock");
    story.classList.add("mx-events-off");
  }else{
    btn.classList.add("fa-lock");
    btn.classList.remove("fa-unlock");
    story.classList.remove("mx-events-off");
  }
}

/*
* Enable or disable story map controls
* @param {Object} o options 
* @param {Object} o.store Story props and cache
* @param {Boolean} o.enable Enable / start story
*/
export function storyController(o){

  var h = mx.helpers;

  o.selectorDisable = o.selectorDisable || [
    "#mxDashboards",
    "#btnTabDashboard",
    "#btnToggleBtns",
    "#btnPrint",
    "#btnTabTools",
    "#btnThemeAerial",
    "#btnTabSettings",
    "#btnTabView",
    "#btnShowLanguage",
    "#btnShowCountry",
    "#btnShowLogin",
    "#btnZoomIn",
    "#btnZoomOut",
    "#btnFullscreen",
    ".mx-panel-views"
  ];
  o.selectorEnable = o.selectorEnable || [
    "#btnStoryUnlockMap",
    "#btnStoryClose",
    "#story"
  ];

  var elBtnClose =  document.querySelector("#btnStoryClose");
  var elBtnPreview =  document.querySelector("#btnViewPreviewStory");

  var toDisable = {
    selector : o.enable ? o.selectorDisable : o.selectorEnable,
    action : "add",
    class : "mx-hide"
  };

  var toEnable = {
    selector : o.enable ? o.selectorEnable : o.selectorDisable,
    action : "remove",
    class : "mx-hide"
  };

  h.classAction(toEnable);
  h.classAction(toDisable);

  o.id = o.id || "map_main";

  if( o.enable ){


    /**
    *Check for previews views list ( in case of update );
    */
    var oldViews = h.path(mx.data,"story.store.views");

    if(! (oldViews instanceof Array) ){
      oldViews =  mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: "MX-"
      });
    }

    /* Save current values */
    o.store = {
      enabled : true,
      map : mx.maps[o.id].map,
      views : oldViews,
      setWrapperLayout : function(o){},
      position : mx.helpers.getMapPos(o),
      currentStep : 0,
      hasAerial : mx.helpers.btnToggleLayer({
        id:'map_main',
        idLayer:'here_aerial',
        idSwitch:'btnThemeAerial',
        action:'hide'
      }),
      listeners : [],
      autoplayStop : true
    };

    /* Remove existing map-x layers */
    mx.helpers.removeLayersByPrefix({
      id:"map_main",
      prefix:"MX-"
    });


    o.store.close =  function(){
      if(this && this.hasAttribute && this.hasAttribute("disabled")) return;
      o.enable = false;
      storyController(o);
    };

    listenerManager(o,{
      action : 'add',
      target : elBtnClose,
      event : "click",
      listener : o.store.close
    });

  }else{

    /**
    * Remvove registered listener
    */
    listenerManager(o,{
      action : 'removeAll'
    });

    /**
     * Remove layers added by the story
     */
    h.removeLayersByPrefix({
      id:'map_main',
      prefix:"MX-",
    });

    /**
     * Get previous stored data
     */

    if( o.store  ){

      /**
      * Set the story as disabled
      */
    o.store.enabled = false;

      /**
       * if edit mode, remove editor
       */
      if( o.store.ct_editor && o.store.ct_editor.remove ){
        o.store.ct_editor.remove();
      }

      /**
       *
       */
      if(o.store.hasAerial){
        h.btnToggleLayer({
          id:'map_main',
          idLayer:'here_aerial',
          idSwitch:'btnThemeAerial',
          action:'show'
        });
      }

      /**
       * Enable previously enabled layers
       */
      o.store.views.forEach(function(idView){  
        h.addView({
          id : o.id,
          idView: idView,
          debug : true
        });
      });

      /**
       * Rest previous position
       */   
      if( o.store.position ){
        var pos =  o.store.position;
        o.store.map.jumpTo({
          zoom : pos.z,
          bearing : pos.b,
          pitch :  pos.p,
          center : [ pos.lng, pos.lat ] 
        });
      }

      /**
       * Remove classes added to wrapper
       */
      if( o.store.classesWrapper instanceof Array ){

        o.store.classesWrapper.forEach(function(c){
          o.store.elWrapper.classList.remove(c);    
        });

        o.store.elWrapper.style.transform = null;
        o.store.map.resize();
      }
      /**
       * clean data storage
       */

      if(mx.data.story){
        mx.data.story = {};
      }
    }
  }

  /**
   * If button preview exist, set disabled to false
   */

  if(elBtnPreview){
    elBtnPreview.removeAttribute("disabled"); 
  }

}

/**
* Listener manager
* @param {Object} o Story options
* @param {Object} config Config
* @param {Element} config.target Target element
* @param {Element} config.action `add`,`remove`,`removeAll`
* @param {String} config.event name
* @param {Function} config.listener Listener function
*/
function listenerManager(o,config){
  var c = config;
  var h = mx.helpers;
  if(c.action === 'add'){
    c.target.addEventListener(c.event,c.listener);
    c.destroy = function(){
      c.target.removeEventListener(c.event,c.listener);
    };
    o.store.listeners.push(c);
  }else{
    var listeners = h.path(o,"store.listeners") || h.path(mx.data,"story.store.listeners");
    if(listeners){
      listeners.forEach(function(l){
        l.destroy();
      });
    }
  }
}




/**
* Build story ui
*
*
*/
export function storyBuild(o){

  var story = mx.helpers.path(o,"view.data.story");
  if(!story || !story.steps || story.steps.length < 1) return;

  /**
  * Set default
  */
  o.idStory = o.idStory || "story";
  o.classStory =  o.classStory || "mx-story";
  o.classStep = o.classStep || "mx-story-step";
  o.classSlide = o.classSlide || "mx-story-slide";
  o.classWrapper = o.classWrapper || "mx-wrapper";
  o.classSlideBack = o.classSlideBack || "mx-story-slide-back";
  o.classSlideFront = o.classSlideFront || "mx-story-slide-front";
  o.classContainer = o.classContainer || "mx-story-container";
  o.colors = o.colors || {};
  o.sizes = o.sizes || {};
  o.sizes.text = o.sizes.text || 40;
  o.colors.bg = o.colors.bg || "#FFF";
  o.colors.fg = o.colors.fg || "#000";
  o.colors.alpha = o.colors.alpha || 1;
  
  /**
   * Story base div
   */
  var doc = window.document;
  var divOldStory = doc.getElementById(o.idStory);
  var startScroll = 0;
  var wrapper = doc.querySelector("." + o.classWrapper );
  var divStory = doc.createElement("div");
  var divStoryContainer = doc.createElement("div");
  //var stepNum = 0;

 /* remove old story if exists. */
  if(divOldStory){
    startScroll = divOldStory.scrollTop;
    divOldStory.remove();
  }

  divStoryContainer.dataset.start_scroll = startScroll;

  /* Add container and story classes */
  divStory.classList.add(o.classStory);
  divStoryContainer.classList.add(o.classContainer);
  divStoryContainer.id = o.idStory;

  /**
  * For each steps, build content
  */
  story.steps.forEach(function(step,stepNum){

    if(!step.slides) return ;
    var slides = step.slides ;
    var divStep = doc.createElement("div");
    divStep.classList.add(o.classStep);

    slides.forEach(function(slide,slideNum){
      var divSlide = doc.createElement("div");
      var divSlideFront = doc.createElement("div");
      var divSlideBack = doc.createElement("div");
      var lang = mx.helpers.checkLanguage({
        obj: slide,
        path: 'html'
      });
      divSlide.classList.add(o.classSlide);
      divSlideBack.classList.add(o.classSlideBack);
      divSlideFront.innerHTML = slide.html[lang];
      divSlideFront.classList.add(o.classSlideFront);
      /**
       * Add ref for contentTools editor
       */    
      divSlideFront.dataset.editable = true;
      divSlideFront.dataset.name = stepNum + ":" + slideNum;
       
      slide.classes.forEach(function(classe){
        divSlide.classList.add(o.classStory +"-"+ classe.name);
      });
      divSlideFront.style.color = slide.color_fg || o.colors.fg;
      divSlideFront.style.borderColor = slide.color_fg || o.colors.fg;
      divSlideFront.style.fontSize = slide.size_text + "px" || o.sizes.text + "px" ;
      divSlideFront.style.overflowY = slide.scroll_enable ? 'scroll' : 'hidden';
      divSlide.setAttribute("data-slide_config",JSON.stringify(slide.effects || []));
      divSlideBack.style.backgroundColor = slide.color_bg || o.colors.bg;
      divSlideBack.style.opacity = (slide.opacity_bg == 0) ? 0 : slide.opacity_bg || o.colors.alpha;
      divSlide.appendChild(divSlideBack);

      divSlide.appendChild(divSlideFront);
      divStep.appendChild(divSlide);
    });
    /* add step to steps */
    divStory.appendChild(divStep);
  });

  /**
  * Finish building by adding container  to wrapper.
  */
  divStoryContainer.appendChild(divStory);
  wrapper.appendChild(divStoryContainer);
}

/*
 * Set slide style translate based on dataset
 * @param {Object} o option
 * @param {Array} o.data Style config array
 * @param {Number} o.percent Percent of anim
 */
export function storySetTransform(o) {
  var tf = {
    0: function(p) {
      return "";
    },
    1: function(p) {
      return "translateX(" + p + "%)";
    },
    2: function(p) {
      return "translateY(" + p + "%)";
    },
    3: function(p) {
      return "translateZ(" + p + "px)";
    },
    4: function(p) {
      p = p * 3.6;
      return "rotateX(" + p + "deg)";
    },
    5: function(p) {
      p = p * 3.6;
      return "rotateY(" + p + "deg)";
    },
    6: function(p) {
      p = p * 3.6;
      return "rotateZ(" + p + "deg)";
    },
    7: function(p) {
      p = (p / 100) + 1;
      return "scale(" + p + ")";
    }
  };
  var tt = [];

  for (var i = 0; i < o.data.length; i++) {
    var d = o.data[i];
    var p = o.percent;
    var t = d.t;


    if (p <= d.s) p = d.s;
    if (p >= d.e) p = d.e;
    p = ((p - d.s + d.o) * d.f);

    tt.push(tf[t](p));


  }


  return tt.join(" ");

}



export function storyPlayStep(o){
  o = o || {};
  o.id = o.id||"map_main";
  var view =  o.view;
  var steps = mx.helpers.path(o,"view.data.story.steps");
  var store = mx.helpers.path(mx.data,"story.store");
  var stepNum = o.stepNum;
  var step, pos, anim, easing, vStep, vToAdd, vVisible, vToRemove;
  var m = mx.maps[o.id];

  store.currentStep = stepNum;

  function getViewsVisible(){
    return  mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: "MX-",
      base: true
    });
  }

  if(!steps){
    console.log("No steps found");
    return;
  }
  /**
   * retrieve step information
   */
  step = steps[stepNum];
  pos = step.position;
  anim = step.animation || {duration:1000,easing:"easeIn",easing_power:1,method:"easeTo"};
  vStep = step.views.map(function(v){return v.view;});
  easing = mx.helpers.easingFun({type:anim.easing,power:anim.easing_power});

  /**
   * Fly to position
   */
  m.map[anim.method]({
    duration: anim.duration,
    zoom : pos.z,
    easing : easing,
    bearing : pos.bearing,
    pitch :  pos.pitch,
    center : [ pos.lng, pos.lat ] 
  });

  /**
   * Add view if not alredy visible
   */
  mx.helpers.onNextFrame(function(){
    vVisible = getViewsVisible();

    vToRemove = mx.helpers.arrayDiff(vVisible,vStep);
    vToAdd = mx.helpers.arrayDiff(vStep,vVisible);

    vToAdd.forEach(function(v){
      mx.helpers.addView({
        id : o.id,
        idView: v
      }); 
    });

    vToRemove.forEach(function(v){
      mx.helpers.removeLayersByPrefix({
        id : o.id,
        prefix : v
      });
    });
  });

}





