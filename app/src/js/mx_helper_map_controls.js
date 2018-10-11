/*jshint esversion: 6 */
import * as mx from "./mx_init.js";
/**
 * Control for live coordinate
 */

export function mapControlLiveCoord(){}
mapControlLiveCoord.prototype.onAdd = function(map){

  var helper = mx.helpers;
  var coord = document.createElement("div");
  map.on('mousemove',function(e){
    var pos =  e.lngLat;
    var lat = helper.formatZeros(pos.lat,3);
    var lng = helper.formatZeros(pos.lng,3);
    coord.innerText = " Lat: "+lat+" - Lng: "+lng;
  });
  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-attrib';
  this._container.appendChild(coord);
  return this._container;

};

mapControlLiveCoord.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};



export function mapxLogo(){}
mapxLogo.prototype.onAdd = function(map){
  var logo =  document.createElement("a");
  logo.classList.add("mx-logo");

  logo.style.backgroundImage = "url("+require("../svg/map-x-logo-full.svg")+")";
  this._container = document.createElement("div");
  this._container.className = 'mapboxgl-ctrl';
  this._container.style.display = "inline-block";
  this._container.style.float = "none";
  this._container.appendChild(logo);
  return this._container;
};

mapxLogo.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};


export function showSelectProject(){
  var val = {
    time : new Date(),
    value : 'showProject' 
  };
  Shiny.onInputChange('btn_control', val);
}

export function showSelectLanguage(){
  var val = {
    time : new Date(),
    value : 'showLanguage' 
  };
  Shiny.onInputChange('btn_control', val);
}

export function createControlBtns(btns){

  var ulAll, id, btn, el, elBtn;
  ulAll =  document.createElement("ul");
  ulAll.className = "mx-controls-ul";
  for( id in btns ){
    btn = btns[id];

    el = document.createElement("li");
    elBtn = document.createElement("div");
    btn.elBtn = elBtn;

    if(btn.liClasses) el.className = btn.liClasses;
    if(btn.classes) elBtn.className = btn.classes;
    if(btn.liData) for(var k in btn.liData){el.dataset[k]=btn.liData[k];}
    if(btn.img){
      var test = "url(" + btn.img + ")";
      elBtn.style.backgroundImage = test; 
      elBtn.style.backgroundRepeat = "no-repeat";
      elBtn.style.width = "17px";
      elBtn.style.height = "17px";
      elBtn.id = id + "_img";
    }
    el.id = id;
    el.appendChild(elBtn);
    el.dataset.lang_key = btn.key;
    el.dataset.lang_type = "tooltip";
    el.classList.add("btn");
    el.classList.add("btn-circle");
    el.classList.add("btn-circle-medium");
    el.classList.add("hint--bottom-right");
    el.classList.add("shadow");
    el.onclick = btn.action;
    ulAll.appendChild(el);
  }
  return(ulAll);
}


/**
 * Create the prototype containing additional control / button.
 * Some of the actions are related to shiny framework
 */
export function mapControlApp(){}
mapControlApp.prototype.onAdd = function(map) {
  var idMap = map._container.id;
  var helper = mx.helpers;

  /**
  * Toggle controls (btnToggleBtns)
  */
  helper.toggleControls = function(o){

    o = o || {};
    var hide = o.hide || !btns.btnToggleBtns.hidden; // state saved in buttons list
    var action = hide ? 'add' : 'remove';  
    var selectorToggle = [".mx-panel-views",".mapboxgl-ctrl-bottom-left",".mapboxgl-ctrl-bottom-right",".mapboxgl-ctrl-top-right",".mx-panel-tools",".mx-panel-settings"];
    var idSkip = o.skip || ["btnStoryUnlockMap","btnStoryClose","btnToggleBtns"];
    var btnToggle = btns.btnToggleBtns;

    btnToggle.hidden = hide;
    btnToggle.elBtn.className = hide ? btnToggle.classesHidden : btnToggle.classes;
    
    if(this instanceof Node){
       if(hide){
         this.classList.add("active");
       }else{
         this.classList.remove("active");
       }
    }

    for(var key in btns){  
      if( idSkip.indexOf(key) == -1 ){
        selectorToggle.push("#"+key);
      }
    }

    helper.classAction({
      selector : selectorToggle,
      action : action,
      class : 'mx-hide-bis'
    });
  };

  /**
  * Build buttons list
  */
  var btns = {
    btnToggleBtns : {
      classes :"fa fa-desktop",
      classesHidden : "fa fa-desktop active",
      key : "btn_toggle_all",
      hidden : false,
      position : "top-left",
      action : helper.toggleControls
    },
    btnShowLogin:{
      classes:"fa fa-user",
      key:"btn_login",
      action:function(){ 
        var val = {
          time : new Date(),
          value : 'showLogin' 
        };
        Shiny.onInputChange('btn_control', val);
      }
    },
    btnTabView:{
      classes:"fa fa-list-ul",
      key:"btn_tab_views",
      action:function(){ 
        helper.panelSwitch(
          'mx-panel-left',
          'mx-panel-views',
          'mx-hide',
          // Set a callback : if present, reset views layout
          function(state){
            if(state=="on"){
              console.log("panel view enabled");
            }
          }
        );
      }
    },
    btnTabTools:{
      classes:"fa fa-cogs",
      key:"btn_tab_tools",
      action:function(){ 
        helper.panelSwitch(
          'mx-panel-left',
          'mx-panel-tools',
          'mx-hide'
        );
      }
    },
    btnTabDashboard:{
      classes:"fa fa-pie-chart",
      key:"btn_tab_dashboard",
      action:function(){ 
        var state = mx.helpers.Dashboard.showPanel('toggle');
      }
    },
    btnPrint:{
      classes:"fa fa-print",
      key:"btn_print",
      action:function(){
        System.import("downloadjs")
          .then(function(d){
            mx.helpers.takeMapScreenshot(map)
            .then(function(data){
              d(data,"mx-export.png");
            });
          });
      }
    },
    btnFullScreen:{
      classes:"fa fa-expand",
      key:"btn_fullscreen",
      action:function(){
        helper.toggleFullScreen('btnFullScreen');
      }
    },
    btnStoryClose:{
      classes:"fa fa-arrow-left",
      liClasses:"mx-hide",
      key:"btn_story_close"
    },
    btnStoryUnlockMap:{
      classes: "fa fa-lock",
      liClasses: "mx-hide",
      liData: {"map_unlock":"off"},
      key: "btn_story_unlock_map", 
      action : helper.storyControlMapPan 
    },
    btnShowAbout:{
      classes:"fa fa-info",
      key:"btn_about",
      action:function(){ 
        var val = {
          time : new Date(),
          value : 'showAbout' 
        };
        Shiny.onInputChange('btn_control', val);
      }
    },
  btnGeolocateUser : {
      classes :"fa fa-map-marker",
      key : "btn_geolocate_user",
      hidden : false,
      action : mx.helpers.geolocateUser
    },
    btnThemeAerial:{
      classes:"fa fa-plane",
      key:"btn_theme_sat",
      action:function(){  
        helper.btnToggleLayer({
          id:'map_main',
          idLayer:'here_aerial',
          idSwitch:'btnThemeAerial',
          action:'toggle'
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
    },
    btnOverlapSpotlight:{
      classes:"fa fa-bullseye",
      key:"btn_overlap_spotlight",
      action:function(e){
        mx.helpers.overlapsSpotlightToggle();
      }
    },
    btnSetNorth:{
      classes:"mx-north-arrow",
      key:"btn_north_arrow",
      action:function(){
        var map =  mx.helpers.getMap();
        if(map){
          map.easeTo({bearing:0,pitch:0});
        }
      }
    }
  };

  var btnList = createControlBtns(btns);

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};

mapControlApp.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

/**
 * Create the prototype containing additional control / button.
 * Some of the actions are related to shiny framework
 */
export function mapControlNav(){}
mapControlNav.prototype.onAdd = function(map) {
  var idMap = map._container.id;
  var helper = mx.helpers;

  /**
  * Build buttons list
  */
  var btns = {
    btnGeolocateUser : {
      classes :"fa fa-map-marker",
      key : "btn_geolocate_user",
      hidden : false,
      action : mx.helpers.geolocateUser
    },
    btnThemeAerial:{
      classes:"fa fa-plane",
      key:"btn_theme_sat",
      action:function(){  
        helper.btnToggleLayer({
          id:'map_main',
          idLayer:'here_aerial',
          idSwitch:'btnThemeAerial',
          action:'toggle'
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
    },
    btnSetNorth:{
      classes:"mx-north-arrow",
      key:"btn_north_arrow",
      action:function(){
        var map =  mx.helpers.path(mx,"maps.map_main.map");
        if(map){
          map.easeTo({bearing:0,pitch:0});
        }
      }
    }
  };

  var btnList = createControlBtns(btns);

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};
mapControlNav.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

/**
* Create a nested scale indicator : text,box and container. Not possible by the original method.
* This is a hack based on mapbox-gl-js/src/ui/control/scale_control.js
*/
export function mapControlScale(){}

mapControlScale.prototype.onAdd = function(map){
  var container = document.createElement("div");
  var text = document.createElement("div");
  var scale = document.createElement("div");
  var helper = mx.helpers;
  container.className = "mapboxgl-ctrl mapboxgl-ctrl-attrib";
  text.className="mx-scale-text";
  scale.className="mx-scale-box";
  scale.appendChild(text);
  container.appendChild(scale);

  map.on("mousemove",function(e){

    let unit = "m";
    const maxWidth = 100;
    //const y = map._container.clientHeight / 2;
    const y = e.point.y;
    const maxMeters = getDistance(map.unproject([0, y]), map.unproject([maxWidth, y]));
    let distance = getRoundNum(maxMeters);
    const ratio = distance / maxMeters;
    if ( distance >= 1000) {
      distance = distance / 1000;
      unit = 'km';
    }

    scale.style.width = (maxWidth * ratio) + "px";
    text.innerHTML = distance + unit;
  });

  this._container = container;

  return this._container;
};

mapControlScale.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};


function getDistance(latlng1, latlng2) {
  // Uses spherical law of cosines approximation.
  const R = 6371000;

  const rad = Math.PI / 180,
    lat1 = latlng1.lat * rad,
    lat2 = latlng2.lat * rad,
    a = Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);

  const maxMeters = R * Math.acos(Math.min(a, 1));
  return maxMeters;

}

function getRoundNum(num) {
  const pow10 = Math.pow(10, (`${Math.floor(num)}`).length - 1);
  let d = num / pow10;

  d = d >= 10 ? 10 :
    d >= 5 ? 5 :
    d >= 3 ? 3 :
    d >= 2 ? 2 : 1;

  return pow10 * d;
}
