


if (typeof(mgl) == "undefined") alert("mgl missing. Load it before mx_story.js");

mgl.helper.story = {};
mgl.helper.story.store = {};



/**
* Control map pan during story map
* @param {Object} o options
* @param {Boolean} o.recalc Revaluate the state stored in dataset
* @param {Boolean} o.unlock Unlock map pan
* @param {Boolean} o.toggle Inverse the current state
*/
mgl.helper.story.controlMapPan = function(o){
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
};



/**
* Read and evaluate story map
* @param {Object} o o.options
* @param {String} o.id Map id
* @param {String} o.idView View id. If no view is given, fetch one by id
* @param {Object} o.view A view object containing a story in data
* @param {Boolean} o.save Save the given view in localstorage by id
* @param 
*/ 
mgl.helper.story.read = function(o){

  /* Fetch view if not given */
  if(!o.view && o.id && o.idView ){
    var view =  mgl.helper.getViews(o);
    o.view = view;
  }

  if ( !path(o,"view.data.story") ) {
    console.log("No story to read, abord");
    return ;
  }

  /* set id view  */
  o.idView = o.idView || o.view.id;

/*  [> toggle main controls <]*/
    //mgl.helper.toggleControls({
      //hide : true,
      //skip : ["btnStoryUnlockMap","btnStoryClose"]
    /*});*/

    /* display story controls */
    mgl.helper.story.controller({
      enable : true
    });


  var db = mgl.data.stories; 
  
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
  mgl.helper.story.cache = {
    views : mgl.helper.getLayersNamesByPrefix({
      id: o.id,
      prefix: "MX-"
    }),
    position : mgl.helper.getMapPos(o),
    currentStep : 0,
    hasAerial : mgl.helper.btnToggleLayer({
      id:'map_main',
      idLayer:'here_aerial',
      idSwitch:'btnThemeAerial',
      action:'hide'
    })
  };
  
  /* Remove existing map-x layers */
  mgl.helper.removeLayersByPrefix({
    id:"map_main",
    prefix:"MX-"
  });

  /* Generate story ui */
  mgl.helper.story.build(o);

  /* Listen to scroll on the main container. */
  mgl.helper.story.onScroll({
    selector: "#story",
    callback: mgl.helper.story.updateSlides,
    view: o.view
  });

  /* Set lock map pan to current value */
  mgl.helper.story.controlMapPan({
    recalc:true
  });

};

/*
* Enable or disable story map controls
* @param {Object} o options 
* @param {String} o.selector Story control selector
* @param {Boolean} o.disable Disable/Hide story ?
*/
mgl.helper.story.controller = function(o){
  o.selectorDisable = o.selectorDisable || [
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
    ".tab-layers"
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

  mx.util.classAction(toEnable);
  mx.util.classAction(toDisable);


  o.id = o.id || "map_main";


  if(o.disable){
    /**
    * Remove layers added by the story
    */
    mgl.helper.removeLayersByPrefix({
      id:'map_main',
      prefix:"MX-"
    });
 
  }


   if(mgl.helper.story.cache && o.disable){
 
    /**
    * Get previous stored data
    */
    d = mgl.helper.story.cache;


    /**
    *
    */
    if(d.hasAerial){
      mgl.helper.btnToggleLayer({
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
      mgl.helper.addView({
        id : o.id,
        idView: d.views[l]
      });
    }
     /**
     * Rest previous position
     */   
    if(d.position){
      var pos =  d.position;

      m.map.flyTo({
        speed : 3,
        easing : mx.util.easingFun({type:"easeIn",power:1}),
        zoom : pos.z,
        bearing : pos.b,
        pitch :  pos.p,
        center : [ pos.lng, pos.lat ] 
      });


    }


  }


};


/**
* Build story ui
*
*
*/
mgl.helper.story.build =  function(o){

  var story = path(o,"view.data.story");

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
  var divOldStory = document.getElementById(o.idStory);
  var startScroll = 0;
  var body = document.body;
  var divStory = document.createElement("div");
  var divStoryContainer = document.createElement("div");
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
    var divStep = document.createElement("div");
    divStep.classList.add(o.classStep);
    divStep.dataset.step_num = stepNum++;
    slides.forEach(function(slide){
      var divSlide = document.createElement("div");
      var divSlideFront = document.createElement("div");
      var divSlideBack = document.createElement("div");
      var lang = mx.util.checkLanguage({
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
      divSlideBack.style.opacity = slide.opacity_bg || o.colors.alpha;
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
};

/*
 * Set slide style translate based on dataset
 * @param {Object} o option
 * @param {Array} o.data Style config array
 * @param {Number} o.percent Percent of anim
 */

mgl.helper.story.setTransform = function(o) {
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

};


/*
 * Update slides transform value;
 * @param {Object} o options
 * @param {Object} o.onScrollData Data from onScroll function
 * @param {Object} o.view View object
 */
mgl.helper.story.updateSlides = function(o) {
  var s, l;
  var bullet, bullets, bulletPlay, activate, axis, top, trigger, bottom, config, rect, slide, slides, slideConfig, step, steps, percent, stepNum;
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
        
       mx.util.srollFromTo({
         el : data.elScroll,
         from : start,
         to : end,
         during : 3000,
         using : "easeInOut"
       }); 
    };

    /*
     * Steps configuration
     */

    data.stepsConfig = [];
    data.views =
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
          mgl.helper.story.playStep({
            id : 'map_main',
            view : o.view,
            stepNum :s
          });
        }
      }

      slides = config.slides;

      for (l = 0; l < slides.length; l++) {
        var slideTransform = mgl.helper.story.setTransform({
          data: config.slidesConfig[l],
          percent: percent
        });
        slides[l].style[mx.util.cssTransformFun] = slideTransform;
      }
    }
  }
};



mgl.helper.story.playStep = function(o){
  o = o || {};
  o.id = o.id||"map_main";
  var view =  o.view;
  var steps = path(o,"view.data.story.steps");
  var stepNum = o.stepNum;
  var step, pos, views, vToShow, vVisible, vToRemove;

  function getViewsVisible(){
    return  mgl.helper.getLayersNamesByPrefix({
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
    speed : 0.5,
    easing : mx.util.easingFun({type:"easeOut",power:1}),
    zoom : pos.z,
    bearing : pos.bearing,
    pitch :  pos.pitch,
    center : [ pos.lng, pos.lat ] 
  });

  /**
   * Add view if not alredy visible
   */
  vVisible = getViewsVisible();


  for( v = 0; v < views.length ; v++){
    vn = views[v].view;
    fi = views[v].filter;

    if( vVisible.indexOf(vn) == -1 ){
      mgl.helper.addView({
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
    vo = vVisible[v];

    var toRemove =  vToShow.indexOf(vo) == -1;

    if( toRemove ){
      mgl.helper.removeLayersByPrefix({
        id : o.id,
        prefix : vo
      });
    }

  }

};



/**
 * On scroll, do something
 * @param {Object} o Options
 * @param {String|Element} o.selector
 * @param {Function} o.callback Callback function. All options will be provided to this callback function
 */
mgl.helper.story.onScroll = function(o) {


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
      mx.util.onNextFrame(loop);
      return false;
    } else {
      o.onScrollData.distTop = posNow;
      o.onScrollData.distBottom = posNow + o.onScrollData.height;
      o.onScrollData.distTrigger = posNow + o.onScrollData.trigger;
    }

    if (o.callback && o.callback.constructor == Function) {
      o.callback(o);
    }

    mx.util.onNextFrame(loop);

  }

  /*
   * init loop
   */
  loop();
};


