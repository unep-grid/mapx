/* jshint esversion:6, evil: true */
import * as mx from './mx_init.js';




/**
* Settings of the user
* @param {Object} o Object that contains user data such as id, email, nickname, etc..
*/
export function setUserData(o){
  for(var i in o){
    mx.settings.user[i] = o[i];
  }
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
export function initMapx(o){

  var elMap = document.getElementById(o.id);
  var hasShiny = !! window.Shiny ;

  if(! elMap ){
    alert("Map element with id "+ o.id  +" not found");
    return ;
  }

  Promise.all([
    System.import("mapbox-gl/dist/mapbox-gl"),
    System.import("localforage"),
    System.import("../data/style_mapx.json"),
    //System.import("../data/style_simple.json"),
    System.import("../built/view_list.dot"),
    System.import("../built/view_list_legend.dot"),
    System.import("../built/view_list_options.dot")
  ]).then(function(m){

    var  mapboxgl = m[0];
    var  localforage = m[1];
    mx.mapboxgl = mapboxgl;
    mx.localforage = localforage;
    mx.data.style = m[2];

    mx.templates.viewList = m[3];
    mx.templates.viewListLegend = m[4];
    mx.templates.viewListOptions = m[5];

    mx.data.geojson = localforage.createInstance({
      name:  "geojson"
    });

    mx.data.images = localforage.createInstance({
      name : "images"
    });

    mx.data.stories = localforage.createInstance({
      name : "stories"
    });

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
    mx.settings.vtUrlBase =  o.vtUrl = location.protocol +"//"+ location.hostname + mx.settings.vtPort ;
    mx.settings.vtUrl = mx.settings.vtUrlBase + "/vt/tile/{z}/{x}/{y}.mvt";
    mx.settings.vtUrlViews = mx.settings.vtUrlBase + "/vt/view/";
    mx.settings.vtUrlUploadImage = mx.settings.vtUrlBase + "/vt/upload/image/";

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
      preserveDrawingBuffer:true,
      attributionControl: false
    });

    /* save map in mgl data */
    mx.maps[o.id].map =  map;

    /**
     * Send loading confirmation to shiny
     */
    map.on('load', function() {

      /*
       * Add views and set source
       */
      mx.helpers.setSourcesFromViews({
        id : o.id,
        viewsList : o.viewsList,
        viewsCompact : o.viewsCompact,
        country : o.country,
        resetViews : true
      });

      /*
       *  First map language 
       */
      mx.helpers.updateLanguage({
        lang : o.language,
        id : o.id
      });

      /**
       * Apply colorscheme if any
       */ 
      if(o.colorScheme){
        mx.helpers.setUiColorScheme({
          colors : o.colorScheme
        });
      }

      /*
       * If shiny, trigger read event
       */
      if(hasShiny){
        Shiny.onInputChange('mglEvent_' + o.id + '_ready', (new Date())) ;
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
/*    map.addControl(new mapboxgl.AttributionControl({*/
        //compact: true
    /*}),'top-right');*/
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



    /**
    * Error handling
    */
    map.on('error',function(e){

      var msg = mx.helpers.path(e,"error.message");

      if(msg){
        if(msg.indexOf("http status 200")>0) return;
      }
      throw new Error(msg);
    });


    map.resize2 = function (){
      var dim = [];
      var elContainer = this._container;
      var rect = elContainer.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      this.transform.resize(w,h);
      this.painter.resize(w,h);
    };
  /*  map._containerDimensions = function (){*/
      //var dim = [];
      //var elContainer = this._container;
      //var rect = elContainer.getBoundingClientRect();
      //return [rect.width,rect.height];
    /*};*/

    /**
    * Mouse move handling
    */
    map.on('mousemove', function(e) {

      var layers = mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: "MX-"
      });

      var features = map.queryRenderedFeatures(e.point,{layers:layers});
      map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });

    map.on("render" , mx.helpers.handleEvent);
    map.on("click", mx.helpers.handleEvent);
    map.on("rotate",function(e){
      var r = map.getBearing();
      var northArrow = document.getElementById("btnSetNorth_img");
      northArrow.style[mx.helpers.cssTransformFun()] = "translate(-50%, -50%) rotateZ("+(r)+"deg) ";
    });


  });

}




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

  /**
   * remove existing layers
   */
  console.log("RESET views : remove all displayed layer");
  mx.helpers.removeLayersByPrefix({
    id:o.idMap,
    prefix:"MX-"
  });

  /*
  * apply remove method
  */

  cleanRemoveModules(views);

  /**
  * Remove list
  */

  console.log("RESET views : empty list elements container");
  elViewList.innerHTML="";
}


/**
* Clean stored modules : dashboard, custom view, etc.
*/
function cleanRemoveModules(view){

  view = typeof view === "string" ? mx.helpers.getViews({id:'map_main',idView:view}) : view;
  view = view instanceof Array ? view : [view];

  view.forEach(function(v){
    if( v._onRemoveCustomView instanceof Function ){
      v._onRemoveCustomView();
    }
    if( v._onRemoveDashboard instanceof Function ){ 
      v._onRemoveDashboard();
    }
  });
}




/** 
 * Add source from view object 
 * @param {Object} o options
 * @param {Object} o.map Map object
 * @param {Oject} o.view View object
 * @param {Boolean} o.noLocationCheck Don't check for location matching
 */
export function addSourceFromView(o){

  if(o.map && mx.helpers.path(o.view,"data.source")){

    var country = mx.helpers.path(mx,"settings.country");
    var countryView = mx.helpers.path(o.view,"country") ;
    var countriesView = mx.helpers.path(o.view,"data.countries") || [];
    var isLocationOk = o.noLocationCheck || countryView == country || countriesView.indexOf(country) > -1 || countriesView.indexOf("GLB") > -1;

    if( isLocationOk ){
      var sourceId = o.view.id + "-SRC";
      var sourceExists = !!o.map.getSource(sourceId);

      if( sourceExists ) {
        o.map.removeSource( sourceId ) ;
      }

      if( o.view.type == "vt" ){
        var baseUrl = mx.settings.vtUrl;
        var url =  baseUrl + "?view=" + o.view.id + "&date=" + o.view.date_modified ;
        o.view.data.source.tiles = [url,url] ;
      }

      o.map.addSource(
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
 * @param {Boolean} o.viewsCompact The view list is in compact form (id and row only)
 * @param {boolean} o.add Append to existing
 * @param {string} o.country code
 * @param {Boolean} o.resetViews should this reset stored views list on map
 * @param {function} o.feedback Feedback function. Default is renderViewsList
 */
export function setSourcesFromViews(o){

  var m = mx.maps[o.id];
  var map, view, singleView, views, sourceId, sourceExists, sourceStore, isFullList;
  var isArray, hasViews;

  if( !m || !o.viewsList || !m.map ) return;
  if( o.country ){

    mx.settings.country = o.country;
    /*
     * Update country button
     */
    var elBtnCountry = document.querySelector("#btnShowCountry");
    elBtnCountry.dataset.lang_key = mx.settings.country; 
    mx.helpers.getDictItem(mx.settings.country,mx.settings.language).then(function(title){
      elBtnCountry.innerText = title;
    });

  }





  if( typeof o.resetViews == "undefined" ) o.resetViews = true;

  map = m.map;
  views = o.viewsList ;
  singleView = views instanceof Object && views.id;
  hasViews = m.views.length > 0;

  if( !o.feedback ) o.feedback = mx.helpers.renderViewsList;

  if( singleView ){
    /**
     * If this is not an array and the mgl map opbject already as views,
     * add the view and feedback
     */
    if( hasViews ){
      m.views.unshift( views );
    }

    mx.helpers.addSourceFromView({
      map : map,
      view : views
    });

    o.feedback({
      id : o.id,
      views : views,
      add : true
    });

    return views ;
  }

  if( ! singleView ){
    /*
     * Reset old views and dashboards
     */
    if( o.resetViews ){
      mx.helpers.reset({
        idMap:o.id
      });
    }

    if( o.viewsCompact ){
      /*
       * If compact, use asynchronous view fetch
       */
      var viewsL = views.length;
      var initViews = [];
      var initViewsL = 0;
      var vtUrlViews = mx.settings.vtUrlViews;

      views.forEach(function(v){
        mx.helpers.getJSON({
          url :  vtUrlViews + v.id + "@" + v.pid,
          onSuccess : function(view){
            view._edit = v._edit; 
            initViews.push( view );
            initViewsL = initViews.length;
            /**
             * add sources for each 
             */
            mx.helpers.addSourceFromView({
              map : map,
              view : view
            });

            if( initViewsL === viewsL  ){
              /*
               * update current map views
               */
              var d = mx.helpers.date;

              /**
               * Sort view list
               */
              initViews.sort(function(a,b){
                return d(b.date_modified) - d(a.date_modified);
              });


              m.views = initViews;

              /*
               * Render the full thing
               */
              o.feedback({
                id : o.id,
                views : initViews
              });


              /**
               * Load geojson
               */
              loadGeojsonFromStorage(o);
            }
          }
        });
      });

    }else{
      /**
       * Save the view list as it
       */

      m.views = views;
      /**
       * add sources for each 
       */
      views.forEach(function(view){
        mx.helpers.addSourceFromView({
          map : map,
          view : view
        });
      });

      /*
       * Render the full thing
       */
      o.feedback({
        id : o.id,
        views : views
      });

      /**
       * Load geojson from storage
       */
      loadGeojsonFromStorage(o);
    }
  }
}


/**
* Load geojson from localstorage,save it in views list and render item
* @param {Object} o options
* @param {String} o.id Map id
* @param {String} o.country Current country to filter geojson view. Default to settings.country
*/
function loadGeojsonFromStorage(o){
  var m = mx.maps[o.id] ;

  if( !mx.data || !mx.data.geojson || !m ) return;

  var map = m.map;
  var country = o.country || mx.settings.country;
  /**
   * extract views from local storage
   */
  mx.data.geojson.iterate(function( value, key, i ){
    var view = value.view;
    if( view.country == country ){
      m.views.unshift( view );

      mx.helpers.addSourceFromView({
        map : map,
        view : view
      });

      mx.helpers.renderViewsList({
        id : o.id,
        views : view,
        add : true
      });
    }
  });
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
  if( typeof def === "undefined" ) def = null;
  if( typeof path !== "string" ) return def;

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

  var vToAdd = [], vToRemove = [], vVisible = [], vChecked = [];
  var view, isChecked,id;
  var idMap = o.id || "map_main";
  var idViewsList = o.idViewsList || "mx-views-list";
  var els = document.querySelectorAll("[data-view_action_key='btn_toggle_view']");

  for(var i = 0; i < els.length ; i++ ){
    id = els[i].dataset.view_action_target;
    isChecked =  els[i].checked === true;
    if(isChecked){
      vChecked.push(id);
    }
  }

  mx.helpers.onNextFrame(function(){
    vVisible = mx.helpers.getLayerNamesByPrefix({
      id:idMap,
      prefix:"MX-",
      base : true
    });

    vToRemove = mx.helpers.arrayDiff(vVisible,vChecked);

    vToAdd = mx.helpers.arrayDiff(vChecked,vVisible);

    /**
     * View to add
     */
    vToAdd.forEach(function(v){
      view = mx.helpers.getViews({
        id:idMap,
        idView:v
      });
      mx.helpers.addView({
        id : idMap,
        viewData : view,
        idViewsList : idViewsList
      });

      //view._setFilter();

      mx.helpers.makeDashboard({ 
        view: view, 
        idMap: idMap
      });  
    });

    /**
     * View to remove
     */
    vToRemove.forEach(function(v){

      mx.helpers.removeLayersByPrefix({
        id : idMap,
        prefix : v
      });

      cleanRemoveModules(v);
    });

    updateViewOrder(o);
  });
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
 * Create a simple layer 
 * @param {object} o Options
 * @param {string} o.id Id of the layer
 * @param {string} o.idSourceLayer Id of the source layer / id of the view
 * @param {string} o.idSource Id of the source
 * @param {string} o.geomType Geometry type (point, line, polygon)
 * @param {string} o.hexColor Hex color. If not provided, random color will be generated
 * @param {array} o.filter
 * @param {Number} o.size 
 * @param {string} o.sprite
*/
export function makeSimpleLayer(o){

  var ran, colA, colB, layer;

  var size = o.size || 2;
  var sprite = o.sprite || "";
  var opA = o.opacity || 0.7;
  var opB = (opA + 0.5 * (1-opA)) || 1 ;
  var filter = o.filter || ["all"];

  if(!o.hexColor){
    ran = Math.random();
    colA = mx.helpers.randomHsl(0.5, ran);
    colB = mx.helpers.randomHsl(0.8, ran);
  }else{
    colA = mx.helpers.hex2rgba(o.hexColor,o.opacity );
    colB = mx.helpers.hex2rgba(o.hexColor,o.opacity + 0.2);
  }

  layer = {
    "symbol" : {
      "type" : "symbol",
      "layout" : {
        'icon-image': sprite,
        'icon-size' : size / 10
      },
      "paint" : {
        "icon-opacity" : 1,
        "icon-halo-width" : 2,
        "icon-halo-color" : colB
      }
    },
    "point": {
      "type" : "circle",
      "paint" : {
        "circle-color" : colA,
        "circle-radius" : size
      }
    },
    "polygon": {
      "type": "fill",
      "paint": {
        "fill-color" : colA,
        "fill-outline-color" : colB
      }
    },
    "pattern": {
      "type": "fill",
      "paint": {
        "fill-pattern": sprite
      }
    },
    "line": {
      "type" : "line",
      "paint" : {
        "line-color" : colA,
        "line-width" : size
      }
    }
  };

  layer = layer[o.geomType];
  layer.id = o.id;
  layer.source =  o.idSource;
  layer["source-layer"] = o.idSourceLayer;
  layer.filter = filter;
  layer.metadata = {};
  layer.metadata.filter_base = filter;

  return(layer);

}

/**
 * Update layer order based on view list position
 * @param {object} o Options
 * @param {string} o.id Id of the map
 * @param {string} o.order Array of layer base name. If empty, use `getViewOrder`
 * @param 
 */
export function updateViewOrder (o){
  
  var displayedOrig  = {};
  var order = o.order || getViewOrder(o) || [];
  var displayed = [];
  var map = mx.maps[o.id||"map_main"].map;
  var layerBefore = mx.settings.layerBefore; 

  if(!order) return;

  displayed = mx.helpers.getLayerNamesByPrefix({
    id:o.id,
    prefix:"MX-"
  });

  displayed.sort(
    function(a,b){
      var posA = order.indexOf(mx.helpers.getLayerBaseName(a));
      var posB = order.indexOf(mx.helpers.getLayerBaseName(b));
      return posA-posB;
    });

  displayed.forEach(function(x){

    var posBefore = displayed.indexOf(x)-1;

    if(posBefore > -1 ){
      layerBefore = displayed[posBefore];
    }
    map.moveLayer(x,layerBefore);

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
  var obj = {};
  var res = [];
  var viewContainer, els, vid, i;

  if( !m ) return;

  viewContainer = document.querySelector(".mx-views-list");
  els = viewContainer.querySelectorAll(".mx-view-item");

  for( i = 0 ; i < els.length; i++ ){
    obj[els[i].offsetTop]=els[i].dataset.view_id;
  }
  
  for( i in obj ){
    res.push(obj[i]);
  }
 
  return res;

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
        step: ( min + max ) / 1000,
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
  var views = m.views;
  var view = views.filter(function(x){
    return x.id == o.idView ;
  })[0];


  if(!view) return;

  if( view.type == "gj" ){
    var data =  mx.data.geojson ;
    data.removeItem( o.idView );
  }

  cleanRemoveModules(view);

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
          var idView = el.dataset.view_action_target;
          var progress = 1;

          function updateProgress(){
            console.log(progress);
            mx.helpers.progressScreen({
              enable : progress < 100,
              id : "upload_geojson",
              percent : progress,
              text : "Processing " + idView + " ( " + progress.toFixed(2) + "% )"
            });

            if(progress>=100) clearInterval(timer);

          }

          setTimeout(updateProgress,10);
          var timer = setInterval(updateProgress,1000);
          var id = mx.helpers.makeId(10);

          setTimeout(function(){
          try{
            /**
             * Extract view data and send it to shiny in chunk
             */
            mx.data.geojson.getItem(idView).then(function(item){

              var sliceSize = 100000;
              var geojson  = mx.helpers.path(item,"view.data.source.data");
              var title =  mx.helpers.path(item,"view.data.title.en"); 
              if(!title) title = idView;
              if(!geojson) return;
                 
              var fileName = title + ".geojson";
              var string = JSON.stringify(geojson);
              var chunks = mx.helpers.chunkString(string,sliceSize);
              var i = 0;
              var iL = chunks.length;

              mx.helpers.onNextFrame(loop);

              function loop() {
                sendPart(id,fileName,i,iL,chunks[i]);
                i++;
                if (i<iL) {
                  setTimeout(loop,1);
                }else{
                  progress = 100;
                }
              }

              function sendPart(id,fileName,i,iL,data){

                Shiny.onInputChange("uploadGeojson:mx.jsonchunk",{
                  id : id,
                  length : iL,
                  idPart : mx.helpers.paddy(i,7),
                  data : data,
                  time : (new Date()),
                  fileName : fileName
                });

                progress  =  Math.round(( i / iL ) * 100) ;
              }
            });
          }catch(e){
            progress=100;
            updateProgress();
            clearInterval(timer);
            console.log(e);
            mx.helpers.modal({title:'Error',content:'An error occured, check the console'});
          }
          },100);
        }
      },
      {
        id : "viewStoryPlay",
        comment :"target is the play button",
        isTrue : el.dataset.view_action_key == "btn_opt_start_story",
        action : function(){
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
          var link =  location.origin + "?views=" + idView + "&country=" + mx.settings.country || "WLD";
          var idLink = "share_"+idView;
          var input = "<textarea class='form-control form-input-line'>"+link+"</textarea>";
          mx.helpers.getDictItem("btn_opt_share").then(function(title){
            mx.helpers.modal({
              title : title,
              id : idLink,
              content : input,
              minHeight :'200px'
            });
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
          var h = mx.helpers;
          /*
           * After click on legend, select all sibling to check 
           * for other values to filter using "OR" logical operator
           */
          var viewValues = [],
            legendContainer = h.parentFinder({
              selector : el,
              class : "mx-view-item-legend" 
            }),
            legendInputs = legendContainer.querySelectorAll("input") 
          ;
          var idView = el.dataset.view_action_target;
          var view = h.getViews({id:'map_main',idView:idView});
          var attribute = h.path(view,'data.attribute.name');
          var type = h.path(view,'data.attribute.type');

          var  filter = ["any"];
          var rules = h.path(view,"data.style.rulesCopy",[]);

          for(var i = 0, iL = legendInputs.length; i < iL ; i++){
            var li =  legendInputs[i];
            if(li.checked){
              var index = li.dataset.view_action_index*1;
              var ruleIndex = rules[index];
              if( typeof ruleIndex !== "undefined" && typeof ruleIndex.filter !== "undefined"  ) filter.push(ruleIndex.filter);
            }
          }

          console.log(filter);
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
          downloadMapPdf({
            id: o.id, 
            idView: el.dataset.view_action_target
          });
        }
      },
      {
        id: "viewMetadataRasterLink",
        comment: "target is the raster metadata link",
        isTrue :  el.dataset.view_action_key == "btn_opt_meta_external",
        action:function(){
          var idView =  el.dataset.view_action_target;
          var view = mx.helpers.getViews({id:'map_main',idView:idView});
          var link = mx.helpers.path(view,"data.source.urlMetadata");
          var title =  mx.helpers.path(view,"data.title." + mx.settings.language) || 
            mx.helpers.path(view,"data.title.en");
          if(!title) title = idView;

          mx.helpers.getDictItem("source_raster_tile_url_metadata").then(function(modalTitle){
            mx.helpers.modal({
              title : modalTitle,
              id : "modalMetaData",
              content : "<b>" + modalTitle + "</b>: <a href=" + link + " target='_blank'>" + title + "</a>",
              minHeight:"150px"
            });         
          });
        }
      },
      {
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



/**
* Update view layout
*/
//function updateViewsListLayout(o){
  //var  id = o.idMap || "map_main";
  //var m = mx.maps[id];
  //var time = o.timeOut || 200;
  //setTimeout(function(){
    //if(m.tools && m.tools.viewsListPackery){
    //}
  //},time);
/*}*/

/**

 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export function renderViewsList(o){

  var elDiv, elNewItem, elNewInput ; 
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

  if( views === undefined || views.constructor !== Array ||  views.length < 1 || !mx.templates.viewList ){
    if( ! add ){
      mx.helpers.getDictItem("noView").then(function(item){
        elViewsList.innerHTML = item ;
      });
    }
  }else{

    if( !m.listener ) m.listener = {};
    if( !m.tools ) m.tools = {};

    if( ! add ){ 

      /**
       * Render all view items
       */
      elViewsList.innerHTML = mx.templates.viewList(views);

    }else{

      /**
       * Render given view items only
       */
      views.forEach(function(v){
        // remove old views if present
        var oldPos ;
         m.views.forEach(function(f){
          if(f.id==v.id){
            oldPos = m.views.indexOf(f); 
          }
        });
        if( oldPos>-1 ){
          m.views.splice(oldPos,1);
        }
        // add new/update view
        m.views.push(v);
        });
      elDiv = document.createElement("div");
      elDiv.innerHTML = mx.templates.viewList(views);
      elNewItem = elDiv.querySelector("li");
      elNewInput = elNewItem.querySelector(".mx-view-tgl-input");
      elNewInput.checked = true;
      elViewsList.insertBefore(elNewItem,elViewsList.childNodes[0]);
    }

    /**
    * Handle draggable and sortable
    */
    mx.helpers.sortable({
      selector : elViewsList,
      onSorted : function(){
        updateViewOrder(o);
      }
    });

    /**
    * Generate filter
    */
    makeViewsFilter({
      tagsTable : getTagsGroupsFromView(m.views),
      optionsButtons : makeViewsFilterOptionsButtons(m.views),
      selectorContainer : "#viewsFilterContainer"
    });

    /*
     * translate based on dict key
     */
    mx.helpers.updateLanguageElements({
      el:elViewsContainer
    });

    /*
    * filter view  by text input
    */
    if( ! m.listener.viewsListFilterText ){

      m.listener.viewsListFilterText = mx.helpers.filterViewsListText({
        selectorInput : "#viewsFilterText",
        classHide : "mx-filter-text",
        classSkip : "mx-filter-class",
        idMap : o.id,
        onFiltered : function(){
        }
      });
    }else{
      m.listener.viewsListFilterText();
    }
    /*
     * List filter by classes
     */
    if( ! m.listener.viewsListFilterCheckbox ){

      m.listener.viewsListFilterCheckbox = mx.helpers.filterViewsListCheckbox({
        selectorInput : "#viewsFilterContainer",
        idMap : o.id ,
        classHide : "mx-filter-class",
        classSkip : "mx-filter-text",
        onFiltered : function(){
        }
      });
    }else{
      m.listener.viewsListFilterCheckbox();
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

    /*
     * inital view controler after view rendering
     */
    viewControler(o);

  } 
}


/**
* Add Additional button to filters
* @param {Object} views list of views
*/
function makeViewsFilterOptionsButtons(views){

  /*
   * Add additional filters
   */
  var labelCheckDisplay = "Display only selected";
  var elFilterCheckDisplayed = mx.helpers.uiToggleBtn({
    label : labelCheckDisplay.toUpperCase() ,
    onChange : function(e,elToggle){

      for (var i = 0, iL = views.length; i < iL; i++) {
        var v = views[i];
        var elLi = document.getElementById(v.id);
        var elInput = elLi.querySelector(".mx-view-tgl-input");
        if(elToggle.checked && elLi && elInput && !elInput.checked){
          elLi.classList.add("mx-filter-displayed");
        }else{
          if(elLi){
            elLi.classList.remove("mx-filter-displayed");
          }

        }
      }
    }
  });

  return [
    elFilterCheckDisplayed  
  ];
}


/**
* Extract tags from various path in given views list and produce frequency tables
* @param {Array} v Views list
* @note : expect type, data.classes and data.collections
*/
function getTagsGroupsFromView(views){

  var h = mx.helpers;

  var tags = {
    type : [],
    classes : [],
    collections : []
  };

  var stat = {};

  views.map(function(v){ 
    tags.type  = tags.type.concat( h.path(v,"type"));
    tags.classes = tags.classes.concat( h.path(v,"data.classes"));
    tags.collections = tags.collections.concat( h.path(v,"data.collections"));
  });

  // grouprs
  stat.type = mx.helpers.getArrayStat({
    arr:tags.type,
    stat:'frequency'
  });

  stat.classes = mx.helpers.getArrayStat({
    arr:tags.classes,
    stat:'frequency'
  });

  stat.collections = mx.helpers.getArrayStat({
    arr:tags.collections,
    stat:'frequency'
  });

  return stat;
}


/**
* Create filter tags label using freqency table from getTagsGroupFromView
* @param {Object} o options
* @param {Array} o.optionsButton Array of buttons to add in options list of filter
* @param {Object} o.tagsTable Object containing the count for each key :
* @param {Object} o.tagsTable.count Count of key.
* @param {Element|Selector} o.selectorContainer Container to store the resulting label
*/
function makeViewsFilter(o){

  var h = mx.helpers;
  var l = mx.settings.language;
  var elContainer = o.selectorContainer instanceof Node ? o.selectorContainer : document.querySelector(o.selectorContainer);

  // Reset content
  elContainer.innerHTML="";

  
  /**
  * Add options
  */
  if(o.optionsButtons instanceof Array && o.optionsButtons.length > 0){

    var elGroupOptions = document.createElement("div");
    elGroupOptions.className = "filter-group";
    o.optionsButtons.forEach(function(b){   
      elGroupOptions.appendChild(b);
    });

    var elFoldOptions = h.uiFold({
      content : elGroupOptions,
      label : "options"
    });
    elContainer.appendChild(elFoldOptions);

  }

  /**
  * Add filter by class, type, ... 
  */
  var types =  Object.keys(o.tagsTable);

  types.forEach(function(t){
    var tags = [];
    var tbl = o.tagsTable[t];
    var keys = Object.keys(tbl);
    var elGroup = document.createElement("div");
    var elFold,label,el;

    elGroup.className = "filter-group";

    h.getDictItem(t,l)
      .then(function(label){

        elFold = h.uiFold({
          content : elGroup,
          label : label
        });

        elContainer.appendChild(elFold);

      }).then(function(){

        return Promise.all(
        keys.map(function(k){
          return h.getDictItem(k,l)
            .then(function(label){
              tags.push({key:k,count:tbl[k],label:label,type:t});
            });
        }));
      
      }).then(function(){

        tags = tags.sort(function(a,b){
          return b.count-a.count;
        });

        tags.forEach(function(t){
          var el =  makeEl(t.key,t.label,t.count,t.type);
          elGroup.appendChild(el);
        });
      });

  });

  function makeEl(id,label,number,type){
    var checkToggle = document.createElement("div");
    var checkToggleLabel = document.createElement("label");
    var checkToggleInput = document.createElement("input");
    checkToggle.className =  "check-toggle";
    checkToggleInput.className = "filter check-toggle-input";
    checkToggleInput.setAttribute("type", "checkbox");
    checkToggleLabel.className = "check-toggle-label";
    checkToggleInput.id = "filter_"+id;
    checkToggleInput.dataset.filter = id;
    checkToggleInput.dataset.type = type;
    checkToggleLabel.setAttribute("for","filter_"+id);
    checkToggleLabel.innerHTML =  label.toUpperCase() + "<span class='check-toggle-badge'> (" + number + ") </span>";
    checkToggle.appendChild(checkToggleInput);
    checkToggle.appendChild(checkToggleLabel);
    return(checkToggle);
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
export function downloadMapPdf(o){

  /**
   * Check asynchron progress
   */
  var progress = 1;
  var timer = setInterval(updateProgress,1000);
  updateProgress();
  function updateProgress(){
    mx.helpers.progressScreen({
      enable : progress < 100,
      id : "Screenshot",
      percent : progress,
      text : "Screenshot generation, please wait"
    });

    if(progress>=100) clearInterval(timer);

  }

  /**
   * Launch the process
   */
  setTimeout(function(){

    /**
     * Load external libraries
     */
  Promise.all([
    System.import("jspdf"),
    System.import("jszip"),
    System.import("downloadjs"),
    System.import("../img/north_001.svg")
  ]).then(function(m){

    progress = 10;

    var jsPDF = m[0];
    var JSZip = m[1];
    var download = m[2];
    var northArrowPath = m[3];
    var dataMap,zip,folder,dataLegend,dataScale,dataNorth;
    var promLegend,promScale,promNorth;
    var qf = [];
    var map = mx.maps[o.id].map;
    var elMap = document.getElementById("map_main");
    var mapDim =  elMap.getBoundingClientRect();
    var paperWidth = 297;
    var paperHeight = 210;
    var mapHeight = mapDim.height / (mapDim.width / paperWidth);
    var link = location.origin + "?views=" + o.idView + "&country=" + mx.settings.country;
    var elLegend = document.getElementById("check_view_legend_"+o.idView);
    var elScale = document.querySelector(".mx-scale-box");
    var fileName = "mx_data_" + (new Date()+"").split(" ")[4].replace(/:/g,"_",true) +".zip";
    var view = mx.helpers.getViews(o);
    var lang = mx.settings.language;
    var langs = mx.settings.languages;
    
    var title = mx.helpers.getLabelFromObjectPath({
      obj : view,
      path : "data.title",
      lang : lang,
      langs : langs,
      defaultKey : view.id
    });
    /**
     * Legend
     */
    if( view.type == "rt" ){
      var imgLegend = elLegend.querySelector("img");
      promLegend = new Promise(function(resolve,reject){
        if(!imgLegend) resolve();
        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext("2d");
          canvas.width = this.width;
          canvas.height = this.height;
          ctx.drawImage(this, 0, 0);
          var data = canvas.toDataURL();
          resolve(data);
        };
        img.onerror = function(e) {
          reject(e);
        };
        img.src = imgLegend.src;

      }).then(function(data){
        progress += 20;
        return(data); 
      });
    }

    if( view.type == "vt" ){
      promLegend = mx.helpers.htmlToData({
        selector : elLegend,
        scale : 1,
        format :"png"
      }).then(function(data){
        progress += 20;
        return(data); 
      });
    }

    /**
     * Scale
     */
    promScale = mx.helpers.htmlToData({
      selector : elScale,
      scale : 1,
      style : "border:1px solid black; border-top:none",
      format :"png"
    }).then(function(data){
      progress += 20;
      return(data); 
    });

    /**
     * North Arrow
     */
    promNorth = new Promise(function(resolve,reject){
      var canvas = document.createElement('canvas');
      var rotation = map.getBearing()*Math.PI/180;
      var imgNorthArrow = new Image();
      var ctx = canvas.getContext("2d");
      function drawImage(image, x, y, scale, rotation){
        ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
        ctx.rotate(rotation);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
      } 

      imgNorthArrow.onload = function(){
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style="position:absolute;top:0;z-index:1000";
        drawImage(this, canvas.width / 2, canvas.height / 2, 1, rotation);
        var data = canvas.toDataURL();
        resolve(data);
      }; 
      imgNorthArrow.onerror = function(e) {
        imgNorthArrow.remove();
        reject(e);
      };
      imgNorthArrow.src = northArrowPath;
    }).then(function(data){
      progress += 20;
      return(data); 
    });

    /**
     * Kml 
     */
      if( view.type !== "vt"){
        progress += 20;
      }
      if( view.type == "vt" ){
        progress +=20;
        /*
        * Code removed, use download feature for kml instead
        */
      }


        Promise.all([
          promNorth,
          promScale,
          promLegend
        ]).then(function(r){

          dataMap = map.getCanvas().toDataURL();
          dataNorth = r[0]?r[0]:dataNorth;
          dataScale = r[1]?r[1]:dataScale;
          dataLegend = r[2]?r[2]:dataLegend;

          var doc = new jsPDF({orientation: 'landscape'});
          if( dataMap ) doc.addImage(dataMap, 'PNG', 0, 0, 297, mapHeight );
          if( dataNorth ) doc.addImage(dataNorth, 'PNG', 280, 5,10,10 );
          if( dataScale ) doc.addImage(dataScale, 'PNG', 270, 190 );
          if( dataLegend ){
            doc.setFillColor(0,0,0,0); // white
            doc.roundedRect(5, 15, 80 , 180 , 2, 2, 'F');
            doc.addImage(dataLegend, 'PNG', 9, 24 );
          }
          if( link ){
            doc.setFontSize(10);
            doc.text(10, 205, link);
          }
          if( title ){
            doc.setFontSize(20);
            doc.text(5, 10, title);
          }

          var dataPdf =  doc.output();

          zip = new JSZip();
          folder = zip.folder("mx-data");

          if(dataScale){
            folder.file("mx-scale.png", dataScale.split(",")[1], {base64: true});
          }
          if(dataLegend){
            folder.file("mx-legend.png", dataLegend.split(",")[1], {base64: true});
          }
          if(dataMap){
            folder.file("mx-map.png", dataMap.split(",")[1], {base64: true});
          }
          if(dataPdf){
            folder.file("mx-map.pdf", dataPdf, {binary:true});
          }

          zip.generateAsync({type:"blob"})
            .then(function(content) {
              progress += 100;
              download(content, fileName);
            });
        })
          .catch(function(e){
            progress=100;
            console.log(e);
          });

      });
  },10);
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
* Get the layer base name
* @param {String} str Layer name to convert
*/
export function getLayerBaseName(str){
  return str.split(mx.settings.separators.sublayer )[0];
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
 
  o = o ||{id:'map_main',prefix:'MX-'};
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
          l = getLayerBaseName(l);
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

  var result = [], hasMap, map, layers;

  hasMap = checkMap(o.id);

  if( hasMap ){
    map  = mx.maps[o.id].map;
    layers = mx.helpers.getLayerNamesByPrefix(o);
    layers.forEach(function(l){
      map.removeLayer(l);
      result.push(l);
    });
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
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
export function addViewVt(o){

  var p = mx.helpers.path;

  try{  
    var view =  o.view,
      map =  o.map,
      layers = [],
      def = p(view,"data"),
      idSource = view.id + "-SRC",
      idView = view.id,
      style = p(view,"data.style"),
      time = p(view,"data.period"),
      rules =  p(view,"data.style.rules",[]),
      nulls = p(view,"data.style.nulls",[])[0],
      geomType = p(view,"data.geometry.type"),
      source =  p(view,"data.source"),
      num = 0,
      defaultColor, defaultOpacity,
      styleCustom,
      defaultOrder = true;


    if( ! source ) return;

    try{
      styleCustom = JSON.parse(p(style,"custom.json"));
    }catch(e){
      console.log("Can't parse custom view json : " + e);
    }

    var sepLayer = p(mx,"settings.separators.sublayer")||"@"; 

    /**
    * clean values
    */ 
    rules = rules.filter(function(r){return r&&r.value != undefined;});
    rules = rules instanceof Array ? rules : [rules];
    rules = mx.helpers.clone(rules);

    if(nulls){
      nulls.isNull = true;
      nulls.value = nulls.value == "" || typeof nulls.value === undefined ? null : nulls.value;
      rules.push(nulls);
    }

    if( style && ( style.reverseLayer === true ) ){
      defaultOrder = false;
      num = rules.length || 1;
    }

    var ruleAll = rules.filter(function(r){ return r.value=="all" ; });
    var idLayer;
    var getIdLayer = function(){
      idLayer = idView + sepLayer + ( defaultOrder ? num++ : num-- ) ; 
      return idLayer;
    };

    var hasStyle = false;
    var hasTime = false;
    var hasSprite = false;
    var hasStyleDefault = false;
    var hasStyleCustom = styleCustom && styleCustom instanceof Object && styleCustom.enable === true ;
    var hasStyleRules = rules.length > 0 && rules[0].value !== undefined ;
    var hasRuleAll = ruleAll.length > 0;

    /**
     * Make custom layer
     */
    if( hasStyleCustom ){

      var layerCustom = {
        'id': getIdLayer(),
        'source': idSource,
        'source-layer': idView,
        'type' : styleCustom.type || "circle",
        'paint' : styleCustom.paint || {},
        'layout' : styleCustom.layout || {},
        'minzoom' : styleCustom.minzoom || 0,
        'maxzoom' : styleCustom.maxzoom || 22,
      };

      layers.push(layerCustom); 

      view._setFilter({
        filter : styleCustom.filter || ['all'],
        type : "custom_style"
      });

    }

    /**
     * Create layer for single rule covering all values
     */
    if( hasRuleAll && !hasStyleCustom ){

      var rule = ruleAll.splice(0,1,1)[0];

      /**
       * add a second layer for symbol if point + sprite
       */
      if( rule.sprite && rule.sprite != "none" && geomType == "point" ){

        var layerSprite = makeSimpleLayer({
          id : getIdLayer(),
          idSource : idSource,
          idSourceLayer : idView,
          geomType : "symbol",
          hexColor : rule.color,
          opacity : rule.opacity,
          size : rule.size,
          sprite : rule.sprite
        });

        layers.push(layerSprite);

      }

      if( rule.sprite && rule.sprite != "none" && geomType == "polygon" ){

        var layerPattern = makeSimpleLayer({
          id : getIdLayer(),
          idSource : idSource,
          idSourceLayer : idView,
          geomType : "pattern",
          hexColor : rule.color,
          opacity : rule.opacity,
          size : rule.size,
          sprite : rule.sprite
        });

        layers.push(layerPattern);

      }

      /*
       * add the layer for all
       */
      var layerAll = makeSimpleLayer({
        id : getIdLayer(),
        idSourceLayer : idView,
        idSource : idSource,
        geomType : geomType,
        hexColor : rule.color,
        opacity : rule.opacity,
        size : rule.size,
        sprite : rule.sprite
      });

      layers.push(layerAll);

    }

    /*
     * Apply default style is no style is defined
     */
    if ( !hasStyleRules && !hasStyleCustom ) {

      var layerDefault = makeSimpleLayer({
        id : getIdLayer(),
        idSource : idSource,
        idSourceLayer : idView,
        geomType : geomType
      });

      layers.push(layerDefault); 

    }

    /*
     * Apply style if avaialble
     */
    if( hasStyleRules && !hasRuleAll && !hasStyleCustom ){

      /* convert opacity to rgba */
      rules.forEach(function(rule) {
        rule.rgba = mx.helpers.hex2rgba(rule.color, rule.opacity);
        rule.rgb  = mx.helpers.hex2rgba(rule.color);
      });

      /**
       * evaluate rules
       */
      rules.forEach(function(rule,i){
        var value = rule.value;
        var isNull = rule.isNull === true;
        var max = p(view,"data.attribute.max")+1;
        var min = p(view,"data.attribute.min")-1;
        var nextRule = rules[i+1];
        var nextRuleIsNull = nextRule && nextRule.isNull;
        var nextValue = nextRule && !nextRuleIsNull ? nextRule.value !== undefined ? nextRule.value : max : max;
        var isNumeric = p(view,"data.attribute.type") == "number";
        var idView = view.id;
        var filter = ["all"];
        var attr = def.attribute.name;
        var paint = {};
        var layerSprite = {};

        /**
         * Set filter
         */
        if( value !== null){ 
          filter.push(["has", attr]);
        }
       
        if( isNull && isNumeric && value !== null ){
          value = value * 1;
        }

        if( isNumeric && !isNull ){
          filter.push([">=", attr, value]);
          filter.push(["<", attr, nextValue]);
        }else{
          if( isNull && value === null ){
            filter.push(["!has", attr]);
          }else{
            filter.push(["==", attr, value]);
          }
        }

        rule.filter = filter;

        /**
         * Add layer for symbols
         */
        if( rule.sprite && rule.sprite != "none" && geomType == "point"){

          var layerSymbol = makeSimpleLayer({
            id : getIdLayer(),
            idSource : idSource,
            idSourceLayer : idView,
            geomType : "symbol",
            hexColor : rule.color,
            opacity : rule.opacity,
            size : rule.size,
            sprite : rule.sprite,
            filter : filter
          });

          layers.push(layerSymbol);

        }

        if( rule.sprite && rule.sprite != "none" && geomType == "polygon" ){

          var layerPattern = makeSimpleLayer({
            id : getIdLayer(),
            idSource : idSource,
            idSourceLayer : idView,
            geomType : "pattern",
            hexColor : rule.color,
            opacity : rule.opacity,
            size : rule.size,
            sprite : rule.sprite,
            filter : filter
          });

          layers.push(layerPattern);

        }

        /**
         * Add layer for curent rule
         */
        var layerMain = makeSimpleLayer({
          id : getIdLayer(),
          idSource : idSource,
          idSourceLayer : idView,
          geomType : geomType,
          hexColor : rule.color,
          opacity : rule.opacity,
          size : rule.size,
          sprite : rule.sprite,
          filter : filter
        });

        layers.push(layerMain);

      });
    }
    
    /**
     * Add layer and legends
     */
    if( layers.length > 0 ){
      

      /**
      * handle order
      */
      if( defaultOrder ){
       layers = layers.reverse();
      }

      /*
       * Add layers to map
       */
      layers.forEach(function(layer){
        map.addLayer(layer,o.before);
      });

      /*
       * Update layer order based in displayed list
       */
      updateViewOrder(o);

      /**
       * Evaluate rules;
       * - If next rules is identical, remove it from legend
       * - Set sprite path
       */
      if( ! o.noLegend && hasStyleRules ){

        var legend = document.querySelector("#check_view_legend_" + view.id);

        if( legend ){

          var rId = [];
          var rNew = [];


          for( var i = 0 ; i < rules.length ; i++ ){

            if( rules[i] ){
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
          /**
           * Update rules
           */
          view.data.style.rulesCopy = rules;

          /*
           * Add legend using template
           */
          legend.innerHTML = mx.templates.viewListLegend(view);
        }

      }
    }

  }catch(e){
    mx.helpers.modal({
      id :  "modalError",
      title : "Error",
      content : "<p>Error during layer evaluation :" + e 
    });
    throw e;
  }
}


/**
* Add option and legend box for the given view
* @param {Object} o Options
* @param {String} o.id map id
* @param {Object} o.view View item
*/
export function addOptions(o){

  var view = o.view;
  var idMap = o.id;
  var elOptions = document.querySelector("[data-view_options_for='"+view.id+"']");

  if(elOptions){
    var optMade = new Promise(function(resolve,reject){
      elOptions.innerHTML = mx.templates.viewListOptions(view);
      resolve(elOptions); 
    });
    optMade.then(function(el){
      mx.helpers.uiReadMore('.make-readmore',{
        selectorParent : el,
        maxHeightClosed : 105,
        maxHeightOpened : 400
      });
    });
  }

  view._idMap = o.id;
  view._interactive = {};
  view._filters = {
    style : ['all'],
    legend : ['all'],
    time_slider : ['all'],
    search_box : ['all'],
    numeric_slider : ['all'],
    custom_style : ['all']
  };
  view._setFilter = mx.helpers.viewSetFilter;
  view._setOpacity = mx.helpers.viewSetOpacity;

  mx.helpers.makeTimeSlider({ view: view , idMap: o.id }); 
  mx.helpers.makeNumericSlider({ view: view, idMap: o.id });
  mx.helpers.makeTransparencySlider({ view: view, idMap: o.id});
  mx.helpers.makeSearchBox({ view: view, idMap: o.id });


  /*
   * translate based on dict key
   */
  mx.helpers.updateLanguageElements({
    el:elOptions
  });
}



/** 
 * Add map-x view on the map
 * @param {object} o Options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 * @param {objsect} o.viewData view 
 * @param {string} o.idViewsList id of ui views list element
 * @param {string} o.before Layer before which insert this view layer(s)
 * @param 
 */
export function addView(o){

  if(!o.viewData && !o.idView) {
    console.log("Add view called without idView or view Data. Options :");
    console.log(o);
    return;
  }
  if(o.before){
    var l = mx.helpers.getLayerNamesByPrefix({
      id : o.id,
      prefix : o.before
    });
    o.before = l[0];
  }else{
    o.before = mx.settings.layerBefore;
  }

  var m = mx.maps[o.id];
  var view = o.viewData;

  /* replace it to have current values */
  if(view && view.id){
    var viewIndex ;

    var oldView =  mx.helpers.getViews({
      id : o.id,
      idView : view.id
    });

    if( oldView ){
      viewIndex = m.views.indexOf(oldView);
      m.views[viewIndex] = view;
    }
  }

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

  /**
   * Add options
   */
  mx.helpers.addOptions({
    id : o.id,
    view : view
  });

  /**
   * Add view
   */
  handler(view.type);

  /**
   * handler based on view type
   */
  function handler(viewType){

    /* Switch on view type*/
    var handler = {
      rt : function(){

        if(!mx.helpers.path(view,"data.source.tiles")) return ;   

        m.map.addLayer({
          id: view.id,
          type : "raster",
          source: view.id + "-SRC"
        },o.before);

        /* IMG */ 

        var legend = mx.helpers.path(view,"data.source.legend");

        if(legend){
          var elLegend = document.querySelector("#check_view_legend_"+view.id);
          if(elLegend){
            var oldImg = elLegend.querySelector("img");
            if(!oldImg){
              var img = new Image();
              img.src = legend;
              img.alt = "Legend"; 
              elLegend.appendChild(img); 
              img.onload = function(){
              };
            }
          }
        }

      },
      cc : function(){
        var methods = mx.helpers.path(view,"data.methods");

        if( !methods ) return;
        var getMethod =  new Promise(function(resolve, reject) {
          var r = new Function(methods)();
          if (r) {
            resolve(r);
          } else {
            reject(methods);
          }
        })
          .then(function(cc){
            if( 
              ! ( cc.onInit instanceof Function ) || 
                ! ( cc.onClose instanceof Function)
            ) return;

            var opt = {
              map : m.map,
              view : view,
              idView : view.id,
              idSource : view.id + "-SRC",
              idLegend : "check_view_legend_" + view.id,
              onClose : cc.onClose,
              onInit : cc.onInit
            };

            opt.elLegend = document.getElementById(opt.idLegend);


            if(opt.map.getSource(opt.idSource)){
              opt.map.removeSource(opt.idSource);
            }


            mx.helpers.removeLayersByPrefix({
              prefix : opt.idView,
              id : "map_main"
            });

            view._onRemoveCustomView = function(){
              opt.onClose(opt);
            };


            /**
             * Init custom map
             */
            opt.onInit(opt);


          }).catch(function(e){
            mx.helpers.modal({
              id :  "modalError",
              title : "Error",
              content : "<p>Error during methods evaluation :" + e 
            });
          });
      },
      vt : function(){
        addViewVt({
          view : view,
          map : m.map,
          debug : o.debug,
          before : o.before
        });
      },
      gj : function(){
        m.map.addLayer(
          mx.helpers.path(view,"data.layer"),
          o.before
        );
      },
      sm : function(){

      }
    };

    /* Call function according to view type */
    handler[viewType]();

  }
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
* Return the intersect between two Polygons or multiPolygon
* @param {Object} poly1 
* @param {Object} poly2 
* @return {Object} Intersect or null
*/
function intersect(poly1, poly2) {

  var martinez = require("martinez-polygon-clipping");
  var helpers = require("@turf/helpers");

  var polygon = helpers.polygon;
  var multiPolygon = helpers.multiPolygon;

  var geom1 = poly1.geometry;
  var geom2 = poly2.geometry;
  var properties = poly1.properties || {};

  var intersection = martinez.intersection(geom1.coordinates, geom2.coordinates);
  if (intersection === null || intersection.length === 0) return null;
  if (intersection.length === 1) {
    var start = intersection[0][0][0];
    var end = intersection[0][0][intersection[0][0].length - 1];
    if (start[0] === end[0] && start[1] === end[1]) return polygon(intersection[0], properties);
    return null;
  }
  return multiPolygon(intersection, properties);
}

/**
 * Get estimated area of visible layer by prefix of layer names
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.prefix Prefix to find layers
 * @param {function} o.onMessage Function to deal with messages
 * @return {number} area in km2
 */
export function getRenderedLayersIntersect(o){

  o.onMessage = o.onMessage || console.log;
  o.onEnd = o.onEnd || console.log;
  o.id = o.id || "map_main";

  if ( checkMap(o.id) ){
    Promise.all([
      System.import("./mx_helper_overlap.worker.js"),
      System.import("@turf/helpers"),
      System.import("@turf/buffer"),
      //System.import('@turf/intersect'),
      System.import('@turf/combine'),
      System.import('@turf/bbox-clip'),
      System.import('@turf/boolean-overlap'),
      System.import('@turf/flatten')
      //System.import('@turf/difference')
    ]).then(function(m){

      var getIntersectWorker = m[0];
      var featureCollection = m[1].featureCollection;
      var buffer = m[2].default;
      //var intersect = m[3].default;
      var combine = m[3].default;
      var bboxClip = m[4].default;
      var booleanOverlap= m[5].default;
      var flatten = m[6].default;
      //var difference = m[4].default;

      var map = mx.maps[o.id].map;
      var elMapContainer = map.getContainer();
      
      var elCompo = elMapContainer.querySelector("#map-x-compo");
      if(!elCompo){
        elCompo = document.createElement("div");
        elCompo.style = "visibility:hidden;width:100%;height:100%;position:absolute;top:0;left:0";
        elCompo.className = "mx-events-off";
        elMapContainer.appendChild(elCompo);
      }

      var layers = mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: o.prefix||"MX-",
        base:true
      });

      var featsGroup = [];
      var featsCol;
      var feats;
      var featsQuery ;
      var featsFlat ;
      var polyOut ;

      if( layers.length > 1 ){

        layers.forEach(function(l){

          var allLayers = mx.helpers.getLayerNamesByPrefix({
            id : o.id,
            prefix : l
          });

          featsQuery = map.queryRenderedFeatures({layers:allLayers});

          feats = [];
          featsQuery.forEach(function(f,i){ 
            if(f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"){
                f = flatten(f);
                f.features.forEach(function(f){
                  f.properties = {id:l};
                  feats.push(f);
              });
            }
          });

          featsGroup.push(featureCollection(feats));
        });

        var addCanvasToMap = function(compo){
          var canvas = compo.canvas;

          canvas.id="geocampo";

          canvas.toBlob(function(blob){
            var url = window.URL.createObjectURL(blob);

            var b = compo.getCanvasBounds();

            var l = {
              id: "geocampo",
              source: {
                type: 'image',
                url : url,
                coordinates: [
                  [b.minLng,b.maxLat],
                  [b.maxLng,b.maxLat],
                  [b.maxLng,b.minLat],
                  [b.minLng,b.minLat]
                ]
              },
              type: 'raster',
              paint: {
                'raster-opacity': 0.8,
              }
            };

            var s = map.getSource('geocampo');
            if(s){
              map.removeLayer("geocampo");
              map.removeSource("geocampo");
            }
              map.addLayer(l);

          });

        };



        window.compo = new mx.helpers.GeoCompo({
          el : elCompo,
          map : map,
          program : [
            { clear : true},
            { addGeojsonArray : featsGroup },
            { render : "source-in" },
            { callback : addCanvasToMap }
          ]
        });

      }
    });
  }
}





/**
 * Get estimated area of visible layer by prefix of layer names
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.prefix Prefix to find layers
 */
export function getRenderedLayersIntersect_old(o){

  o.onMessage = o.onMessage || console.log;
  o.onEnd = o.onEnd || console.log;
  o.id = o.id || "map_main";

  if ( checkMap(o.id) ){

    return import("./mx_helper_overlap.worker.js")
      .then(function(worker){
    
      var w = new worker();
      var id, feats, featsLayers = [], featsQuery, allLayers;
      var geom, properties;
      var map = mx.maps[o.id].map;
    
      var layers = mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: o.prefix||"MX-",
        base:true
      });

        if( layers.length > 1 ){

          id = mx.helpers.makeId();

          layers.forEach(function(l){

            allLayers = mx.helpers.getLayerNamesByPrefix({
              id : o.id,
              prefix : l
            });

            feats = [];
            featsQuery = map.queryRenderedFeatures({layers:allLayers});

            featsQuery = featsQuery.filter(function(f){
              return f.geometry.type == "Polygon" || f.geometry.type == "MultiPolygon";
            });


            featsQuery.forEach(function(f){
              feats.push({
                properties:{id:l},
                geometry:f._geometry,
                type : "Feature"
              });
            });

            featsLayers.push({
              id : l,
              features : feats
            });

          });

          w.postMessage({
            featsLayers : featsLayers
          });

          w.addEventListener("message",function(e){
            if(e.data.message)  o.onMessage(e.data.message);
            if(e.data.end){
              var oldLayer = map.getLayer("test");
              if(oldLayer){
                map.removeLayer("test");
                map.removeSource("test");
              }

              map.addLayer({
                id: "test",
                type: "fill",
                source: {
                  type: "geojson",
                  data : e.data.end 
                },
                paint : {
                  'fill-color':'#FF0000',
                  'fill-opacity': 0.6,
                  'fill-outline-color':'#FF0000'
                }
              });

            }


            o.onEnd(e.data.end);
          });
        }

    });
  }
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
        bbox : getBoundsArray(o)
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
* Get map bounds as array
* @param {Object} o options
* @param {String} o.id Map id
* @param {Object} o.map Map (optional, overwrite id)
*/
export function getBoundsArray(o){
  var map = o.map || mx.maps[o.id].map;
  var a = map.getBounds();
  return [a.getWest(),a.getSouth(),a.getEast(),a.getNorth()];
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

/*selectize version*/
export function makeSearchBox(o){
  

  var view = o.view;
  var idMap = o.idMap;
  var m = mx.maps[idMap];
  var el = document.querySelector("[data-search_box_for='"+view.id+"']");

  if(!el) return;

  makeSelectize();

  function tableToData(table){
    var r,rL,row, res;
    var data = [];
    for(r = 0,rL=table.length; r < rL ; r++ ){
      row = table[r];
      res = {};
      res.value = row.value;
      res.label = row.value;
      data.push(res);
    }
    return data;
  }

  function makeSelectize(){
    return import("selectize").then(function(Selectize){
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
  var isVisible = lay.visibility === "visible";
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
  init = c !== undefined && mx.settings.colors === undefined;
  c = c||{};

  mx.settings.colors = c;
  
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

    //inputs.classList.add("mx-views-content");

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

  if(typeof Shiny !== "undefined"){
    Shiny.onInputChange("uiColorScheme",JSON.stringify(c,0,2));
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
        container_inputs.className="mx-settings-colors-input";
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

  console.log(c.mx_map_background);

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
* Quick iframe builder
*/
//export function iframeBuilder(btnId){

  //var btn = document.getElementById(btnSelector);
  //var str = "" ;

  //function buildInput(label,callback){
    //var id  mx.helpers.makeId();
    //checkContainer =  document.createElement("div");
    //checkInput = document.createElement("input");
    //labelInput = document.createElement("label");
    //checkContainer.className = "mx-form-list-item";
    //checkInput.id = id;
    //labelInput.innerText = label;
    //labelInput.setAttribute("for",id );
    //checkContainer.appenChild(checkInput);
    //checkContainer.appenChild(checkLabel);
    //return(checkContainer);
  //};

  //var checkCountry = buildInput("Use country",)


  //btn.addEventListener("click",function(){
    //var form = 
  
  
  //})


/*}*/







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
  var cEl = function(type){
   return document.createElement(type);
  };
  var layers = mx.helpers.getFeaturesValuesByLayers({
    id : o.id,
    point : o.point
  });

  var idViews = Object.keys(layers);

  if( idViews.length === 0 ){
    popup.remove();
    return ;
  }

  var filters = {};
  var elContainer = cEl("div");
  elContainer.classList.add("mx-popup-container");
  elContainer.classList.add("mx-scroll-styled");

  function getTitle(id){
    return  mx.helpers.getLabelFromObjectPath({
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

  idViews.forEach(function(l){
    var view = views[l];
    var lay = layers[l];
    var attributes = mx.helpers.path(view,"data.attribute.names") || Object.keys(lay);
    var elLayer = cEl("div");
    var elProps = cEl("div");
    var elTitle = cEl("label");
    elLayer.className = "mx-prop-group";
    elLayer.dataset.l=l;
    elTitle.innerText = getTitle(l);
    elLayer.appendChild(elTitle);

    if(  ! (attributes instanceof Array) ) attributes = [attributes];
    
    attributes.forEach(function(p){

      var values = mx.helpers.getArrayStat({
        stat:"sortNatural",
        arr: lay[p]
      });

      var hasValues =  values.length > 0;
      values = hasValues ? values : ["-"];

      var elValue;
      var elProp = cEl("div");
      var elPropContent = cEl("div");
      var elPropTitle = cEl("h4");
      elProp.classList.add("mx-prop-read-more");
      elPropTitle.innerText = p;
      elPropContent.appendChild(elPropTitle);

      for(var i=0, iL=values.length; i<iL; i++){
        var v = values[i];

        if(hasValues){
          elValue = mx.helpers.uiToggleBtn({
            label:v,
            onChange:filterValues,
            data:{
              l:l,
              p:p,
              v:v
            },
            labelBoxed : true,
            checked : false
          });
        }else{
          elValue = cEl("span");
          elValue.innerText=v;
        }

        elPropContent.appendChild(elValue); 
      }
      elProp.appendChild(elPropContent);
      elProps.appendChild(elProp);  
      elLayer.appendChild(elProps);
    });

    elContainer.appendChild(elLayer);
  });

  var uiBuilt = new Promise(function(resolve,reject){
    popup.setDOMContent(elContainer);
    resolve(elContainer);
  });

  uiBuilt.then(function(elContainer){ 
    mx.helpers.uiReadMore(".mx-prop-read-more",{
     maxHeightClosed : 100,
     selectorParent : elContainer,
     boxedContent : true
    });
  });
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



export function randomUicolor(){

  mx.helpers.setUiColorScheme({
    colors: {
      mx_ui_text :mx.helpers.randomHsl(1),
      mx_ui_text_faded :mx.helpers.randomHsl(1),
      mx_ui_hidden : mx.helpers.randomHsl(1) ,
      mx_ui_border : mx.helpers.randomHsl(1) ,
      mx_ui_background : mx.helpers.randomHsl(1) ,
      mx_ui_shadow : mx.helpers.randomHsl(1) ,
      mx_map_text : mx.helpers.randomHsl(1) ,
      mx_map_background : mx.helpers.randomHsl(1) ,
      mx_map_mask : mx.helpers.randomHsl(1) ,
      mx_map_water : mx.helpers.randomHsl(1) ,
      mx_map_road : mx.helpers.randomHsl(1) ,
      mx_map_admin : mx.helpers.randomHsl(1) ,
      mx_map_admin_disputed : mx.helpers.randomHsl(1) 
    }
  });

}


