/*jshint esversion: 6 */
import * as mx from "./mx_init.js";

/**
* Control for live coordinate
*/

export function mapControlLiveCoord(){}
mapControlLiveCoord.prototype.onAdd = function(map){
  
  var helper = mx.helpers;
  var coord = document.createElement("a");
  map.on('mousemove',function(e){
    var pos =  e.lngLat;
    var lat = helper.round(pos.lat,3);
    var lng = helper.round(pos.lng,3);
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


/**
* North arrow
*/
export function mapControlNorth(){}
mapControlNorth.prototype.onAdd = function(map){
  var helper = mx.helpers;
  var northArrow = document.createElement("div");
  northArrow.id="mx_north";
  northArrow.style[helper.cssTransformFun] = "rotateZ("+(-90)+"deg)";
  northArrow.onclick=function(){map.setBearing(0);};
  northArrow.innerText='\u27A4';

  map.on("rotate",function(e){
    var r = map.getBearing();
    northArrow.style[helper.cssTransformFun] = "rotateZ("+(r-90)+"deg)";
  });

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-north-arrow';
  this._container.appendChild(northArrow);
  return this._container;
};

mapControlNorth.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

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
        helper.tabEnable('tabs-main','tab-layers');
      }
    },
    btnTabSettings:{
      classes:"fa fa-sliders",
      key:"btn_tab_settings",
      action:function(){ 
        helper.tabEnable('tabs-main','tab-settings');
      }
    },
    btnTabTools:{
      classes:"fa fa-cogs",
      key:"btn_tab_tools",
      action:function(){ 
        helper.tabEnable('tabs-main','tab-tools');
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
    }

  }; 

  function createList(){
    var ulAll, id, btn, el, elBtn;
    ulAll =  document.createElement("ul");
    ulAll.className = "mx-controls-ul btn-group shadow";
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
      el.classList.add("btn");
      el.classList.add("btn-default");
      el.classList.add("hint--bottom-right");
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



