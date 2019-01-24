/* jshint esversion:6*/

import './pickolor.css';
import noUiSlider from 'nouislider';
import chroma from 'chroma-js';
import './node_modules/nouislider/distribute/nouislider.css';
import {buel} from 'buel';
import localforage from 'localforage';
export {Pickolor as default};

/**
 * Pickolor quick palette maker
 */
function Pickolor(opt) {
  var pk = this;
  pk._built = false;
  pk._destroyed = false;

  pk.db = localforage.createInstance({
    name:  "pickolor"
  });
  pk.defaultColors = { 
    bright : "#ffffff",
    dark :  "#474747"
  };
  pk.options = opt;
  pk.sliders = [];
  pk.binds = [];
  pk.bind = {};
  pk.config = {};
  pk.colors = [];
  pk.color = "";
  pk.sliderValues = {};
  pk.observer = {};
  // Set intial cb and values;
  pk.setContainer();
  pk.setCbOnInitColor();
  pk.setCbOnPick();
  pk.registerBinds();
  pk.observeMutation();
  pk._init = true;
}

Pickolor.prototype.setCbOnPick = function(){
  var pk = this;
  pk.onPick = pk.options.onPick instanceof Function ?
    pk.options.onPick :
    alert;
};

Pickolor.prototype.setCbOnInitColor = function(){
  var pk = this;
  pk.onInitColor = pk.options.onInitColor instanceof Function ?
    pk.options.onInitColor :
    function(el){return pk.defaultColors.bright;} ;
};

Pickolor.prototype.setContainer = function(selector){
  var pk = this;
  selector = selector || pk.options.container;
  pk.elContainer = selector instanceof Element ? selector : document.body;
};

Pickolor.prototype.registerBinds = function(el){
  var pk = this;
  var listener;
  var isBindEl = pk.validateBindEl(el);
  var elBinds = isBindEl ? [ el ] : Array.from(
      pk.elContainer.querySelectorAll('[data-pickolor_trigger]')
    );
  // check if there is no duplicate;
  elBinds.forEach((el,i)=> {
    if(pk.validateBindEl(el)){
      var b = pk.binds.find(b => b.el == el);
      if( !b ){
        listener = pk.open.bind(pk);
        el.addEventListener('click',listener);
        pk.binds.push({
          el : el,
          listener : listener
        });
      }
    }
  });
};


Pickolor.prototype.unregisterBindByEl = function(el){
  var pk = this;
  if(pk.validateBindEl(el)){
    var b = pk.binds.find(b => b.el == el);
    if( b ){
      var id = pk.binds.indexOf(b);
      b.el.removeEventListener('click',b.listener);
      pk.binds.splice(id,1);
    }
  }
};


Pickolor.prototype.setCurrentBind = function(selector){
  var pk = this;
  pk.bind = selector instanceof Element ? selector : pk.el;
};

Pickolor.prototype.open = function(e){
  var pk = this;
  pk.build();
  var color =  pk.defaultColors.dark;
  if(e && e.target instanceof Element){
    pk.setCurrentBind(e.target);
    var colorUser = pk.onInitColor(e.target);
    color = pk.validateColor(colorUser) ? colorUser : color;
  }
  pk.setColorInput({
    color : color
  });
};

Pickolor.prototype.build = function() {
  var pk = this;
  if(pk._built){
    pk.show();
    return;
  }
  pk._built = true;

  pk.id = Math.random().toString(32);
  var elContainer = pk.elContainer || pk.options.el;
  var sliders = pk.sliders;
  var elDest = buel("div");

  var elHandle = buel("div",{
    class: 'handle'
  });

  var elInputColor = buel('input',{
    class : ['color-input'],
    placeholder : '#fff',
    dataset : {
      action : 'input-text-color'
    }
  });

  var elBtnAdd = buel("button","add",{
    type: "button",
    class : ["button"],
    dataset : {
      action : 'btn-select-color'
    }
  });

  var elBtnClose = buel("button","close",{
    type: "button",
    class : ["button"],
    dataset :{
      action : 'btn-close'
    }
  });

  var elInputGroup = buel("div",
    {
      class : ['top-group-input']
    },
    elInputColor,
    elBtnAdd,
    elBtnClose
  );

  var elTabSliders = buel('div',{
    class : ['tab-sliders'],
    style : {
      display : 'none'
    }
  });
  var elItems = buel('div', {
    class: ['items'],
  });

  var elToggleTabSliders = buel("div",
    buel('input', {
      id : 'toggleTools' + pk.id,
      type: "checkbox",
      class: ['toggle-tools'],
      dataset : {
        action : 'check-toggle-slider'
      }
    }),
    buel('label','Settings', {
      for: 'toggleTools' + pk.id,
      type: "checkbox",
      class: ['toggle-tools-label'],
    }
    )
  );

  var elToggleTabJson = buel("div",
    buel('input', {
      id : 'toggleJSONinput' + pk.id,
      type: "checkbox",
      class: ['toggle-tools'],
      dataset : {
        action : 'check-toggle-json'
      }
    }),
    buel('label','Edit values', {
      for: 'toggleJSONinput' + pk.id,
      type: "checkbox",
      class: ['toggle-tools-label'],
    })
  );

  var elTabs = buel("div",
    {
      class : ["tabs"]
    },
    elToggleTabSliders,
    elToggleTabJson
  );

  var elInputJson = buel('textarea',{
    class : ['text-area-input-json']
  });

  var elTabInputJson = buel("div",{
    class : ['tab-json'],
    style : {
      display : "none"
    }
  },
    elInputJson,
    buel("button","update",{
      class : "button",
      dataset : {
        action : "btn-update-json"
      }
    })
  );

  elDest.classList.add('pickolor');
  elDest.classList.add('handle');
  elDest.style.width = pk.options.width || '300px';
  //elDest.style.height = pk.options.height || '400px';
  pk.el = elDest;
  pk.elItems = elItems;
  pk.elInputColor = elInputColor;
  pk.elInputGroup = elInputGroup;
  pk.elInputJson = elInputJson;
  pk.elTabInputJson = elTabInputJson;
  pk.elTabSliders = elTabSliders;
  elDest.appendChild(elHandle);
  elDest.appendChild(elInputGroup);
  elDest.appendChild(elItems);
  elDest.appendChild(elTabs);
  elDest.appendChild(elTabSliders);
  elDest.appendChild(elTabInputJson);
  elContainer.appendChild(elDest);


  /**
   * Event delegation
   */
  pk.listenClick = pk.handleClick.bind(pk);
  pk.listenChange = pk.handleChange.bind(pk);
  pk.el.addEventListener("click",pk.listenClick);
  pk.el.addEventListener("change",pk.listenChange);

  /**
   * Build sliders
   */
  pk.getTemplateSliders().forEach(s => {
    var slider;
    /**
     * ui
     */
    var elContainer = buel('div', {
      class: ['slider-container'],
    });
    var elSlider = buel('div', {
      class: ['slider'],
    });
    var elContainerMinMax = buel('div', {
      class: 'slider-min-max-container',
    });
    var elMin = buel('input',{
      type:'text',// avoid browser things..
      dataset : {
        action : "input-update-value-slider",
        idSlider : s.id
      }
    });
    var elMax = buel('input',{
      type:'text',// avoid browser things
      dataset : {
        action : "input-update-value-slider",
        idSlider : s.id
      }
    });
    var elTitle = buel('span', s.title, {
      id: s.id,
    });

    elContainer.appendChild(elTitle);
    elContainerMinMax.appendChild(elMin);
    elContainerMinMax.appendChild(elMax);
    elContainer.appendChild(elContainerMinMax);
    elContainer.appendChild(elSlider);
    elTabSliders.appendChild(elContainer);

    /**
     * Settings
     */
    slider = noUiSlider.create(elSlider, s.opt);
    s.updateValueSlider = function(){
      slider.set(s.type === 'numericRange' ? [elMin.value,elMax.value] : elMin.value);
      pk.update();
    };
    if (s.type == 'boolean') {
      elSlider.classList.add('toggle');
      elMin.style.display = "none";
      elMax.style.display = "none";
    }
    if(s.type == "numeric") {
      elMax.style.display = "none";
    }
    slider.on('slide', pk.update.bind(pk));
    sliders.push({
      slider: slider,
      config: s,
      elMin: elMin,
      elMax: elMax,
    });
  });

  /**
  * Restore value if any
  */
  pk.restore();

  /**
   * Add draggable
   */
  if( ! pk.options.disableDraggable ){
    
    draggable({
      selector : elDest,
      classHandle: 'handle',
      elcontainer: pk.elContainer
    });
  }

};



Pickolor.prototype.observeMutation = function(){
  var pk =  this;
  var targetNode = pk.elContainer;
  var config = { childList: true, subtree : true };
  function callback(mutationsList, observer) {
    for(var mutation of mutationsList) {
      if (mutation.type == 'childList') {
        mutation.addedNodes.forEach(autoAddBind);
        mutation.removedNodes.forEach(autoRemoveBind);
      }
    }
  }
  function autoAddBind(el){ 
    if ( pk._init && pk.validateBindEl(el) ){
      pk.registerBinds(el);
    }
  }
  function autoRemoveBind(el){ 
    if ( pk._init && pk.validateBindEl(el) ){
      pk.unregisterBindByEl(el);
    }
  }
  pk.observer = new MutationObserver(callback);
  pk.observer.observe(targetNode, config);
};


Pickolor.prototype.validateBindEl = function(el){
  var pk = this;
  return el instanceof Element &&
    el.dataset.pickolor_trigger == "true";
};



Pickolor.prototype.handleClick = function(e){
  var pk = this;
  var target = e.target;
  var action = target.dataset.action;

  if( action == "btn-select-color"){
    var color = pk.getColorInput();
    pk.onPick(color,pk.bind);
  }
  if( action == "btn-close"){
    pk.hide();
  }
  if( action == "check-toggle-slider"){
    pk.toggleTabJson(false);
    pk.toggleTabSliders();
  }
   if( action == "check-toggle-json"){
    pk.toggleTabSliders(false);
    pk.toggleTabJson();
  }
  if( action == "item-get-color"){
    pk.getColor(e);
  }
  if(action == "btn-update-json"){
    pk.set(pk.elInputJson.value);
    pk.update();  
  }
};

Pickolor.prototype.handleChange = function(e){
  var pk = this;
  var action = e.target.dataset.action;

  if(action == "input-text-color"){
    var color = pk.getColorInput();
    pk.setColorInput({
      color : color,
      updateColorOnly : true
    });
  }
  if(action == "input-update-value-slider"){
    var id = e.target.dataset.idSlider;
    pk.updateValueSlider(id);
    pk.update();  
  }


};



Pickolor.prototype.getColorInput = function(){
  var pk = this;
  var color = pk.elInputColor.value;
  return pk.getValidColor(color);
};

Pickolor.prototype.validateColor = function(color){
  return chroma.valid(color);
};

Pickolor.prototype.getValidColor = function(color){
  var pk = this;
  var isValid = pk.validateColor(color);
  if(!isValid){
    color = "#fff";
  }
  return chroma(color).hex();
};

Pickolor.prototype.setColorInput = function(opt){
  var pk = this;
  var color = pk.getValidColor(opt.color);
  var updateColorOnly = opt.updateColorOnly;
  if( !updateColorOnly ){
    pk.elInputColor.value = chroma(color).hex();
  }
  pk.elInputColor.style.backgroundColor = color;

  if(chroma.contrast(pk.defaultColors.bright,color) < 4.5){
    pk.elInputColor.style.color = pk.defaultColors.dark;
  }else{
    pk.elInputColor.style.color = pk.defaultColors.bright;
  }

};

Pickolor.prototype.toggleTabSliders = function(visible){
  var pk = this;
  var el = pk.elTabSliders;
  var dis = el.style.display;
  visible = typeof visible == "boolean" ? visible : dis == "none";
  el.style.display = visible ? "" : "none";
};

Pickolor.prototype.toggleTabJson = function(visible){
  var pk = this;
  var el = pk.elTabInputJson;
  var dis = el.style.display;
  visible = typeof visible == "boolean" ? visible : dis == "none";
  el.style.display = visible ? "" : "none";
};

Pickolor.prototype.hide = function() {
  var pk = this;
  pk.el.style.display = "none";
};

Pickolor.prototype.show = function() {
  var pk = this;
  pk.el.style.display = "";
};

Pickolor.prototype.destroy = function() {
  var pk = this;
  if(pk._destroyed == true) return;
  pk.observer.disconnect();
  pk.sliders.forEach(s => {
    s.slider.destroy();
  });
  pk.binds.forEach((b,i) => {
    b.el.removeEventListener('click',b.listener);
  });
  if(pk.el) {
    pk.el.removeEventListener("click",pk.listenClick);
    pk.el.removeEventListener("change",pk.listenChange);
    pk.el.remove();
  }
  pk._destroyed = true;
};

Pickolor.prototype.getColor = function(e) {
  if (!e.target.dataset.color) return;

  var pk = this;
  var color = '';
  var elsItem = pk.elItems.querySelectorAll('.item input');
  elsItem.forEach(e => {
    if (e.checked) {
      color = e.dataset.color;
    }
  });
  pk.setColorInput({
    color : color
  });
};

Pickolor.prototype.updateValueSlider = function(id,value) {
  var pk = this;
  pk.sliders.forEach(s => {
    if(s.config.id == id){
      s.config.updateValueSlider();
    }
  });
};

Pickolor.prototype.getSlidersValues = function() {
  var pk = this;
  var value, id;
  var values = {};
  pk.sliders.forEach(s => {
    value = s.slider.get();
    id = s.config.id;
    if (s.config.type == 'numericRange') {
      value = value.map(v => Math.round(v*10)/10 );
      s.elMin.value = value[0];
      s.elMax.value = value[1];
    }
    if (s.config.type == 'numeric') {
      value = value * 1;
      s.elMin.value = Math.round(value*10)/10;
    }
    if (s.config.type == 'boolean') {
      //value = Boolean(value * 1);
      value = value * 1;
    }

    values[id] = value;
  });
  return values;
};


Pickolor.prototype.update = function() {
  var pk = this;
  var values = pk.getSlidersValues();
  var config = {
    diverge: values.inColDiverge,
    random: values.inColRandom,
    reverse: values.inColReverse,
    count: values.inColNumber,
    colRotation: values.inColRotation,
    colShift : values.inColShift,
    colMin: values.inColRange[0],
    colMax: values.inColRange[1],
    lumMin: values.inLumRange[0],
    lumMax: values.inLumRange[1],
    satMin: values.inSatRange[0],
    satMax: values.inSatRange[1],
  };
  var colors = getColors(config);


  var backup = {
    slidersValues : values,
    colors : colors
  };

  pk.db.setItem("default", backup);

  pk.elInputJson.value = JSON.stringify(backup,0,2);

  pk.elItems.innerHTML = '';
  colors.forEach(c => {
    var elItem = createItem(c);
    pk.elItems.appendChild(elItem);
  });
};


Pickolor.prototype.restore = function(){
  var pk = this;

  /**
   * Set default
   */
  pk.setColorInput({
    color : pk.options.initValue
  });

  /*
   * Check for saved data
   */
  pk.db.getItem("default")
    .then(data => {
      pk.set(data);
      pk.update();
    });
};

Pickolor.prototype.set = function(data){
  var pk = this;
  data = data || {};
  data = typeof data == "string" && isJSON(data) ? JSON.parse(data) : data ;
  if( pk.validateDataInput(data)){
    pk.sliders.forEach(s => {
      var id = s.config.id;
      var values = data.slidersValues[id];
      if( typeof values != "undefined" ){
        s.slider.set(values);
      }
    });
  }
};

Pickolor.prototype.validateDataInput = function(data){
  var pk = this;
  var keys = pk.getTemplateSliders().map(s => s.id);

  if(!data) return false;
  // test if it's an object
  var slidersValid =  data instanceof Object &&
    // test if sliders values is an object
    data.slidersValues instanceof Object && 
    // test if all liders valus keys are known
    Object.keys(data.slidersValues).reduce((a,kd) => {
      return a && keys.indexOf(kd) > -1;
    },true) ;


  // test if colors is an array
  var colorsValid = data.colors instanceof Array &&
    // test if all colors are string
    data.colors.reduce((a,c) => {
      return a && pk.validateColor(c);
    },true);

  return slidersValid && colorsValid;
};



function createItem(color) {
  var idRadio = Math.random().toString(32);
  var elItem = buel('div', {
    class: ['item'],
  });
  var elLabel = buel('label', {
    for: idRadio,
    style: {
      backgroundColor: color
      //borderColor: color,
    },
  });
  var elInput = buel('input', {
    id: idRadio,
    type: 'radio',
    name: 'pickolor-item',
    dataset: {
      color: color,
      action : 'item-get-color'
    },
  });
  elItem.appendChild(elInput);
  elItem.appendChild(elLabel);

  return elItem;
}

function getColors(o) {
  var colors = [];
  var c = '';
  var sats = splitIn(o.satMin, o.satMax, o.count);
  var cols = splitIn(o.colMin, o.colMax, o.count, o.colRotation, o.colShift);
  var lums = splitIn(o.lumMin, o.lumMax, o.count);

  //if(o.colRotation > 0){

  /**
   * Sinusoidal version
   *
   *  
   *  var x,f,r,d;
   *  cols = cols.map((c,i) => {
   *    x = i / n;
   *    r = x * Math.PI * o.colRotation;
   *    f = (1 - Math.cos(r)) / 2;
   *    d = dC * f ;
   *    return o.colMin + d + o.colShift;
   *  });
   */
  //}

  for (var i = 0; i < o.count; i++) {
    c = 'hsl(' + cols[i] + ',' + sats[i] * 100 + '%,' + lums[i] * 100 + '%)';
    colors.push(chroma(c).hex());
  }
  if (o.random) colors = shuffle(colors);
  if (o.reverse) colors.reverse();

  if (o.diverge) colors = diverge(colors);
  return colors;
}

Pickolor.prototype.getTemplateSliders = function() {
  return [
    {
      title: 'Number of colors',
      type: 'numeric',
      id: 'inColNumber',
      opt: {
        start: 15,
        step : 1,
        range: {
          min: 1,
          max: 500,
        },
      },
    },
    {
      title: 'Number of hue rotation',
      id: 'inColRotation',
      type: 'numeric',
      opt: {
        start: 1,
        step : 0.01,
        range: {
          min: 1,
          max: 10,
        },
      },
    },
    {
      title: 'Hue shift',
      id: 'inColShift',
      type: 'numeric',
      opt: {
        start: 0,
        step : 1,
        range: {
          min: 0,
          max: 360,
        },
      },
    },
    {
      title: 'Colors',
      id: 'inColRange',
      type: 'numericRange',
      opt: {
        start: [180,240],
        step : 1,
        connect: true,
        behaviour: 'drag',
        range: {
          min: 0,
          max: 360,
        },
      },
    },
    {
      title: 'Saturation',
      id: 'inSatRange',
      type: 'numericRange',
      opt: {
        start: [0.5, 0.9],
        step : 0.01,
        connect: true,
        behaviour: 'drag',
        range: {
          min: 0,
          max: 1,
        },
      },
    },
    {
      title: 'Luminosity',
      id: 'inLumRange',
      type: 'numericRange',
      opt: {
        start: [0.5, 0.9],
        step : 0.01,
        behaviour: 'drag',
        connect: true,
        range: {
          min: 0,
          max: 1,
        },
      },
    },
    {
      title: 'Randomize',
      id: 'inColRandom',
      type: 'boolean',
      opt: {
        start: 0,
        step : 1,
        range: {
          min: [0, 1],
          max: 1,
        },
      },
    },
    {
      title: 'Reverse',
      id: 'inColReverse',
      type: 'boolean',
      opt: {
        start: 0,
        step : 1,
        range: {
          min: [0, 1],
          max: 1,
        },
      },
    },
    {
      title: 'Diverge',
      id: 'inColDiverge',
      type: 'boolean',
      opt: {
        step : 1,
        start: 0,
        range: {
          min: [0, 1],
          max: 1,
        },
      },
    },
  ];
};

/**
* helpers
*/

export function draggable(o) {

  var xMin,xMax,yMin,yMax,x,y;


  o.classHandle = o.classHandle || "mx-drag-handle";
  o.classDraggable = o.classDraggable || "mx-draggable";
  o.classDragged = o.classDragged || "mx-dragged";

  o.el = o.selector instanceof Element ? o.selector : document.querySelector(o.selector);
  o.elHandle = o.selectorHandle instanceof Element ? o.selectorHandle : o.el.querySelector(o.selectorHandle) || o.el;
  o.elContainer = o.selectorContainer instanceof Element ? o.selectorContainer : document.querySelector(o.selectorContainer) || document.body;

  o.el.style.zIndex = 1000;
  o.el.style.position = "absolute";
  o.el.style.top ="0px";

  o.forceDim = o.forceDim || false;
  o.listener = {};
  o.containerRect = o.elContainer.getBoundingClientRect();

  xMin = o.containerRect.left;
  xMax = o.containerRect.right;
  yMin = o.containerRect.top;
  yMax = o.containerRect.bottom;

  /**
   * Set position value using delta from client
   */
  o.setPos = function(newX, newY) {
    var x = o.x + newX - o.x_to;
    var y = o.y + newY - o.y_to;

    if( x + o.rectHandle.width >= xMax ) x = xMax - o.rectHandle.width ;
    if( x <= xMin ) x = xMin;
    if( y + o.rectHandle.height >= yMax  ) y = yMax - o.rectHandle.height;
    if( y <= yMin ) y = yMin;
    return {
      left: x,
      top: y
    };
  };

  /*
   * Set dragged item position and store rect
   */
  o.setPosElement = function(el, newX, newY) {
    //o.rect = el.getBoundingClientRect();
    o.pos = o.setPos(newX, newY);
    o.el.style.left = o.pos.left + "px";
    o.el.style.top = o.pos.top + "px";
    o.block = false;
  };

  /**
   * mouse down + move : change element coordinate
   */
  o.listener.mousemove = function(event) {
    if( o.block === false ){
      o.block = true;
    event.preventDefault();
    event.stopImmediatePropagation();
        o.setPosElement(o.el, event.clientX, event.clientY);
        if (o.onDragMove instanceof Function) o.onDragMove(o, event);
    }
  };

  /*
   * mouse up : remove "up" and "move" listener
   */
  o.listener.mouseup = function(event) {

    o.block = true;

    event.preventDefault();
    event.stopImmediatePropagation();

    window.removeEventListener('pointermove', o.listener.mousemove, false);
    window.removeEventListener('pointerup', o.listener.mouseup, false);

    o.el.classList.remove(o.classDragged);

    if (o.onDragEnd instanceof Function) o.onDragEnd(o, event);

  };

  /**
   * mouse down : make it draggable
   */
  o.listener.mousedown = function(event) {

    var isHandle = event.target.classList.contains(o.classHandle);
    if (isHandle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      o.styleOrig = {
        left: o.el.style.left,
        top: o.el.style.top,
        width: o.el.style.width,
        height: o.el.style.height,
        zIndex: o.el.style.zIndex,
        position: o.el.style.position,
        margin : o.el.style.margin
      };

      o.block = false;
      

      o.rect = o.el.getBoundingClientRect();
      o.rectHandle = o.elHandle.getBoundingClientRect();
      o.x = o.el.offsetLeft;
      o.y = o.el.offsetTop;
      o.x_to = event.clientX;
      o.y_to = event.clientY;


      if( o.forceDim ){
        o.el.style.zIndex = 1000;
        o.el.style.width = o.rect.width + "px";
        o.el.style.height = o.rect.height + "px";
      }

      o.el.style.position = "absolute";
      o.el.style.margin = "initial";
      o.el.classList.add(o.classDragged);

      o.setPosElement(o.el, event.clientX, event.clientY);

      window.addEventListener('pointermove', o.listener.mousemove, false);
      window.addEventListener('pointerup', o.listener.mouseup, false);

      if (o.onDragStart instanceof Function) o.onDragStart(o, event);

    }
  };

  if (!o.event) {
    o.elHandle.addEventListener('pointerdown', o.listener.mousedown, false);
  } else {
    o.listener.mousedown(event);
  }

}

function splitIn(min, max, n, r, s) {
  min = min * 1;
  max = max * 1;
  r = r || 1;
  s = s || 0;
  var out = [];
  var step = (max - min) / n * r;
  var value = 0;
  var up = true; 
  var j = 0;
  for (var i = 0; i < n; i++) {
    if( r == 1 ){
      value = (s + min + step * i);
    }else{
      j = Math.floor(i % ( n / r )) ;
      up = i > 0 && j == 0 ? !up : up;
      if(up){
        value = Math.floor( s + min + step * j );
      }else{
        value = Math.floor( s + max - step * j );
      }
    }
    out.push(value);
  }
  return out;
}

function shuffle(array) {
  /**https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array*/
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function diverge(array) {
  var a = array;
  var b = a.filter((v,i) => i % 2 == 0 );
  var c = b.map(v => v);
  c.reverse();
  if( a.length % 2 !== 0 ){
    c.shift();
  }
  b = b.concat(c);
  return b;
}

function isJSON(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
