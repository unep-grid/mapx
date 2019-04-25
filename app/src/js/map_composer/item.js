import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as h from './helpers.js';

import {el} from '@fxi/el';

import MediumEditor from 'medium-editor';
import 'medium-editor/dist/css/medium-editor.min.css';
import './style-medium-editor.css';

class Item {
  constructor(data, parent) {
    this.orig = data;
    this.type = data.type;
    this.page = parent;
    this.options = this.page.options;
    this.container = this.page.container;
    this.layout = this.options.layout.item;
    this.width = this.orig.width || this.layout.item.width;
    this.height = this.orig.height || this.layout.item.height;
    this.x = 0;
    this.y = 0;
    this.resizeAction = [];
    this.createEl();
    this.buildByType();
    this.addInteract();
    this.setSize();
    this.onResize();
  }

  buildByType() {
    let item = this;
    let type = item.type;
    if (type === 'map') {
      return this.addMapItem(item);
    }
    if (type === 'title' || type === 'text') {
      return this.addTextItem(item);
    }
    if (type === 'legend' || type === 'element') {
      return this.addElementItem(item);
    }
    console.warn('type ' + type + 'not known');
  }

  onResize() {
    this.resizeAction.forEach((a) => a());
  }
  createEl() {
    this.elContent = el('div', {
      class: 'mc-item-content'
    });
    this.el = el(
      'div',
      {
        class: ['mc-item', 'mc-item-' + this.type]
   /*     style: {*/
          //willChange: 'transform'
        /*}*/
      },
      this.elContent,
      el('div', {class: ['mc-handle', 'mc-handle-drag']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-top']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-left']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-bottom']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-right']})
    );
    this.el._mc = this;
    this.page.el.appendChild(this.el);
  }
 
  destroy(){
    if(this.map){
      this.map.remove();
      console.log('destroy map');
    }
    if(this.editor){
      this.editor.destroy();
      console.log('destroy editor');
    }
    this.el.remove();
  }
  setSize() {
    var res = this.options.layout.resolution;
    this.el.style.width = this.width * res[1] + 'px';
    this.el.style.height = this.height * res[0] + 'px';
  }

  addElementItem(item) {
    item.elContent.appendChild(item.orig.element);
    item.elContent.classList.add('mc-element');
  }

  addTextItem(item) {
    item.elContent.innerText = item.orig.text;
    item.elContent.classList.add('mc-text');
    item.editor = new MediumEditor(item.elContent, {
      elementsContainer: item.container.el
    });
  }
  addMapItem(item) {
    item.elContent.classList.add('mc-map');

    let mapOptions = Object.assign(
      {
        preserveDrawingBuffer: true,
        container: item.elContent,
        fadeDuration: 0
      },
      item.orig.options
    );

    item.map = new mapboxgl.Map(mapOptions);
    item.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
    item.map.addControl(new h.mapNorthArrow(), 'top-right');

    item.resizeAction.push(
      function() {
        item.map.resize();
      }.bind(item)
    );
    item.setScale = function(scale) {
      if (scale === 1) {
        item.elContent.style.width = 'auto';
        item.elContent.style.height = 'auto';
        item.elContent.style.transform = '';
      } else {
        var rect = item.elContent.getBoundingClientRect();
        var w = Number.parseInt(item.elContent.style.width || rect.width);
        var h = Number.parseInt(item.elContent.style.height || rect.height);
        item.elContent.style.width = w * scale + 'px';
        item.elContent.style.height = h * scale + 'px';
        item.elContent.style.transform = 'scale(' + 1 / scale + ')';
      }
      item.map.resize();
    };
  }

  addInteract() {
    h.makeInteract(this);
    h.addDraggable(this);
    h.addResizable(this);
  }
}

export {Item};
