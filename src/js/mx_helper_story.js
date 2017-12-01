/*jshint esversion: 6 , node: true */
//'use strict';
import * as mx from './mx_init.js';

//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;



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

  if ( !mx.helpers.path(o,"view.data.story") ) {
    console.log("No story to read, abord");
    return ;
  }

  checkMissingView(o)
    .then(function(){

    /* set id view  */
    o.idView = o.idView || o.view.id;

    /* display story controls */
    mx.helpers.storyController({
      enable : true
    });

    var db = mx.data.stories; 

    if(o.save){
      /* save current view in db */
      db.setItem(
        o.idView,
        o.view
      ).then(function(){
        console.log("saved story id" + o.view.id + " with date modified set at " +o.view.date_modified );
      });
    }

    /* Save current values */
    mx.data.storyCache = {
      views : mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: "MX-"
      }),
      position : mx.helpers.getMapPos(o),
      currentStep : 0,
      hasAerial : mx.helpers.btnToggleLayer({
        id:'map_main',
        idLayer:'here_aerial',
        idSwitch:'btnThemeAerial',
        action:'hide'
      })
    };

    /* Remove existing map-x layers */
    mx.helpers.removeLayersByPrefix({
      id:"map_main",
      prefix:"MX-"
    });

    /* Generate story ui */
    mx.helpers.storyBuild(o);


    window.addEventListener("keydown", storyHandleKeyDown );


    /* Listen to scroll on the main container. */
    mx.helpers.storyOnScroll({
      selector: "#story",
      callback: mx.helpers.storyUpdateSlides,
      view: o.view
    });

    /* Set lock map pan to current value */
    mx.helpers.storyControlMapPan({
      recalc:true
    });

  });
}

function checkMissingView(o){

  var view =  o.view;
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
         
          var url =  vtUrlViews + v.id + "/row/" + v.pid; 
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
 * On scroll, do something
 * @param {Object} o Options
 * @param {String|Element} o.selector
 * @param {Function} o.callback Callback function. All options will be provided to this callback function
 */
export function storyOnScroll(o) {

  /*
   * store scroll data in object onScrollData
   * elScroll : div to get/set the scroll position
   * contentHeight : the content height
   * height : the visible part of elScroll
   * trigger : the trigger position
   * distTop,distBottom,distTrigger,distStart : initials distances 
   */
  var elScroll = document.querySelector(o.selector);
  if(!elScroll) console.log(o.selector + "not found");

  o.onScrollData = {
    elScroll: elScroll,
    contentHeight: elScroll.firstElementChild.clientHeight,
    height: elScroll.clientHeight,
    trigger: elScroll.clientHeight * 0.5,
    distTop: -1,
    distBottom: -1,
    distTrigger: -1,
    distStart: elScroll.dataset.start_scroll
  };


  /*
   * Loop : run a function if scroll is done on an element
   */
  function loop() {

    var posNow = elScroll.scrollTop;
    var posLast = o.onScrollData.distTop;

    if (posLast == posNow) {
      mx.helpers.onNextFrame(loop);
      return false;
    } else {
      o.onScrollData.distTop = posNow;
      o.onScrollData.distBottom = posNow + o.onScrollData.height;
      o.onScrollData.distTrigger = posNow + o.onScrollData.trigger;
    }

    if (o.callback && o.callback.constructor == Function) {
      o.callback(o);
    }

    mx.helpers.onNextFrame(loop);

  }

  /*
   * init loop
   */
  loop();
}


/*
 * Update slides transform value;
 * @param {Object} o options
 * @param {Object} o.onScrollData Data from onScroll function
 * @param {Object} o.view View object
 */
export function storyUpdateSlides(o) {
  var s, l;
  var bullet, bullets, top, trigger, bottom, config, rect, slide, slides, slideConfig, step, steps, percent, stepNum;
  var data = o.onScrollData;

  /*
   * Initial configuration
   */
  if (!data.stepsConfig) {

    /*
     * local functions
     */
    var getBulletScrollTo = function() {
      var start = data.elScroll.scrollTop;
      var end = this.dataset.to;
        
       mx.helpers.scrollFromTo({
         el : data.elScroll,
         from : start,
         to : end,
         during : 1000,
         using : mx.helpers.easingFun({type:"easeInOut",power:2})
       }); 

    };

    /*
     * Steps configuration
     */

    data.stepsConfig = [];
    steps = data.elScroll.querySelectorAll(".mx-story-step");
    bullets = document.createElement("div");
    bullets.classList.add("mx-story-step-bullets");
    data.elScroll.appendChild(bullets);


    for (s = 0; s < steps.length; s++) {

      /*
       * config init
       */
      config = {};
      step = steps[s];
      rect = step.getBoundingClientRect();
      slides = step.querySelectorAll(".mx-story-slide");
      config.slides = slides;
      config.slidesConfig = [];

      /*
       * Save step dimension
       */
      config.start = rect.top;
      config.end = rect.bottom;
      config.height = rect.height;
      config.width = rect.width;


      /*
       * Bullets init
       */
      bullet = document.createElement("div");

      bullet.classList.add("mx-story-step-bullet");


      bullet.dataset.to = config.start;
      bullet.dataset.step = s;
      bullet.innerHTML = s+1;
      bullet.classList.add("hint--top");
      bullet.setAttribute("aria-label","Go to step " + (s+1));
      bullets.appendChild(bullet);
      bullet.onclick = getBulletScrollTo;
      config.bullet = bullet;


      if (s === 0){
        bullet
          .classList
          .add("mx-story-step-active");
      }

      /*
       * Evaluate slides and save in config
       */
      for (l = 0; l < slides.length; l++) {
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
    mx.data.storyCache.stepsConfig = data.stepsConfig;
    /**
     * Set initial scroll position
     */
    if(o.onScrollData.distStart){
      data.elScroll.scrollTop = o.onScrollData.distStart*1;
    }
  }


  /*
   * Apply style
   */

  top = data.distTop;
  bottom = data.distBottom;
  trigger = data.distTrigger;

  for (s = 0; s < data.stepsConfig.length; s++) {

    config = data.stepsConfig[s];

    if (config.start < bottom) {
      config
        .bullet
        .classList
        .add("mx-story-step-active");
    } else {
      config
        .bullet
        .classList
        .remove("mx-story-step-active");
    }

    if (config.start <= bottom && config.end >= top) {

      percent = 100 * (1 - (config.end - top) / (data.height + config.height));


      if( percent < 75 && percent >= 25 ){
        if(data.stepActive !== s){
          data.stepActive = s;
          mx.helpers.storyPlayStep({
            id : 'map_main',
            view : o.view,
            stepNum :s
          });
        }
      }

      slides = config.slides;

      for (l = 0; l < slides.length; l++) {
        var slideTransform = mx.helpers.storySetTransform({
          data: config.slidesConfig[l],
          percent: percent
        });
        slides[l].style[mx.helpers.cssTransformFun()] = slideTransform;
      }
    }
  }
}





/*
 * listen for keydown
 */



function storyHandleKeyDown(event){

  mx.helpers.onNextFrame(function(){

    if (event.defaultPrevented) {
      return; // Do nothing if the event was already processed
    }
    var step,currentStep,nextStep,previousStep,maxStep,scrollStop;  
    var steps = mx.helpers.path(mx,"data.storyCache.stepsConfig");
    var storyContainer =  document.querySelector(".mx-story-container");
    var scrollStart = storyContainer.scrollTop;

    for(var i=0,iL=steps.length;i<iL;i++){
      step = steps[i];
      if((scrollStart >= step.start) && (scrollStart < step.end)){
        currentStep=i;
      }
    }

    maxStep = steps.length -1;
    nextStep = currentStep + 1 ;
    previousStep = currentStep - 1 ;
    nextStep = nextStep >= maxStep ? maxStep : nextStep;
    previousStep = previousStep <= 0 ? 0 : previousStep;

    switch (event.key) {
      case "ArrowDown":
        scrollStop = steps[nextStep].start;
        break;
      case "ArrowUp":
        scrollStop = steps[previousStep].start;
        break;
      case "ArrowLeft":
        scrollStop = steps[previousStep].start;
        break;
      case "ArrowRight":
        scrollStop = steps[nextStep].start;
        break;
    } 

    mx.helpers.scrollFromTo({
      el : storyContainer,
      from : scrollStart,
      to : scrollStop,
      during : 1000,
      using : mx.helpers.easingFun({type:"easeInOut",power:2})
    });

  });

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
* @param {String} o.selector Story control selector
* @param {Boolean} o.disable Disable/Hide story ?
*/
export function storyController(o){
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


  o.disable = !o.enable;

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

  mx.helpers.classAction(toEnable);
  mx.helpers.classAction(toDisable);


  o.id = o.id || "map_main";


  if(o.disable){
    /**
    * Remove layers added by the story
    */
    console.log("remove story layers");
    mx.helpers.removeLayersByPrefix({
      id:'map_main',
      prefix:"MX-"
    });
 
  }


   if(mx.data.storyCache && o.disable){
 
    /**
    * Get previous stored data
    */
    var d = mx.data.storyCache;


    /**
    *
    */
    if(d.hasAerial){

      mx.helpers.btnToggleLayer({
        id:'map_main',
        idLayer:'here_aerial',
        idSwitch:'btnThemeAerial',
        action:'show'
      });
    }

    /**
     * Enable previously enabled layers
     */
    for( var l = 0 ; l < d.views.length ; l ++){

      mx.helpers.addView({
        id : o.id,
        idView: d.views[l]
      });
    }
     /**
     * Rest previous position
     */   
    if(d.position){
      var pos =  d.position;
      var map = mx.maps[o.id].map;
      map.easeTo({
        //speed : 3,
        easing : mx.helpers.easingFun({type:"easeOut",power:1}),
        zoom : pos.z,
        bearing : pos.b,
        pitch :  pos.p,
        center : [ pos.lng, pos.lat ] 
      });


    /**
    * Update packery layout
    */
    if( mx.maps[o.id].tools.viewsListPackery ){
      mx.maps[o.id].tools.viewsListPackery.shiftLayout();
    }

      /**
      * Remove listener
      */
     window.removeEventListener("keydown",storyHandleKeyDown);

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
  o.classSlideBack = o.classSlideBack || "mx-story-slide-back";
  o.classSlideFront = o.classSlideFront || "mx-story-slide-front";
  o.classContainer = o.classContainer || "mx-story-container";
  o.colors = o.colors || {};
  o.sizes = o.sizes || {};
  o.sizes.text = o.sizes.text || 100;
  o.colors.bg = o.colors.bg || "#FFF";
  o.colors.fg = o.colors.fg || "#000";
  o.colors.alpha = o.colors.alpha || 1;
  
  /**
   * Story base div
   */
  var doc = window.document;
  var divOldStory = doc.getElementById(o.idStory);
  var startScroll = 0;
  var body = doc.body;
  var divStory = doc.createElement("div");
  var divStoryContainer = doc.createElement("div");
  var stepNum = 0;

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
  story.steps.forEach(function(step){

    if(!step.slides) return ;
    var slides = step.slides ;
    var divStep = doc.createElement("div");
    divStep.classList.add(o.classStep);
    divStep.dataset.step_num = stepNum++;
    slides.forEach(function(slide){
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
      slide.classes.forEach(function(classe){
        divSlide.classList.add(o.classStory +"-"+ classe.name);
      });
      divSlideFront.style.color = slide.color_fg || o.colors.fg;
      divSlideFront.style.zoom = slide.size_text+"%" || o.sizes.text+"%";
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
  * Finish building by adding container  to body.
  */
  divStoryContainer.appendChild(divStory);
  body.appendChild(divStoryContainer);
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
  var stepNum = o.stepNum;
  var step, pos, views, vToShow, vVisible, vToRemove;
  var m = mx.maps[o.id];

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
  views = step.views;
  vToShow = [];

  /**
   * Fly to position
   */
  m.map.flyTo({
    speed : 0.3,
    easing : mx.helpers.easingFun({type:"easeOut",power:1}),
    zoom : pos.z,
    bearing : pos.bearing,
    pitch :  pos.pitch,
    center : [ pos.lng, pos.lat ] 
  });

  /**
   * Add view if not alredy visible
   */
  vVisible = getViewsVisible();


  for( var v = 0; v < views.length ; v++){
    var vn = views[v].view;
    var fi = views[v].filter;

    if( vVisible.indexOf(vn) == -1 ){
      mx.helpers.addView({
        id : o.id,
        idView: vn
      }); 
    }

    vToShow.push(vn);
  }

  vVisible = getViewsVisible() ;

  /**
   * old view to remove
   */
  for( v = 0; v < vVisible.length ; v++){
    var vo = vVisible[v];

    var toRemove =  vToShow.indexOf(vo) == -1;

    if( toRemove ){
      mx.helpers.removeLayersByPrefix({
        id : o.id,
        prefix : vo
      });
    }

  }

}





