/*jshint esversion: 6 */
import * as mx from "./mx_init.js";
//import svgNorthArrow from 
/**
 * Control for live coordinate
 */

export function mapControlLiveCoord(){}
mapControlLiveCoord.prototype.onAdd = function(map){

  var helper = mx.helpers;
  var coord = document.createElement("a");
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

  logo.style.backgroundImage = "url("+require("../img/mapx_blue_small.svg")+")";
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


/**
 * North arrow
 */
//export function mapControlNorth(){}
//mapControlNorth.prototype.onAdd = function(map){
  //var helper = mx.helpers;
  //var northArrow = document.createElement("div");
  //northArrow.id="mx_north";
  //northArrow.style[helper.cssTransformFun()] = "rotateZ("+(-90)+"deg)";
  //northArrow.onclick=function(){map.setBearing(0);};
  //northArrow.innerText='\u27A4';

  //map.on("rotate",function(e){
    //var r = map.getBearing();
    //northArrow.style[helper.cssTransformFun()] = "rotateZ("+(r-90)+"deg)";
  //});

  //this._map = map;
  //this._container = document.createElement('div');
  //this._container.className = 'mapboxgl-ctrl mx-north-arrow';
  //this._container.style.borderRadius = "50%";
  //this._container.appendChild(northArrow);
  //return this._container;
//};

//mapControlNorth.prototype.onRemove = function() {
  //this._container.parentNode.removeChild(this._container);
  //this._map = undefined;
//};

/**
 * Create the prototype containing additional control / button.
 * Some of the actions are related to shiny framework
 */
export function mapControlMain(){}
mapControlMain.prototype.onAdd = function(map) {

  var helper = mx.helpers;

  helper.toggleControls = function(o){

    o = o || {};
    var hide = o.hide || !btns.btnToggleBtns.hidden;
    var action = hide ? 'add':'remove';  
    var idToggle = ["#tabLayers","#tabTools","#tabSettings"];
    var idSkip = o.skip || ["btnStoryUnlockMap","btnStoryClose","btnToggleBtns"];
    btns.btnToggleBtns.hidden = hide;

    for(var key in btns){  
      if(idSkip.indexOf(key) == -1){
        idToggle.push("#"+key);
      }
    }

    helper.classAction({
      selector:idToggle,
      action:action,
      class:'mx-hide-bis'
    });
  };

  var btns = {
    btnToggleBtns:{
      classes:"fa fa-bars",
      key:"btn_togle_btns",
      hidden:false,
      action:helper.toggleControls
    },
    btnShowLogin:{
      classes:"fa fa-sign-in",
      key:"btn_login",
      action:function(){ 
        var val = {
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
        var val = {
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
        var val = {
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
        helper.panelEnable(
          'panels-main',
          'panel-layers',
          'mx-hide'
        );
      }
    },
    btnTabSettings:{
      classes:"fa fa-sliders",
      key:"btn_tab_settings",
      action:function(){ 
        helper.panelEnable(
          'panels-main',
          'panel-settings',
          'mx-hide'
        );
      }
    },
    btnTabTools:{
      classes:"fa fa-cogs",
      key:"btn_tab_tools",
      action:function(){ 
        helper.panelEnable(
          'panels-main',
          'panel-tools',
          'mx-hide'
        );
      }
    },
    btnTabDashboard:{
      classes:"fa fa-pie-chart",
      key:"btn_tab_dashboard",
      action:function(){ 
        helper.panelEnable(
          'panel-bottom',
          'panel-dashboard',
          'mx-hide-back'
        );
      }
    },
    btnPrint:{
      classes:"fa fa-print",
      key:"btn_print",
      action:function(){
        System.import("downloadjs")
          .then(function(d){
            var png = map.getCanvas().toDataURL();
            d(png,"mx-export.png");
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
    btnStoryUnlockMap:{
      classes: "fa fa-lock",
      liClasses: "mx-hide",
      liData: {"map_unlock":"off"},
      key: "btn_story_unlock_map", 
      action : helper.storyControlMapPan 
    },
    btnStoryClose:{
      classes:"fa fa-close",
      liClasses:"mx-hide",
      key:"btn_story_close",
      action:function(){  
        helper.storyController({
          enable : false
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
      classes:"",
      key:"btn_north_arrow",
      hidden:false,
      img : require("../img/north_001.svg"),
      action:function(){
        var map =  mx.helpers.path(mx,"maps.map_main.map");
        if(map){
          map.easeTo({bearing:0,pitch:0});
        }
      }
    }
  }; 

  function createList(){
    var ulAll, id, btn, el, elBtn;
    ulAll =  document.createElement("ul");
    ulAll.className = "mx-controls-ul";
    for( id in btns ){
      btn = btns[id];

      el = document.createElement("li");
      elBtn = document.createElement("div");

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
      el.classList.add("btn-default");
      el.classList.add("hint--bottom-right");
      el.classList.add("shadow");
      el.onclick = btn.action;
      ulAll.appendChild(el);
    }
    return(ulAll);
  }

  var btnList = createList();

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};
mapControlMain.prototype.onRemove = function() {
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
  container.className = "mapboxgl-ctrl mapboxgl-ctrl-attrib";
  text.className="mx-scale-text";
  scale.className="mx-scale-box";
  scale.appendChild(text);
  container.appendChild(scale);

  map.on("move",function(e){
    let unit = "m";
    const maxWidth = 100;
    const y = map._container.clientHeight / 2;
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
