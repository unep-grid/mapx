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
* Take a screen show of the map, even if preserveDrawingBuffer is false
* @param {Object} map A mapbox gl js object
*/
export function takeMapScreenshot(map) {
  return new Promise(function(resolve, reject) {
    map.once("render", function() {
      resolve(map.getCanvas().toDataURL());
    });
    /* trigger render */
    map.setBearing(map.getBearing());
  });
}


export function handlerDownloadVectorSource(o){
  var elMsg;
  var elOutput = document.getElementById(o.idHandlerContainer);

  var dlUrlCreate = mx.settings.apiUrlDownloadCreate;
  var dlUrlGet = mx.settings.apiUrlDownloadGet ;

  dlUrlCreate = dlUrlCreate + o.data ;

  if(!elOutput){
    throw new Error("No handler container");
  }

  var cEl = function(type){
   return document.createElement(type);
  };

  var progressMsg = "";
  var elProgressLabel =  cEl("label");
  var elProgressContainer = cEl("div");

  /* progress bar */
  var elProgressBar = cEl("div");
  var elProgressBarContainer = cEl("div");
  var elProgressMessage = cEl("pre");
  var elProgressIssues = cEl("pre");
  var elProgressIssuesContainer = mx.helpers.uiFold({
    label : 'Issues',
    content : elProgressIssues
  });

  elProgressBar.classList.add("mx-inline-progress-bar");
  elProgressBarContainer.classList.add("mx-inline-progress-container");
  elProgressBarContainer.appendChild(elProgressBar);
  elProgressLabel.innerText = "Extraction progress";
  elProgressContainer.appendChild(elProgressLabel);
  elProgressContainer.appendChild(elProgressBarContainer);
  elProgressContainer.appendChild(elProgressMessage);
  elProgressContainer.appendChild(elProgressIssuesContainer);
  elOutput.appendChild(elProgressContainer);

  function isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  function addMsg(msg,type){
    if(type=="error") console.log(msg);

    console.log({msg:msg,type:type});

    var p = cEl("p");
    switch(type){
      case 'end' :
        var dlButton = cEl("button");
        dlButton.classList.add("btn");
        dlButton.innerText = "Download";
        dlButton.onclick = function(){
          window.open(dlUrlGet + msg.filepath,'_blank');
        };
        var dlMsg = cEl("span");
        elProgressBar.style.width = 100 + "%";
        dlMsg.innerText = "Process done, the data is available for download";
        elProgressMessage.appendChild(dlMsg);
        elProgressMessage.appendChild(dlButton);
        break;
      case 'progress' :
        elProgressBar.style.width = msg + "%";
        break;
      case 'message': 
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
        break;
      case 'error':
        p.innerText = msg ;
        elProgressIssues.appendChild(p);
        break;
      default :
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
    }
  }

  var msgs = [];
  function cleanMsg(res){
    /**
    * Hacky way of splitting appended message
    * The '\t\n' value is set server side at the end of each write.
    * Here, the result keeps appending new value ( why ? ), so we needed a way to get only the last message to avoid duplicate.
    * It does not sounds very clean ...
    * Maybe a websocket message would be better here.
    */
    return res.split("\t\n").map(function(j){
      if(j){
        if(msgs.indexOf(j) == -1){
          msgs.push(j);
          var val =  JSON.parse(j);
          addMsg(val.msg,val.type);
        }
      }
    });
  }
  
  mx.helpers.getJSON({
    maxWait : 1e3 * 60 * 60,
    url : dlUrlCreate,
    onMessage : function(d){
      cleanMsg(d);
    },
    onSuccess : function(d){
        cleanMsg(d);
    },
    onError : function(res){
      cleanMsg(d);
    }
  });
}

/**
* Set the project manually
* @param {String} idProject project to load
* @return null
*/
export function setProject(idProject){
  Shiny.onInputChange("selectProject",idProject);
}

export function requestProjectMembership(idProject){
  Shiny.onInputChange("requestProjectMembership",{id:idProject,date:(new Date())});
}


/**
 * Initial mgl and mapboxgl
 * @param {string} o options
 * @param {string} o.idMap id
 * @param {string} o.token Mapbox token
 * @param {Object} o.mapPosition Options (zoom, method, for center ing the map)
 * @param {Object} o.mapPosition Options (zoom, method, for center ing the map)
 * @param {Object} o.mapPosition.z Zoom
 * @param {Object} o.mapPosition.n North max
 * @param {Object} o.mapPosition.s South max
 * @param {Object} o.mapPosition.e East max
 * @param {Object} o.mapPosition.w West max
 * @param {Object} o.mapPosition.pitch Pitch
 * @param {Object} o.mapPosition.bearing Bearing
 * @param {Object} o.mapPosition.lng Longitude center
 * @param {Object} o.mapPosition.lat Latitude center
 * @param {Object} o.mapPosition.fitToBounds fit map to bounds
 * @param {number} [o.minZoom=4] Min zoom level
 * @param {number} [o.maxZoom=10] Max zoom level
 * @param {string} o.language Initial language code 
 * @param {string} o.languages Languages code list 
 * @param {string} o.path relative path to resource (style, theme, sprite , ...)
 * @param {Object} o.apiUrl Base url for api 
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

    mx.data.views = localforage.createInstance({
      name : "views"
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
    * Handle message from external page
    */
    window.addEventListener("message",function(msg){
      if(msg.data=="getCurrentUser"){
        window.parent.postMessage(JSON.stringify(mx.settings.user), '*');
      }
    });

    /**
     * Set default
     */
    //o.center = o.center || [0,0];
    //o.lat = o.lat || 90;
    //o.lng = o.lng || 0;
    //o.zoom = o.zoom  || 4;
    o.maxZoom = o.maxZoom || 20;
    o.minZoom = o.minZoom || 0;

    o.location = o.location || window.location.origin + window.location.pathname;
    if(o.apiPort){
      o.apiPort=":"+o.apiPort;
    }
    mx.settings.languages = o.languages = o.languages || ["en","fr"];
    mx.settings.language = o.language = o.language || o.languages[0];
    mx.settings.project =  o.project || "";
    mx.settings.apiPort = o.apiPort = o.apiPort || "";
    mx.settings.apiHost = o.apiHost = o.apiHost || location.hostname;
    mx.settings.apiProtocol = o.apiProtocol = o.apiProtocol || location.protocol;
    mx.settings.apiUrlBase =  o.apiUrlBase = o.apiProtocol +"//"+ o.apiHost  + o.apiPort ;
    mx.settings.apiUrlTiles = o.apiUrlBase + "/get/tile/{x}/{y}/{z}.mvt";
    mx.settings.apiUrlViews = o.apiUrlBase + "/get/view/";
    /**
    * dev only
    */
    //o.apiUrlBase = o.apiProtocol +"//"+ 'apidev.mapx.localhost'  + o.apiPort;
    mx.settings.apiUrlDownloadCreate = o.apiUrlBase + "/get/source?data=";
    mx.settings.apiUrlDownloadGet = o.apiUrlBase + "";
    mx.settings.apiUrlUploadImage = o.apiUrlBase + "/upload/image/";

    // set path using current location. 

    if(o.paths.sprite){
      o.paths.sprite = o.location + o.paths.sprite;
    }
    /*
    * Update cache
    */
    if(o.version){
    
    
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
    o.mapPosition = o.mapPosition || {};
    var mp = o.mapPosition;
    style.sprite = o.paths.sprite;
    mx.maps[o.id].style = style;


    /* map options */
    var mapOptions = {
      container: o.id, // container id
      style: style,
      maxZoom: o.maxZoom,
      minZoom: o.minZoom,
      preserveDrawingBuffer: false,
      attributionControl: false,
      zoom : mp.z || mp.zoom || 0,
      bearing : mp.bearing || 0,
      pitch : mp.pitch || 0,
      center : [mp.lng||0,mp.lat||0]
    };

    /* Create map object */
    var map = new mapboxgl.Map(mapOptions);

    /* centering method */
    if( o.mapPosition.fitToBounds == true ){
      map.fitBounds([mp.w||0, mp.s||0, mp.e||0, mp.n||0]);
    }
    /* save map in mgl data */
    mx.maps[o.id].map =  map;

    /**
     * Send loading confirmation to shiny
     */
    map.on('load', function() {

        if( ! o.storyAutoStart ){
          showUi();
        }

      /*
       * Add views and set source
       */
      mx.helpers.setSourcesFromViews({
        id : o.id,
        viewsList : o.viewsList,
        viewsCompact : o.viewsCompact,
        project : o.project,
        resetViews : true
      }).then(function(v){

        /*
        * Auto start story map
        */
        if(o.storyAutoStart){
          mx.helpers.storyRead({
            id : o.id,
            view : o.viewsList[0],
            save : false,
            autoStart : true
          }).then(showUi);
        }
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
    map.addControl(new mx.helpers.mapControlApp(),'top-left');
    //map.addControl(new mx.helpers.mapControlNav(),'top-right');
    map.addControl(new mx.helpers.mapControlLiveCoord(),'bottom-right');
    map.addControl(new mx.helpers.mapControlScale(),'bottom-right');
    map.addControl(new mx.helpers.mapxLogo(),'bottom-left');

    /**
     * Trigger project change on double click
     * NOTE: experimental. layers and input id should be moved as options.
     */
/*    map.on('dblclick',function(e){*/
      //var cntry, features ;
      //if(o.projects){
        //features = map.queryRenderedFeatures(e.point, { layers: ['country-code'] });
        //cntry = mx.helpers.path(features[0],"properties.iso3code");
        //if(o.projects.indexOf(cntry) > -1 && hasShiny ) {
          //Shiny.onInputChange( "selectProject", cntry);
        //}
      //}
    /*});*/



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
      var r = -map.getBearing();
      var northArrow = document.querySelector(".mx-north-arrow");
      northArrow.style[mx.helpers.cssTransformFun()] = "translate(-50%, -50%) rotateZ("+(r)+"deg) ";
    });


    /**
    * local helpers
    */
    function showUi(){
      document.querySelectorAll(".mx-hide-start")
        .forEach(function(el){
          el.classList.remove("mx-hide-start");
        });
    }
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
* Geolocate user on click
* @return null
*/
export function geolocateUser(e){
  var lang = mx.settings.language;
  var hasGeolocator = !!navigator.geolocation;

  var o = {idMap:'map_main'};
  var classesHtml = document.documentElement.classList;
  classesHtml.add("shiny-busy");
  var map = mx.maps[o.idMap].map;
  var options = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  function success(pos) {
    classesHtml.remove("shiny-busy");
    var crd = pos.coords;
    map.flyTo({center:[crd.longitude,crd.latitude],zoom:10});
    console.log(`Latitude : ${crd.latitude}`);
    console.log(`Longitude: ${crd.longitude}`);
    console.log(`More or less ${crd.accuracy} meters.`);
  }

  function error(err) {
    mx.helpers
      .getDictItem(['error_cant_geolocate_msg','error_geolocate_issue'],lang)
      .then(it => {    
        classesHtml.remove("shiny-busy");
        mx.helpers.modal({
         id : "geolocate_error",
         title : it[1],
         content : "<p> " + it[0] + "</p> <p> ( "+ err.message +" ) </p>"
        });
      });
  }

  if(hasGeolocator){
    navigator.geolocation.getCurrentPosition(success, error, options);
  }else{
    error({message:"Browser not compatible"});
  }

}



/**
* Reset project : remove view, dashboards, etc
* 
* @param {String} idMap map id
*/
export function reset(o){

  var views = mx.maps[o.idMap].views ;
  var elViewList = document.querySelector(".mx-views-list");

  /**
   * remove existing layers
   */
  mx.helpers.removeLayersByPrefix({
    id:o.idMap,
    prefix:"MX-"
  });
  
  /**
  *  Reset filters and selector
  */
  var elTxtFilterInput = document.querySelector("#viewsFilterText");
  elTxtFilterInput.value="";
  var elBtnFilterCheck = document.querySelector("#btn_filter_checked");
  elBtnFilterCheck.classList.remove("active");
  var elBtnSort = document.querySelectorAll(".mx-btn-sort");
  for(var i=0,iL=elBtnSort.length;i<iL;i++){
     elBtnSort[i].classList.remove('asc');
  }
  var elViewsFilter = document.querySelector("#viewsFilter");
  var elFilterToggles = elViewsFilter.querySelectorAll(".check-toggle");
  elFilterToggles.forEach(v => v.remove() );

  /*
  * apply remove method
  */

  cleanRemoveModules(views);

  /**
  * Remove list
  */
  elViewList.innerHTML="";

  emptyViewsList(true);
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
 * Add source from views array 
 * @param {Object} o options
 * @param {Object} o.map Map object
 * @param {Array} o.views Views array
 */
export function addSourceFromViews(o){
if(o.views instanceof Array){
  o.views.forEach(v=>{
    mx.helpers.addSourceFromView({
    map : o.map,
    view : v
    });
  });
}}

/** 
 * Add source from view object 
 * @param {Object} o options
 * @param {Object} o.map Map object
 * @param {Oject} o.view View object
 * @param {Boolean} o.noLocationCheck Don't check for location matching
 */
export function addSourceFromView(o){

  var p = mx.helpers.path;

  if( o.map && p(o.view,"data.source") ){

    var project = p(mx,"settings.project");
    var projectView = p(o.view,"project") ;
    var projectsView = p(o.view,"data.projects") || [];
    var isEditable = p(o.view._edit) == true;
    var isLocationOk = o.noLocationCheck || projectView == project || projectsView.indexOf(project) > -1;

    if( !isLocationOk && isEditable ){
      /*
      * This should be handled in DB. TODO:check why this is needed here...
      */
      o.view._edit = false;
    }

    var sourceId = o.view.id + "-SRC";
    var sourceExists = !!o.map.getSource(sourceId);

    if( sourceExists ) {
      o.map.removeSource( sourceId ) ;
    }

    if( o.view.type == "vt" ){
      var baseUrl = mx.settings.apiUrlTiles;
      var url =  baseUrl + "?view=" + o.view.id + "&date=" + o.view.date_modified ;
      o.view.data.source.tiles = [url,url] ;
    }

    o.map.addSource(
      sourceId,
      o.view.data.source
    );
  }
}


export function loadGeojsonViews(o){

 var project = mx.settings.project;
  var viewsGj = [];

  var getProjectGj =  function(gj, key, i){ 
    var v = gj.view;
    if( v && v.project === project){
      viewsGj.push(v);
    }
    return viewsGj;
  };

 mx.data.geojson.iterate(getProjectGj)
  .then(function(gj){
    console.log(gj);
  });

}




/**
 * Save view list to views
 * @param {object} o options
 * @param {string} o.id ID of the map 
 * @param {object} o.viewList views list
 * @param {Boolean} o.viewsCompact The view list is in compact form (id and row only)
 * @param {boolean} o.add Append to existing
 * @param {string} o.project code
 * @param {Boolean} o.resetViews should this reset stored views list on map
 */
export function setSourcesFromViews(o){
  return new Promise(function(resolve,reject){

    var m = mx.maps[o.id];
    var mode, map, view, singleView, views, sourceId, sourceExists, sourceStore, isFullList;
    var nCache = 0, nNetwork = 0, nTot = 0, prog;
    if( o.viewsList && o.viewsList.length > 0 ) nTot = o.viewsList.length ;
    var isArray, hasViews;
    var apiUrlViews = mx.settings.apiUrlViews;

    if( !m || !o.viewsList || !m.map ) return;

    map = m.map;
    views = o.viewsList ;
    singleView = views instanceof Object && views.id;
    hasViews = m.views.length > 0;
    if(singleView) mode = "object_single";
    if(!singleView && o.viewsCompact) mode = "array_async";
    if(!singleView && !o.viewsCompact) mode = "array_sync";

    if( typeof o.resetViews == "undefined" && !singleView ) o.resetViews = true;
    /*
     * Set project if needed
     */
    if( o.project ){
      mx.settings.project = o.project;
    }
    /*
     * Reset old views and dashboards
     */
    if( o.resetViews ){
      mx.helpers.reset({
        idMap:o.id
      });
    }

    /**
     * Process view list
     */
    resolve(addViews());


    /**
     * Helper
     */
    
    /* Switch according to mode */
    function addViews(){
      return {
        object_single : addSingle,
        array_sync : addSync,
        array_async : addAsync
      }[mode](views);
    }

   /* Sort views by title */
    function sortViews(views){

      var aTitle,bTitle;

      views.sort(function(a,b){
        aTitle = getViewTitle(a);
        bTitle = getViewTitle(b);
        if( aTitle < bTitle) return -1;
        if( aTitle > bTitle) return 1;
        return 0;
      });

      return(views);
    }


    function updateProgress(){
      if(!prog){
        prog = new mx.helpers.RadialProgress("noViewItemText",{radius:20,stroke:3});
      }
      prog.update((nCache+nNetwork)/nTot);
    }

   /* get view title  */
    function getViewTitle(view){
      var title = mx.helpers.getLabelFromObjectPath({
        lang : mx.settings.language,
        obj : view,
        path : "data.title"
      });
      title =  mx.helpers.cleanDiacritic(title).toLowerCase().trim();
      return title;
    }

   /* get view object from storage or network */
    function getViewObject(v){
      var keyStore = v.id + "@" + v.pid;
      var keyNet = apiUrlViews + v.id + '?' + v.pid;
      var editable = v._edit;
      return mx.data.views.getItem(keyStore)
        .then(view => {
          if(view){
            nCache ++;
            updateProgress();
            view._edit = editable;
            return Promise.resolve(view);
          }else{
          return fetch( keyNet )
            .then( r => r.json())
            .then( view => {
              nNetwork ++;
              updateProgress();
              view._edit = editable;
              return view;
            })
            .then( view => mx.data.views.setItem(keyStore,view));
          }
        });
    }

    /* Add array of compact views object*/
    function addAsync(views){

      var out = views.map(getViewObject);

      return Promise.all(out)
        .then(viewsFetched => {

          viewsFetched = sortViews(viewsFetched);

          m.views = viewsFetched;

          mx.helpers.renderViewsList({
            id : o.id,
            views : viewsFetched
          });

          mx.helpers.addSourceFromViews({
            map : map,
            views : viewsFetched
          });

          loadGeojsonFromStorage(o);

          return viewsFetched;

        });

    }

    /* Add array of coomplete views object*/
    function addSync(view){

      m.views = views;

      views.forEach(function(view){

        mx.helpers.addSourceFromView({
          map : map,
          view : view
        });
      });

      mx.helpers.renderViewsList({
        id : o.id,
        views : views,
      });

      loadGeojsonFromStorage(o);
      return views;
    }

    /* Add single view object */
    function addSingle(view){

      if( hasViews ){
        m.views.unshift( view );
      }

      mx.helpers.addSourceFromView({
        map : map,
        view : view
      });

      mx.helpers.renderViewsList({
        id : o.id,
        views : view,
        add : true,
        open : true
      });

      return view;
    }

  });
}


/**
* Load geojson from localstorage,save it in views list and render item
* @param {Object} o options
* @param {String} o.id Map id
* @param {String} o.project Current project to filter geojson view. Default to settings.project
*/
function loadGeojsonFromStorage(o){
  var m = mx.maps[o.id] ;

  if( !mx.data || !mx.data.geojson || !m ) return;

  var map = m.map;
  var project = o.project || mx.settings.project;
  /**
   * extract views from local storage
   */
  mx.data.geojson.iterate(function( value, key, i ){
    var view = value.view;
    if( view.project == project ){
      m.views.unshift( view );

      mx.helpers.addSourceFromView({
        map : map,
        view : view
      });

      mx.helpers.renderViewsList({
        id : o.id,
        views : view,
        add : true,
        open : true
      });
    }
  });
}







//[>*
 //* Save view list to views

 //* @param {object} o options
 //* @param {string} o.id ID of the map 
 //* @param {object} o.viewList views list
 //* @param {Boolean} o.viewsCompact The view list is in compact form (id and row only)
 //* @param {boolean} o.add Append to existing
 //* @param {string} o.project code
 //* @param {Boolean} o.resetViews should this reset stored views list on map
 //*/
//export function setSourcesFromViews(o){

  /**
  * Settings
  */
  
  //var m = mx.maps[o.id] ;
        //var action, map, view, views, oldViews, sourceId, sourceExists, sourceStore ;
        //var isArray, isSingleView, isFullList, hasExistingViews, hasNewViews , hasGeoJSON;


        //if( typeof o.resetViews == "undefined" ){
          //o.resetViews = true;
        //}

        //if( !m || !o.viewsList || !m.map ){
          //reject(false);
        //}

        //if( o.project ){
          //mx.settings.project = o.project;
        //}

        //map = m.map;
        //views = o.viewsList ;
        //oldViews = m.views ;
        //isSingleView = views instanceof Object && typeof views.id != 'undefined';
        //hasExistingViews = oldViews instanceof Array && oldViews.length > 0;
        //hasNewViews = views instanceof Array && views.length > 0;

  //if( !isSingleView && !hasNewViews ) action = "addNothing";
  //if( isSingleView ) action = "addSingle";
        //if( !isSingleView && ( hasNewViews && o.viewsCompact ) || hasGeoJSON ) action = "addViewsAsync";
        //if( !isSingleView && ( hasNewViews && !o.viewsCompact ) || hasGeoJSON ) action = "addViewsSync";

        //console.log("Render view list action = " + action);

      //return new Promise(function(resolve,reject){

 
        //switch (action) {        
          /**
           * Add empty views list
           */
          //case 'addNothing':
          //mx.helpers.renderViewsList({
            //map : map,
            //empty : true
          //});
          //resolve(views);

          //oldViews = views;
          //break;

          /**
           * Single view entry : add to the views list
           */
          //case 'addSingle' :

          //if( hasExistingViews ){
            //oldViews.unshift( views );
          //}

          //mx.helpers.addSourceFromView({
            //map : map,
            //view : views
          //});

          //mx.helpers.renderViewsList({
            //id : o.id,
            //views : views,
            //add : true
          //});

          //resolve(views) ;

          //break;
          /**
           * Multiple view entry : replace views list
           */
          //case 'addViewsAsync' :

          //[> Reset old views and dashboards <]
          //if( o.resetViews ){
            //mx.helpers.reset({
              //idMap:o.id
            //});
          //}

          //[>  If compact, use asynchronous view fetch <]
          //var viewsL = views.length;
          //var renderedL = 0;
          //var apiUrlViews = mx.settings.apiUrlViews;

          //function checkForLast(){
            //++renderedL;
            //if(renderedL === viewsL){
              //resolve(views);
            //}
          //}

          //views.forEach(function(v,i){

            //oldViews.push( v );
            //var async = v.type != "gj" && !v.data;
            ////var last = (i === v,cciewsL - 1);
            //if( async ){
              //mx.helpers.getJSON({
                //url :  apiUrlViews + v.id,
                //onSuccess : function(view){
                  //[> set edit flag  <]
                  //view._edit = v._edit; 
                  /**
                   * add sources for each 
                   */
                  //mx.helpers.addSourceFromView({
                    //map : map,
                    //view : view
                  //});

                  //mx.helpers.renderViewsList({
                    //id : o.id,
                    //views : view,
                    //add : true
                  //});
                  //checkForLast();
                //}
              //});
            //}else{
              //mx.helpers.addSourceFromView({
                //map : map,
                //view : v
              //});
              /*
               * Render the full thing
               */
              //mx.helpers.renderViewsList({
                //id : o.id,
                //views : v,
                //add : true
              //});

              //checkForLast();
            //}


          //});


          //break;
          //case 'addViewsSync':

          //if( o.resetViews ){
            //mx.helpers.reset({
              //idMap:o.id
            //});
          //}


          /**
           * Save the view list as it
           */

          //m.views = views;
          /**
           * add sources for each 
           */
          //views.forEach(function(view){
            //mx.helpers.addSourceFromView({
              //map : map,
              //view : view
            //});
          //});

          /*
           * Render the full thing
           */
          //mx.helpers.renderViewsList({
            //id : o.id,
            //views : views
          //});

          //oldViews = views;
          //resolve(views);
          //break;
          //default:
          //console.log("no logic set, reject");
          //oldViews = [];
          //reject(false);
        //}
      //});

    //}).then(function(v){

      /**
       * Set default order
       */
      //sortViewsListBy({
        //type : "title",
        //dir :'asc',
        //onSorted:function(){
          //viewControler(o);
        //}
      //});
     //return(v);
    //});
//}


/**
* Load geojson from localstorage,save it in views list and render item
* @param {Object} o options
* @param {String} o.id Map id
* @param {String} o.project Current project to filter geojson view. Default to settings.project
*/
//function loadGeojsonFromStorage(o){
  //var m = mx.maps[o.id] ;

  //if( !mx.data || !mx.data.geojson || !m ) return;

  //var map = m.map;
  //var project = o.project || mx.settings.project;
  /**
   * extract views from local storage
   */
  //mx.data.geojson.iterate(function( value, key, i ){
    //var view = value.view;
    //if( view.project == project ){

      //m.views.unshift( view );

      //mx.helpers.addSourceFromView({
        //map : map,
        //view : view
      //});

      //mx.helpers.renderViewsList({
        //id : o.id,
        //views : view,
        //add : true
      //});
    //}
  //});
//}






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


export function  moveViewItem(o){

  o.id = o.id || new Error("no id");
  o.mode = o.mode || "top" || "next" || "previous" || "bottom";

  var elViewsList = document.querySelector(".mx-views-list");
  var elView = document.getElementById(o.id);
  var elsViews = elViewsList.querySelectorAll(".mx-view-item");
  var elViewFirst = elsViews[0];
  var elViewLast = elsViews[elsViews.length-1];
  var elScroll = elViewsList.parentElement;
  var scrollMax = elViewsList.getBoundingClientRect().height;

  switch(o.mode){
    case "top": {
      elViewsList.insertBefore(elView,elViewFirst);
      elScroll.scrollTop = 0;
      break;
    }
    case "bottom": {
      elViewsList.insertBefore(elView,elViewLast.nextSibling);
      elScroll.scrollTop = scrollMax ;
      break;
    }
    case "next": {
      elViewsList.insertBefore(elView,elView.nextSibling);
      break;
    }
    case "previous": {
      elViewsList.insertBefore(elView,elView.previousSibling);
      break;
    }


  }
  updateViewOrder({
    id:'map_main'
  });


}


export function filterActiveViews(o){

  var elList = document.querySelector(".mx-views-list");
  var elItems = elList.querySelectorAll(".mx-view-item");
  var elItem, elCheck;
  var elBtn = document.getElementById(o.idBtn);
  var wasActive = elBtn.classList.contains('active');
  if(wasActive){
    elBtn.classList.remove('active');
  }else{
    elBtn.classList.add('active');
  }

  for(var i=0,iL=elItems.length;i<iL;i++){
    elItem = elItems[i];
    elCheck = elItem.querySelector('.mx-view-tgl-input');
    if( wasActive  === true || (elCheck && elCheck.checked)){
      elItem.classList.remove('mx-hide-filter');
    }else{
      elItem.classList.add('mx-hide-filter');
    }
  }
}





export function sortViewsListBy(o){

  /**
  * Get elements and element state
  */
  var elList = document.querySelector(".mx-views-list");
  var elItems = elList.querySelectorAll(".mx-view-item");
  var elItemFirst = elItems[0];
  var elItemNext;
  var elItemPrev;
  var idBtn = o.idBtn || "";
  var elBtn;
  var isAsc = false;
  if(idBtn) elBtn = document.getElementById(idBtn);
  if(elBtn) isAsc = elBtn.classList.contains("asc");

  /*
  * Set options based on arguments
  */
  var dir = o.dir ||  "asc";
  var toggle = dir === "toggle";
  var type = o.type || "title";
  var onSorted = o.onSorted || "";

  /*
  * Update ui
  */
  //if( elBtn ) debugger;
  if( elBtn && toggle ){
    if(isAsc){
     dir = "asc";
     elBtn.classList.remove("asc");
    }else{ 
     dir = "desc";
     elBtn.classList.add("asc");
    }
  }

  /**
  * Set direction 
  */ 
  var gt = dir == 'desc' ? 1 : -1;
  var lt = dir == 'desc' ? -1 : 1;
  /*
  * value in array
  */
  var values = [];
  elItems.forEach(function(el) {
    values.push({
      el: el,
      val: getValue(el)
    });
  });

  values.sort(function(a, b) {
    if (a.val > b.val) {
      return gt;
    }
    if (a.val < b.val) {
      return lt;
    }
    return 0;
  });

  values.forEach(function(v, i) {
    if (i == 0) {
      elList.insertBefore(v.el, elItemFirst);
    } else {
      elList.insertBefore(v.el, values[i - 1].el);
    }
  });


  function getValue(el){
    switch(type){
      case 'date' : return  prep(el.dataset.view_date_modified || "");
      case 'checked' : return prep(el.querySelector("input").checked || false); 
      case 'title' : return  prep(el.dataset.view_title.toLowerCase().trim() || "");
      default : return '';
    }
  }

  function prep(val){
    switch(typeof(val)){
     case 'boolean': return val;
     case 'string': return mx.helpers.cleanDiacritic(val).toLowerCase();
     case 'number':return val;
    }
  }
  
}



/**
 * Get the current view order
 * @param {Object} o Options
 * @param {string} o.id Id of the map
 * @return {array} view id array
 */
export function getViewOrder(o){
  
  var m = mx.maps[o.id||"map_main"];
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

  if( views.length === 0 ){
    emptyViewsList(true);
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
        id : "moveViewTop",
        comment :"target is the move top button",
        isTrue : el.dataset.view_action_key == "btn_opt_move_top",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          mx.helpers.moveViewItem({
             id : viewTarget,
            mode : "top"
          });
        }
      },
      {
        id : "moveViewBottom",
        comment :"target is the move bottom button",
        isTrue : el.dataset.view_action_key == "btn_opt_move_bottom",
        action : function(){
          var viewTarget = el.dataset.view_action_target;
          mx.helpers.moveViewItem({
             id : viewTarget,
            mode : "bottom"
          });
        }
      },
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
          mx.helpers.uploadGeojsonModal(idView);
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

  var h = mx.helpers;
  var elDiv, elNewItem, elNewInput ; 
  var m = mx.maps[o.id];
  var elViewsContainer = document.querySelector(".mx-views-container");
  var elViewsContent = elViewsContainer.querySelector(".mx-views-content");
  var elViewsList = elViewsContainer.querySelector(".mx-views-list");
  var views = o.views;
  var add = o.add || false;
  var open = o.open || false;
  var isEmpty = o.empty === true;
  var hasList =  ( !isEmpty &&  views !== undefined && views.constructor === Array &&  views.length > 0 && mx.templates.viewList );

  if( !hasList && views && views.constructor === Object ){
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


  var components, isVt, isSm, isCc,isRt,widgets,story,overlap,attributes,customStyle;

  views.forEach(v=>{
    components = [];

    isVt = v.type == "vt";
    isSm = v.type == "sm";
    isCc = v.type == "cc";
    isRt = v.type == "rt";

    widgets = h.path(v,"data.dashboard.widgets",""); 
    story = h.path(v,"data.story.steps",""); 
    overlap = h.path(v,"data.source.layerInfo.maskName","");
    attributes = h.path(v,"data.attribute.names","");
    customStyle = h.path(v,"data.style.custom","");

    if(isSm && story && story.length) components.push("story_map");
    if(isVt && widgets && widgets.length) components.push("dashboard");
    if(!isSm) components.push("layer");
    if(isVt && attributes && attributes.indexOf("mx_t0") >-1 )  components.push("time_slider");
    if(isVt && typeof overlap == "string" && overlap.length )  components.push("overlap");
    if(isVt && customStyle && customStyle.json && JSON.parse(customStyle.json).enable)  components.push("custom_style");
    if(isCc) components.push("custom_code"); 
    v._components = components;

  });


  if( ! hasList && ! add ){
    emptyViewsList(true);

  }else{

    emptyViewsList(false);

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
      elNewInput.checked = open;
      elViewsList.insertBefore(elNewItem,elViewsList.childNodes[0]);
    }

    /**
     * Handle draggable and sortable
     */
/*    h.sortable({*/
      //selector : elViewsList,
      //onSorted : function(){
        //updateViewOrder(o);
      //}
    /*});*/

    /**
     * Generate filter
     */
    makeViewsFilter({
      tagsTable : getTagsGroupsFromView(m.views),
      //optionsButtons : makeViewsFilterOptionsButtons(m.views),
      selectorContainer : "#viewsFilterContainer"
    });

    /*
     * translate based on dict key
     */
    h.updateLanguageElements({
      el:elViewsContainer
    });

    /*
     * filter view  by text input
     */
    if( ! m.listener.viewsListFilterText ){

      m.listener.viewsListFilterText = h.filterViewsListText({
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

      m.listener.viewsListFilterCheckbox = h.filterViewsListCheckbox({
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
      m.listener.viewsValueFilterText =  h.handleViewValueFilterText({
        id: o.id
      });
      /* NOTE: keyup on the whole list */
      elViewsList.addEventListener("keyup",m.listener.viewsValueFilterText);
    }

    /**
     * Listen to click inside the list
     */
    if( ! m.listener.viewsListClick ){
      m.listener.viewsListClick = h.handleViewClick(o);
      elViewsList.addEventListener("click",m.listener.viewsListClick,false);
    }

    /**
    * Trigger view controler
    */
    h.viewControler(o);

  }
}


/**
* Check if there is an empty views list and add a message if needed
*/
export function emptyViewsList(enable){

  enable = enable || false;

  var noViewKey = "noView";
  var elViewsList = document.querySelector(".mx-views-list");
  mx.helpers.getDictItem(noViewKey).then(function(item){

    if( enable ){
      elViewsList.innerHTML = "";
      var elView = document.createElement("li");
      var elTitle = document.createElement("span");
      elTitle.dataset.lang_key = noViewKey;
      elView.classList.add("mx-view-item-empty");
      elTitle.innerHTML = item;
      elTitle.id = "noViewItemText";
      elView.appendChild(elTitle);
      elViewsList.appendChild(elView) ;
    }else{
      var elToRemove = document.querySelector(".mx-view-item-empty");
      if(elToRemove) elToRemove.remove();
    }

  });
}

/**
* Add Additional button to filters
* @param {Object} views list of views
*/
//function makeViewsFilterOptionsButtons(views){

  /*
   * Add additional filters
   */
  //var labelCheckDisplay = "Display only selected";
  //var elFilterCheckDisplayed = mx.helpers.uiToggleBtn({
    //label : labelCheckDisplay.toUpperCase() ,
    //onChange : function(e,elToggle){

      //for (var i = 0, iL = views.length; i < iL; i++) {
        //var v = views[i];
        //var elLi = document.getElementById(v.id);
        //if(!elLi) return;
        //var elInput = elLi.querySelector(".mx-view-tgl-input");
        //if(elToggle.checked && elLi && elInput && !elInput.checked){
          //elLi.classList.add("mx-filter-displayed");
        //}else{
          //if(elLi){
            //elLi.classList.remove("mx-filter-displayed");
          //}

        //}
      //}
    //}
  //});

  //return [
    //elFilterCheckDisplayed  
  //];
/*}*/


/**
* Extract tags from various path in given views list and produce frequency tables
* @param {Array} v Views list
* @note : expect type, data.classes and data.collections
*/
function getTagsGroupsFromView(views){

  var h = mx.helpers;

  var tags = {
    components : [],
    classes : [],
    collections : []
  };

  var stat = {};

  views.map(function(v){ 
    tags.components = tags.components.concat( h.path(v,"_components"));
    tags.classes = tags.classes.concat( h.path(v,"data.classes"));
    tags.collections = tags.collections.concat( h.path(v,"data.collections"));
  });

  // grouprs
  stat.components = mx.helpers.getArrayStat({
    arr:tags.components,
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
  var elFilters = document.createElement("div");
  var elFoldFilters ;

  // Reset content
  elContainer.innerHTML="";

  /**
   * Add filter by class, type, ... 
   */
  var types =  Object.keys(o.tagsTable);

  types.forEach(function(t){
    var tags = [];
    var tbl = o.tagsTable[t];
    var keys = Object.keys(tbl);
    var elTypeContent = document.createElement("div");
    var elTypeContainer = document.createElement("div");
    var elTypeLabel = document.createElement("span");
    elTypeContainer.appendChild(elTypeLabel);
    elTypeContainer.appendChild(elTypeContent);
    elTypeContainer.className = "filter-group";
    elFilters.appendChild(elTypeContainer);

    h.getDictItem(t,l)
      .then(function(label){
        elTypeLabel.innerText =  label;
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
          elTypeContent.appendChild(el);
        });
      });
  });

  elFoldFilters = h.uiFold({
    content : elFilters,
    label : "Filters"
  });

  elContainer.appendChild(elFoldFilters);


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
    System.import("../svg/arrow-north-n.svg")
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
    var link = location.origin + "?views=" + o.idView + "&project=" + mx.settings.project;
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

    var dataItems = [];

    Promise.all([
      promNorth,
      promScale,
      promLegend
    ])
      .then(function(r){
        dataItems = r;
        return  mx.helpers.takeMapScreenshot(map);
      })
      .then(function(dataMap){
        var r = dataItems;
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
      hideNulls = p(view,"data.style.hideNulls",false),
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

    if( nulls && !hideNulls ){
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

        var elLegend = document.querySelector("#check_view_legend_" + view.id);

        if( elLegend ){

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
          elLegend.innerHTML = mx.templates.viewListLegend(view);
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
* @param {Boolean} o.noUi Don't add ui components
*/
export function addOptions(o){

  var view = o.view;
  var idMap = o.id;

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

  if(!o.noUi){

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
  }
}



/** 
 * Add map-x view on the map
 * @param {object} o Options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 * @param {objsect} o.viewData view 
 * @param {Boolean} o.noUi Don't add ui components
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
      view : view,
      noUi : o.noUi
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
              img.style = "cursor:zoom.in";
              elLegend.appendChild(img); 
              img.onload = function(){
              };
              img.onclick = function(){
                var title = mx.helpers.getLabelFromObjectPath({
                  obj : view,
                  path : "data.title",
                  defaultKey : "noTitle"
                });
                var imgModal = new Image();
                imgModal.src = legend;
                imgModal.alt = "Legend";
                  mx.helpers.modal({
                    title:title,
                    id:"legend-raster-" + view.id,
                    content:imgModal,
                    addBackground:false
                  });
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
 * @param {number} o.param Parameters to use 
 */
export function flyTo(o) {

  var hasMap = checkMap(o.id);

  if ( hasMap ) {
    var m = mx.maps[o.id].map;
    var p = o.param;
    if(p.z){
      p.zoom = p.z ;
    }

    if (p.zoom && p.zoom == -1) {
      p.zoom = m.getZoom();
    }

    if( p.fitToBounds === true ){

      m.fitBounds([
        p.w||0, 
        p.s||0, 
        p.e||0,
        p.n||0
      ]);

    }else{
      var opt = {
        center: [p.lng||0,p.lat||0],
        zoom: p.zoom || 0,
        duration: o.duration || 3000
      };

      m.flyTo(opt);

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
  c.mx_map_text_outline = c.mx_map_text_outline || "hsla(196, 98%, 50%,0)";
  c.mx_map_background = c.mx_map_background ||"hsla(0, 0%, 97%, 0.95)";
  c.mx_map_mask = c.mx_map_mask || "hsla(0, 0%, 60%, 0.3)";
  c.mx_map_water =  c.mx_map_water || "hsla(0, 0%, 97%, 0.95)";
  c.mx_map_road = c.mx_map_road || "hsla(0, 0%, 97%, 0.95)";
  c.mx_map_road_border = c.mx_map_road_border || "hsl(0, 0%, 61%)";
  c.mx_map_building = c.mx_map_building || "hsla(0, 0%, 97%, 0.95)";
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
        container.classList.add("mx-settings-color-container");
        container.id = cid;
        var container_inputs = document.createElement("div");
        var lab = document.createElement("span");
        lab.classList.add("mx-settings-color-label");
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
       
        setLabelTitle(cid,lab);
        lab.dataset.lang_key = cid;
        lab.setAttribute("aria-label", cid);
        lab.classList.add("hint--right");
        lab.for = cid;
        container.appendChild(lab);
        container.appendChild(container_inputs);
        inputs.appendChild(container);
      }
    }

  /*
  * helpers
  */
function setLabelTitle(id,label){
    mx.helpers.getDictItem(id).then(function(title){
      label.innreHTML=title;
    }); 
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
        "id":[
          "road-street-low",
          "road-street_limited-low",
          "road-path",
          "road-construction",
          "road-trunk_link",
          "road-motorway_link",
          "road-service-link-track",
          "road-street_limited",
          "road-street",
          "road-secondary-tertiary",
          "road-primary",
          "road-trunk",
          "road-motorway",
          "road-rail",
          "road-rail-tracks"
        ],
        "paint":{
          "line-color":c.mx_map_road
        }
      },
      {
        "id":[
          "road-pedestrian-polygon",
          "road-polygon"
        ],
        "paint":{
          "fill-color":c.mx_map_road
        }
      },
      {
        "id":[
          "road-pedestrian-polygon-case",
          "road-service-link-track-case",
          "road-street_limited-case",
          "road-street-case",
          "road-secondary-tertiary-case",
          "road-primary-case",
          "road-motorway_link-case",
          "road-trunk_link-case",
          "road-trunk-case",
          "road-motorway-case"
        ],
        "paint":{
          "line-color":c.mx_map_road_border
        }
      },
      {
        "id":["building"],
        "paint":{
          "fill-color":c.mx_map_building
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
        "id":[
          "project-label",
          "place-label-capital",
          "place-label-city",
          "country-label",
          "road-label",
          "road-label-small",
          "road-label-medium",
          "road-label-large"
        ],
        "paint":{          
          "text-color": c.mx_map_text,
          "text-halo-color": c.mx_map_text_outline
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
            try{
            map.setPaintProperty(lid,p,grp.paint[p]); 
            } catch(err){
              console.log({
                err : err,
                id : lid,
                property:p
              });
            }
          }
        }
      }
    }


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

  //var checkProject = buildInput("Use project",)


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

  idViews.forEach(function(idView){
    var view = views[idView];
    var lay = layers[idView];
    var attributes = mx.helpers.path(view,"data.attribute.names") || Object.keys(lay);
    var elLayer = cEl("div");
    var elProps = cEl("div");
    var elTitle = cEl("span");

    elTitle.classList.add("mx-prop-layer-title");
    elLayer.className = "mx-prop-group";
    elLayer.dataset.l=idView;
    elTitle.innerText = getTitle(idView);
    elLayer.appendChild(elTitle);

    if(  ! (attributes instanceof Array) ) attributes = [attributes];
    
    attributes.forEach(function(property){

      var values = mx.helpers.getArrayStat({
        stat:"sortNatural",
        arr: lay[property]
      });

      var hasValues =  values.length > 0;
      values = hasValues ? values : ["-"];

      var elValue;

      /* Container */
      var elPropContainer = cEl("div");
      elPropContainer.classList.add("mx-prop-container");

      /* Content */
      var elPropContent = cEl("div");
      elPropContent.classList.add("mx-prop-content");

      /* Wrapper */
      var elPropWrapper = cEl("div");

      /* Title */
      var elPropTitle = cEl("span");
      elPropTitle.classList.add('mx-prop-title');
      elPropTitle.setAttribute('title',property);
      // cant make it appear.. it seems to be hidden
      //elPropTitle.setAttribute('aria-label', property);
      // elPropTitle.classList.add("hint--right");
      elPropTitle.innerText = property;

      /* Toggles */
      var elPropToggles = cEl("div");
      elPropToggles.classList.add("mx-prop-toggles");

      /*Add a toggle for each value */
      for(var i=0, iL=values.length; i<iL; i++){
        var value = values[i];

        if(hasValues){
          elValue = mx.helpers.uiToggleBtn({
            label : value,
            onChange : filterValues,
            data : {
              l : idView,
              p : property,
              v : value
            },
            labelBoxed : true,
            checked : false
          });
        }else{
          elValue = cEl("span");
          elValue.innerText=value;
        }

        elPropToggles.appendChild(elValue);
      }

       /* Build  */
      elPropContent.appendChild(elPropTitle);
      elPropContent.appendChild(elPropToggles);    
      elPropWrapper.appendChild(elPropContent);
      elPropContainer.appendChild(elPropWrapper);
      elProps.appendChild(elPropContainer);  
      elLayer.appendChild(elProps);
    });

    elContainer.appendChild(elLayer);
  });

  var uiBuilt = new Promise(function(resolve,reject){
    popup.setDOMContent(elContainer);
    resolve(elContainer);
  });

  uiBuilt.then(function(elContainer){ 
    mx.helpers.uiReadMore(".mx-prop-container",{
     maxHeightClosed : 100,
     selectorParent : elContainer,
     boxedContent : false
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


export function getReadersIcons(view){
  view = view || {};
  var cl;
  var elItem;
  var elSpan;
  var elReaders = document.createElement("div");
  var readers = view.readers || [];
  var hasEdit = view._edit === true;
  var hasPublic = readers.indexOf("public") > -1;
  var clAll = "fa";
  elReaders.classList.add("mx-readers-grp");

  if( hasPublic ){  
    elItem = document.createElement("i");
    elSpan = document.createElement("span");
    elSpan.appendChild(elItem);
    elItem.classList.add(clAll);
    elItem.classList.add('fa-gavel');
    elSpan.classList.add('hint--left');
    elSpan.dataset.lang_type ="tooltip";
    elSpan.dataset.lang_key ="view_validated";
    elReaders.appendChild(elSpan);
  }
   
  elItem = document.createElement("i");
  elSpan = document.createElement("span");
  elSpan.appendChild(elItem);
  elItem.classList.add(clAll);
  elSpan.classList.add('hint--left');
  elSpan.dataset.lang_type ="tooltip";
  elSpan.dataset.lang_key = hasEdit?"view_editable":"view_locked";
  elItem.classList.add(hasEdit?'fa-unlock':'fa-lock');
  elReaders.appendChild(elSpan);

  return elReaders.outerHTML;
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
      mx_map_road_border : mx.helpers.randomHsl(1) ,
      mx_map_building : mx.helpers.randomHsl(1) ,
      mx_map_admin : mx.helpers.randomHsl(1) ,
      mx_map_admin_disputed : mx.helpers.randomHsl(1) 
    }
  });

}


