/* jshint esversion:6*/

import './pickolor.css';
import './node_modules/nouislider/distribute/nouislider.css';

import noUiSlider from 'nouislider';
import chroma from 'chroma-js';
import localforage from 'localforage';
import {el} from '@fxi/el';
import {draggable} from './draggable.js';
import * as frameTool from './onNextFrame.js';
import * as options from './options.js';

export {Pickolor as default};

/**
 * Pickolor quick palette maker
 */
function Pickolor(opt) {
  var pk = this;
  pk._built = false;
  pk._destroyed = false;
  pk.db = localforage.createInstance({
    name: 'pickolor'
  });

  // set options
  pk.options = options.default;
  Object.assign(pk.options, opt);
  pk.sliders = [];
  pk.binds = [];
  pk.bind = {};

  pk.colors = [];
  pk.color = '';
  pk.sliderValues = {};
  pk.observer = {};
  // Set intial cb and values;
  pk.setContainer();
  pk.setCbOnInitColor();
  pk.setCbOnPick();
  pk.registerBinds();
  pk.observeMutation();
  // shortcut
  pk._init = true;
}

Pickolor.prototype.setCbOnPick = function() {
  var pk = this;
  pk.onPick = pk.options.onPick instanceof Function ? pk.options.onPick : alert;
};

Pickolor.prototype.d = function(id) {
  var pk = this;
  var item = pk.options.dict.find((d) => d.id === id);
  if (item) {
    return item[pk.options.language] || item.en || id;
  } else {
    return id;
  }
};

Pickolor.prototype.setCbOnInitColor = function() {
  var pk = this;
  pk.onInitColor =
    pk.options.onInitColor instanceof Function
      ? pk.options.onInitColor
      : function() {
          return pk.options.defaultColors.bright;
        };
};

Pickolor.prototype.setContainer = function(selector) {
  var pk = this;
  selector = selector || pk.options.container;
  pk.elContainer = selector instanceof Element ? selector : document.body;
};

Pickolor.prototype.registerBinds = function(el) {
  var pk = this;
  var listener;
  var isBindEl = pk.validateBindEl(el);
  var elBinds = isBindEl
    ? [el]
    : Array.from(pk.elContainer.querySelectorAll('[data-pickolor_trigger]'));
  // check if there is no duplicate;
  elBinds.forEach((el) => {
    if (pk.validateBindEl(el)) {
      var b = pk.binds.find((b) => b.el === el);
      if (!b) {
        listener = pk.open.bind(pk);
        el.addEventListener('click', listener);
        pk.binds.push({
          el: el,
          listener: listener
        });
      }
    }
  });
};

Pickolor.prototype.unregisterBindByEl = function(el) {
  var pk = this;
  if (pk.validateBindEl(el)) {
    var b = pk.binds.find((b) => b.el === el);
    if (b) {
      var id = pk.binds.indexOf(b);
      b.el.removeEventListener('click', b.listener);
      pk.binds.splice(id, 1);
    }
  }
};

Pickolor.prototype.setCurrentBind = function(selector) {
  var pk = this;
  pk.bind = selector instanceof Element ? selector : pk.el;
};

Pickolor.prototype.open = function(e) {
  var pk = this;
  pk.build();
  var color = pk.options.defaultColors.dark;
  if (e && e.target instanceof Element) {
    pk.setCurrentBind(e.target);
    var colorUser = pk.onInitColor(e.target);
    color = pk.validateColor(colorUser) ? colorUser : color;
  }
  pk.setColorInput({
    color: color
  });
};

Pickolor.prototype.buildTabs = function() {
  var pk = this;

  var elTabSliders = el('div', {
    class: ['pickolor-tab-sliders']
  });
  var elTabJsonEdit = el('div', {
    class: ['pickolor-tab-json']
  });
  var elTabSaveLoad = el('div', {
    class: ['pickolor-tab-palette']
  });

  var elPanelOptions = el(
    'div',
    {
      class: ['pickolor-options']
    },
    el('input', {
      type: 'checkbox',
      class: 'pickolor-check-panel-options',
      id: 'pickolorCheckPanelOptions'
    }),
    el(
      'label',
      {
        class: 'pickolor-check-panel-options-label',
        lang_key: 'pk_panel_options',
        for: 'pickolorCheckPanelOptions'
      },
      pk.d('pk_panel_options')
    )
  );

  var elTabsRadio = el(
    'div',
    {
      class: ['pickolor-tabs']
    },
    el('input', {
      type: 'radio',
      name: 'pickolor-tabs',
      class: 'pickolor-tab-radio',
      value: 'pickolor-tab-sliders',
      checked: true,
      id: 'pickolor-tab-sliders-radio'
    }),
    el(
      'label',
      {
        class: 'pickolor-tab',
        lang_key: 'pk_tab_settings',
        for: 'pickolor-tab-sliders-radio'
      },
      pk.d('pk_tab_settings')
    ),
    el('input', {
      type: 'radio',
      name: 'pickolor-tabs',
      class: 'pickolor-tab-radio',
      value: 'pickolor-tab-load-save',
      id: 'pickolor-tab-load-save-radio'
    }),
    el(
      'label',
      {
        class: 'pickolor-tab',
        lang_key: 'pk_tab_palettes',
        for: 'pickolor-tab-load-save-radio'
      },
      pk.d('pk_tab_palettes')
    ),
    el('input', {
      type: 'radio',
      name: 'pickolor-tabs',
      class: 'pickolor-tab-radio',
      value: 'pickolor-tab-json-edit',
      id: 'pickolor-tab-json-edit-radio'
    }),
    el(
      'label',
      {
        class: 'pickolor-tab',
        lang_key: 'pk_tab_edit_json',
        for: 'pickolor-tab-json-edit-radio'
      },
      pk.d('pk_tab_edit_json')
    ),
    el(
      'div',
      {
        class: ['pickolor-tabs-content']
      },
      el(
        'div',
        {
          id: 'pickolor-tab-sliders-content',
          class: 'pickolor-tab-content'
        },
        elTabSliders
      ),
      el(
        'div',
        {
          id: 'pickolor-tab-load-save-content',
          class: 'pickolor-tab-content'
        },
        elTabSaveLoad
      ),
      el(
        'div',
        {
          id: 'pickolor-tab-json-edit-content',
          class: 'pickolor-tab-content'
        },
        elTabJsonEdit
      )
    )
  );

  pk.elTabSliders = elTabSliders;
  pk.elTabJsonEdit = elTabJsonEdit;
  pk.elTabSaveLoad = elTabSaveLoad;
  pk.elTabsRadio = elTabsRadio;
  pk.elPanelOptions = elPanelOptions;
  pk.elPanelOptions.appendChild(elTabsRadio);
  pk.el.appendChild(elPanelOptions);
};

Pickolor.prototype.buildTabSliders = function() {
  pk = this;
  /**
   * Build sliders
   */
  pk.getTemplateSliders().forEach((s) => {
    var slider;
    /**
     * ui
     */
    var elContainer = el('div', {
      class: ['slider-container']
    });
    var elSlider = el('div', {
      class: ['slider']
    });
    var elContainerMinMax = el('div', {
      class: 'slider-min-max-container'
    });
    var elMin = el('input', {
      type: 'text', // avoid browser things..
      dataset: {
        action: 'input-update-value-slider',
        idSlider: s.id
      }
    });
    var elMax = el('input', {
      type: 'text', // avoid browser things
      dataset: {
        action: 'input-update-value-slider',
        idSlider: s.id
      }
    });
    var elTitle = el('span', s.title, {
      id: s.id
    });

    elContainerMinMax.appendChild(elMin);
    elContainerMinMax.appendChild(elMax);
    elContainer.appendChild(elTitle);
    elContainer.appendChild(elContainerMinMax);
    elContainer.appendChild(elSlider);
    pk.elTabSliders.appendChild(elContainer);

    /**
     * Settings
     */
    slider = noUiSlider.create(elSlider, s.opt);
    s.updateValueSlider = function() {
      slider.set(
        s.type === 'numericRange' ? [elMin.value, elMax.value] : elMin.value
      );
      pk.update();
    };
    if (s.type === 'boolean') {
      elSlider.classList.add('toggle');
      elMin.style.visibility = 'hidden';
      elMax.style.visibility = 'hidden';
    }
    if (s.type === 'numeric') {
      elMax.style.visibility = 'hidden';
    }
    slider.on('slide', pk.update.bind(pk));
    pk.sliders.push({
      slider: slider,
      config: s,
      elMin: elMin,
      elMax: elMax
    });
  });
};

Pickolor.prototype.buildTabJsonEdit = function() {
  var pk = this;

  var elInputJson = el('textarea', {
    class: ['text-area-input-json']
  });

  var elContainer = el(
    'div',
    elInputJson,
    el('button', 'update', {
      class: 'button',
      dataset: {
        action: 'btn-update-json'
      }
    })
  );

  pk.elTabJsonEdit.appendChild(elContainer);
  pk.elInputJson = elInputJson;
};

Pickolor.prototype.buildPanel = function() {
  var pk = this;
  pk.id = Math.random().toString(32);

  var elContainer = pk.elContainer || pk.options.el;

  var elDest = el('div');
  var elHandle = el('div', {
    class: 'handle'
  });
  var elInputColor = el('input', {
    class: ['color-input'],
    placeholder: '#fff',
    dataset: {
      action: 'input-text-color'
    }
  });

  var elBtnAdd = el('button', pk.d('pk_btn_add'), {
    type: 'button',
    class: ['button'],
    dataset: {
      lang_key: 'pk_btn_add',
      action: 'btn-select-color'
    }
  });

  var elBtnClose = el('button', pk.d('pk_btn_close'), {
    type: 'button',
    class: ['button'],
    dataset: {
      action: 'btn-close',
      lang_key: 'pk_btn_close'
    }
  });

  var elInputGroup = el(
    'div',
    {
      class: ['top-group-input']
    },
    elInputColor,
    elBtnAdd,
    elBtnClose
  );

  var elItems = el('div', {
    class: ['items']
  });

  elDest.appendChild(elHandle);
  elDest.appendChild(elInputGroup);
  elDest.appendChild(elItems);
  elContainer.appendChild(elDest);
  elDest.classList.add('pickolor');
  //elDest.classList.add('handle');
  elDest.style.width = pk.options.width || '300px';
  pk.elItems = elItems;
  pk.elInputColor = elInputColor;
  pk.elInputGroup = elInputGroup;

  pk.el = elDest;
};

Pickolor.prototype.buildTabSaveLoad = function() {
  var pk = this;
  var elContent = el(
    'div',
    {
      class: 'pickolor-tab-palettes'
    },
    el(
      'button',
      {
        type: 'button',
        class: ['button'],
        dataset: {
          action: 'btn-set-default-palette',
          lang_key: 'pk_btn_set_default_palette'
        }
      },
      pk.d('pk_btn_set_default_palette')
    ),
    el(
      'div',
      'Available soon:',
      el(
        'ul',
        el('li', 'Browse standard palettes'),
        el('li', 'Save your own palettes'),
        el('li', 'Share palettes')
      )
    )
  );
  pk.elTabSaveLoad.appendChild(elContent);
};

Pickolor.prototype.build = function() {
  var pk = this;
  if (pk._built) {
    pk.show();
    return;
  }
  pk._built = true;

  pk.buildPanel();
  pk.buildTabs();
  pk.buildTabSliders();
  pk.buildTabSaveLoad();
  pk.buildTabJsonEdit();

  /**
   * Event delegation
   */
  pk.listenClick = pk.handleClick.bind(pk);
  pk.listenChange = pk.handleChange.bind(pk);
  pk.el.addEventListener('click', pk.listenClick);
  pk.el.addEventListener('change', pk.listenChange);
  /**
   * Restore value if any
   */
  pk.restore();

  /**
   * Add draggable
   */
  if (!pk.options.disableDraggable) {
    draggable({
      selector: pk.el,
      classHandle: 'handle',
      elcontainer: pk.elContainer
    });
  }
};

Pickolor.prototype.observeMutation = function() {
  var pk = this;
  var targetNode = pk.elContainer;
  var config = {childList: true, subtree: true};
  function callback(mutationsList) {
    for (var mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(autoAddBind);
        mutation.removedNodes.forEach(autoRemoveBind);
      }
    }
  }
  function autoAddBind(el) {
    if (pk._init && pk.validateBindEl(el)) {
      pk.registerBinds(el);
    }
  }
  function autoRemoveBind(el) {
    if (pk._init && pk.validateBindEl(el)) {
      pk.unregisterBindByEl(el);
    }
  }
  pk.observer = new MutationObserver(callback);
  pk.observer.observe(targetNode, config);
};

Pickolor.prototype.validateBindEl = function(el) {
  return el instanceof Element && el.dataset.pickolor_trigger === 'true';
};

Pickolor.prototype.handleClick = function(e) {
  var pk = this;
  var target = e.target;
  var action = target.dataset.action;

  if (action === 'btn-select-color') {
    var color = pk.getColorInput();
    pk.onPick(color, pk.bind);
  }
  if (action === 'btn-close') {
    pk.hide();
  }
  if (action === 'btn-set-default-palette') {
    pk.setDefault();
  }
  if (action === 'item-get-color') {
    pk.getColor(e);
  }
  if (action === 'btn-update-json') {
    pk.set(pk.elInputJson.value);
    pk.update();
  }
};

Pickolor.prototype.handleChange = function(e) {
  var pk = this;
  var action = e.target.dataset.action;

  if (action === 'input-text-color') {
    var color = pk.getColorInput();
    pk.setColorInput({
      color: color,
      updateColorOnly: true
    });
  }
  if (action === 'input-update-value-slider') {
    var id = e.target.dataset.idSlider;
    pk.updateValueSlider(id);
    pk.update();
  }
};

Pickolor.prototype.getColorInput = function() {
  var pk = this;
  var color = pk.elInputColor.value;
  return pk.getValidColor(color);
};

Pickolor.prototype.validateColor = function(color) {
  return chroma.valid(color);
};

Pickolor.prototype.getValidColor = function(color) {
  var pk = this;
  var isValid = pk.validateColor(color);
  if (!isValid) {
    color = '#fff';
  }
  return chroma(color).hex();
};

Pickolor.prototype.setColorInput = function(opt) {
  var pk = this;
  var color = pk.getValidColor(opt.color);
  var updateColorOnly = opt.updateColorOnly;
  if (!updateColorOnly) {
    pk.elInputColor.value = chroma(color).hex();
  }
  pk.elInputColor.style.backgroundColor = color;

  if (chroma.contrast(pk.options.defaultColors.bright, color) < 4.5) {
    pk.elInputColor.style.color = pk.options.defaultColors.dark;
  } else {
    pk.elInputColor.style.color = pk.options.defaultColors.bright;
  }
};

//Pickolor.prototype.toggleTabSliders = function(visible){
//var pk = this;
//var el = pk.elTabSliders;
//var dis = el.style.display;
//visible = typeof visible === 'boolean' ? visible : dis === 'none';
//el.style.display = visible ? '' : 'none';
//};

//Pickolor.prototype.toggleTabJson = function(visible){
//var pk = this;
//var el = pk.elTabInputJson;
//var dis = el.style.display;
//visible = typeof visible === 'boolean' ? visible : dis === 'none';
//el.style.display = visible ? '' : 'none';
//};

Pickolor.prototype.hide = function() {
  var pk = this;
  pk.el.style.display = 'none';
};

Pickolor.prototype.show = function() {
  var pk = this;
  pk.el.style.display = '';
};

Pickolor.prototype.destroy = function() {
  var pk = this;
  if (pk._destroyed === true) {
    return;
  }
  pk.observer.disconnect();
  pk.sliders.forEach((s) => {
    s.slider.destroy();
  });
  pk.binds.forEach((b) => {
    b.el.removeEventListener('click', b.listener);
  });
  if (pk.el) {
    pk.el.removeEventListener('click', pk.listenClick);
    pk.el.removeEventListener('change', pk.listenChange);
    pk.el.remove();
  }
  pk._destroyed = true;
};

Pickolor.prototype.getColor = function(e) {
  if (!e.target.dataset.color) {
    return;
  }

  var pk = this;
  var color = '';
  var elsItem = pk.elItems.querySelectorAll('.item input');
  elsItem.forEach((e) => {
    if (e.checked) {
      color = e.dataset.color;
    }
  });
  pk.setColorInput({
    color: color
  });
};

Pickolor.prototype.updateValueSlider = function(id) {
  var pk = this;
  pk.sliders.forEach((s) => {
    if (s.config.id === id) {
      s.config.updateValueSlider();
    }
  });
};

Pickolor.prototype.getSlidersValues = function() {
  var pk = this;
  var value, id;
  var values = {};
  pk.sliders.forEach((s) => {
    value = s.slider.get();
    id = s.config.id;
    if (s.config.type === 'numericRange') {
      value = value.map((v) => Math.round(v * 10) / 10);
      s.elMin.value = value[0];
      s.elMax.value = value[1];
    }
    if (s.config.type === 'numeric') {
      value = value * 1;
      s.elMin.value = Math.round(value * 10) / 10;
    }
    if (s.config.type === 'boolean') {
      //value = Boolean(value * 1);
      value = value * 1;
    }

    values[id] = value;
  });
  return values;
};

Pickolor.prototype.update = function() {
  var pk = this;

  if(pk.frame){
    frameTool.cancel(pk.frame);
  }
  pk.frame = frameTool.onNext(function() {
    var values = pk.getSlidersValues();
    var config = {
      diverge: values.inColDiverge,
      random: values.inColRandom,
      reverse: values.inColReverse,
      count: values.inColNumber,
      colRotation: values.inColRotation,
      colShift: values.inColShift,
      colMin: values.inColRange[0],
      colMax: values.inColRange[1],
      lumMin: values.inLumRange[0],
      lumMax: values.inLumRange[1],
      satMin: values.inSatRange[0],
      satMax: values.inSatRange[1]
    };
    var colors = getColors(config);

    var backup = {
      slidersValues: values,
      colors: colors
    };

    pk.db.setItem(pk.options.idPalette, backup);

    pk.elInputJson.value = JSON.stringify(backup, 0, 2);

    var elContainer = el('div', {class: 'items'});
    colors.forEach((c) => {
      var elItem = createItem(c);
      elContainer.appendChild(elItem);
    });

    pk.elItems.parentNode.replaceChild(elContainer, pk.elItems);
    pk.elItems = elContainer;
  });

};

Pickolor.prototype.restore = function() {
  var pk = this;
  var restored = false;
  /**
   * Set default
   */
  pk.setColorInput({
    color: pk.options.defaultColors.dark
  });

  /*
   * Check for saved data
   */
  pk.db
    .getItem(pk.options.idPalette)
    .then((data) => {
      if (data) {
        restored = true;
      }
      pk.set(data);
      pk.update();
    })
    .then(() => {
      if (!restored) {
        pk.setDefault();
      }
    });
};

Pickolor.prototype.setDefault = function() {
  var pk = this;
  pk.set(pk.options.initPalette);
  pk.update();
};

Pickolor.prototype.set = function(data) {
  var pk = this;
  data = data || {};
  data = typeof data === 'string' && isJSON(data) ? JSON.parse(data) : data;
  if (pk.validateDataInput(data)) {
    pk.sliders.forEach((s) => {
      var id = s.config.id;
      var values = data.slidersValues[id];
      if (typeof values !== 'undefined') {
        s.slider.set(values);
      }
    });
  }
};

Pickolor.prototype.validateDataInput = function(data) {
  var pk = this;
  var keys = pk.getTemplateSliders().map((s) => s.id);

  if (!data) {
    return false;
  }
  // test if it's an object
  var slidersValid =
    data instanceof Object &&
    // test if sliders values is an object
    data.slidersValues instanceof Object &&
    // test if all liders valus keys are known
    Object.keys(data.slidersValues).reduce((a, kd) => {
      return a && keys.indexOf(kd) > -1;
    }, true);

  // test if colors is an array
  var colorsValid =
    data.colors instanceof Array &&
    // test if all colors are string
    data.colors.reduce((a, c) => {
      return a && pk.validateColor(c);
    }, true);

  return slidersValid && colorsValid;
};

function createItem(color) {
  var idRadio = Math.random().toString(32);
  var elItem = el('div', {
    class: ['item']
  });
  var elLabel = el('label', {
    for: idRadio,
    style: {
      backgroundColor: color
      //borderColor: color,
    }
  });
  var elInput = el('input', {
    id: idRadio,
    type: 'radio',
    name: 'pickolor-item',
    dataset: {
      color: color,
      action: 'item-get-color'
    }
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

  for (var i = 0; i < o.count; i++) {
    c = 'hsl(' + cols[i] + ',' + sats[i] * 100 + '%,' + lums[i] * 100 + '%)';
    colors.push(chroma(c).hex());
  }
  if (o.random) {
    colors = shuffle(colors);
  }
  if (o.reverse) {
    colors.reverse();
  }
  if (o.diverge) {
    colors = diverge(colors);
  }

  return colors;

  /**
   * Distance calculation
   */

  //var cn,
  //dist,
  //distMin = 100;

  //for (var j = 0, jL = colors.length; j < jL; j++) {
  //c = colors[j];
  //cn = colors[j + 1];
  //if (cn) {
  //dist = chroma.distance(c, cn);
  //if (dist < distMin) {
  //distMin = dist;
  //}
  //}
  //}

  //console.log(distMin);

  /*return colors;*/
}

Pickolor.prototype.getTemplateSliders = function() {
  var pk = this;
  return [
    {
      title: pk.d('pk_slider_n_colors'),
      titleKey: 'pk_slider_n_colors',
      type: 'numeric',
      id: 'inColNumber',
      opt: {
        start: 15,
        step: 1,
        range: {
          min: 1,
          max: 100
        }
      }
    },
    {
      title: pk.d('pk_slider_n_hue_rotation'),
      titleKey: 'pk_slider_n_hue_rotation',
      id: 'inColRotation',
      type: 'numeric',
      opt: {
        start: 1,
        step: 0.01,
        range: {
          min: 1,
          max: 10
        }
      }
    },
    {
      title: pk.d('pk_slider_hue_shift'),
      titleKey: 'pk_slider_hue_shift',
      id: 'inColShift',
      type: 'numeric',
      opt: {
        start: 0,
        step: 1,
        range: {
          min: 0,
          max: 360
        }
      }
    },
    {
      title: pk.d('pk_slider_colors'),
      titleKey: 'pk_slider_colors',
      id: 'inColRange',
      type: 'numericRange',
      opt: {
        start: [180, 240],
        step: 1,
        connect: true,
        behaviour: 'drag',
        range: {
          min: 0,
          max: 360
        }
      }
    },
    {
      title: pk.d('pk_slider_saturation'),
      titleKey: 'pk_slider_saturation',
      id: 'inSatRange',
      type: 'numericRange',
      opt: {
        start: [0.5, 0.9],
        step: 0.01,
        connect: true,
        behaviour: 'drag',
        range: {
          min: 0,
          max: 1
        }
      }
    },
    {
      title: pk.d('pk_slider_luminosity'),
      titleKey: 'pk_slider_luminosity',
      id: 'inLumRange',
      type: 'numericRange',
      opt: {
        start: [0.5, 0.9],
        step: 0.01,
        behaviour: 'drag',
        connect: true,
        range: {
          min: 0,
          max: 1
        }
      }
    },
    {
      title: pk.d('pk_slider_randomize'),
      titleKey: 'pk_slider_randomize',
      id: 'inColRandom',
      type: 'boolean',
      opt: {
        start: 0,
        step: 1,
        range: {
          min: [0, 1],
          max: 1
        }
      }
    },
    {
      title: pk.d('pk_slider_reverse'),
      titleKey: 'pk_slider_reverse',
      id: 'inColReverse',
      type: 'boolean',
      opt: {
        start: 0,
        step: 1,
        range: {
          min: [0, 1],
          max: 1
        }
      }
    },
    {
      title: pk.d('pk_slider_diverge'),
      titleKey: 'pk_slider_diverge',
      id: 'inColDiverge',
      type: 'boolean',
      opt: {
        step: 1,
        start: 0,
        range: {
          min: [0, 1],
          max: 1
        }
      }
    }
  ];
};

/**
 * helpers
 */

function splitIn(min, max, n, r, s) {
  min = min * 1;
  max = max * 1;
  r = r || 1;
  s = s || 0;
  var out = [];
  var step = ((max - min) / n) * r;
  var value = 0;
  var up = true;
  var j = 0;
  for (var i = 0; i < n; i++) {
    if (r === 1) {
      value = s + min + step * i;
    } else {
      j = Math.floor(i % (n / r));
      up = i > 0 && j === 0 ? !up : up;
      if (up) {
        value = Math.floor(s + min + step * j);
      } else {
        value = Math.floor(s + max - step * j);
      }
    }
    out.push(value);
  }
  return out;
}

function shuffle(array) {
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
  var center = a.pop();
  var set = a.filter((v, i) => i % 2 === 0);
  var copy = set.map((v) => v);
  copy.reverse();
  set = set.concat(center);
  set = set.concat(copy);
  return set;
}

function isJSON(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

