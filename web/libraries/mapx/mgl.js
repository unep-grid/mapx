/**
 * MGL 
 * 
 *  mapx mapbox gl helper
 *
 * Author : Fred Moser
 * Year   : 2017
 * Copyright : 
 */

if (typeof(doT) == "undefined") alert("We need doT.js before mgl.js");
if (typeof(mapboxgl) == "undefined") alert("We need mabox-gl-js before mgl.js");
if (typeof(localforage) == "undefined") alert("We need localforage before mgl.js");
if (typeof(Chartist) == "undefined") alert("We need Chartist before mgl.js");
if (typeof(turf) == "undefined") alert("We need Chartist before mgl.js");

/**
 * Main mgl object
 */
var mgl = {};
/**
 * functions / methods
 */

mgl.helper = {};

/**
* Map related data. 
* ex. mgl.maps.map_main:
* 
*  - listener = listener function. eg. click on view list
*  - map = mapbox gl js map object
*  - options = store map options like defaults, ids of elements, languages, etc.
*  - style = the main style of the map
*  - (removed) themes = Additional rules to theme the map
*  - tools = object produced by dependencies, like list.js
*  - views = list of mapx-views
*
*/
mgl.maps = {};

/**
* settings
* TODO : use mx object to store settings.
*/
mgl.settings = {};
mgl.settings.separators = {};
mgl.settings.separators.sublayer = "_@_";
mgl.settings.country="";
mgl.settings.vtUrl= "http://localhost:3030/tile/{z}/{x}/{y}.mvt";
/**
* Data unrelated to specific map
*/
mgl.data = {};
mgl.data.geojson = localforage.createInstance({
    name: "geojson"
});

mgl.data.images = localforage.createInstance({
    name: "images"
});

mgl.data.stories = localforage.createInstance({
    name: "stories"
});
/**
* Controls
*/
mgl.control = {};




/**
* Create the prototype containing additional control / button.
* Some of the actions are related to shiny framework
*/
mgl.control.main = function(){};
mgl.control.main.prototype.onAdd = function(map) {

  mgl.helper.toggleControls = function(o){
    o = o || {};
    var hide = o.hide || !btns.btnToggleBtns.hidden;
    var action = hide ? 'add':'remove';  
    var idToggle = ["#tabLayers","#tabTools","#tabSettings"];
    var idSkip = ["btnStoryUnlockMap","btnStoryClose","btnToggleBtns"];
    btns.btnToggleBtns.hidden = hide;

    for(var key in btns){  
      if(idSkip.indexOf(key) == -1){
        idToggle.push("#"+key);
      }
    }

    mx.util.classAction({
      selector:idToggle,
      action:action,
      class:'mx-hide-bis'
    });
  };

  btns = {
    btnToggleBtns:{
      classes:"fa fa-bars",
      key:"btn_togle_btns",
      hidden:false,
      action:mgl.helper.toggleControls
    },
    btnShowLogin:{
      classes:"fa fa-sign-in",
      key:"btn_login",
      action:function(){ 
        val = {
          time : new Date(),
          value : 'showLogin' 
        };
        Shiny.onInputChange('btn_control', val);
      }
    },
    btnShowCountry:{
      classes:"fa fa-globe",
      key:"btn_country",
      action:function(){
        val = {
          time : new Date(),
          value : 'showCountry' 
        };
        Shiny.onInputChange('btn_control', val);
      }
    },
    btnShowLanguage:{
      classes:"fa fa-language",
      key:"btn_language",
      action:function(){ 
        val = {
          time : new Date(),
          value : 'showLanguage' 
        };
        Shiny.onInputChange('btn_control', val);
      }
    },
    btnTabView:{
      classes:"fa fa-newspaper-o",
      key:"btn_tab_views",
      action:function(){ 
        mx.util.tabEnable('tabs-main','tab-layers');
      }
    },
    btnTabSettings:{
      classes:"fa fa-sliders",
      key:"btn_tab_settings",
      action:function(){ 
        mx.util.tabEnable('tabs-main','tab-settings');
      }
    },
    btnTabTools:{
      classes:"fa fa-cogs",
      key:"btn_tab_tools",
      action:function(){ 
        mx.util.tabEnable('tabs-main','tab-tools');
      }
    },

    btnPrint:{
      classes:"fa fa-print",
      key:"btn_print",
      action:function(){
        var png = map.getCanvas().toDataURL();
        download(png,"mx-export.png");
      }
    },
    btnFullscreen:{
      classes:"fa fa-expand",
      key:"btn_fullscreen",
      action:function(){
        toggleFullScreen('btnFullScreen');
      }
    },
    btnThemeAerial:{
      classes:"fa fa-plane",
      key:"btn_theme_sat",
      action:function(){  
        mgl.helper.btnToggleLayer({
          id:'map_main',
          idLayer:'here-aerial',
          idSwitch:'btnThemeAerial',
          action:'toggle'
        });
      }
    },
    btnStoryUnlockMap:{
      classes: "fa fa-lock",
      liClasses: "mx-hide",
      liData: {"map_unlock":"off"},
      key: "btn_story_unlock_map", 
      action : mgl.helper.story.controlMapPan 
    },
    btnStoryClose:{
      classes:"fa fa-close",
      liClasses:"mx-hide",
      key:"btn_story_close",
      action:function(){  
        mgl.helper.story.controller({
          enable : false
        });
        mgl.helper.toggleControls({
          hide : false
        });
      }
    },
    btnZoomIn:{
      classes:"fa fa-plus",
      key:"btn_zoom_in",
      action:function(){
        map.zoomIn();
      }
    },
    btnZoomOut:{
      classes:"fa fa-minus",
      key:"btn_zoom_out",
      action:function(){
        map.zoomOut();
      }
    }

  }; 

  function createList(){
    var ulAll, id, btn, elBtn;
    ulAll =  document.createElement("ul");
    ulAll.className = "mx-controls-ul";
    for( id in btns ){
      btn = btns[id];
      
      el = document.createElement("li");
      elBtn = document.createElement("div");

      if(btn.liClasses) el.className = btn.liClasses;
      if(btn.classes) elBtn.className = btn.classes;
      if(btn.liData) for(var k in btn.liData){el.dataset[k]=btn.liData[k];}
      el.id = id;
      el.appendChild(elBtn);
      el.dataset.lang_key = btn.key;
      el.dataset.lang_type = "tooltip";
      el.classList.add("mx-pointer");
      el.classList.add("shadow");
      el.classList.add("hint--bottom");
      el.onclick = btn.action;
      ulAll.appendChild(el);
    }
    return(ulAll);
  }

  btnList = createList();

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};
mgl.control.main.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};


/**
 * Get local forage item and send it to shiny server
 * @param {Object} o options
 * @param {String} o.idStore Id/Name of the store
 * @param {String} o.idKey Key to retrieve
 * @param {String} o.idInput Which id to trigger in Shiny
 */
mgl.helper.getLocalForageData = function(o){
  var db = mgl.data[o.idStore];
  db.getItem(o.idKey).then(function(item){
    Shiny.onInputChange(o.idInput,{
      item : item,
      time : (new Date())
    });
  });
};

/** 
* Add source from view object 
* @param {Object} o options
* @param {Object} o.m Mgl maps item e.g. mgl.maps.map_main
* @param {oject} o.view View object
*/
mgl.helper.addSourceFromView = function(o){

  if(o.m && path(o.view,"data.source")){

    if( o.view.country  == mgl.settings.country ){
      sourceId = o.view.id + "-SRC";
      sourceExists = !!o.m.map.getSource(sourceId);

      if( sourceExists ) {
        o.m.map.removeSource( sourceId ) ;
      }

      if(o.view.type == "vt"){
        baseUrl = mgl.settings.vtUrl;
        url =  baseUrl + "?view=" + o.view.id + "&date=" + o.view.date_modified ;
        o.view.data.source.tiles = [url,url] ;
      }

      o.m.map.addSource(
        sourceId,
        o.view.data.source
      );
    }
  }
};


/**
* Save view list to views

* @param {object} o options
* @param {object} o.viewList views list
* @param {string} o.id ID of the map 
* @param {boolean} o.add Append to existing
* @param {string} o.country code
* @param {function} o.feedback Feedback function
*/
mgl.helper.setSourcesFromViews = function(o){

  var m = mgl.maps[o.id];
  var view, views, sourceId, sourceExists, sourceStore;
  var isArray, hasViews;

  if(m){

    views = o.viewsList ;
    isFullList = views instanceof Array ;
    hasViews = m.views.length > 0;

    if( !o.feedback ) o.feedback = mgl.helper.renderViewsList;

    if( isFullList ){ 
      /**
       * if there is multiple view in array, use them as main views list.
       * Set country, add each views to sources and feedback.
       */
      m.views = views;
      /**
       * remove existing layers
       */
      mgl.helper.removeLayersByPrefix({
        id:o.id,
        prefix:"MX-"
      });
      /**
       * Reset the current country
       */
      if( o.country ) mgl.settings.country = o.country;

      /**
       * Init 
       */
      for( var i = 0 ; i < m.views.length ; i++ ){
        /**
         * add source from views list
         */
        mgl.helper.addSourceFromView({
          m : m,
          view : m.views[i]
        });


      }

      o.feedback({
        id : o.id,
        views : m.views
      });

      /**
       * extract views from local storage
       */
      mgl.data.geojson.iterate(function( value, key, i ){
        view = value.view;
        if( view.country == mgl.settings.country ){
          m.views.unshift(value.view);


          mgl.helper.addSourceFromView({
            m : m ,
            view : view
          });

          o.feedback({
            id : o.id,
            views : view,
            add : true
          });
        }
      });

    }else if( ! isFullList && hasViews ){

      /**
      * If this is not an array and the mgl map opbject already as views,
      * add the view and feedback
      */
      m.views.unshift( views );

      mgl.helper.addSourceFromView({
        m : m,
        view : views
      });

      o.feedback({
        id : o.id,
        views : views,
        add : true
      });

    }
  }

};



/**
 * Retrieve nested item from object/array
 * @param {Object|Array} obj
 * @param {String} path dot separated
 * @param {*} def default value ( if result undefined )
 * @note http://jsfiddle.net/Jw8XB/1/
 * @returns {*}
 */
function path(obj, path, def){
    var i, len;
  if(!def) def = null;

    for(i = 0,path = path.split('.'), len = path.length; i < len; i++){
        if(!obj || typeof obj !== 'object') return def;
        obj = obj[path[i]];
    }

    if(obj === undefined) return def;
    return obj;
}


/**
*  View controler : evalutate view state and enable/disable it depending on ui state
*/
mgl.helper.viewControler = function(o){

  var m = mgl.maps[o.id];
  var i,els,view,views,isChecked,isLoaded,viewStyle,geomType,idSource;

  if(m.views){ 

    views = mgl.helper.getKeyedViews(o);
    els = document.querySelectorAll("[data-view_action_key='btn_toggle_view']");

    loaded = mgl.helper.getLayersNamesByPrefix({
      id:o.id,
      prefix:"MX-",
      base : true
    }) ;

    for( i = 0; i < els.length ; i++ ){
      id = els[i].dataset.view_action_target;

      view = views[id];

      if( view ){

        isChecked =  els[i].checked === true;
        isLoaded = loaded.indexOf(id) > -1;
        toAdd = isChecked && !isLoaded ;
        toRemove = !isChecked && isLoaded ;

        if( toRemove ){

          mgl.helper.removeLayersByPrefix({
            id : o.id,
            prefix: id
          }); 

        }

        if( toAdd ){

          mgl.helper.addView({
            id : o.id,
            viewData : view,
            idViewsList : o.idViewsList,
          });
          
          view._setFilter();


        }
      } 
    }

      mgl.helper.updateViewOrder(o);
  }
};


/**
* Manual events on view list items
* @param {object} o options
* @param {string} o.id Map id
* @param {string} o.idView view id
* @param {string} o.action Action :  "check", "uncheck"
*/
mgl.helper.viewLiAction = function(o){

  if(!o.id || !o.idView || !o.action) return;
  
  el = document.querySelector("input[data-view-toggle='" + o.idView + "']");
 
  if( o.action == "check"  && el && !el.checked ) {
    el.checked = true;
  }

  if( o.action == "uncheck" && el && el.checked){
    el.checked = false;
  }

};

/**
* Parse a view containting a story map
* @param {object} o Options
* @param {string} o.id Id of the map
* @param {object} o.idView view/story id
*/
mgl.helper.parseStory = function(o){

  var m, view, views, story, steps, storyContainer;
  views = mgl.helper.getKeyedViews(o);
  view = views[o.idView];
  m = mgl.maps[o.id];
  
  if( !mx.templates.viewStory ) return;
  if( !view ) return;

  /**
  * extract values
  */
  story =  path(view,"data.story");
  steps = story.steps;

  /*
  * Object to hold state of the app : displayed view, map position, background color, etc
  */

  m.storyCache = {
    views : mgl.helper.getLayersNamesByPrefix({
      id: o.id,
      prefix: "MX-"
    }),
    position : mgl.helper.getMapPos(o),
    currentStep : 0
  };

  /*
  * Remove existing layers
  */
  mgl.helper.removeLayersByPrefix({
    id:"map_main",
    prefix:"MX"
  });

  /**
  * Request or create story container
  */
  storyContainer =  document.querySelectorAll("mx-story-container");

  if(!storyContainer || storyContainer.length === 0){
    body = document.getElementsByTagName("body")[0];
    storyContainer = document.createElement("div");
    storyContainer.className = "mx-story-container";
    body.appendChild(storyContainer); 
  }

  storyContainer.id = "mxStory_" + view.id;
  storyContainer.innerHTML = mx.templates.viewStory(view);
  storyBody = document.querySelector(".mx-story-body");

  /**
  * Hide menu and left column
  */

  mx.util.classAction({
    selector :  ".tabs-main",
    action : "add",
    class : "mx-hide" 
  });

  mx.util.classAction({
    selector :  ".mx-controls-top",
    action : "add",
    class : "mx-hide" 
  });

  /**
  * Scroll event
  */

  m.listener.viewStoryScroll = mx.util.debounce(function (event) {

    var el, els, bounds, storyBounds, limit, isVisible;
    var vVisible = [], vToShow = [];
    var stepNum, step, pos;
    var n, p, v, vn, vo, fi;

    els = document.querySelectorAll("div[data-story-step-num]");
    storyBounds =  storyBody.getBoundingClientRect();
    limit =  storyBounds.top + ( storyBounds.height / 2 );

    vVisible = mgl.helper.getLayersNamesByPrefix({
      id: o.id,
      prefix: "MX-",
      base: true
    });

    for( n = 0 ; n < els.length ; n++ ){
      el = els[n];
      bounds =  el.getBoundingClientRect();
      stepNum = el.getAttribute("data-story-step-num");
      isVisible = bounds.top < limit && bounds.bottom >= limit;
      /**
       *
       *  Top of the window is zero, bottom is max.
       *
       * | a -  e _
       * |         |
       * | b -  d _|
       * |
       * | c -
       *  
       *  a : story top; b : limit  c: story bottom or height
       * 
       *  view is visible when e < b && d >= limit
       */
      if( isVisible ){
        /*
         * If the current step is in cache, return;
         */

        if( m.storyCache.currentStep && stepNum == m.storyCache.currentStep) return;

        m.storyCache.currentStep = stepNum;
        /**
         * retrieve step information
         */
        step = steps[stepNum];
        pos = step.mapPosition; 
        vToShow = [];

        /**
         * Fly to position
         */  

        m.map.flyTo({
          speed : 0.5,
          easing : mx.util.easingFun({type:"easeOut",power:5}),
          zoom : pos.z,
          bearing : pos.bearing,
          pitch :  pos.pitch,
          center : [ pos.lng, pos.lat ] 
        });

        /**
         * Add view if not alredy visible, apply filter.
         */
        for( v = 0; v < step.views.length ; v++){

          vn = step.views[v].view;
          fi = step.views[v].filter;

          if( vVisible.indexOf(vn) == -1 ){
            mgl.helper.addView({
              id : o.id,
              idView: vn
            });
          }

          vToShow.push(vn);
          /*
           * Apply filter to main variable
           */
          if(fi){

            fiVariable = mgl.helper.getViewVariable({
              id:o.id,
              idView:vn
            });

            if( !fiVariable ) return;

            mgl.helper.filterViewValues({
              id : o.id,
              idView : vn,
              attribute : fiVariable,
              search : fi
            }); 
          }
        }

        vVisible = mgl.helper.getLayersNamesByPrefix({
          id: o.id,
          prefix: "MX-",
          base: true
        });
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
      }
    }
  },100);


  /**
  * Add listener to window scroll
  */
  storyBody.addEventListener("scroll",m.listener.viewStoryScroll, false);

  /**
  * Trigger the first step without event;
  */
  m.listener.viewStoryScroll();

  /**
  * Click event : handle clicks on story map controls
  */
  m.listener.viewStoryClick = function (event) {
        var el, t;

        el = event.target;

        t = [
          {
            id : "viewStory",
            comment :"target is the container",
            isTrue : event.target == event.currentTarget,
            action : function(){
              return;
            }
          },
          {
            id : "storyAction",
            comment :"target has a data-story-action",
            isTrue : !! el.getAttribute("data-story-action"),
            action : function(){
              var action, actions;

              action = el.getAttribute("data-story-action");

              actions = {
                interact : function(){ /* half panel for map interaction */
                  mx.util.classAction({
                    selector : storyContainer,
                    action : "toggle",
                    class : "mx-story-container-half"
                  });
                },
                close : function(){  /* Close the story map and show panels */
                  storyContainer.remove();

                  mgl.helper.removeLayersByPrefix({
                    id:"map_main",
                    prefix:"MX"
                  });

                  mx.util.classAction({
                    selector : storyContainer,
                   action : "add",
                   class : "mx-hide" 
                  });

                  mx.util.classAction({
                    selector : ".tabs-main",
                    action : "remove",
                    class : "mx-hide" 
                  });

                  mx.util.classAction({
                    selector :  ".mx-controls-top",
                    action : "remove",
                    class : "mx-hide" 
                  });

                  /**
                  * Enable previously enabled layers
                  */

                  for( var l = 0 ; l < m.storyCache.views.length ; l ++){
                    mgl.helper.addView({
                      id : o.id,
                      idView: m.storyCache.views[l]
                    });
                  }
                  if(m.storyCache.position){
                    var pos =  m.storyCache.position;

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
        
              out = actions[action];
              return out;
            }()
          }
        ];

    t.forEach(function(x){
      if(x.isTrue){
        x.action();
      }
    });
  };

  storyContainer.addEventListener("click",m.listener.viewStoryClick, false);


};

/**
* Get main variable for a vt view
* @param {object} o options
* @param {string} o.id map id
* @param {string} o.idView view id
*/
mgl.helper.getViewVariable = function(o){
  var out;

  views = mgl.helper.getKeyedViews(o);
  if(views && o.idView){
    view = views[o.idView];
    out = path(view,"data.attribute.name");
  }
  return out;
};

/**
* Create a default random style 
* @param {object} o Options
* @param {string} o.id Id of the view
* @param {string} o.idSource id of the source
# @param {string} o.geomType Geometry type, once of point, line, polygon
# @param {string} o.hexColor Hex color. If not provided, random color will be generated
*/
mgl.helper.defaultStyle = function(o){

  var ran, colA, colB, style;

  if(!o.hexColor){
    ran = Math.random();
    colA = mx.util.randomHsl(0.5, ran);
    colB = mx.util.randomHsl(0.8, ran);
  }else{
    if( !o.opacity ){
      o.opacity = 0.7;
    }
    colA = mgl.helper.hex2rgba(o.hexColor,o.opacity );
    colB = mgl.helper.hex2rgba(o.hexColor,o.opacity + 0.6);
  }

    style = {
      "point": {
        "id": o.id,
        "source": o.idSource,
        "source-layer":o.id,
        "type": "circle",
        "paint": {
          "circle-color": colA,
          "circle-radius":10,
          "circle-stroke-width":1,
          "circle-stroke-color":colB
        }
      },
      "polygon": {
        "id": o.id,
        "source": o.idSource,
        "source-layer":o.id,
        "type": "fill",
        "paint": {
          "fill-color": colA,
          "fill-outline-color": colB
        }
      },
      "line": {
        "id": o.id,
        "source": o.idSource,
        "source-layer":o.id,
        "type": "line",
        "paint": {
          "line-color": colA,
          "line-width": 2
        }
      }
    };

  return(style[o.geomType]);

};

/**
* Update layer order based on view list position
* @param {object} o Options
* @param {string} o.id Id of the map
* @param {string} o.idViewsList Id of the list containing view items
* @param 
*/
mgl.helper.updateViewOrder = function(o){

  var displayedOrig  = {};
  var order = mgl.helper.getViewOrder(o);
  var displayed = [];
  var m = mgl.maps[o.id];
  var viewContainer = document.getElementById(o.idViewsList);
  var orderSubset = [];
  var layerBefore = "mxlayers"; 

  if(!order) return;

  displayed = mgl.helper.getLayersNamesByPrefix({
    id:o.id,
    prefix:"MX-"
  });


  displayed.sort(
    function(a,b){
      posA = order.indexOf(a.split(mgl.settings.separators.sublayer )[0]);
      posB = order.indexOf(b.split(mgl.settings.separators.sublayer )[0]);
      return posA-posB;
    });

  displayed.forEach(function(x){
    
      posBefore = displayed.indexOf(x)-1;
    
      if(posBefore > -1 ){
        layerBefore = displayed[posBefore];
      }

      m.map.moveLayer(x,layerBefore);
    
  });

};

/**
* Get the current view order
* @param {Object} o Options
* @param {string} o.id Id of the map
* @return {array} view id array
*/
mgl.helper.getViewOrder = function(o){

  var m = mgl.maps[o.id];
  var res = [];
  var viewContainer, els, vid, i;

  if( !m ) return;
  
  viewContainer = document.querySelector(".mx-views-list");
  els = viewContainer.querySelectorAll(".mx-view-item");

  for( i = 0 ; i < els.length; i++){
    vid = els[i].dataset.view_id;
    res.push(vid);
  }

 return res;
};

/**
* Listener for view list filter
* @param {object}  o options
* @param {array} o.activeFilters Current active filters
* @param {object} o.m Mgl data item
* @param {object} o.viewClasses View classes
*/
mgl.helper.handleListFilterClass =  function(o){

  return function(event){
    if( event.target == event.currentTarget ) return ;
    el = event.target ;
    var isChecked = el.checked;
    var filter = el.getAttribute("data-filter");

    /* pupulate active filters*/
    if( isChecked ){
      o.activeFilters.push(filter);
    }else{
      o.activeFilters.splice(o.activeFilters.indexOf(filter),1);
    }
    /* For each view item check if checked if the view contain checked class */
    o.m.tools.viewsListJs.filter(function (view) { 
      if( o.activeFilters.length > 0 ){
        var value = view
          .values()[ o.viewClasses.classes ]
          .split(",") ; 
        return o.activeFilters.every(function(f){
          return value.indexOf(f)>-1;
        });
      }
      /* defaut, return all view*/
      return true;
    });
  };
};



/**
* Create and listen to numeric sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
mgl.helper.makeNumericSlider = function(o) {

  view = o.view;
  idMap = o.idMap;
  m = mgl.maps[idMap];

  el = document.querySelector("[data-range_numeric_for='"+view.id+"']");
  if(!el) return;

  makeSlider();

  function makeSlider(){
    var idView = view.id;
    var attrName = view.data.attribute.name;
    var min = path(view,"data.attribute.min");
    var max = path(view,"data.attribute.max");

    if(view && min !== null && max !== null){

      if(min == max){
        min = min -1;
        max = max +1;
      }

      var range = {
        min: min,
        max: max
      };

      slider = noUiSlider.create(el, {
        range: range,
        step: ( min + max ) / 100,
        start: [ min, max ],
        connect: true,
        behaviour: 'drag',
        tooltips: false
      });

      slider.targetView = view;

      /*
       * Save the slider in the view
       */
      view._interactive.numericSlider = slider;

      /*
       * 
       */
      slider.on("update", mx.util.debounce(function(n, h) {
        var view =  this.targetView;
        var layerExists, filter;

        elContainer = this.target.parentElement;
        elDMax = elContainer.querySelector('.mx-slider-dyn-max');
        elDMin = elContainer.querySelector('.mx-slider-dyn-min');

        k = view.data.attribute.name;

        /* Update text values*/
        if (n[0]) {
          elDMin.innerHTML = n[0];
        }
        if (n[1]) {
          elDMax.innerHTML = " – " + n[1];
        }

        filter = ['any', 
          ['all', 
            ['<=', k, n[1]*1],
            ['>=', k, n[0]*1],
          ],
          ['!has', k],
        ];

        view._setFilter({
          filter : filter,
          type : "numeric_slider"
        });

      }, 10 ));
    }
  }
};

/**
* Create and listen to time sliders
*/
mgl.helper.makeTimeSlider = function(o) {

  var k = {};
  k.t0 = "mx_t0";
  k.t1 = "mx_t1";

  view = o.view;
  idMap = o.idMap;
  m = mgl.maps[idMap];

  el = document.querySelector('[data-range_time_for="'+view.id+'"]');
  if(!el) return ;

  /*
   * Create a time slider for each time enabled view
   */
  /* from slider to num */
  var fFrom = function(x) {
    return x;
  };
  /* num to slider */
  var fTo = function(x) {
    return Math.round(x);
  };

  var now = new Date().getTime() / 1000;
  var dateForm = {
    to: mx.util.date,
    from: true
  };

  makeSlider(); 

  function makeSlider(){

    if( view.data.period ){
      var time = path(view,"data.period");
      var prop = path(view,"data.attribute.names");
      var start = [];
      var tooltips = [];
      var nowIsIn = now > time.extent.min && now < time.extent.max;
      var idView = view.id;

      if (time.extent.min && time.extent.max) {

        var hasT0 = prop.indexOf(k.t0) > -1;
        var hasT1 = prop.indexOf(k.t1) > -1;
        var min = time.extent.min * 1000; 
        var max = time.extent.max * 1000; 

        if(min == max){
          min = min -1;
          max = max +1;
        }

        var range = {
          min: min,
          max: max
        };

        start.push(min);
        start.push(max);

        slider = noUiSlider.create(el, {
          range: range,
          step: 24 * 60 * 60 * 1000,
          start: start,
          connect: true,
          behaviour: 'drag',
          tooltips: false,
          format: {
            to: fTo,
            from: fFrom
          }
        });

        /**
         * Save slider in the view and view ref in target
         */
        slider.targetView = view;
        view._interactive.timeSlider = slider;
      
        /*
         * create distribution plot in time slider
         */
        mgl.helper.plotTimeSliderData({
          data: time.density,
          el: el,
          type: "density"
        });


        /*
         * 
         */
        slider.on("update", mx.util.debounce(function(t, h) {
          var view = this.targetView;
          var layerExists, filter;

          elContainer = this.target.parentElement;
          elDMax = elContainer.querySelector('.mx-slider-dyn-max');
          elDMin = elContainer.querySelector('.mx-slider-dyn-min');
 
          /* save current time value */
          //ime.extent.set = t;

          /* Update text values*/
          if (t[0]) {
            elDMin.innerHTML = mx.util.date(t[0]);
          }
          if (t[1]) {
            elDMax.innerHTML = " – " + mx.util.date(t[1]);
          }

          filter = ['any'];
          filterAll = ["all"];
          filter.push(["==",k.t0,-9e10]);
          filter.push(["==",k.t1,-9e10]);
       
            if ( hasT0 && hasT1 ) {
              filterAll.push( ['<=', k.t0, t[1] / 1000] ); 
              filterAll.push( ['>=', k.t1, t[0] / 1000] );
            } else if (hasT0) {
              filterAll.push( ['>=', k.t0, t[0] / 1000] );
              filterAll.push( ['<=', k.t0, t[1] / 1000] );
            }         
          filter.push(filterAll);

          view._setFilter({
            filter : filter,
            type : "time_slider"
          });
           
        }, 10 ));
      }
    }
  }
};

/**
* Handle view data text filter listener
* @param {object} o options
* @param {string} o.id map id
*/
mgl.helper.handleViewValueFilterText = function(o){
  /*
   * Set listener for each view search input
   * NOTE: keyup is set globaly, on the whole view list
   */
    return function(event) {
    var el, idView, viewVar, search, options;
    el = event.target;

    idView = el.dataset.view_action_target;
    action = el.dataset.view_action_key; 

    if( !idView || action != "view_search_value"  ) return;

    search = event.target.value;

    options = {
      id : o.id,
      idView : idView,
      search : search
    };

    mgl.helper.filterViewValues(options);
  };
};


/** 
* Remove view from views list and geojson database
* @param {object} o options;
* @param {string} o.id map id
* @param {string} o.idView view id
*/
mgl.helper.removeView = function(o){
  
  var li  = document.querySelector("[data-view_id='" + o.idView + "']") ;

  var m  = mgl.maps[ o.id ];
  var list = m.tools.viewsListJs;
  var views = m.views;
  var view = views.filter(function(x){
    return x.id == o.idView ;
  })[0];

  if( view.type == "gj" ){
   var data =  mgl.data.geojson ;
    data.removeItem( o.idView );
  }
   
  m.views = views.filter(function(x){
    return x.id != o.idView ; 
  });

  mgl.helper.removeLayersByPrefix({
    id : o.id,
    prefix : o.idView
  });

  if(li){
    li.remove();
  }

  list.reIndex();
};

/**
* Handle view click events
* @param o options
*/
mgl.helper.handleViewClick = function(o){

  return function (event) {
    var el, t, isIcon;

    if( event.target == event.currentTarget ) return ;

    el = event.target;

    if(el.dataset){
      event.stopPropagation();
    }
    /* Skip icon. The */
    isIcon = el.classList.contains("fa");

    el = isIcon ? el.parentElement: el;

    t = [
      {
        id : "viewDeleteGeojson",
        comment :"target is the delete geojson button",
        isTrue : el.dataset.view_action_key == "btn_opt_delete_geojson",
        action : function(){

          var arg =  el.dataset ;

          mgl.helper.removeView({
            id : o.id,
            idView : arg.view_action_target
          });

        }
      },
      {
        id : "viewUploadGeojson",
        comment :"target is the upload geojson button",
        isTrue : el.dataset.view_action_key == "btn_opt_upload_geojson",
        action : function(){
          var target = el.dataset.view_action_target;
          /**
          * Extract view data and send it to shiny in chunk
          */
          mgl.data.geojson.getItem(target).then(function(x){

            var data, part, 
              size = 100000,
              delay = 1000;

            var view = x.view;
            var json = JSON.stringify(view);
            var chunk = mx.util.chunkString(json,size);
            var chunkL = chunk.length;

            for(var i = 1; i < chunkL + 1 ; i++){
              sendPart(i,chunk[i-1]);
            }

            function sendPart(part,data){
              setTimeout(function(){
                var percent =  Math.round(( part / chunkL ) * 100);

                mx.util.progressScreen({
                  enable : part != chunkL,
                  id : "upload_geojson",
                  percent : percent,
                  text : "Upload " + view.data.title.en + " (" + percent + "%)"
                });
                Shiny.onInputChange("uploadGeojson:mx.jsonchunk",{
                  length : chunkL,
                  part : part,
                  data : data,
                  time : (new Date())
                });
              },delay*part);
            }
          });
        }
      },
      {
        id : "viewStoryPlay",
        comment :"target is the play button",
        isTrue : el.dataset.view_action_key == "btn_opt_start_story",
        action : function(){
/*          mgl.helper.parseStory({*/
            //id : o.id,
            //idView : el.dataset.view_action_target
          /*});*/
          mgl.helper.story.read({
            id : o.id,
            idView : el.dataset.view_action_target,
            save : false
          });
        }
      },
      {
        id : "viewZoom",
        comment :"target is the search button",
        isTrue : el.dataset.view_action_key == "btn_opt_zoom_visible",
        action : function(){
          mgl.helper.zoomToViewIdVisible({
            id : o.id,
            idView : el.dataset.view_action_target
          });
        }
      },
      {
        id : "viewZoomExtent",
        comment :"target is zoom to extent",
        isTrue : el.dataset.view_action_key == "btn_opt_zoom_all",
        action : function(){
          mgl.helper.zoomToViewId({
            id : o.id,
            idView : el.dataset.view_action_target
          });
        }
      },
      {
        id : "viewShowSearch",
        comment :"target is tool search",
        isTrue : el.dataset.view_action_key == "btn_opt_search",
        action : function(){
          
          elSearch =  document.getElementById(el.dataset.view_action_target);

          mx.util.classAction({
            selector : elSearch,
            action : "toggle"
          });
        }
      },
      {
        id : "viewLegendFilter",
        comment : "target is a legend filter",
        isTrue : el.dataset.view_action_key == "btn_legend_filter",
        action : function(){
          /*
          * After click on legend, select all sibling to check 
          * for other values to filter using "OR" logical operator
          */
          var viewValues = [],
           legendContainer = mx.util.parentFinder({
            selector : el,
            class : "mx-view-item-legend" 
          }),
          legendInputs = legendContainer.querySelectorAll("input") 
            ;
          var idView = el.dataset.view_action_target;
          var view = mgl.helper.getKeyedViews({id:'map_main'})[idView]; 
          var attribute = view.data.attribute.name;
          var type = view.data.attribute.type;
          var op = "==";
          var  filter = ["any"];
          if(type=="number") op = ">=";


          for(var i = 0, il = legendInputs.length; i < il ; i++){
            var li =  legendInputs[i];
            if(li.checked){
              viewValue = li.dataset.view_action_value; 
              if(viewValue){
                if(type=="number") viewValue = viewValue * 1;
                filter.push([op,attribute,viewValue]);
              }
            }
          }

          view._setFilter({
            type : "legend", 
            filter : filter 
          });

        } 
      },
      {
        id : "viewToggle",
        comment : "target is the label/input for the view to toggle",
        isTrue : el.dataset.view_action_key == "btn_toggle_view", 
        action : function(){
          mgl.helper.viewControler(o);       
        } 
      },
      {
        id : "viewReset",
        comment : "target is the reset button",
        isTrue :  el.dataset.view_action_key == "btn_opt_reset",
        action :function(){
          mgl.helper.resetViewStyle({
            id:o.id,
            idView:el.dataset.view_action_target
          });
        }
      },
      {
        id: "pngScreenshot",
        comment: "target is the png screenshoot button",
        isTrue :  el.dataset.view_action_key == "btn_opt_screenshot",
        action:function(){
          mgl.helper.downloadMapPng({
            id: o.id, 
            idView: el.dataset.view_action_target
          });
        }
      },{
        id : "shinyAction",
        comment: "target is a shiny action button",
        isTrue : el.dataset.view_action_handler == "shiny",
        action : function(){
          Shiny.onInputChange( 'mglEvent_' + o.id + '_view_action',{
            target : el.dataset.view_action_target,
            action : el.dataset.view_action_key,
            time : new Date()
          });
        }
      }
    ];

    for(var i = 0; i < t.length ; i++ ){
      if( t[i].isTrue ){
        event.stopPropagation();
        t[i].action();
      }
    } 

  };
};




/**
* Update views list text and title using data in views.
* 
* @param {Object} o options
* @param {String} o.id Maps item id
* @param {String} o.lang Two letter language code. see mx.languages.
*/
mgl.helper.updateViewsListLanguage = function(o){
  elsViews = document.getElementsByClassName("mx-view-item");
  var views = mgl.maps[o.id].views;

  o.langs = mx.util.objectToArray(mx.languages);

  mx.util.forEachEl({
    els : elsViews,
    callback : function(el){
      var l =  o.lang,
       id = el.dataset.view_id,
       v = views.filter(function(v){ return v.id == id ; })[0],
      elTitle = el.querySelector(".mx-view-item-title"),
      elText = el.querySelector(".mx-view-item-desc");

      if(elTitle){ 
        elTitle.innerHTML = mx.util.getLanguageFromObjectPath({
          obj :v,
          path : "data.title",
          lang : o.lang,
          langs : o.langs,
          defaultKey : "noTitle"
        });
      }
      if(elText){ 
        elText.innerHTML = mx.util.getLanguageFromObjectPath({
          obj : v,
          path : "data.abstract",
          lang : o.lang,
          langs : o.langs,
          defaultKey : "noAbstract"
        });
      }
    }
  });


};




/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
mgl.helper.renderViewsList = function(o){

  var m = mgl.maps[o.id];
  elViewsContainer = document.querySelector(".mx-views-container");
  elViewsContent = elViewsContainer.querySelector(".mx-views-content");
  elViewsList = elViewsContainer.querySelector(".mx-views-list");

  //o.add = o.add === undefined ? false : o.add; 

  if( ! o.views ){ 
    o.views = m.views;
  }
  if( ! o.views ){
    return;
  }

  if( ! (o.views instanceof Array ) ){
    o.views = [o.views];
    o.add = true;
  }

  /* TODO: set as options */

  var viewClasses = {
    "title" : "mx-view-item-title",
    "meta" : "mx-view-item-index",
    "type" : "mx-view-item-type",
    "classes" : "mx-view-item-classes"
  };

  var elFilters, activeFilters = [];


  if( !o.views || o.views.constructor !== Array ||  o.views.length < 1 || !mx.templates.viewList ){
    if( ! o.add ){ 
      elViewsList.innerHTML = "<span>" + mx.util.getLanguage("noView",mx.language) + "</span>" ;
    }
  }else{

    if( !m.listener ) m.listener = {};
    if( !m.tools ) m.tools = {};

    /**
     * Render view items
     */
    if( ! o.add ){ 
      elViewsList.innerHTML = mx.templates.viewList(o.views);
    }else{
      var emptyDiv, newItem, newInput ; 
      o.views.forEach(function(v){m.views.push(v);});
      emptyDiv = document.createElement("div");
      emptyDiv.innerHTML = mx.templates.viewList(o.views);
      newItem = emptyDiv.querySelector("li");
      newInput =  newItem.querySelector(".mx-view-item-checkbox");
      newInput.checked = true;
      elViewsList.insertBefore(newItem,elViewsList.childNodes[0]);
    }

    /** 
     * Get components 
     * elFilters = filter view list by classes
     * elTimeSlider =  filter views list and content by time
     */
    elFilters = elViewsContainer.querySelector(".filters");

    /*
     * translate based on dict key
     */
    mx.util.setLanguage({
      el:elViewsContainer
    });
    


    /**
     * Create searchable list.js object
     */
    if( ! m.tools.viewListJs ){
      m.tools.viewsListJs = new List( elViewsContainer, {
        valueNames: mx.util.objectToArray(viewClasses),
        listClass : "mx-views-list"
      });
    }else{
      m.tools.viewsListJs.reIndex();
    }

    /**
     * Create Sortable list
     */
    if( ! m.listener.viewsListSortable ){
      m.listener.viewsListSortable = mx.util.sortable({
        selector : elViewsList,
        callback : function(x){
          mgl.helper.updateViewOrder(o);
        }
      });
    }

    /*
     * List filter by classes
     */
    if( ! m.listener.viewsListFilterClass ){

      m.listener.viewsListFilterClass =  mgl.helper.handleListFilterClass({
        activeFilters : activeFilters,
        viewClasses : viewClasses,
        m: m
      });

      elFilters.addEventListener("change", m.listener.viewsListFilterClass);
    }

    /*
     * View values filter by text
     */
    if( ! m.listener.viewsValueFilterText ){ 
      m.listener.viewsValueFilterText =  mgl.helper.handleViewValueFilterText({
        id: o.id
      });
      /* NOTE: keyup on the whole list */
      elViewsList.addEventListener("keyup",m.listener.viewsValueFilterText);
    }
 
    /**
     * Listen to click inside the list
     */
    if( ! m.listener.viewsListClick ){
      m.listener.viewsListClick = mgl.helper.handleViewClick(o);
      elViewsList.addEventListener("click",m.listener.viewsListClick,false);
    }
    
    /**
     * Time sliders and search module 
     */
    //if( !o.add ) {
    /*
    * Init interactive tools for views
    */
    o.views.forEach(function(x){ 
      x._idMap = o.id;
      x._interactive = {};
      x._filters = {
        style : ['all'],
        legend : ['all'],
        time_slider : ['all'],
        search_box : ['all'],
        numeric_slider : ['all']
      };
      x._setFilter = mgl.helper.viewSetFilter;

      mgl.helper.makeTimeSlider({ view: x , idMap: o.id }); 
      mgl.helper.makeNumericSlider({ view: x, idMap: o.id });
      mgl.helper.makeSearchBox({ view: x, idMap: o.id });
    });
    //}

    /*
     * inital view controler after view rendering
     */
    mgl.helper.viewControler(o);


  } 
};

/**
* Filter current view and store rules
* @param {Object} o Options
* @param {Array} o.filter Array of filter
* @param {String} o.type Type of filter : style, legend, time_slider, search_box or numeric_slider
*/
mgl.helper.viewSetFilter = function(o){
  o = o||{};
  var view = this;
  var idView = view.id;
  var filter = o.filter;
  var filters = view._filters;
  var filterNew = ['all'];
  var type = o.type ? o.type : "default";
  var idMap = view._idMap ? view._idMap : "map_main";
  var m = mgl.maps[idMap].map;
  var layers = mgl.helper.getLayersByPrefix({id:idMap,prefix:idView});

  if(filter && filter.constructor == Array && filter.length > 1){  
    filters[type] = filter;
  }else{
    filters[type] = ['all'];
  }

  for(var t in filters){
    var f = filters[t];
    filterNew.push(f);
  }

  for(var l=0,ll=layers.length;l<ll;l++){
    var layer = layers[l];
    var origFilter = path(layer,"metadata.filter_base");
    var filterFinal = [];
    if(!origFilter){
      filterFinal = filterNew;
    }else{
      filterFinal = filterNew.concat([origFilter]);
    }
    m.setFilter(layer.id, filterFinal);
  }
};






/**
* Plot distribution
* @param {Object} o options
* @param {Object} o.data Object containing year "year" and value "n"
* @param {Element} o.el Element where to append the plot
# @param {string} o.type Type of plot. By default = density
*/
mgl.helper.plotTimeSliderData = function(o){

  var data = o.data;
  var el = o.el;
  o.type = o.type ? o.type:"density";

  if(!data || !data.year || !data.n) return;

  var obj = {
    labels: data.year,
    series: [
      data.n
    ]
  };

  var options = {
    seriesBarDistance: 100,
    height: '30px',
    showPoint: false,
    showLine: false,
    showArea: true,
    fullWidth: true,
    showLabel: false,
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0
    },
    axisY: {
      showGrid: false,
      showLabel: false,
      offset: 0
    },
    chartPadding: 0,
    low: 0
  };

  divPlot = document.createElement("div");
  divPlot.className = "ct-chart ct-square mx-slider-chart";
  el.append(divPlot);
  cL = new Chartist.Line(divPlot, obj, options);

};

/** 
* Download screenshot
* @param {object} o options;
* @param {string} o.id map id
* @parma {string} o.idView view id
*/
mgl.helper.downloadMapPng =  function(o){

  var map = mgl.maps[o.id].map;
  var body = document.querySelector("body");
  var legend = document.getElementById("check_view_legend_"+o.idView);
  var imgMap = map.getCanvas().toDataURL();
  var imgLegend ;
  var fileName = "mx_data_" + (new Date()+"").split(" ")[4].replace(/:/g,"_",true) +".zip";


  if(legend){

    mx.util.htmlToData({
      selector: legend,
      scale: 10,
      callback: function(out) { 
        var zip, folder ;
        zip = new JSZip();
        folder = zip.folder("mx-data");
        folder.file("mx-legend.png", out.png.split(",")[1], {base64: true});
        folder.file("mx-legend.svg", out.svg.split(",")[1], {base64: true});
        folder.file("mx-map.png", imgMap.split(",")[1], {base64: true});
        zip.generateAsync({type:"blob"}).then(function(content) {
          download(content, fileName);
        });
      }
    });

  }else{
    zip = new JSZip();
    img = zip.folder("mx-data");

    img.file("mx-map.png", imgMap.split(",")[1], {base64: true});

    zip.generateAsync({type:"blob"}).then(function(content) {
      download(content, fileName);
    });

  }
};

/**
 * convert hex to rgb or rgba
 * @param {string} hex Hex color
 * @param {number} opacity Value of opacity, from 0 to 1
 */
mgl.helper.hex2rgba = function(hex, opacity) {
  var h = hex.replace("#", "");
  var rgba =  "rgba";
  var rgb =  "rgb";
  var out = "";
  var i;
  h = h.match(new RegExp("(.{" + h.length / 3 + "})", "g"));

  for ( i = 0; i < h.length; i++ ) {
    h[i] = parseInt(h[i].length == 1 ? h[i] + h[i] : h[i], 16);
  }

  if (typeof opacity != "undefined") {
    if(opacity>1) opacity=1;
    if(opacity<0) opacity=0;
    h.push(opacity);
    rgb = rgba;
  }

  return rgb + "(" + h.join(",") + ")";
};

/**
 * convert rgb|a to hex
 * @param {string} rgba string
 */
mgl.helper.rgba2hex = function(rgb){
 rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
 return (rgb && rgb.length === 4) ? "#" +
  ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
};
/**
 * convert any color to obj with key alpha and hex color
 * @param {string} color string. e.g. hsl(10%,10%,0)
 */
mgl.helper.color2obj = function(color){
  var alpha;
  var col;
  var out = {
    alpha : 1,
    color: "#000"
  };
  var div = document.createElement("div");
  div.style.color = color;
  div.style.height = 0;
  div.style.width = 0;
  document.body.appendChild(div);
  col = window.getComputedStyle(div).color;
  if(col){
    alpha = col.split(", ")[3];
    if(alpha){
      out.alpha = alpha.replace("\)",'')*1;
    }
    out.color = mgl.helper.rgba2hex(col);
  }
  div.remove();
  return out;
};


/**
 * Get layer by prefix
 * @param {Object} o Options
 * @param {string} o.id Map element id
 * @param {string } o.prefix Prefix to search for
 * @return {array} list of layers
 *
 */
mgl.helper.getLayersByPrefix = function(o) {
  var mapId = o.id,
    prefix = o.prefix,
    result = [],
    hasMap = false,
    map, layers , l;

  hasMap  = mgl.helper.hasMap(o.id);

  if ( hasMap ) {
    map = mgl.maps[mapId].map;
    if ( map ) {
      layers = map.style._layers;
      for ( l in layers ) {
        if (l.indexOf(prefix) > -1) {
          result.push(layers[l]);
        }
      }
    }
  }
  return result;
};
/**
 * Get layer by id
 * @param {Object} o options
 * @param {string} o.id Map id
 * @param {string} o.idLayer id of the layer
 * @return {array} of layers
 *
 */
mgl.helper.getLayerById = function(o) {
  var hasMap, result, map, layer;
  hasMap  = mgl.helper.hasMap(o.id);
  result = [];
  if (hasMap) {
     map = mgl.maps[o.id].map;
    if (map) {
      layer = map.getLayer(o.idLayer);
      if (layer) {
        result.push(layer);
      }
    }
  }
  return result;
};

/**
 * Get layer names by prefix
 * @param  {Object} o options
 * @param {String} o.id Map id
 * @param {String} o.prefix Prefix to search for
 * @return {Boolean} o.base should return base layer only
 *
 */
mgl.helper.getLayersNamesByPrefix = function(o) {
  var mapId, prefix, base, result, hasMap, map, layers, l;
  var out = [];
  mapId = o.id;
  prefix = o.prefix;
  base = o.base;

  if( base === undefined ) base = false;

  result = [];
  hasMap = mgl.helper.hasMap(o.id);

  if ( hasMap ) {
     map = mgl.maps[mapId].map;
    if (map) {
      if(!prefix) prefix = "";
      layers = map.style._layers;
      for ( l in layers ) {
        if(base){
          l = l.split(mgl.settings.separators.sublayer )[0];
        }
        if (l.indexOf(prefix) > -1) {
          result.push(l);
        }
      }
    }
  }

 out =  mx.util.getArrayStat({arr:result,stat:"distinct"});

  return out;
};

/**
 * Remove multiple layers by prefix
 * @param {object} o options
 * @param {string} o.id Map element id
 * @param {string} o.prefix Prefix to search for in layers, if something found, remove it
 * @return {array} List of removed layer 
 */
mgl.helper.removeLayersByPrefix = function(o) {
  var result = [], hasMap, legend, map, layers, l;
  
  hasMap = mgl.helper.hasMap(o.id);

  if( hasMap ){
    map  = mgl.maps[o.id].map;
    layers = mgl.helper.getLayersNamesByPrefix(o);
    var rExp = new RegExp("^" + o.prefix + ".*");
    
    for(i = 0 ; i < layers.length ; i++ ){
      l = layers[i];
       if(l.indexOf(o.prefix) > -1 && l.search(rExp) > -1){
         map.removeLayer(l);
         result.push(l);
       }
    }
  }

  return result;
};


/** 
 * Search for registered maps and enable/disable position synchronisation
 * @param {object} o options
 * @param {boolean} [o.enabled=false]  Enable synchronisation
 */
mgl.helper.syncAll = function(o) {
  var enabled, maps, ids;

  enabled = o.enabled;

  if (!enabled) {
    enabled = false;
  }

  maps = mgl.maps;
  ids = [];

  for (var m in maps) {
    ids.push(m);
  }

  ids.forEach(function(x) {
    var others,m, locked, exists, pos, m2;

    others = [];

    ids.forEach(function(i) {
      if (i != x) {
        others.push(i);
      }

    });

    locked = false;
    m = maps[x].map;
    exists = maps[x].listener.sync;

    if (enabled) {
      if (!exists) {
        maps[x].listener.sync = function(e) {
          if (!locked) {
            pos = {
              center: m.getCenter(),
              zoom: m.getZoom(),
              pitch: m.getPitch(),
              bearing: m.getBearing()
            };
            locked = true;
            others.forEach(function(o) {
              m2 = maps[o].map;
              m2.setCenter(pos.center);
              m2.setZoom(pos.zoom);
              m2.setPitch(pos.pitch);
              m2.setBearing(pos.bearing);
            });
            locked = false;
          }
        };
      }

      m.on('move', maps[x].listener.sync);
    } else {
      if (exists) {
        m.off('move', maps[x].listener.sync);
      }
    }


  });
};

/** 
 *  Test if a key-value pair exist in a list
 * @param {object} li Object for the recursive search
 * @param {string} it Named key
 * @param {any} val Corresponding value
 * @param {boolean} [inverse=false] Return true if the key value pair is not found
 * @return {boolean} exists (or not depending of inverse)
 */
mgl.helper.existsInList = function(li, it, val, inverse) {
  // TODO: find a ways to pass an operator for more flexibility "a" "!=" "yelloe"
  // TODO: Syntastic return a warning with when using eval()... 
  if (!inverse) {
    for (var i in li) {
      if (i === it && (
        li[i] === val ||
          (typeof(val) === "object" && JSON.stringify(li[i]) === JSON.stringify(val))
      )) {
        return (true);
      } else if (typeof(li[i]) == "object") {
        if (this.existsInList(li[i], it, val, inverse)) return (true);
      }
    }
    return (false);
  } else {
    for (var j in li) {
      if (j === it && (
        li[j] !== val ||
          (typeof(val) === "object" && JSON.stringify(li[j]) !== JSON.stringify(val))
      )) {
        return (true);
      } else if (typeof(li[j]) == "object") {
        if (this.existsInList(li[j], it, val, inverse)) return (true);
      }
    }
    return (false);
  }
};


/**
 * Parse view of type vt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 */
mgl.helper.addViewVt = function(o){
  var view =  o.view,
    map =  o.map,
    layers = [],
    def = path(view,"data"),
    idSource = view.id + "-SRC",
    style = path(view,"data.style"),
    time = path(view,"data.period"),
    rules =  path(view,"data.style.rules"),
    geomType = path(view,"data.geometry.type"),
    num = 0,
    hasStyle = false,
    hasTime = false,
    hasSprite = false,
    hasStyleDefault = false,
    defaultColor, defaultOpacity,
    ruleValues = [];


  /* check style and rules*/
  if( style && rules && rules.length > 0 ){
    /* the view has at least one style */
    hasStyle = true;
    /* 
     * Loop on style rules
     */
    rules.forEach(function(x){
      /*
       * save used values
       */
      ruleValues.push(x.value);
      /* 
       * sprite
       */
      if( !hasSprite && x.sprite ) hasSprite = true;
      /*
       * default style
       */
      if( !hasStyleDefault && x.value && x.value=="all" ){

        layer = mgl.helper.defaultStyle({
          id : view.id,
          idSource : idSource,
          geomType : geomType,
          hexColor : x.color,
          opacity : x.opacity
        });
        /* add the default layer */
        layers.push(layer);
        /* save style default state */
        hasStyleDefault = true;
      }
    });

  }

  /*
   * Apply default style is no style is defined
   */
  if ( ! hasStyle ) {
    layer = mgl.helper.defaultStyle({
      id : view.id,
      idSource : idSource,
      geomType : geomType
    });
    /* add the default layer */
    layers.push(layer); 
  }
  /*
   * Apply style if avaialble
   */
  if( hasStyle && !hasStyleDefault ){

    /* convert opacity to rgba */
    rules.forEach(function(x) {
      x.rgba = mgl.helper.hex2rgba(x.color, x.opacity);
      x.rgb  = mgl.helper.hex2rgba(x.color);
    });

    /*    [> always sort by value if data driven <]*/
    //if (style.dataDrivenEnable && style.valueType=="numeric") {
    //style.rules = style.rules.sort(function(a, b) {
    //if (a.value > b.value) return (1);
    //if (b.value > a.value) return (-1);
    //return (0);
    //});
    /*}*/

    /**
     * evaluate rules
     */

    rules.forEach(function(rule,i){
      var value = rule.value;
      var max = path(view,"data.attribute.max")+1;
      var nextRule = rules[i+1];
      var nextValue = nextRule ? nextRule.value ? nextRule.value : max : max;
      var isNumeric = path(view,"data.attribute.type") == "number";
      var idView = view.id;
      var sepLayer = mgl.settings.separators.sublayer; 
      var getIdLayer = function(){ return idView + sepLayer + num++ ; };
      var filter = ["all"];
      var attr = def.attribute.name;
      var paint = {};
      var layerSprite = {};


      /**
       * Set filter
       */

      if(isNumeric){
        filter.push(["has", attr]);
        filter.push([">=", attr, value]);
        filter.push(["<", attr, nextValue]);
      }else{
        filter.push(["has", attr]);
        filter.push(["==", attr, value]);
      }
      /** 
       * layer skeleton
       */
      var layer = {
        'id': getIdLayer(),
        'source': idSource,
        'source-layer': idView,
        'filter': filter,
        'metadata': {
          'filter_base':filter
        }
      };

      switch(geomType) {
        case "point":
          layer.type = 'circle';
          /**
           * Handle sprite based circle
           */
          if(rule.sprite && rule.sprite != 'none'){
            layerSprite = mx.util.clone(layer);
            layerSprite.layout = {
              'icon-image': rule.sprite,
              'icon-size': rule.size / 10
            };
            layerSprite.paint = {
              'icon-opacity': 1,
              'icon-halo-width': 2,
              'icon-halo-color': rule.rgb
            };
            layerSprite.id = getIdLayer();
            layers.push(layerSprite); 
          }

          layer.paint = {
            "circle-color" : rule.rgba,
            "circle-radius": rule.size
          };
          layers.push(layer); 
          break;
        case "polygon":
          layer.type = "fill";

          if(rule.sprite && rule.sprite != 'none'){
            layerSprite = mx.util.clone(layer);
            layerSprite.paint = {
              'fill-pattern': rule.sprite
            };
            layerSprite.id = getIdLayer();
            layers.push(layerSprite); 
          }

          layer.paint = {
            "fill-color" : rule.rgba
          };
          layers.push(layer);
          break;
        case "line":
          layer.type = "line";
          layer.paint = {
            'line-color': rule.rgba,
            'line-width': rule.size
          };
          layers.push(layer);
          break;
      }
    });
  }
  
  if(layers.length>0){

    /*
     * Add layers to map
     */
      layers.forEach(function(x){
        map.addLayer(x);
      });

      /**
       * remove duplicated rules based on value and merge sprite 
       */

    if(!o.noLegend){

      rules = path(view, "data.style.rules") ;

      if(!rules) return;

      rId = [];
      rNew = [];

      for(var i = 0 ; i < rules.length ; i++){
        if(rules[i]){
          ruleHasSprite = rules[i].sprite && rules[i].sprite != "none";
          nextRuleIsSame =  !!rules[i+1] && rules[i+1].value == rules[i].value;
          nextRuleHasSprite = !!rules[i+1] && rules[i+1].sprite && rules[i+1].sprite != "none";

          if( ruleHasSprite ){
            rules[i].sprite = "url(sprites/svg/" + rules[i].sprite + ".svg)";
          }else{
            rules[i].sprite = null;
          }

          if( nextRuleIsSame ){
            if( nextRuleHasSprite ){
              rules[i].sprite = rules[i].sprite + "," + "url(sprites/svg/" + rules[i+1].sprite + ".svg)";
            }
            rules[i+1] = null;
          }
        }
      }
      view.data.style.rules = rules;

      /*
       * Add legend and update view order
       */

        var legend = document.querySelector("#check_view_legend_" + view.id);
        if(legend){
          legend.innerHTML = mx.templates.viewListLegend(view);
        }
        mgl.helper.updateViewOrder(o);
      }
    }
};

/** 
*  Add map-x view on the map
*  @param {object} o Options
*  @param {string} o.id map id
*  @param {string} o.idView view id
*  @param {objsect} o.viewData view 
*  @param {string} o.idViewsList id of ui views list element
*  @param 
*/
mgl.helper.addView = function(o){

  if(!o.viewData && !o.idView) {
    console.log("Add view called without idView or view Data. Options :");
    console.log(o);
    return;
  }

  var views;
  var m = mgl.maps[o.id];
  var view = o.viewData;

  if(o.idView){
    o.idView = o.idView.split(mgl.settings.separators.sublayer)[0];
    views = mgl.helper.getKeyedViews(o);
    view = views[o.idView];
  }  

  if(!view || !view.data.source ) return;

  /* Remove previous layer if needed */
  mgl.helper.removeLayersByPrefix({
    id: o.id,
    prefix : view.id
  });

  /* Switch on view type*/
  handler = {
    rt : function(){
      m.map.addLayer({
        id: view.id,
        type : "raster",
        source: view.id + "-SRC"
      });
    },
    vt : function(){
      mgl.helper.addViewVt({
        view : view,
        map : m.map
      });
    },
    gj : function(){
      m.map.addLayer(
        path(view,"data.layer"),
        "mxlayers"
      );
    },
    sm : function(){} 
  };

  /* Call function according to view type */
  handler[view.type]();

};

/**
 * Add source, handle existing 
 * @param {Object} o Options
 * @param {String} o.id  Map id
 * @param {String} o.idSource  Source id
 * @param {Object} o.source Source values
 */
mgl.helper.addSource = function(o) {

  var hasMap = mgl.helper.hasMap(o.id);

  if (hasMap) {

    var map = mgl.maps[o.id].map;
    var sourceExists =  Object
      .keys( map.style.sourceCaches )
      .indexOf( o.idSource ) > -1;

    if ( sourceExists ) {
      map.removeSource(o.idSource);
    }

    map.addSource(o.idSource, o.source);
  }
};


/**
 * Apply a filter on a layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idView  view id
 * @param {array} o.filter Filter array to apply
 */
mgl.helper.setFilter = function(o){
  var exists = !!document.getElementById(o.id);
  if (exists) {
    var m = mgl.maps[o.id].map;
    m.setFilter(o.idView, o.filter);
  }
};

/**
* Check if map object exist
* @param {string} id map id
*/
mgl.helper.hasMap = function(id){
  return !!  mgl.maps[id] && mgl.maps[id].map;
};

/**
* Get estimated area of visible layer by prefix of layer names
* @param {object} o options
* @param {string} o.id map id
* @param {string} o.prefix Prefix to find layers
* @return {number} area in km2
*/
mgl.helper.getRenderedLayersArea = function(o){

  if ( this.hasMap(o.id) ){
    var map = mgl.maps[o.id].map;
    var layers = mgl.helper.getLayersNamesByPrefix({
      id: o.id,
      prefix: o.prefix
    });


    if( layers.length > 0 ){

      var geomTemp = {
        type : "FeatureCollection",
        features : [] 
      };

      qf = map.queryRenderedFeatures({layers:layers});

      // get all abject in one
      qf.forEach(function(feature){
        geomTemp
          .features
          .push({
            "type" : "Feature",
            "properties":{},
            "geometry":feature.geometry
          });
      });

      // get bounds;
      var bounds = turf.bboxPolygon(turf.bbox({
        type:"Feature",
        properties:{},
        geometry:{
          type: "MultiPoint",
          coordinates:map.getBounds().toArray()
        }
      }));

      geomTemp = turf.combine(geomTemp);
      geomTemp = turf.buffer(geomTemp,0);
      geomTemp = turf.intersect(geomTemp,bounds);
    

      return(turf.area(geomTemp) * 1e-6);

    }
  }
};

mgl.helper.sendRenderedLayersAreaToUi = function(o){
  el =  document.getElementById(o.idEl);
  if(el){
    area = mgl.helper.getRenderedLayersArea(o);
    if(!area) area = 0 ;
    el.innerHTML = Math.round(area) ;
  }
};


/**
* Method to convert string with logical operators to regex search function
* & and | are implemented. E.g.
* mgl.helper.makeStringFilterFun("Diamant & Au")("Diamant, Au") is true
* @param {String} re string to convert
*/
/*mgl.helper.makeStringFilterFun = function(re){*/

  //if( ! re | re == "all" ){
    //re = ".*";
  //}
////[>else{<]
    ////re = re.replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g," ");
  ////}

  //try {
      //re = re
        //.trim()
        //.toLowerCase();

      //if( re.indexOf(",")){
        //re = re.replace(",","&");
      //}
    
      //if( re.indexOf("|") >-1 ){
        //re = re
          //.split( "|" )
          //.map(function(r){
            ////return "(?=.*"+r.trim()+".*)";
            //return "^"+r.trim()+"$";
          //}).join("|");
      //}

      //if(re.indexOf("&")>-1){
        //re = re
          //.split( "&" )
          //.map(function(r){
            //return "(?=.*"+r.trim()+".*)";
          //}).join("");
      //}

      //re =  new RegExp(re);
    //}
    //catch( err ){
      //console.log( "make filter fun failed: "+err );
    //}

  //return function(t){
    //t  = t.toLowerCase();
   //return t.search(re)>-1;
  //};


/*};*/


//mgl.helper.makeStringFilterFun = function(re){
  //return(function(t){
    //var score = mx.util.distanceScore(re,t) ;
    //return score;
  //});
/*};*/

/**
* Create search box for each views
* @param {Object} o Options
* @param {String} o.id Id of the map
*/
/*mgl.helper.makeSearchBox = function(o){*/

  //view = o.view;
  //idMap = o.idMap;
  //m = mgl.maps[idMap];

  //el = document.querySelector("[data-search_box_for='"+view.id+"']");

  //if(!el) return;

  //makeSelectr();

  //function tableToData(table){
    //var r, res;
    //var data = [];
    //for(r = 0 ; r < table.length ; r++ ){
      //row = table[r];
      //res = {};
      //res.value = row.values;
      //res.text = row.values;
      //data.push(res);
    //}
    //return data;
  //}

  //function makeSelectr(){
  
    //var table = path(view,"data.attribute.table");
    //var idView = view.id;
    //var data = tableToData(table);  
    //var selectr = new Selectr(el,{
      //data : data,
      //pagination : 10,
      //placeholder : mx.util.getLanguage("view_search_values",mx.language),
      //multiple : true,
      //clearable : true
    //});
     /**
    * Save selectr object in the view
    */
    //view.interactive.searchBoxe = selectr;
    /**
    * Set event logic
    */
    //selectr.on("selectr.select",function(el){
     //filterSelectr(this.selectedValues); 
    //});
    //selectr.on("selectr.deselect",function(el){
     //filterSelectr(this.selectedValues);
    //});

    /*
    * Filter selected values
    */
    //function filterSelectr(values){
      //mgl.helper.filterViewValues({
        //id : idMap,
        //search : values,
        //idView : idView
      //});
    //}
  //}
/*};*/
mgl.helper.makeSearchBox_choicejs = function(o){

  view = o.view;
  idMap = o.idMap;
  m = mgl.maps[idMap];

  el = document.querySelector("[data-search_box_for='"+view.id+"']");

  if(!el) return;

  makeSelectr();

  function tableToData(table){
    var r, res;
    var data = [];
    for(r = 0 ; r < table.length ; r++ ){
      row = table[r];
      res = {};
      res.value = row.values;
      res.label = row.values;
      res.selected = false;
      res.disabled = false;
      data.push(res);
    }
    return data;
  }

  function makeSelectr(){
  
    var table = path(view,"data.attribute.table");
    var idView = view.id;
    var data = tableToData(table);

    var searchBox = new Choices(el,{
      choices : data,
      placeholderValue : mx.util.getLanguage("view_search_values",mx.language)
    });
    
     /**
    * Save selectr object in the view
    */
    searchBox.targetView = view;
    view._interactive.searchBox = searchBox;
    /**
    * Set event logic
    */
    el.addEventListener('change', function(event) {
      var listObj = searchBox.getValue();
      var view = searchBox.targetView;
      var attr = path(view,"data.attribute.name");
      var filter = ['any'];
      listObj.forEach(function(x){
        filter.push(["==",attr,x.value]);
      });
      view._setFilter({
        filter : filter,
        type : "search_box"
      });
    });
  }
};
/*selectize version*/
mgl.helper.makeSearchBox = function(o){

  view = o.view;
  idMap = o.idMap;
  m = mgl.maps[idMap];

  el = document.querySelector("[data-search_box_for='"+view.id+"']");

  if(!el) return;

  makeSelectize();

  function tableToData(table){
    var r, res;
    var data = [];
    for(r = 0 ; r < table.length ; r++ ){
      row = table[r];
      res = {};
      res.value = row.values;
      res.label = row.values;
      data.push(res);
    }
    return data;
  }

  function makeSelectize(){
    var idView = view.id;
    var table = path(view,"data.attribute.table");
    var attr = path(view,"data.attribute.name");
    var data = tableToData(table);

    selectOnChange = function(value) {
      var view = this.view;
      var listObj = this.getValue();
      var filter = ['any'];
      listObj.forEach(function(x){
        filter.push(["==",attr,x]);
      });
      view._setFilter({
        filter : filter,
        type : "search_box"
      });
    };

    var searchBox = $(el).selectize({
      placeholder : "Filter values",
      choices : data,
      valueField : 'value',
      labelField : 'label',
      searchField :['value'],
      options : data,
      onChange : selectOnChange
    })
      .data()
      .selectize;
    /**
    * Save selectr object in the view
    */
    searchBox.view = view;
    view._interactive.searchBox = searchBox;

    // searchBox.targetView = view;
    //view._interactive.searchBox = searchBox;
    /**
    * Set event logic
    */

  }
};

/**
 * Apply a filter on a layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idView Layer id
 * @param {boolean} o.strict Search exact occurence
 * @param {boolean} o.useTable Search in table first.
 * @param {string} o.viewVariable variable name
 * @param {array} o.search srtring to search
 * @param {string} o.operator Operator for matching numeric value
*/ 
mgl.helper.filterViewValues_orig = function(o){

  //var start = performance.now();

  var view, views, idView, filterAll, varView, search, map, filt, valueMatch, valueStore = [], layers={}, idViewAll=[], values = [], attributes = {};
  var l, lay, origFilter, newFilter, filter;
  var operators = ["==",">=","<=",">","<"];
  var operator = o.operator ? o.operator : operators[0];
  var groupAnd = ["all"];
  var gOr, gAnd, op, rul, ops, attrs;
  var threshold = 90;
  var strict = o.strict ? o.strict : true;
  var useTable = o.useTable ? o.useTable : false;

  /**
   * id can be a sub view : eg. MX-YN0ZZ-T2YUQ-64LLV__pattern_0 
   * Extracting base layer : MX-YN0ZZ-T2YUQ-64LLV
  */ 
  idView = o.idView.split(mgl.settings.separators.sublayer)[0];
  views = mgl.helper.getKeyedViews(o);
  varView = o.viewVariable ;
  search = o.search;
  map = mgl.maps[o.id].map;
  view = views[idView];


  /* populate keyed multi layers */
  if(path(view,"data.layers")){
    view.data.layers.forEach(function(l){
      idViewAll.push(l.id);
      layers[l.id]=l;
    });
  }
 /* single layer*/
  if(path(view,"data.layer")){
    layers[view.id] = view.data.layer;
  }

  // if no attribute name to search for is given, try default
  if(!varView){
    varView = path(view,"data.attribute.name");
  }
  
  /** 
   *  retrieve view type and table for quick values match
   */
  type = path(view,"data.attribute.type");

  if(!search || search=="all$" || search === ""){
   threshold = 0;
  }

  if( search.constructor !== Array){
    search = [search];
  }
  
  if(type=="string"){

    search.forEach(function(s){ 
      if(useTable){
        table.forEach(function(x){
          if(strict){
            if( x.values == s || !s) valueStore.push(x.values);
          }else{
            if(mx.util.distanceScore(x.values,s)>=threshold) valueStore.push(x.values);
          }
        });
      }else{
        valueStore.push(s);
      }
    });
  
    valueStore =  mx.util.getArrayStat({arr:valueStore,stat:"distinct"});
    
    for( lay in layers ){

      filter = [];
      l = layers[lay];
      origFilter = l.filter;

      if(valueStore.length > 0){
        newFilter = ["in",varView].concat(valueStore);
      }else{
        newFilter = ["all"];
      }

      if( origFilter ){
        filter = ["all",origFilter,newFilter];
      }else{
        filter =  ["all",newFilter] ;
      }

      map.setFilter(lay,filter);
    }
  }
  
  
  if(type=="number"){

    if(search.constructor === Array) search = search.join("&");
    
    gAnd = search.split("&");

    if(gAnd){
      for( var i = 0; i < gAnd.length; i++ ){
        groupOr = ["any"];
        gOr = gAnd[i].split("|");
        for( var j= 0; j < gOr.length; j++ ){
          g=gOr[j];
          ops = [];
          for( var k = 0; k < operators.length; k++ ){
            op = operators[k];
            pos = g.indexOf(op);
            if( pos > -1 ){
              ops.push(op);
            }
          }
          op = ops[0];
          if(!op) op = operator;
          val = parseFloat(g.replace(/[^0-9\.]+/,""));
          if(!isNaN(val)){
            rul = [op,varView,val];
            groupOr.push(rul);
          }
        }
        if(groupOr.length>1){
          groupAnd.push(groupOr); 
        }
      }

      for(lay in layers){

        l = layers[lay];
        origFilter = l.filter;
        newFilter = groupAnd;
        filter = [];

      if( origFilter ){
        filter = ["all",origFilter,newFilter];
      }else{
        filter =  newFilter ;
      }
        map.setFilter(lay,filter);
      }
    }
  }
};

mgl.helper.filterViewValues = function(o){

  var attr,idMap,idView,search;
  var view, views, map, features, values, filter, op, dat;
  var isEl, isNumeric;

  isEl = o.constructor == HTMLAnchorElement;

  if(isEl){
    dat = o.dataset;
    attr = dat.tags_filter_attribute;
    idMap = dat.tags_filter_id_map;
    idView = dat.tags_filter_id_view;
    search = dat.tags_filter_search;
  }else{
    attr = o.attribute;
    idMap = o.id;
    idView = o.idView;
    search = o.search;
  }

  search = search.trim();
  isNumeric = mx.util.isNumeric(search);
  views = mgl.helper.getKeyedViews({id:idMap});
  view = views[idView];

  filter = ["all"];

  if( isNumeric ){
    filter = [">=",attr,search*1];
  }else{
    map = mgl.maps[idMap].map;
    features = map.querySourceFeatures(idView+"-SRC",{sourceLayer:idView});
    values = {}; 

    features.forEach(function(f){
      var value = f.properties[attr]; 
      var splited = value.split(/\s*,\s*/);
      if(splited.indexOf(search)>-1){
        values[value] = true;
      }
    });

    values = Object.keys(values);

    if(values.length>0){
      filter =  ['in',attr].concat(values);
    }
  }

  view._setFilter({
    filter : filter,
    type : "filter"
  });

};



/**
 * Add a new layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {object} o.layer Layer object
 * @param {string} o.before
 */
mgl.helper.addLayer = function(o) {
  var hasMap = mgl.helper.hasMap(o.id); 
  if ( hasMap ) {
    map = mgl.maps[o.id].map;
    if (map) {
      if (o.layer.id in map.style._layers) {
      } else {
        map.addLayer(o.layer, o.before);
      }
    }
  }
};

/**
 * Fly to view id using geometry extent
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
*/
mgl.helper.zoomToViewId = function(o){
  var hasMap = mgl.helper.hasMap(o.id); 

  if ( hasMap ) {

    map =  mgl.maps[o.id].map;
    views = mgl.helper.getKeyedViews(o);
    
    if( !views ) return ;
    
    var isArray = o.idView.constructor === Array;

    if(isArray){
      id = o.idView[0];
    }else{
      id = o.idView;
    }
    /* in case of layer group */
    id = id.split(mgl.settings.separators.sublayer )[0];
    /* extract view data */
    var dat = views[id];
    
    var extent = path(dat,"data.geometry.extent");
   
    if( !extent ) return;

    var llb = new mapboxgl.LngLatBounds(
      [extent.lng1, extent.lat1], 
      [extent.lng2, extent.lat2] 
    );

    if(llb){
      try{
      map.fitBounds(llb);
      }
      catch(err){
      console.log(err);
      }
    }

  }
};

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
*/
mgl.helper.zoomToViewIdVisible =  function(o){

  var geomTemp, exists, isArray;

  geomTemp = {
    type : "FeatureCollection",
    features : [] 
  };

  hasMap = mgl.helper.hasMap(o.id);

  if (hasMap) {

    try {
      map =  mgl.maps[o.id].map;

      idLayerAll =  mgl.helper.getLayersNamesByPrefix({
        id : o.id,
        prefix: o.idView
      });

      features =  map.queryRenderedFeatures({ 
        layers: idLayerAll
      });

      features.forEach(function(x){
        geomTemp
          .features
          .push( x );
      });

      if( geomTemp.features.length>0 ){
        var bbx = turf.bbox(geomTemp);
        var sw = new mapboxgl.LngLat(bbx[0], bbx[1]);
        var ne = new mapboxgl.LngLat(bbx[2], bbx[3]);
        var llb = new mapboxgl.LngLatBounds(sw, ne);
        map.fitBounds(llb);
      }
    }
    catch(err) {
      console.log("fit bound failed: " + err);
    }
  }
};

mgl.helper.resetViewStyle = function(o){

  if( ! o.id || ! o.idView) return;

  mgl
    .helper
    .addView({
      id : o.id,
      idView: o.idView
    });

  //mgl.helper.zoomToViewId({
  //id: o.id,
  //idView: o.idView
  /*});*/

};

/**
 * Fly to location and zoom
 * @param {object} o options
 * @param {string} o.id map id
 * @param {number} o.zoom 
 * @param {array} o.center
 * @param {number} o.speed
 */
mgl.helper.flyTo = function(o) {

  var hasMap = mgl.helper.hasMap(o.id);

  if ( hasMap ) {
    var m = mgl.maps[o.id].map;

    if (o.zoom && o.zoom == -1) {
      o.zoom = m.getZoom();
    }

    m.flyTo({
      center: o.center,
      zoom: o.zoom,
      speed: o.speed
    });
  }
};

/** 
 * Set or Update language of a layer, based on text-field attribute. 
 * @param {object} o Options 
 * @param {string} o.mapId Map id
 * @param {string} [o.layerId='country-label'] Layer containing the labels to change
 * @param {string} [o.language='en'] Two letter language code
 */
mgl.helper.setLanguage = function(o) {

  var hasMap = mgl.helper.hasMap(o.id);

  if (hasMap) {
    var m = mgl.maps[o.id].map;

    if (!o.language) {
      o.language = mx.language;
    }

    if (!o.language) {
      o.language = "en";
    }

    mx.language = o.language;

    if (!o.layerId) {
      o.layerId = "country-label";
    }


    /**
    * Set language in views list
    */
   mgl.helper.updateViewsListLanguage({
     id:o.id,
     lang:o.language
   });

    /**
    * Set language in layers
    */
    var layers = ["place-label-city","place-label-capital","country-label","water-label","poi-label"];

    for(var i = 0; i < layers.length ; i++){
      var layer = layers[i];
      var layerExists = mgl.helper.getLayersNamesByPrefix({
        id: o.id,
        prefix: layer
      }).length > 0;

      if( layerExists ) {
        m.setLayoutProperty(
          layer, "text-field", "{name_" + o.language + "}"
        );
      }

    }

  }
};



/**
* Toggle visibility for existing layer in style
* TODO: This is quite messy : simplify, generalize
* @param {Object} o options
* @param {String} o.id map id
* @param {String} o.idLayer Layer id to toggle
* @param {String} o.idSwitch Add a class "active" to given element id.
* @param {String} o.action hide, show, toggle
* @return {String} Toggled
*/
mgl.helper.btnToggleLayer = function(o){

  o.id = o.id || "map_main";
  var map = mgl.maps[o.id].map;
  var btn = document.getElementById(o.idSwitch);
  var lay = map.getLayer(o.idLayer);
  var layersToShow = [];
  var layersToHide = [];

  o.action = o.action || 'toggle';
  var isAerial = o.idLayer == 'here-aerial';// hide also shades...
  var toShow = o.action == 'show';
  var toHide = o.action == 'hide';
  var isVisible = lay.layout.visibility === "visible";
  var toToggle = o.action == 'toggle' || toShow && !isVisible || toHide && isVisible;

  if(isAerial){
    shades = mgl.helper.getLayersNamesByPrefix({id:o.id,prefix:'shade'});
  }

  if(toToggle){
    if(isVisible){    
      map.setLayoutProperty(o.idLayer,"visibility","none");
      if(isAerial){
        shades.forEach(function(s){ 
          map.setLayoutProperty(s,"visibility","visible");
        });
      }
      if(btn){
        btn.classList.remove("active");
      }     
    }else{
      map.setLayoutProperty(o.idLayer,"visibility","visible");
      if(isAerial){
        shades.forEach(function(s){ 
          map.setLayoutProperty(s,"visibility","none");
        });
      }
      if(btn){
        btn.classList.add("active");
      }
    }
  }
  return toToggle;
};

/**
* Set map-x ui and map colorscheme. 
* TODO: 
* - Generalize this. Default in mgl settings
* - Map modifier object as an option
* 
* @param {Object} o options
* @param {String} o.id map id
* @param {Object} o.colors Intial colors scheme.
*
*/
mgl.helper.setUiColorScheme = function(o){

  var init = false;
  var mx_colors;
  var map = mgl.maps[o.id||"map_main"].map;
  var styles = document.styleSheets;
  for(var i= 0,iL=styles.length;i<iL;i++){
    if(styles[i].title == "mx_colors"){
      var rules = styles[i].rules||styles[i].cssRules||[];
      for(var j=0,jL=rules.length;j<jL;j++){
        if(rules[j].selectorText == ".mx *"){
          mx_colors=rules[j];
        }
      }
    }
  }

  if(!mx_colors) {
    alert("mx_colors rules not found");
  }

  var c = o.colors;
  init = c !== undefined;
  c = c||{};
  c.mx_text = c.mx_text || "hsl(0, 0%, 21%)";
  c.mx_text_faded = c.mx_text_faded || "hsla(0, 0%, 21%, 0.6)";
  c.mx_hidden = c.mx_hidden || "hsla(196, 98%, 50%,0)";
  c.mx_border = c.mx_border || "hsl(0, 0%, 61%)";
  c.mx_background = c.mx_background ||"hsla(0, 0%, 97%, 0.95)";
  c.mx_shadow = c.mx_shadow || "hsla(0, 0%, 60%, 0.3)";
  c.mx_country_mask = c.mx_country_mask || "hsla(0, 0%, 60%, 0.3)";
  c.mx_water =  c.mx_water || "hsla(0, 0%, 97%, 0.95)";
  c.mx_road = c.mx_road || "hsla(0, 0%, 97%, 0.95)";
  c.mx_admin = c.mx_admin || "hsla(0, 0%, 97%, 0.95)";

  /**
  * create / update input color
  */

  var inputs = document.getElementById("inputThemeColors");
  inputs.classList.add("theme_colors");
  
  if(inputs && inputs.children.length>0){
    mx.util.forEachEl({
      els:inputs.children,
      callback:function(el){
         var colorIn = el.querySelector("[type='color']").value;
         var alphaIn = el.querySelector("[type='range']").value;
         var idIn = el.id;
        c[idIn] = mgl.helper.hex2rgba(colorIn,alphaIn);
      }
    });
  }

  if(init){
    inputs.innerHTML="";
    var inputType = ["color","range"];
    for(var cid in c){
      var container = document.createElement("div");
      container.id = cid;
      var container_inputs = document.createElement("div");
      var lab = document.createElement("label");
      container_inputs.id = cid + "_inputs";
      var color = mgl.helper.color2obj(c[cid]);

      for(var ityp=0,itypL=inputType.length;ityp<itypL;ityp++ ){
        var typ = inputType[ityp];
        var input = document.createElement("input");
        input.onchange=mgl.helper.setUiColorScheme;
        input.type = typ;
        input.id = cid + "_" + typ;
        if( typ == "range" ){
          input.min = 0;
          input.max = 1;
          input.step = 0.1;
        }
        input.value = typ == "range" ? color.alpha : color.color;
        container_inputs.appendChild(input);
      }
      lab.innerHTML = cid;
      //lab.dataset.lang_key = cid;
      //lab.dataset.lang_type = "tooltip";
      lab.setAttribute("aria-label", cid);
      lab.classList.add("hint--right");
      lab.for = cid;
      container.appendChild(lab);
      container.appendChild(container_inputs);
      inputs.appendChild(container);
    }
  }
  /**
  * Ui color
  */

  for(var col in c){
    mx_colors.style.setProperty("--"+col,c[col]);
  }
  

  /**
  * Map colors NOTE: PUT THIS OBJECT AS THEME
  */ 
  var layers = [
    {
      "id":["background"],
      "paint": {
        "background-color": c.mx_background 
      }
    },
    {
      "id":["maritime"],
      "paint": {
        "line-color": c.mx_background 
      }
    },
    {
      "id":["water"],
      "paint": {
        "fill-color": c.mx_water,
        "fill-outline-color" : c.mx_water
      }
    },
    {
      "id":["waterway"],
      "paint": {
        "line-color": c.mx_water
      }
    },
    {
      "id":["country-code"],
      "paint":{
        "fill-color": c.mx_country_mask
      }
    },
    {
      "id":["road-footway","road-cycleway","road-minor","road-major","road-street-minor"],
      "paint":{
        "line-color":c.mx_road
      }
    },
    {
      "id":["boundaries_2","boundaries_3-4"],
      "paint":{
        "line-color":c.mx_admin
      }
    },
    {
      "id":["country-label","place-label-capital","place-label-city"],
      "paint":{          
        "text-color": c.mx_text
      }
    } 
  ];

for(var k = 0,kL = layers.length; k<kL; k++ ){
  var grp = layers[k];
  for( l = 0, lL = grp.id.length; l < lL; l++ ){
    var lid = grp.id[l];
    var lay = map.getLayer(lid);
    if( lay ){
      for(var p in grp.paint){
        map.setPaintProperty(lid,p,grp.paint[p]); 
        }
      }
    }
  }

};



/**
 * Initial mgl and mapboxgl
 * @param {string} o options
 * @param {string} o.idMap id
 * @param {string} o.token Mapbox token
 * @param {array} [o.center=[0,0]] Array of lat,lng for center 
 * @param {number} [o.zoom=0] Zoom level
 * @param {number} [o.minZoom=4] Min zoom level
 * @param {number} [o.maxZoom=10] Max zoom level
 * @param {string} o.language Initial language code 
 * @param {string} o.languages Languages code list 
 * @param {string} o.path relative path to resource (style, theme, sprite , ...)
 * @param {Object} o.vtUrl Base url for fetching vector tiles. eg. http://localhost:3030/tile/{z}/{x}/{y}.mvt 

 */
mgl.helper.initMap = function(o){

  var mapEl = document.getElementById(o.id);

  if(! mapEl ){
    alert("Map element with id "+ o.id  +" not found");
    return ;
  }


  /**
   * Confirm user quit
   */

  if(false){
    window.onbeforeunload = function(e) {
      var dialogText = 'Are you sure you want to quit?';
      e.returnValue = dialogText;
      return dialogText;
    };
  }

  /**
   * Set mapbox gl token
   */
  if (!mapboxgl.accessToken && o.token) {
    mapboxgl.accessToken = o.token;
  }

  /**
   * TEst if mapbox gl is supported
   */
  if ( !mapboxgl.supported() ) {
    alert("This website will not work with your browser. Please upgrade it or use a compatible one.");
    return;
  }

  

  /**
   * Set default
   */
  if (!o.center) {
    o.center = [0, 0];
  }
  if (!o.zoom) {
    o.zoom = 0;
  }
  if (!o.maxZoom) {
    o.maxZoom = 20;
  }
  if (!o.minZoom) {
    o.minZoom = 0;
  }

  if (!o.location){
    o.location = window.location.origin + window.location.pathname;
  }

  // set path using current location. 
  //This means that styles files must be on the current server.
  if(o.paths.style){
    o.paths.style = o.location + o.paths.style;
  }
/*  if(o.paths.themes){*/
    //o.paths.themes = o.location + o.paths.themes;
  /*}*/
  if(o.paths.sprite){
    o.paths.sprite = o.location + o.paths.sprite;
  }

  // save all available languages
  if(o.languages){
    mx.languages = o.languages;
  }

  // save default language
  if(o.language){
    mx.language = o.language;
  }else{
    o.language = mx.language;
    if(!o.language) o.language = o.languages[0];
  }

  // save vt config
  if(o.vtUrl){
    mgl.settings.vtUrl = o.vtUrl;
  }


  /**
   * Init mgl data store
   */  
  if (!mgl.maps) {
    mgl.maps = {};
  }
  /**
   * Mgl data : keep reference on options, listener, views, etc...
   */
  mgl.maps[o.id] = {
    options : o,
    map: {},
    listener: {},
    views : [],
    style : {}
    //themes : {}
  };

  /*
  * Get style object
  */
  mx.util.getJSON({
    url : o.paths.style,
    onError : console.log,
    onSuccess : function(style) { 
      /*
      * Get the theme object
      */
/*      mx.util.getJSON({*/
        //url : o.paths.themes,
        //onError : console.log,
        /*onSuccess : function(themes) {*/

          /* save theme and sytle object, used in switchui */
          //mgl.maps[o.id].themes = themes;
          mgl.maps[o.id].style = style;

          /*  Set sprite url : relative path does not work..*/
          style.sprite = o.paths.sprite;

          /* Create map object */
          var map = new mapboxgl.Map({
            container: o.id, // container id
            style: style,
            center: [o.lng,o.lat],
            zoom: o.zoom,
            maxZoom: o.maxZoom,
            minZoom: o.minZoom,
            preserveDrawingBuffer: true
          });

          /* save map in mgl data */
          mgl.maps[o.id].map =  map;

          /**
           * Send loading confirmation to shiny
           */
          map.on('load', function() {
            Shiny.onInputChange('mglEvent_' + o.id + '_ready', (new Date()));

            if(o.colorScheme){
              mgl.helper.setUiColorScheme({colors:o.colorScheme});
            }
          });

          /**
           * Handle drop geojson event
           */
          if(mgl.helper.handleDropGeojson && mgl.helper.handleDragOver){
            // Set events
            mapEl.addEventListener('dragover', mgl.helper.handleDragOver, false);
            mapEl.addEventListener('drop', mgl.helper.handleDropGeojson, false);
          }
          /**
           * Add controls to the map
           */
          map.addControl(new mgl.control.main(),'top-left');

          /**
           * Move event:
           * if content of class "mgl-map-pos" elements is empty, add map position data
           */
          map.on("moveend",mx.util.debounce(function(){
            var el, els, pos;

            els = document.querySelectorAll(".mgl-map-pos");

            if(els && els.length > 0){

              pos = mgl.helper.getMapPos(o);

              for(var e=0; e < els.length ; e++){
                el = els[e];
                if(!el.value){
                  el.value = JSON.stringify(pos);
                }
              }
            }
          }));


          /**
          * Trigger country change on double click
          * NOTE: experimental. layers and input id should be moved as options.
          */
          map.on('dblclick',function(e){
            var cntry, features ;
            if(o.countries){
              features = map.queryRenderedFeatures(e.point, { layers: ['country-code'] });
              /**
              * From there we could use the feature to zoom on the bounding box. But.. 
              * The server application will try to set zoom as well. TODO: untangle this.
              */
              cntry = path(features[0],"properties.iso3code");
              if(o.countries.indexOf(cntry) > -1 && Shiny ) {
                Shiny.onInputChange( "selectCountry", cntry);
              }
            }
          });

          /**
           * Click event : it's a popup.
           */
          map.on('click', function(e) {

            var layers, item, p, prop, propAll, layerDone, view, views, lang, baseLayer, features, title;
            var popup, popupRendered;

            layers = mgl.helper.getLayersNamesByPrefix({
              id: o.id,
              prefix: "MX-"
            });

            if( layers.length < 1 || !mx.templates.viewPopup ) return;

            propAll = [];
            layerDone = [];
            views = mgl.helper.getKeyedViews(o);
            lang =  mx.language;

            for(var i =0; i < layers.length; i++){

              baseLayer = layers[[i]].split(mgl.settings.separators.sublayer)[0];

              if( layerDone.indexOf( baseLayer ) == -1 ){

                features = map.queryRenderedFeatures(e.point, { layers: [layers[i]] });

                if(features.length > 0){
                  layerDone.push(baseLayer);
                }

                view = views[baseLayer];

                title = path(view,"data.title."+lang);

                if(!title) title = path(view,"data.title."+"en");


                prop = [];

                for(var f = 0 ; f < features.length ; f++){
                  feat = features[f];
                  if( feat ){
                    p = feat.properties;
                    if( p ){
                      for(var k in p){
                        if(k !="mx_t0" && k != "mx_t1"){
                          item = {
                            key : k,
                            value : p[k],
                            idView : baseLayer,
                            idMap : o.id
                          };
                          prop.push(item);
                        }
                      }
                    }
                  }
                }
                
               if( prop.length > 0 ){
                propAll.push({
                  title : title,
                  prop : prop
                });
               }

              }
            }
            
            if(propAll.length >0 ){
            popupRendered = mx.templates.viewPopup(propAll);

            popup = new mapboxgl.Popup()
              .setLngLat(map.unproject(e.point))
              .setHTML(popupRendered)
              .addTo(map);
            }
          });

        //}
      //});
    }
  });
};






/**
* Get map position summary
* @param {object} o options 
* @param {string} o.id map id
*/
mgl.helper.getMapPos = function(o){

  var map, bounds, center, zoom, bearing, pitch;
  var r = mx.util.round;
  map = mgl.maps[o.id].map;

  bounds = map.getBounds();
  center =  map.getCenter();
  zoom = map.getZoom();
  bearing = map.getBearing();
  pitch = map.getPitch();

  out = {
    n : r(bounds.getNorth()),
    s : r(bounds.getSouth()),
    e : r(bounds.getEast()),
    w : r(bounds.getWest()),
    lat :r(center.lat),
    lng :r(center.lng),
    b : r(bearing),
    p : r(pitch),
    z : r(zoom)
  };

  return out;

};

/**
* Create views object with id as key
* @param {object} o options
* @param {string} o.id map id
*/
mgl.helper.getKeyedViews = function(o){

  var dat, viewsKeyed = {};

  dat = mgl.maps[o.id];

  if( dat && dat.views ){
    if( dat.views.length > 0 ){
      dat.views.forEach(function(x){
        viewsKeyed[x.id] = x;     
      });
    }
  }

  return viewsKeyed;
};

/**
* Toy function to make layer move
*/
mgl.helper.makeLayerJiggle = function(mapId, prefix) {

  var layersName = this.getLayersNamesByPrefix({
    id: mapId,
    prefix: prefix
  });

  if (layersName.length > 0) {

    var varTranslate = {
      'line': 'line-translate',
      'fill': 'fill-translate',
      'circle': 'circle-translate',
      'symbol': 'icon-translate'
    };

    var m = mgl.maps[mapId].map;

    layersName.forEach(function(x) {
      var l = m.getLayer(x);
      var t = l.type;
      var o = varTranslate[t];
      var n = 0;
      var max = 20;
      var time = 200;
      var dist = [
        [-20, 0],
        [20, 0]
      ];
      var interval = setInterval(function() {
        if (n < max) {
          n++;
          m.setPaintProperty(x, o, dist[n % 2]);
        } else {
          m.setPaintProperty(x, o, [0, 0]);
          clearInterval(interval);
        }
      }, time);
    });
  }
};


/**
 * swich ui color
 * @param {object} o options
 * @param {string} o.idMap id map
 * @param {string} o.id ID of the theme
 */
//mgl.helper.setTheme =  function(o){
  //var m =  mgl.maps[o.idMap],
    //map = m.map,
    //style = m.style,
    //themes = m.themes,
    //config = themes.config, [> ready: false ; idEnabled : "init" <]
    //oldClass = config.class;
    
    //if ( !config.initial || !config.initial.name  ) {
      //config.initial = JSON.parse(JSON.stringify(map.getStyle()));
      //config.current = "init";
    //}


  //var updateStyle = function(layer){
    //for( var p in layer.paint){
      //map.setPaintProperty(layer.id,p,layer.paint[p]);
    //}
    //for( var l in layer.layout ){
      //map.setLayoutProperty(layer.id,l,layer.layout[l]);
    //}
  //};


  //var resetStyle = function(){
    //var layers = config.initial.layers,
      //altered = config.altered,
      //layer, alt;
    //for(var i = 0; i < altered.length ; i++){
      //for(var j = 0; j < layers.length ; j++){
        //layer = layers[j];
        //alt = altered[i];
        //if( layer.id == alt ){
          //updateStyle(layer);
         //}
      //}
    //}
    //config.altered = [] ;
    //config.current = "init";
    //config.class="white";
  //};

  //var applyTheme = function(id){
    //resetStyle();
    //for(var i = 0 ; i < themes.store.length; i++){
      //var theme =  themes.store[i];
      //if( id == theme.id ){
        //config.current = id;
        //config.class = theme.ui.class;
        //for(var j = 0; j < theme.layers.length ; j ++ ){
          //var layer = theme.layers[j];
          //config.altered.push(layer.id);
          //updateStyle(layer);
        //} 
      //}
    //}
  //};

  //var applyNextTheme = function(){
    //var ids = ['init'];
    //var pos = 0;
    //for(var i = 0 ; i < themes.store.length ; i++){
      //ids.push(themes.store[i].id);
    //}
    //pos = ids.indexOf(config.current);
    //if(pos == -1 || pos == ids.length ){
      //pos = 0;
    //}else{
      //pos = pos + 1;
    //}

    //applyTheme(ids[pos]);
  //};

  //if(o.id){
     //applyTheme(o.id); 
  //}else{
    //applyNextTheme();
  //}


  //mx.util.classAction({
    //selector : "body",
    //class : oldClass,
    //action : "remove"
  //});

  //mx.util.classAction({
    //selector : "body",
    //class : config.class,
    //action : "add"
  //});

//};


/**
 * Take every layer and randomly change the color  
 * @param {string} mapId Map identifier
 */
mgl.helper.randomFillAll = function(mapId) {
  setInterval(function() {
    var map = mgl.maps[mapId].map;
    var layers = map.style._layers;

    //map.setBearing(Math.random() * 360);
    //map.setPitch(Math.random() * 60);

    for (var l in layers) {
      var type = layers[l].type;
      if (type) {
        switch (type) {
          case 'fill':
            map.setPaintProperty(l, 'fill-color', mx.util.randomHsl(1));
            break;
          case 'background':
            map.setPaintProperty(l, 'background-color', mx.util.randomHsl(1));
            break;
          case 'line':
            map.setPaintProperty(l, 'line-color', mx.util.randomHsl(1));
            break;
        }
      }
    }
  }, 100);
};




/*
 * Shiny bindings
 */
$('document').ready(function() {

  // mapbox gl init
  Shiny.addCustomMessageHandler( 'mglInit', mgl.helper.initMap );

  // Set country language
  Shiny.addCustomMessageHandler( 'mglSetLanguage', mgl.helper.setLanguage );

  // Save update vuew list
  Shiny.addCustomMessageHandler( 'mglSetSourcesFromViews',mgl.helper.setSourcesFromViews );

  // Render view list to ui
  Shiny.addCustomMessageHandler( 'mglRenderViewsList', mgl.helper.renderViewsList );

  // add auto layer generated by schema
  /*Shiny.addCustomMessageHandler( 'mglAddAutoLayer', mgl.helper.addAutoLayer );*/

  // preview story map edits, save state
  Shiny.addCustomMessageHandler('mglReadStory', mgl.helper.story.read );

  // add view style
  Shiny.addCustomMessageHandler('mglAddView', mgl.helper.addView );
  
  // Get local forage object
  Shiny.addCustomMessageHandler('mglGetLocalForageData', mgl.helper.getLocalForageData );

  // filter visible feature of the given layer id
  Shiny.addCustomMessageHandler( 'mglSetFilter', mgl.helper.setFilter );

  // add new layer
  Shiny.addCustomMessageHandler( 'mglAddLayer',  mgl.helper.addLayer );

  // go to location with animation
  Shiny.addCustomMessageHandler( 'mglFlyTo', mgl.helper.flyTo );

  // sync all maps
  Shiny.addCustomMessageHandler( 'mglSyncAllMaps', mgl.helper.syncAll );

  // delete geojson view
  Shiny.addCustomMessageHandler( 'mglRemoveView', mgl.helper.removeView );

});


