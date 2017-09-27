/*jshint esversion: 6 , node: true */
import * as mx from './mx_init.js';
//var escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;

/**
 * Get local forage item and send it to shiny server
 * @param {Object} o options
 * @param {String} o.idStore Id/Name of the store
 * @param {String} o.idKey Key to retrieve
 * @param {String} o.idInput Which id to trigger in Shiny
 */
export function getLocalForageData(o){ 
  var db = mx.data[o.idStore];
  db.getItem(o.idKey).then(function(item){
    Shiny.onInputChange(o.idInput,{
      item : item,
      time : (new Date())
    });
  });
}


/**
* Reset project : remove view, dashboards, etc
* @param {String} idMap map id
*/
export function reset(o){

  var views = mx.maps[o.idMap].views ;
  var elViewList = document.querySelectorAll(".mx-views-list");

  views.forEach(function(view){
    if( view._dashboard ) view._dashboard.destroy();
  }) ;

  //mx.maps[o.idMap].views = [] ;

  elViewList.innerHTML="";

}




/** 
 * Add source from view object 
 * @param {Object} o options
 * @param {Object} o.m Mgl maps item e.g. mx.maps.map_main
 * @param {oject} o.view View object
 */
export function addSourceFromView(o){
  
  if(o.m && mx.helpers.path(o.view,"data.source")){

    var country = mx.settings.country;
    var countryView = mx.helpers.path(mx,"settings.country") ;
    var countriesView = mx.helpers.path(o.view,"data.countries") || [];

    var isLocationOk = countryView == country || countriesView.indexOf(country) > -1;

    if( isLocationOk ){
      var sourceId = o.view.id + "-SRC";
      var sourceExists = !!o.m.map.getSource(sourceId);

      if( sourceExists ) {
        o.m.map.removeSource( sourceId ) ;
      }

      if(o.view.type == "vt"){
        var baseUrl = mx.settings.vtUrl;
        var url =  baseUrl + "?view=" + o.view.id + "&date=" + o.view.date_modified ;
        o.view.data.source.tiles = [url,url] ;
      }

      o.m.map.addSource(
        sourceId,
        o.view.data.source
      );
    }
  }
}


/**
 * Save view list to views

 * @param {object} o options
 * @param {string} o.id ID of the map 
 * @param {object} o.viewList views list
 * @param {boolean} o.add Append to existing
 * @param {string} o.country code
 * @param {function} o.feedback Feedback function. Default is renderViewsList
 */
export function setSourcesFromViews(o){
  
  var m = mx.maps[o.id];
  var view, views, sourceId, sourceExists, sourceStore, isFullList;
  var isArray, hasViews;

  if(m){

    views = o.viewsList ;
    isFullList = views instanceof Array ;
    hasViews = m.views.length > 0;

    if( !o.feedback ) o.feedback = mx.helpers.renderViewsList;

    if( isFullList ){ 
      /**
       * if there is multiple view in array, use them as main views list.
       * Set country, add each views to sources and feedback.
       */
      //m.views = views;

      mx.maps[o.id].views = views;
      /**
       * remove existing layers
       */
      mx.helpers.removeLayersByPrefix({
        id:o.id,
        prefix:"MX-"
      });
      /**
       * Reset the current country
       */
      if( o.country ) mx.settings.country = o.country;

      /**
       * Init 
       */
      for( var i = 0 ; i < views.length ; i++ ){
        /**
         * add source from views list
         */
        mx.helpers.addSourceFromView({
          m : m,
          view : views[i]
        });


      }

      o.feedback({
        id : o.id,
        views : views
      });

      /**
       * extract views from local storage
       */
      mx.data.geojson.iterate(function( value, key, i ){
        view = value.view;
        if( view.country == mx.settings.country ){
          m.views.unshift(value.view);


          mx.helpers.addSourceFromView({
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

    }else{

      /**
       * If this is not an array and the mgl map opbject already as views,
       * add the view and feedback
       */
      if(hasViews){
        m.views.unshift( views );
      }

      mx.helpers.addSourceFromView({
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

}

/**
 * Retrieve nested item from object/array
 * @param {Object|Array} obj
 * @param {String} path dot separated
 * @param {*} def default value ( if result undefined )
 * @note http://jsfiddle.net/Jw8XB/1/
 * @returns {*}
 */
export function path(obj, path, def){
  
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
export function viewControler(o){
  

  var m = mx.maps[o.id];
  var i,els,view,views,viewStyle,geomType,idSource;

  if(m.views){ 

    views = mx.helpers.getViews(o);
    els = document.querySelectorAll("[data-view_action_key='btn_toggle_view']");

    var loaded = mx.helpers.getLayerNamesByPrefix({
      id:o.id,
      prefix:"MX-",
      base : true
    }) ;

    for( i = 0; i < els.length ; i++ ){
      var id = els[i].dataset.view_action_target;

      view = views[id];

      if( view ){

        var isChecked =  els[i].checked === true;
        var isLoaded = loaded.indexOf(id) > -1;
        var toAdd = isChecked && !isLoaded ;
        var toRemove = !isChecked && isLoaded ;

        if( toRemove ){

          mx.helpers.removeLayersByPrefix({
            id : o.id,
            prefix: id
          });

         if(view._dashboard){
           view._dashboard.destroy();
         }

        }

        if( toAdd ){

          mx.helpers.addView({
            id : o.id,
            viewData : view,
            idViewsList : o.idViewsList,
          });

          view._setFilter();

          mx.helpers.makeDashboard({ view: view, idMap: o.id });

        }
      } 
    }

    updateViewOrder(o);
  }
}


/**
 * Manual events on view list items
 * @param {object} o options
 * @param {string} o.id Map id
 * @param {string} o.idView view id
 * @param {string} o.action Action :  "check", "uncheck"
 */
export function viewLiAction(o){
  

  if(!o.id || !o.idView || !o.action) return;

   var el = document.querySelector("input[data-view-toggle='" + o.idView + "']");

  if( o.action == "check"  && el && !el.checked ) {
    el.checked = true;
  }

  if( o.action == "uncheck" && el && el.checked){
    el.checked = false;
  }

}


/**
 * Get main variable for a vt view
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function getViewVariable(o){
  
  var view = mx.helpers.getViews(o);
  return mx.helpers.path(view,"data.attribute.name");
}

/**
 * Create a default random style 
 * @param {object} o Options
 * @param {string} o.id Id of the view
 * @param {string} o.idSource id of the source
# @param {string} o.geomType Geometry type, once of point, line, polygon
# @param {string} o.hexColor Hex color. If not provided, random color will be generated
# @param {Number} o.size 
# @param {string} o.sprite
*/
export function defaultStyle(o){
  

  var ran, colA, colB, style;

  var size = o.size || 2;
  var sprite = o.sprite || "";
  var opA = o.opacity || 0.7;
  var opB = (opA + 0.5 * (1-opA)) || 1 ;

  if(!o.hexColor){
    ran = Math.random();
    colA = mx.helpers.randomHsl(0.5, ran);
    colB = mx.helpers.randomHsl(0.8, ran);
  }else{
    colA = mx.helpers.hex2rgba(o.hexColor,o.opacity );
    colB = mx.helpers.hex2rgba(o.hexColor,o.opacity + 0.6);
  }

  style = {
    "point": {
      "id": o.id,
      "source": o.idSource,
      "source-layer":o.id,
      "type": "circle",
      "paint": {
        "circle-color": colA,
        "circle-radius": size,
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
        "line-width": size
      }
    }
  };

  return(style[o.geomType]);

}

/**
 * Update layer order based on view list position
 * @param {object} o Options
 * @param {string} o.id Id of the map
 * @param {string} o.idViewsList Id of the list containing view items
 * @param 
 */
export function updateViewOrder (o){
  

  var displayedOrig  = {};
  var order = getViewOrder(o);
  var displayed = [];
  var m = mx.maps[o.id];
  var viewContainer = document.getElementById(o.idViewsList);
  var orderSubset = [];
  var layerBefore = "mxlayers"; 

  if(!order) return;

  displayed = mx.helpers.getLayerNamesByPrefix({
    id:o.id,
    prefix:"MX-"
  });


  displayed.sort(
    function(a,b){
      var posA = order.indexOf(a.split(mx.settings.separators.sublayer )[0]);
      var posB = order.indexOf(b.split(mx.settings.separators.sublayer )[0]);
      return posA-posB;
    });

  displayed.forEach(function(x){

    var posBefore = displayed.indexOf(x)-1;

    if(posBefore > -1 ){
      layerBefore = displayed[posBefore];
    }

    m.map.moveLayer(x,layerBefore);

  });

}

/**
 * Get the current view order
 * @param {Object} o Options
 * @param {string} o.id Id of the map
 * @return {array} view id array
 */
export function getViewOrder(o){
  

  var m = mx.maps[o.id];
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
}

/**
 * Listener for view list filter
 * @param {object}  o options
 * @param {array} o.activeFilters Current active filters
 * @param {object} o.m Mgl data item
 * @param {object} o.viewClasses View classes
 */
export function handleListFilterClass(o){
  

  return function(event){
    if( event.target == event.currentTarget ) return ;
    var el = event.target ;
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
}


/**
 * Create and listen to transparency sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export function makeTransparencySlider(o) {
  

  var view = o.view;
  var idMap = o.idMap;
  var m = mx.maps[idMap];
  var el = document.querySelector("[data-transparency_for='"+view.id+"']");

  if(!el) return;

  makeSlider();

  function makeSlider(){

    Promise.all([
    System.import("nouislider"),
    System.import("../../node_modules/nouislider/distribute/nouislider.css")
    ]).then(function(module){

      var noUiSlider = module[0];

      var slider = noUiSlider.create(el, {
        range: {min:0,max:100},
        step:  1,
        start: 0,
        tooltips: false
      });

      slider.targetView = view;

      /*
       * Save the slider in the view
       */
      view._interactive.transparencySlider = slider;

      /*
       * 
       */
      slider.on("slide", mx.helpers.debounce(function(n, h) {
        var view =  this.targetView;
        var opacity = 1-n[h]*0.01;
        view._setOpacity({opacity:opacity});
      }, 10 ));

    });
  }
}


/**
 * Create and listen to numeric sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export function makeNumericSlider(o) {
  

  var view = o.view;
  var idMap = o.idMap;
  var m = mx.maps[idMap];
  var el = document.querySelector("[data-range_numeric_for='"+view.id+"']");

  if(!el) return;

  makeSlider();

  function makeSlider(){
    var idView = view.id;
    var attrName = view.data.attribute.name;
    var min = mx.helpers.path(view,"data.attribute.min");
    var max = mx.helpers.path(view,"data.attribute.max");

    if(view && min !== null && max !== null){

      if(min == max){
        min = min -1;
        max = max +1;
      }

      var range = {
        min: min,
        max: max
      };

    System.import("nouislider").then(function(noUiSlider){
     var slider = noUiSlider.create(el, {
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
      slider.on("slide", mx.helpers.debounce(function(n, h) {
        var view =  this.targetView;
        var layerExists, filter;

        var elContainer = this.target.parentElement;
        var elDMax = elContainer.querySelector('.mx-slider-dyn-max');
        var elDMin = elContainer.querySelector('.mx-slider-dyn-min');
        var k = view.data.attribute.name;

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
    });
    }
  }
}

/**
 * Create and listen to time sliders
 */
export function makeTimeSlider(o) {
  
  var k = {};
  k.t0 = "mx_t0";
  k.t1 = "mx_t1";

  var view = o.view;
  var idMap = o.idMap;
  var m = mx.maps[idMap];

  var el = document.querySelector('[data-range_time_for="'+view.id+'"]');
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
    to: now,
    from: true
  };

  makeSlider(); 

  function makeSlider(){

    if( view.data.period ){
      var time = mx.helpers.path(view,"data.period");
      var prop = mx.helpers.path(view,"data.attribute.names");
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

    System.import("nouislider").then(function(noUiSlider){
        var  slider = noUiSlider.create(el, {
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
        /* NOTE: removed chart. Removed dependencies to chartist

        /*
         * 
         */
        slider.on("slide", mx.helpers.debounce(function(t, h) {
          var filterAll = [];
          var filter = [];
          var view = this.targetView;
          var layerExists;
          var elContainer = this.target.parentElement;
          var elDMax = elContainer.querySelector('.mx-slider-dyn-max');
          var elDMin = elContainer.querySelector('.mx-slider-dyn-min');

          /* save current time value */
          //ime.extent.set = t;

          /* Update text values*/
          if (t[0]) {
            elDMin.innerHTML = mx.helpers.date(t[0]);
          }
          if (t[1]) {
            elDMax.innerHTML = " – " + mx.helpers.date(t[1]);
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

       });
      }

    }

  }

}

/**
 * Handle view data text filter listener
 * @param {object} o options
 * @param {string} o.id map id
 */
export function handleViewValueFilterText(o){
  
  /*
   * Set listener for each view search input
   * NOTE: keyup is set globaly, on the whole view list
   */
  return function(event) {
    var action, el, idView, viewVar, search, options;
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

    filterViewValues(options);
  };
}


/** 
 * Remove view from views list and geojson database
 * @param {object} o options;
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function removeView(o){

  var li  = document.querySelector("[data-view_id='" + o.idView + "']") ;

  var m  = mx.maps[ o.id ];
  var list = m.tools.viewsListJs;
  var views = m.views;
  var view = views.filter(function(x){
    return x.id == o.idView ;
  })[0];

  if(!view) return;

  if( view.type == "gj" ){
    var data =  mx.data.geojson ;
    data.removeItem( o.idView );
  }

  if( view._dashboard ){
     view._dashboard.destroy();
  }

  m.views = views.filter(function(x){
    return x.id != o.idView ; 
  });

  mx.helpers.removeLayersByPrefix({
    id : o.id,
    prefix : o.idView
  });

  if(li){
    li.remove();
  }

  list.reIndex();
}

/**
 * Handle view click events
 * @param o options
 */
export function handleViewClick(o){
  

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

          removeView({
            id : o.id,
            idView : arg.view_action_target
          });

        }
      },
      {
        id : "viewUploadGeojson",
        comment :"target is the upload geojson button",
        isTrue : el.dataset.view_action_key == "btn_upload_geojson",
        action : function(){
          var target = el.dataset.view_action_target;
          /**
           * Extract view data and send it to shiny in chunk
           */
          mx.data.geojson.getItem(target).then(function(x){

            var data, part, 
              size = 100000,
              delay = 1000;

            var view = x.view;
            var json = JSON.stringify(view);
            var chunk = mx.helpers.chunkString(json,size);
            var chunkL = chunk.length;

            for(var i = 1; i < chunkL + 1 ; i++){
              sendPart(i,chunk[i-1]);
            }

            function sendPart(part,data){
              setTimeout(function(){
                var percent =  Math.round(( part / chunkL ) * 100);

                mx.helpers.progressScreen({
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
          /*          parseStory({*/
          //id : o.id,
          //idView : el.dataset.view_action_target
          /*});*/
          mx.helpers.storyRead({
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
          zoomToViewIdVisible({
            id : o.id,
            idView : el.dataset.view_action_target
          });
        }
      },
      {
        id : "viewShare",
        comment :"target is the share button",
        isTrue : el.dataset.view_action_key == "btn_opt_share",
        action : function(){
          var idView =  el.dataset.view_action_target;
          var link =  location.origin + location.pathname + "?views=" + idView + "&country="+mx.settings.country;
          var idLink = "share_"+idView;
          var input = "<textarea class='form-control form-input-line'>"+link+"</textarea>";
          mx.helpers.modal({
            title : mx.helpers.getLanguage("btn_opt_share",mx.settings.language),
            id : idLink,
            content : input
          });
        }
      },
      {
        id : "viewZoomExtent",
        comment :"target is zoom to extent",
        isTrue : el.dataset.view_action_key == "btn_opt_zoom_all",
        action : function(){
          mx.helpers.zoomToViewId({
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

          var elSearch =  document.getElementById(el.dataset.view_action_target);

          mx.helpers.classAction({
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
            legendContainer = mx.helpers.parentFinder({
              selector : el,
              class : "mx-view-item-legend" 
            }),
            legendInputs = legendContainer.querySelectorAll("input") 
          ;
          var idView = el.dataset.view_action_target;
          var view = mx.helpers.getViews({id:'map_main',idView:idView});
          var attribute = mx.helpers.path(view,'data.attribute.name');
          var type = mx.helpers.path(view,'data.attribute.type');
          var op = "==";
          var  filter = ["any"];
          if(type=="number") op = ">=";


          for(var i = 0, il = legendInputs.length; i < il ; i++){
            var li =  legendInputs[i];
            if(li.checked){
              var viewValue = li.dataset.view_action_value; 
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
          viewControler(o);       
        } 
      },
      {
        id : "viewReset",
        comment : "target is the reset button",
        isTrue :  el.dataset.view_action_key == "btn_opt_reset",
        action :function(){
          resetViewStyle({
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
          downloadMapPng({
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
}




/**
 * Update views list text and title using data in views.
 * 
 * @param {Object} o options
 * @param {String} o.id Maps item id
 * @param {String} o.lang Two letter language code. see mx.settings.languages.
 */
export function updateViewsListLanguage(o){
  
  var elsViews = document.getElementsByClassName("mx-view-item");
  var views = mx.maps[o.id].views;

  o.langs = mx.helpers.objectToArray(mx.settings.languages);

  mx.helpers.forEachEl({
    els : elsViews,
    callback : function(el){
      var l =  o.lang,
        id = el.dataset.view_id,
        v = views.filter(function(v){ return v.id == id ; })[0],
        elTitle = el.querySelector(".mx-view-item-title"),
        elText = el.querySelector(".mx-view-item-desc"),
        elLegend = el.querySelector(".mx-view-item-legend");

      if(elLegend){
        elLegend.innerHTML = mx.templates.viewListLegend(v);
      }

      if(elTitle){
        elTitle.innerHTML = mx.helpers.getLanguageFromObjectPath({
          obj : v,
          path : "data.title",
          lang : o.lang,
          langs : o.langs,
          defaultKey : "noTitle"
        });
      }
      if(elText){ 
        elText.innerHTML = mx.helpers.getLanguageFromObjectPath({
          obj : v,
          path : "data.abstract",
          lang : o.lang,
          langs : o.langs,
          defaultKey : "noAbstract"
        });
      }
    }
  });


}




/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export function renderViewsList(o){
  
  var m = mx.maps[o.id];
  var elViewsContainer = document.querySelector(".mx-views-container");
  var elViewsContent = elViewsContainer.querySelector(".mx-views-content");
  var elViewsList = elViewsContainer.querySelector(".mx-views-list");
  var views = o.views;
  var add = o.add;

  if( views.constructor === Object ){
    views = [ views ];
    add = true;
  }

  /* TODO: set as options */

  var viewClasses = {
    "title" : "mx-view-item-title",
    "meta" : "mx-view-item-index",
    "type" : "mx-view-item-type",
    "classes" : "mx-view-item-classes"
  };

  var elFilters, activeFilters = [];

  if( views === undefined || views.constructor !== Array ||  views.length < 1 || !mx.templates.viewList ){
    if( ! add ){
      elViewsList.innerHTML = mx.helpers.getLanguage("noView"); 
    }
  }else{

    if( !m.listener ) m.listener = {};
    if( !m.tools ) m.tools = {};

    /**
     * Render view items
     */
    if( ! add ){ 
      elViewsList.innerHTML = mx.templates.viewList(views);
    }else{
      var emptyDiv, newItem, newInput ; 
      views.forEach(function(v){m.views.push(v);});
      emptyDiv = document.createElement("div");
      emptyDiv.innerHTML = mx.templates.viewList(views);
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

 
    /**
     * Create searchable list.js object
     */
    if( ! m.tools.viewListJs ){
      System.import('list.js').then(function(List){
        m.tools.viewsListJs = new List( elViewsContainer, {
          valueNames: mx.helpers.objectToArray(viewClasses),
          listClass : "mx-views-list"
        });
      });
    }else{
      m.tools.viewsListJs.reIndex();
    }

    /**
     * Create Sortable list
     */
    if( ! m.listener.viewsListSortable ){
      m.listener.viewsListSortable = mx.helpers.sortable({
        selector : elViewsList,
        callback : function(x){
          updateViewOrder(o);
        }
      });
    }

    /*
     * List filter by classes
     */
    if( ! m.listener.viewsListFilterClass ){

      m.listener.viewsListFilterClass =  mx.helpers.handleListFilterClass({
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
      m.listener.viewsValueFilterText =  mx.helpers.handleViewValueFilterText({
        id: o.id
      });
      /* NOTE: keyup on the whole list */
      elViewsList.addEventListener("keyup",m.listener.viewsValueFilterText);
    }

    /**
     * Listen to click inside the list
     */
    if( ! m.listener.viewsListClick ){
      m.listener.viewsListClick = mx.helpers.handleViewClick(o);
      elViewsList.addEventListener("click",m.listener.viewsListClick,false);
    }

    /**
     * Time sliders and search module 
     */
    //if( !o.add ) {
    /*
     * Init interactive tools for views
     */
    views.forEach(function(x){ 
      x._idMap = o.id;
      x._interactive = {};
      x._filters = {
        style : ['all'],
        legend : ['all'],
        time_slider : ['all'],
        search_box : ['all'],
        numeric_slider : ['all']
      };
      x._setFilter = viewSetFilter;
      x._setOpacity = viewSetOpacity;

      mx.helpers.makeTimeSlider({ view: x , idMap: o.id }); 
      mx.helpers.makeNumericSlider({ view: x, idMap: o.id });
      mx.helpers.makeTransparencySlider({ view: x, idMap: o.id});
      mx.helpers.makeSearchBox({ view: x, idMap: o.id });
    });
    //}

    /*
     * inital view controler after view rendering
     */
    viewControler(o);

  } 
}

/**
 * Filter current view and store rules
 * @param {Object} o Options
 * @param {Array} o.filter Array of filter
 * @param {String} o.type Type of filter : style, legend, time_slider, search_box or numeric_slider
 */
export function viewSetFilter(o){
  /*jshint validthis:true*/
  
  o = o||{};
  var view = this;
  var idView = view.id;
  var filter = o.filter;
  var filters = view._filters;
  var filterNew = ['all'];
  var type = o.type ? o.type : "default";
  var idMap = view._idMap ? view._idMap : "map_main";
  var m = mx.maps[idMap].map;
  var layers = mx.helpers.getLayerByPrefix({id:idMap,prefix:idView});

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
    var origFilter = mx.helpers.path(layer,"metadata.filter_base");
    var filterFinal = [];
    if(!origFilter){
      filterFinal = filterNew;
    }else{
      filterFinal = filterNew.concat([origFilter]);
    }
    m.setFilter(layer.id, filterFinal);
  }
  //m.fire("filter");
}


/**
 * Set this view opacity
 * @param {Object} o Options
 * @param {Array} o.opacity
 */
export function viewSetOpacity(o){
/*jshint validthis:true*/
  
  o = o||{};
  var view = this;
  var idView = view.id;
  var opacity = o.opacity;
  var idMap = view._idMap ? view._idMap : "map_main";
  var m = mx.maps[idMap].map;
  var layers = mx.helpers.getLayerByPrefix({id:idMap,prefix:idView});

  for(var l=0,ll=layers.length;l<ll;l++){
    var layer = layers[l];
    var property = layer.type +"-opacity";  
    m.setPaintProperty(layer.id,property,opacity);
  }
}



/**
 * Plot distribution
 * @param {Object} o options
 * @param {Object} o.data Object containing year "year" and value "n"
 * @param {Element} o.el Element where to append the plot
# @param {string} o.type Type of plot. By default = density
*/
export function plotTimeSliderData(o){
  

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

}

/** 
 * Download screenshot
 * @param {object} o options;
 * @param {string} o.id map id
 * @parma {string} o.idView view id
 */
export function downloadMapPng(o){

  Promise.all([
    System.import("tokml"),
    System.import("jszip"),
    System.import("downloadjs"),
    System.import("@turf/turf"),
    System.import("../img/north_001.svg")
    //System.import("dom-to-image"),
    //System.import("html2canvas"),
  ]).then(function(m){

    var toKml = m[0];
    var JSZip = m[1];
    var download = m[2];
    var turf = m[3];
    var northArrowPath = m[4];
    //var domtoimage = m[4];
    
    var kml,zip,folder;
    var qf = [];
    var map = mx.maps[o.id].map;
    var elMap = document.getElementById("#map_main");
    var elLegend = document.getElementById("check_view_legend_"+o.idView);
    var elScale = document.querySelector(".mx-scale-box");
    //var elNorthArrow = document.querySelector("#btnSetNorth_img");
    var imgMap = map.getCanvas().toDataURL();

    //var imgLegend ;
    //var imgScale;
    var fileName = "mx_data_" + (new Date()+"").split(" ")[4].replace(/:/g,"_",true) +".zip";
    var view = mx.helpers.getViews(o);
     
    var layers = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: o.idView
    });

    if( layers.length > 0 ){

      var attr = mx.helpers.path(view,'data.attribute.name');
      var rules = mx.helpers.path(view,'data.style.rules');
      var gType = mx.helpers.path(view,'data.geometry.type');

      var simpleColor = {
        'polygon':'fill',
        'line':'stroke',
        'point':'marker-color'
      }[gType];

      var simpleOpacity = {
        'polygon':'fill-opacity',
        'line':'stroke-opacity',
        'point':null
      }[gType];

      var geomTemp = {
        type : "FeatureCollection",
        features : [] 
      };

      qf = map.queryRenderedFeatures({layers:layers});

      // get all abject in one
      qf.forEach(function(feature){

        // add properties for simplestyle conversion
        if(rules && simpleColor){
          var v = feature.properties[attr];
          var n = mx.helpers.isNumeric(v);
          rules.forEach(function(r){
            if(r.value == "all" || (n && v>= r.value) || (!n && v == r.value)){
              feature.properties[simpleColor] = r.color;
              if(simpleOpacity){
                feature.properties[simpleOpacity] = r.opacity;
              }
            }
          });
        }

        // Push featre in main geojson NOTE: This include duplicated due to tiles 
        geomTemp
          .features
          .push({
            "type" : "Feature",
            "properties":feature.properties,
            "geometry":feature.geometry
          });
      });

      
      geomTemp = turf.dissolve(geomTemp,"gid");

      kml = toKml(geomTemp,{
        simplestyle:true
      });

    }
   

    // set nort arrow img

    function getNorthArrow(){
      return new Promise(function(resolve,reject){
        var imgNorthArrow = new Image();
        imgNorthArrow.onload = function(){
              resolve(imgNorthArrow);
        };
        imgNorthArrow.onerror = function(e) {
              reject(e);
        };
        imgNorthArrow.src = northArrowPath;
        imgNorthArrow.style.width="150px";
        imgNorthArrow.style.height="150px";
        imgNorthArrow.style.position="absolute";
        imgNorthArrow.style.zIndex="-1";
        imgNorthArrow.style[mx.helpers.cssTransformFun()] = "rotateZ("+(map.getBearing())+"deg) ";
        document.body.appendChild(imgNorthArrow);
      });
    }
  

    zip = new JSZip();
    folder = zip.folder("mx-data");

    var promScale = mx.helpers.htmlToData({
      selector : elScale,
      scale : 1,
      style : "border:1px solid black; border-top:none"
     }).catch(function(e){
         console.log(e);
      });
    
    var promLegend = mx.helpers.htmlToData({
      selector : elLegend,
      scale : 10 
     }).catch(function(e){
         console.log(e);
      });

    Promise.all([
      //promArrow,
      promScale,
      promLegend
    ]).then(function(r){

      if(kml){
        folder.file("mx-data.kml",kml);
      }

      //if(r[0]){
        //folder.file("mx-north.png", r[0].png.split(",")[1], {base64: true});
        //folder.file("mx-north.svg", r[0].svg.split(",")[1], {base64: true});
      /*}*/
      if(r[0]){
        folder.file("mx-scale.png", r[0].png.split(",")[1], {base64: true});
        folder.file("mx-scale.svg", r[0].svg.split(",")[1], {base64: true});
      }
      if(r[1]){
        folder.file("mx-legend.png", r[1].png.split(",")[1], {base64: true});
        folder.file("mx-legend.svg", r[1].svg.split(",")[1], {base64: true});
      }

      if(imgMap){
        folder.file("mx-map.png", imgMap.split(",")[1], {base64: true});
      }
      zip.generateAsync({type:"blob"})
        .then(function(content) {
          download(content, fileName);
        });
    })
      .catch(function(e){
        console.log(e);
      });

  });
}



/**
 * Get layer by prefix
 * @param {Object} o Options
 * @param {string} o.id Map element id
 * @param {string } o.prefix Prefix to search for
 * @return {array} list of layers
 *
 */
export function getLayerByPrefix(o) {
  
  var mapId = o.id,
    prefix = o.prefix,
    result = [],
    hasMap = false,
    map, layers , l;

  hasMap  = checkMap(o.id);

  if ( hasMap ) {
    map = mx.maps[mapId].map;
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
}
/**
 * Get layer by id
 * @param {Object} o options
 * @param {string} o.id Map id
 * @param {string} o.idLayer id of the layer
 * @return {array} of layers
 *
 */
export function getLayerById(o) {
  
  var hasMap, result, map, layer;
  hasMap  = checkMap(o.id);
  result = [];
  if (hasMap) {
    map = mx.maps[o.id].map;
    if (map) {
      layer = map.getLayer(o.idLayer);
      if (layer) {
        result.push(layer);
      }
    }
  }
  return result;
}

/**
 * Get layer names by prefix
 * @param  {Object} o options
 * @param {String} o.id Map id
 * @param {String} o.prefix Prefix to search for
 * @return {Boolean} o.base should return base layer only
 *
 */
export function getLayerNamesByPrefix(o) {
  
  var mapId, prefix, base, result, hasMap, map, layers, l;
  var out = [];
  mapId = o.id;
  prefix = o.prefix;
  base = o.base;

  if( base === undefined ) base = false;

  result = [];
  hasMap = checkMap(o.id);

  if ( hasMap ) {
    map = mx.maps[mapId].map;
    if (map) {
      if(!prefix) prefix = "";
      layers = map.style._layers;
      for ( l in layers ) {
        if(base){
          l = l.split(mx.settings.separators.sublayer )[0];
        }
        if (l.indexOf(prefix) > -1) {
          result.push(l);
        }
      }
    }
  }

  out =  mx.helpers.getArrayStat({arr:result,stat:"distinct"});

  return out;
}

/**
 * Remove multiple layers by prefix
 * @param {object} o options
 * @param {string} o.id Map element id
 * @param {string} o.prefix Prefix to search for in layers, if something found, remove it
 * @return {array} List of removed layer 
 */
export function removeLayersByPrefix(o) {
  
  var result = [], hasMap, legend, map, layers;

  hasMap = checkMap(o.id);

  if( hasMap ){
    map  = mx.maps[o.id].map;
    layers = mx.helpers.getLayerNamesByPrefix(o);
    var rExp = new RegExp("^" + o.prefix + ".*");

    for(var i = 0 ; i < layers.length ; i++ ){
      var l = layers[i];
      if(l.indexOf(o.prefix) > -1 && l.search(rExp) > -1){
        map.removeLayer(l);
        result.push(l);
      }
    }
  }

  return result;
}


/** 
 * Search for registered maps and enable/disable position synchronisation
 * @param {object} o options
 * @param {boolean} [o.enabled=false]  Enable synchronisation
 */
export function syncAll(o) {
  
  var enabled, maps, ids;

  enabled = o.enabled;

  if (!enabled) {
    enabled = false;
  }

  maps = mx.maps;
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
}

/** 
 *  Test if a key-value pair exist in a list
 * @param {object} li Object for the recursive search
 * @param {string} it Named key
 * @param {any} val Corresponding value
 * @param {boolean} [inverse=false] Return true if the key value pair is not found
 * @return {boolean} exists (or not depending of inverse)
 */
export function existsInList(li, it, val, inverse) {
  
  /*jshint validthis:true*/
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
}


/**
 * Parse view of type vt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 */
export function addViewVt(o){
  
  var view =  o.view,
    map =  o.map,
    layers = [],
    def = mx.helpers.path(view,"data"),
    idSource = view.id + "-SRC",
    style = mx.helpers.path(view,"data.style"),
    time = mx.helpers.path(view,"data.period"),
    rules =  mx.helpers.path(view,"data.style.rules"),
    geomType = mx.helpers.path(view,"data.geometry.type"),
    source =  mx.helpers.path(view,"data.source"),
    num = 0,
    hasStyle = false,
    hasTime = false,
    hasSprite = false,
    hasStyleDefault = false,
    defaultColor, defaultOpacity,
    ruleValues = [];

  if( ! source ) return;
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

        layer = defaultStyle({
          id : view.id,
          idSource : idSource,
          geomType : geomType,
          hexColor : x.color,
          opacity : x.opacity,
          size : x.size,
          sprite :x.sprite
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
    var layer = defaultStyle({
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
      x.rgba = mx.helpers.hex2rgba(x.color, x.opacity);
      x.rgb  = mx.helpers.hex2rgba(x.color);
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
      var max = mx.helpers.path(view,"data.attribute.max")+1;
      var min = mx.helpers.path(view,"data.attribute.min")-1;
      var nextRule = rules[i+1];
      var nextValue = nextRule ? nextRule.value ? nextRule.value : max : max;
      var isNumeric = mx.helpers.path(view,"data.attribute.type") == "number";
      var idView = view.id;
      var sepLayer = mx.settings.separators.sublayer; 
      var getIdLayer = function(){ return idView + sepLayer + num++ ; };
      var filter = ["all"];
      var attr = def.attribute.name;
      var paint = {};
      var layerSprite = {};

      /**
       * Set filter
       */

      filter.push(["has", attr]);

      if(isNumeric){
        filter.push([">=", attr, value]);
        filter.push(["<", attr, nextValue]);
      }else{
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
            layerSprite = mx.helpers.clone(layer);
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
            layerSprite = mx.helpers.clone(layer);
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
    layers = layers.reverse();
    layers.forEach(function(x){
      map.addLayer(x,"mxlayers");
    });

    /**
     * remove duplicated rules based on value and merge sprite 
     */

    if(!o.noLegend){

      rules = mx.helpers.path(view, "data.style.rules") ;

      if(!rules) return;

      var rId = [];
      var rNew = [];

      for(var i = 0 ; i < rules.length ; i++){
        if(rules[i]){
          var ruleHasSprite = rules[i].sprite && rules[i].sprite != "none";
          var nextRuleIsSame =  !!rules[i+1] && rules[i+1].value == rules[i].value;
          var nextRuleHasSprite = !!rules[i+1] && rules[i+1].sprite && rules[i+1].sprite != "none";

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
      updateViewOrder(o);
    }
  }
}

/** 
 *  Add map-x view on the map
 *  @param {object} o Options
 *  @param {string} o.id map id
 *  @param {string} o.idView view id
 *  @param {objsect} o.viewData view 
 *  @param {string} o.idViewsList id of ui views list element
 *  @param 
 */
export function addView(o){
  

  if(!o.viewData && !o.idView) {
    console.log("Add view called without idView or view Data. Options :");
    console.log(o);
    return;
  }

  var m = mx.maps[o.id];
  var view = o.viewData;

  if(o.idView){
    o.idView = o.idView.split(mx.settings.separators.sublayer)[0];
    view = mx.helpers.getViews(o);
  } 

  if( !view.id ){
    console.log("View " + o.idView + " not found");
    return ;
  }

  /* Remove previous layer if needed */
  mx.helpers.removeLayersByPrefix({
    id: o.id,
    prefix : view.id
  });

  /* Switch on view type*/
  var handler = {
    rt : function(){

      if(!mx.helpers.path(view,"data.source.tiles")) return ;   

      m.map.addLayer({
        id: view.id,
        type : "raster",
        source: view.id + "-SRC"
      },"mxlayers");

      /* IMG */ 

      var legend = mx.helpers.path(view,"data.source.legend");

      console.log("add legend for " + view.id);
      if(legend){
        var elLegend = document.querySelector("#check_view_legend_"+view.id);
        var oldImg = elLegend.querySelector("img");
        if(!oldImg){
          var img = new Image();
          img.src = legend;
          img.alt = "Legend"; 
          elLegend.appendChild(img); 
        }
      }

    },
    vt : function(){

      addViewVt({
        view : view,
        map : m.map
      });
    },
    gj : function(){
      m.map.addLayer(
        mx.helpers.path(view,"data.layer"),
        "mxlayers"
      );
    },
    sm : function(){
      /*
       * Check if there is additional views
       */
      var viewsStory = mx.helpers.path(view,"data.views");
      if(viewsStory){

        /**
         * Get current view ids
         */
        var ids = [];
        m.views.forEach(function(v){
          ids.push(v.id);
        });

        /*
         * Add source for each, ignore duplicate
         */
        viewsStory.forEach(function(v){
          if(ids.indexOf(v.id)==-1){
            mx.helpers.addSourceFromView({
              m : m,
              view : v
            });
            m.views = m.views.concat(v);
          }
        });
      }
    } 
  };

  /* Call function according to view type */
  handler[view.type]();

}

/**
 * Add source, handle existing 
 * @param {Object} o Options
 * @param {String} o.id  Map id
 * @param {String} o.idSource  Source id
 * @param {Object} o.source Source values
 */
export function addSource(o) {
  

  var hasMap = checkMap(o.id);

  if (hasMap) {

    var map = mx.maps[o.id].map;
    var sourceExists =  Object
      .keys( map.style.sourceCaches )
      .indexOf( o.idSource ) > -1;

    if ( sourceExists ) {
      map.removeSource(o.idSource);
    }

    map.addSource(o.idSource, o.source);
  }
}


/**
 * Apply a filter on a layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idView  view id
 * @param {array} o.filter Filter array to apply
 */
export function setFilter(o){
  
  var exists = !!document.getElementById(o.id);
  if (exists) {
    var m = mx.maps[o.id].map;
    m.setFilter(o.idView, o.filter);
  }
}

/**
 * Check if map object exist
 * @param {string} id map id
 */
export function checkMap(id){
  
  return !!  mx.maps[id] && mx.maps[id].map;
}






/**
 * Get estimated area of visible layer by prefix of layer names
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.prefix Prefix to find layers
 * @param {function} o.onMessage Function to deal with messages
 * @return {number} area in km2
 */
export function getRenderedLayersArea(o){

  var msg = o.onMessage || console.log;

  function getBoundsArray(map){
    var a = map.getBounds();
    return [a.getWest(),a.getSouth(),a.getEast(),a.getNorth()];
  } 

  if ( checkMap(o.id) ){
    var calcAreaWorker = require("./mx_helper_calc_area.worker.js");  
    var map = mx.maps[o.id].map;
    var layers = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: o.prefix
    });

    if( layers.length > 0 ){
      
      var features = map.queryRenderedFeatures({layers:layers});

      var geomTemp = {
        type : "FeatureCollection",
        features : [] 
      };

      features.forEach(function(f){    
        geomTemp
          .features
          .push({
            type : "Feature",
            properties:{},
            geometry : f.geometry
          });
      });

      var data = { 
        geojson : geomTemp,
        bbox : getBoundsArray(map)
      };

     
     var worker = new calcAreaWorker();
      worker.postMessage(data);
      worker.addEventListener("message",function(e){
        if(e.data.message)  o.onMessage(e.data.message);
        if(e.data.end)  o.onEnd(e.data.end);
      });
    }
  }
}

export function sendRenderedLayersAreaToUi(o){
  
  var el =  document.getElementById(o.idEl);
  if(el){
   var area = getRenderedLayersArea({
      id : o.id, 
      prefix: o.prefix,
      onMessage : function(msg){  
        el.innerHTML = msg ;
      },
      onEnd : function(msg){  
        el.innerHTML = "~ " + msg + " km2";
      }
    });
  }
}


/**
 * Get layer data
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idLayer Original id layer
 * @param {string} o.gid Geometry id name default is "gid"
 * @param {PointLike} o.point optional point
 * @return {array} table
 */
export function getRenderedLayersData(o){

  return new Promise(function(resolve, reject) {
    var point = o.point || undefined;
    var out = [];
    var start = new Date(); 
    var idLayer = o.idLayer.split(mx.settings.separators.sublayer)[0];
    var msg = o.onMessage || console.log;
    var gid = o.gid || "gid";

    function getBoundsArray(map){
      var a = map.getBounds();
      return [a.getWest(),a.getSouth(),a.getEast(),a.getNorth()];
    }

    if ( checkMap(o.id) ){

      var map = mx.maps[o.id].map;
      var layers = mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: o.idLayer
      });

      if( layers.length > 0 ){

        var features =  map.queryRenderedFeatures(point,{layers:layers});
        var featuresUniques = {};
        features.forEach(function(f){
          featuresUniques[f.properties.gid] = f;
        });
        for(var fu in featuresUniques){
          out.push(featuresUniques[fu].properties);
        }
        //console.log(out.length + " fetched in " + ((new Date()-start)/1000) + " [s]");
      }

    }

    resolve(out);
  });
}





/**
 * Method to convert string with logical operators to regex search function
 * & and | are implemented. E.g.
 * makeStringFilterFun("Diamant & Au")("Diamant, Au") is true
 * @param {String} re string to convert
 */
/*makeStringFilterFun = function(re){*/

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


//makeStringFilterFun = function(re){
//return(function(t){
//var score = distanceScore(re,t) ;
//return score;
//});
/*};*/

/**
 * Create search box for each views
 * @param {Object} o Options
 * @param {String} o.id Id of the map
 */
/*makeSearchBox = function(o){*/

//view = o.view;
//idMap = o.idMap;
//m = mx.maps[idMap];

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

//var table = mx.helpers.path(view,"data.attribute.table");
//var idView = view.id;
//var data = tableToData(table);  
//var selectr = new Selectr(el,{
//data : data,
//pagination : 10,
//placeholder : getLanguage("view_search_values",mx.settings.language),
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
//filterViewValues({
//id : idMap,
//search : values,
//idView : idView
//});
//}
//}
/*};*/
export function makeSearchBox_choicejs(o){
  

  view = o.view;
  idMap = o.idMap;
  m = mx.maps[idMap];

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

    var table = mx.helpers.path(view,"data.attribute.table");
    var idView = view.id;
    var data = tableToData(table);

    var searchBox = new Choices(el,{
      choices : data,
      placeholderValue : getLanguage("view_search_values",mx.settings.language)
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
      var attr = mx.helpers.path(view,"data.attribute.name");
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
}
/*selectize version*/
export function makeSearchBox(o){
  

  var view = o.view;
  var idMap = o.idMap;
  var m = mx.maps[idMap];
  var el = document.querySelector("[data-search_box_for='"+view.id+"']");

  if(!el) return;

  makeSelectize();

  function tableToData(table){
    var r,row, res;
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
    System.import("selectize").then(function(Selectize){
      var idView = view.id;
      var table = mx.helpers.path(view,"data.attribute.table");
      var attr = mx.helpers.path(view,"data.attribute.name");
      var data = tableToData(table);

      var selectOnChange = function(value) {
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

    });
  }
}

export function filterViewValues(o){
  

  var attr,idMap,idView,search;
  var view, views, map, features, values, filter, op, dat;
  var isEl, isNumeric;

  attr = o.attribute;
  idMap = o.id;
  idView = o.idView;
  search = o.search;
  operator = o.operator || ">=";
  filterType = o.filterType || "filter";

  search = search.trim();
  isNumeric = mx.helpers.isNumeric(search);
  view = mx.helpers.getViews({id:idMap,idView:idView});

  filter = ["all"];

  if(search){
    if( isNumeric ){
      filter = [operator,attr,search*1];
    }else{
      map = mx.maps[idMap].map;
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
  }

  view._setFilter({
    filter : filter,
    type : filterType
  });

}



/**
 * Add a new layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {object} o.layer Layer object
 * @param {string} o.before
 */
export function addLayer(o) {
  
  var hasMap = checkMap(o.id); 
  if ( hasMap ) {
    map = mx.maps[o.id].map;
    if (map) {
      if (o.layer.id in map.style._layers) {
      } else {
        map.addLayer(o.layer, o.before);
      }
    }
  }
}

/**
 * Fly to view id using geometry extent
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function zoomToViewId(o){
  var view, map, isArray, extent, llb; 
  var hasMap = checkMap(o.id); 

  if ( hasMap ) {
    
    isArray = o.idView.constructor === Array;

    o.idView = isArray ? o.idView[0] : o.idView;
    /* in case of layer group */
    o.idView = o.idView.split(mx.settings.separators.sublayer )[0];
    /* get map and view */
    map =  mx.maps[o.id].map;
    view = mx.helpers.getViews(o);

    if( !view ) return ;

    extent = mx.helpers.path(view,"data.geometry.extent");

    if( !extent ) return;

    llb = new mx.mapboxgl.LngLatBounds(
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
}

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function zoomToViewIdVisible(o){
 
 System.import("@turf/turf").then(function(turf){ 

  var geomTemp, exists, isArray, hasMap, map, idLayerAll, features;

  geomTemp = {
    type : "FeatureCollection",
    features : [] 
  };

  hasMap = checkMap(o.id);

  if (hasMap) {

    try {
      map =  mx.maps[o.id].map;

      idLayerAll =  mx.helpers.getLayerNamesByPrefix({
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
        var sw = new mx.mapboxgl.LngLat(bbx[0], bbx[1]);
        var ne = new mx.mapboxgl.LngLat(bbx[2], bbx[3]);
        var llb = new mx.mapboxgl.LngLatBounds(sw, ne);
        map.fitBounds(llb);
      }
    }
    catch(err) {
      console.log("fit bound failed: " + err);
    }
  }
 });
}

export function resetViewStyle(o){
  

  if( ! o.id || ! o.idView) return;

  mx
    .helpers
    .addView({
      id : o.id,
      idView: o.idView
    });

  //zoomToViewId({
  //id: o.id,
  //idView: o.idView
  /*});*/

}

/**
 * Fly to location and zoom
 * @param {object} o options
 * @param {string} o.id map id
 * @param {number} o.zoom 
 * @param {array} o.center
 * @param {number} o.speed
 */
export function flyTo(o) {
  

  var hasMap = checkMap(o.id);

  if ( hasMap ) {
    var m = mx.maps[o.id].map;

    if (o.zoom && o.zoom == -1) {
      o.zoom = m.getZoom();
    }

    m.flyTo({
      center: o.center,
      zoom: o.zoom,
      speed: o.speed
    });
  }
}

/** 
 * Set or Update language of a layer, based on text-field attribute. 
 * @param {object} o Options 
 * @param {string} o.mapId Map id
 * @param {string} [o.language='en'] Two letter language code
 */
export function setMapLanguage(o) {
  

  var hasMap = checkMap(o.id);
  var mapLang = ["en","es","fr","de","ru","zh","pt","ar"];
  var defaultLang = "en";
  var layers = ["place-label-city","place-label-capital","country-label","water-label","poi-label"];

  if (hasMap) {
    var m = mx.maps[o.id].map;

    if (!o.language || mapLang.indexOf(o.language) == -1) {
      o.language = mx.settings.language;
    }

    if (!o.language) {
      o.language = defaultLang;
    }

    mx.settings.language = o.language;

    /**
     * Set language in views list
     */
    updateViewsListLanguage({
      id:o.id,
      lang:o.language
    });

    /*
     * set default to english for the map layers if not in language set
     */
    if (mapLang.indexOf(o.language) == -1) {
      o.language = defaultLang;
    }


    /**
     * Set language in layers
     */

    for(var i = 0; i < layers.length ; i++){
      var layer = layers[i];
      var layerExists = mx.helpers.getLayerNamesByPrefix({
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
}



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
export function btnToggleLayer(o){
  
  var shades;

  o.id = o.id || "map_main";
  var map = mx.maps[o.id].map;
  var btn = document.getElementById(o.idSwitch);
  var lay = map.getLayer(o.idLayer);

  if(!lay){
    alert("Layer '" +o.idLayer + "' not found");
    return;
  }

  var layersToShow = [];
  var layersToHide = [];

  o.action = o.action || 'toggle';
  var isAerial = o.idLayer == 'here_aerial';// hide also shades...
  var toShow = o.action == 'show';
  var toHide = o.action == 'hide';
  var isVisible = lay.layout.visibility === "visible";
  var toToggle = o.action == 'toggle' || toShow && !isVisible || toHide && isVisible;

  if(isAerial){
    shades = mx.helpers.getLayerNamesByPrefix({id:o.id,prefix:'shade'});
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
}

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
export function setUiColorScheme(o){
  
  var mx_colors; // colors from stylesheet from the rule ".mx *";
  var init = false;
  var map = mx.maps[o.id||"map_main"].map;
  var c = o.colors;
  init = c !== undefined;
  c = c||{};

  /**
  * Extract main rules. NOTE: this seems fragile, find another technique
  */
  var styles = document.styleSheets;
  for(var i= 0, iL=styles.length;i<iL;i++){
    var rules = styles[i].rules||styles[i].cssRules||[];
    for(var j=0, jL=rules.length;j<jL;j++){
      if(rules[j].selectorText == ".mx *"){
        mx_colors=rules[j];
      }
    }
  }
  /*
   * Hard coded default if no stylsheet defined or user defined colors is set
   */
    c.mx_ui_text = c.mx_ui_text || "hsl(0, 0%, 21%)";
    c.mx_ui_text_faded = c.mx_ui_text_faded || "hsla(0, 0%, 21%, 0.6)";
    c.mx_ui_hidden = c.mx_ui_hidden || "hsla(196, 98%, 50%,0)";
    c.mx_ui_border = c.mx_ui_border || "hsl(0, 0%, 61%)";
    c.mx_ui_background = c.mx_ui_background ||"hsla(0, 0%, 97%, 0.95)";
    c.mx_ui_shadow = c.mx_ui_shadow || "hsla(0, 0%, 60%, 0.3)";
    c.mx_map_text = c.mx_map_text || "hsl(0, 0%, 21%)";
    c.mx_map_background = c.mx_map_background ||"hsla(0, 0%, 97%, 0.95)";
    c.mx_map_mask = c.mx_map_mask || "hsla(0, 0%, 60%, 0.3)";
    c.mx_map_water =  c.mx_map_water || "hsla(0, 0%, 97%, 0.95)";
    c.mx_map_road = c.mx_map_road || "hsla(0, 0%, 97%, 0.95)";
    c.mx_map_admin = c.mx_map_admin || "hsla(0, 0%, 97%, 0.95)";
    c.mx_map_admin_disputed = c.mx_map_admin_disputed || "hsla(0, 0%, 97%, 0.95)";

    /**
     * create / update input color
     */

    var inputs = document.getElementById("inputThemeColors");
    inputs.classList.add("mx-settings-colors");
    inputs.classList.add("mx-views-content");

    if(inputs && inputs.children.length>0){
      mx.helpers.forEachEl({
        els:inputs.children,
        callback:function(el){
          var colorIn = el.querySelector("[type='color']").value;
          var alphaIn = el.querySelector("[type='range']").value;
          var idIn = el.id;
          c[idIn] = mx.helpers.hex2rgba(colorIn,alphaIn);
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
        var color = mx.helpers.color2obj(c[cid]);

        for(var ityp=0, itypL=inputType.length;ityp<itypL;ityp++ ){
          var typ = inputType[ityp];
          var input = document.createElement("input");
          input.onchange=mx.helpers.setUiColorScheme;
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
          "background-color": c.mx_map_background 
        }
      },
      {
        "id":["maritime"],
        "paint": {
          "line-color": c.mx_map_background 
        }
      },
      {
        "id":["water"],
        "paint": {
          "fill-color": c.mx_map_water,
          "fill-outline-color" : c.mx_map_water
        }
      },
      {
        "id":["waterway"],
        "paint": {
          "line-color": c.mx_map_water
        }
      },
      {
        "id":["country-code"],
        "paint":{
          "fill-color": c.mx_map_mask
        }
      },
      {
        "id":["road-footway","road-cycleway","road-minor","road-major","road-street-minor"],
        "paint":{
          "line-color":c.mx_map_road
        }
      },
      {
        "id":["boundaries_2","boundaries_3-4"],
        "paint":{
          "line-color":c.mx_map_admin
        }
      },
      {
        "id":["boundaries_disputed"],
        "paint":{
          "line-color":c.mx_map_admin_disputed
        }
      },
      {
        "id":["country-label","place-label-capital","place-label-city"],
        "paint":{          
          "text-color": c.mx_map_text
        }
      } 
    ];

    for(var k = 0,kL = layers.length; k<kL; k++ ){
      var grp = layers[k];
      for(var l = 0, lL = grp.id.length; l < lL; l++ ){
        var lid = grp.id[l];
        var lay = map.getLayer(lid);
        if( lay ){
          for(var p in grp.paint){
            map.setPaintProperty(lid,p,grp.paint[p]); 
          }
        }
      }
    }


  //})
 }



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
export function initMap(o){
  
  var elMap = document.getElementById(o.id);
  var hasShiny = !! window.Shiny ;

  if(! elMap ){
    alert("Map element with id "+ o.id  +" not found");
    return ;
  }

  Promise.all([
  System.import("mapbox-gl/dist/mapbox-gl"),
  System.import("localforage"),
  System.import("../data/style_mapx.json")
  ]).then(function(m){

    var  mapboxgl = m[0];
    var  localforage = m[1];
    mx.mapboxgl = mapboxgl;
    mx.localforage = localforage;
    mx.data.style = m[2];

    mx.data.geojson = localforage.createInstance({
      name:  "geojson"
    });
    mx.data.images = localforage.createInstance({
      name : "images"
    });
    
    mx.data.stories = localforage.createInstance({
      name : "stories"
    });
    mx.data.storyCache = {};


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
  o.center = o.center || [0,0];
  o.lat = o.lat || 90;
  o.lng = o.lng || 0;
  o.zoom = o.zoom  || 4;
  o.maxZoom = o.maxZoom || 20;
  o.minZoom = o.minZoom || 0;
  o.location = o.location || window.location.origin + window.location.pathname;
  mx.settings.languages = o.languages = o.languages || ["en","fr"];
  mx.settings.language = o.language = o.language || o.languages[0];
  mx.settings.vtPort = o.vtPort = o.vtPort || "";
  mx.settings.vtUrl = o.vtUrl = location.protocol +"//"+ location.hostname + mx.settings.vtPort + "/tile/{z}/{x}/{y}.mvt";
  // set path using current location. 
  
  if(o.paths.sprite){
    o.paths.sprite = o.location + o.paths.sprite;
  }

  /**
   * Init mgl data store
   */  
  if (!mx.maps) {
    mx.maps = {};
  }
  /**
   * Mgl data : keep reference on options, listener, views, etc...
   */
  mx.maps[o.id] = {
    options : o,
    map: {},
    listener: {},
    views : [],
    style : {}
    //themes : {}
  };

      var style = mx.maps[o.id].style = mx.data.style;
      style.sprite = o.paths.sprite;
      mx.maps[o.id].style = style;

      /* Create map object */
      var map = new mapboxgl.Map({
        container: o.id, // container id
        style: style,
        center: [o.lng,o.lat],
        zoom: o.zoom,
        maxZoom: o.maxZoom,
        minZoom: o.minZoom,
        preserveDrawingBuffer:true
      });

      /* save map in mgl data */
      mx.maps[o.id].map =  map;

      /**
       * Send loading confirmation to shiny
       */
      map.on('load', function() {
        if(hasShiny)
          Shiny.onInputChange('mglEvent_' + o.id + '_ready', (new Date())) ;
        if(o.colorScheme){
          mx.helpers.setUiColorScheme({colors:o.colorScheme});
        }
      });

      /**
       * Handle drop geojson event
       */
      if(mx.helpers.handleUploadFileEvent && mx.helpers.handleDragOver){
        elMap.addEventListener('dragover', mx.helpers.handleDragOver, false);
        elMap.addEventListener('drop', mx.helpers.handleUploadFileEvent, false);
      }
      /**
       * Add controls to the map
       */
      
      map.addControl(new mx.helpers.mapControlMain(),'top-left');
      map.addControl(new mx.helpers.mapControlLiveCoord(),'bottom-right');
      map.addControl(new mx.helpers.mapControlScale(),'bottom-right');
      map.addControl(new mx.helpers.mapxLogo(),'bottom-left');

      /**
       * Trigger country change on double click
       * NOTE: experimental. layers and input id should be moved as options.
       */
      map.on('dblclick',function(e){
        var cntry, features ;
        if(o.countries){
          features = map.queryRenderedFeatures(e.point, { layers: ['country-code'] });
          cntry = mx.helpers.path(features[0],"properties.iso3code");
          if(o.countries.indexOf(cntry) > -1 && hasShiny ) {
            Shiny.onInputChange( "selectCountry", cntry);
          }
        }
      });

    map.on("render" , mx.helpers.handleEvent);
    map.on("click", mx.helpers.handleEvent);
    map.on("rotate",function(e){
      var r = map.getBearing();
      var northArrow = document.getElementById("btnSetNorth_img");
      northArrow.style[mx.helpers.cssTransformFun()] = "translate(-50%, -50%) rotateZ("+(r)+"deg) ";
    });


    //}
  //});
  });

}




/*
* Get extract features values at given point, group by properties
* @param {Object} o Options
* @param {String} o.id Map id
* @param {String} o.prefix Layer prefix Default = "MX-"
* @param {Array} o.point Array of coordinates
*/
export function getFeaturesValuesByLayers(o){
  
  var props = {}; 
  var sep = mx.settings.separators.sublayer;
  var layers = mx.helpers.getLayerNamesByPrefix({
    id: o.id,
    prefix: o.prefix || "MX-"
  });
  var excludeProp = ['mx_t0','mx_t1','gid'];
  var map = mx.maps[o.id].map;
  var features = map.queryRenderedFeatures(o.point,{layers:layers});

  features.forEach(function(f){
    var baseLayer = f.layer.id.split(sep)[0];
    if( !props[baseLayer] ){
      props[baseLayer] = {};
    }
    for(var p in f.properties){
      if( excludeProp.indexOf(p) == -1 ){
        var value = f.properties[p];
        var values = props[baseLayer][p] || [];
        values = values.concat(value);
        props[baseLayer][p] = mx.helpers.getArrayStat({
          stat:"distinct",
          arr: values
        });
      }
    }
  });

  return props;
}

/*
* Convert result from getFeaturesValuesByLayers to HTML 
* @param {Object} o Options
* @param {String} o.id Map id
* @param {Array} o.point Array of coordinates
* @param {Object} o.popup Mapbox-gl popup object
*/
export function featuresToHtml(o){
  
  var classGroup = "list-group";
  var classGroupItem = "list-group-item";
  var classGroupItemMember = "list-group-item-member"; 
  var popup = o.popup;
  var langs = mx.helpers.objectToArray(mx.settings.languages) || ["en"];
  var lang = mx.settings.language || langs[0];
  var views = mx.helpers.getViews(o);
  var layers = mx.helpers.getFeaturesValuesByLayers({
    id : o.id,
    point : o.point
  });

  if( Object.keys(layers).length === 0 ){
    popup.remove();
    return ;
  }

  var filters = {};
  var elLayers = document.createElement("ul");
  var elContainer = document.createElement("div");
  elLayers.classList.add("list-group");
  elContainer.classList.add("mx-popup-container");

  function getTitle(id){
    return  mx.helpers.getLanguageFromObjectPath({
      obj :views[id],
      path : "data.title",
      lang : lang,
      langs : langs,
      defaultKey : "noTitle"
    });
  }

  function updatePopup(){
    popup._update();
  }

  popup.on('close',function(){
    for(var idV in filters){
      var view = views[idV];
      view._setFilter({
        filter : ['all'],
        type : "popup_filter"
      });
    }
  });

  function filterValues(e,el){
    var  elChecks = popup._content.querySelectorAll(".check-toggle input");
    filters = {}; // reset filter at each request

    mx.helpers.forEachEl({
      els : elChecks,
      callback : buildFilters
    });

    for(var idV in filters){
      var filter = filters[idV];
      var view = views[idV];

      view._setFilter({
        filter : filter,
        type : "popup_filter"
      });
    }

    function buildFilters(el){
      var v = el.dataset.v;
      var l = el.dataset.l;
      var p = el.dataset.p;
      var add = el.checked;
      var isNum = mx.helpers.isNumeric(v);
      var rule = [];

      if( !filters[l] ) filters[l]=['any'];
      if( add ){
        if(isNum){
          rule = ['any',["==",p,v],["==",p,v*1]];
        }else{
          rule = ["==",p,v];
        }
        filters[l].push(rule);
      }
    }
  }

  for(var l in layers){
    var lay = layers[l];
    var elLayer = document.createElement("div");
    elLayer.classList.add("mx-layer-group");
    elLayer.dataset.l=l;
    var elProps = document.createElement("div");
    var title = getTitle(l);

    for(var p in lay){
      var values = lay[p];
      var elValues = document.createElement("div");
      for(var i=0, iL=values.length; i<iL; i++){
        var v = values[i];

        var elValue = mx.helpers.uiToggleBtn({
          label:v,
          onChange:filterValues,
          data:{
            l:l,
            p:p,
            v:v
          },
          checked:false
        });

        elValues.appendChild(elValue); 
      }
      elProps.appendChild(
        mx.helpers.uiFold({
          content:elValues,
          label:p,
          open:false
        })
      );
      elLayer.appendChild(elProps);
    }

    elLayers.appendChild(
      mx.helpers.uiFold({
        content:elLayer,
        label:title,
        open:false,
        onChange:updatePopup
      })
    );   

  }

  elContainer.appendChild(elLayers);
  /*
   * Update popup content
   */
  popup.setDOMContent(elContainer);
}




/**
 * Get map position summary
 * @param {object} o options 
 * @param {string} o.id map id
 */
export function getMapPos(o){
  

  var out, map, bounds, center, zoom, bearing, pitch;
  var r = mx.helpers.round;
  map = mx.maps[o.id].map;

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

}

/**
 * Create views object with id as key or single view if idView is provided in options
 * @param {Object} o options
 * @param {String} o.id map id
 * @param {String} o.idView Optional. Filter view to return. Default = all.
 */
export function getViews(o){
  
  var dat, out = {};

  dat = mx.maps[o.id];

  if( dat && dat.views ){
    if( dat.views.length > 0 ){
      dat.views.forEach(function(x){
        if( !o.idView ){ 
          out[x.id] = x;     
        }else if(o.idView == x.id){ 
          out= x;     
        }
      });
    }
  }

  return out;
}

/**
 * Toy function to make layer move
 */
export function makeLayerJiggle(mapId, prefix) {
  /*jshint validthis:true*/
  
  var layersName = mx.helpers.getLayerNamesByPrefix({
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

    var m = mx.maps[mapId].map;

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
}

/**
 * Take every layer and randomly change the color  
 * @param {string} mapId Map identifier
 */
export function randomFillAll(mapId) {
  
  setInterval(function() {
    var map = mx.maps[mapId].map;
    var layers = map.style._layers;

    //map.setBearing(Math.random() * 360);
    //map.setPitch(Math.random() * 60);

    for (var l in layers) {
      var type = layers[l].type;
      if (type) {
        switch (type) {
          case 'fill':
            map.setPaintProperty(l, 'fill-color', mx.helpers.randomHsl(1));
            break;
          case 'background':
            map.setPaintProperty(l, 'background-color', mx.helpers.randomHsl(1));
            break;
          case 'line':
            map.setPaintProperty(l, 'line-color', mx.helpers.randomHsl(1));
            break;
        }
      }
    }
  }, 100);
}


