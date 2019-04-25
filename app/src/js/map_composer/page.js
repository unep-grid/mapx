import {el} from '@fxi/el';
import {Item} from './item.js';
import * as h from './helpers.js';

class Page {
  constructor(options, parent) {
    this.options = options;
    this.container = parent;
    this.layout = this.options.layout.page;
    this.width = this.layout.width;
    this.height = this.layout.height;
    this.scale = 1;

    this.createEl();
    this.setSize();
    this.addInteract();
    this.addToContainer();
    this.addItems();
    this.placeItems();
  }

  destroy() {
   this.items.forEach((i) => {
     i.destroy(); 
    });
   this.el.remove();
  }

  addItems() {
    this.items = this.options.items.map((i) => {
      return new Item(i, this);
    });
  }
  setSize() {
    var res = this.options.layout.resolution;
    this.el.style.width = this.width * res[1] + 'px';
    this.el.style.height = this.height * res[0] + 'px';
  }
  onResize() {
    var s = this.calcRect();
    var w = Math.round(s.width);
    var h = Math.round(s.height);
    var r = window.devicePixelRatio;
    this.container.showMessageFlash(w * r + ' x' + h * r + '');
  }

  setScale(n) {
    console.warn('scaling does not work');
    if (false) {
      this.scale = n;
      this.items.forEach((i) => {
        if (i.setScale) {
          i.setScale(n);
        }
      });
      this.container.el.style.transform = 'scale(' + (n || 1) + ')';
    }
  }

  resetScale() {
    this.setScale(1);
  }

  addInteract() {
    h.makeInteract(this);
    h.addResizable(this);
  }
  createEl() {
    this.el = el(
      'div',
      {
        class: ['mc-page'],
        style: {
          width: this.width + 'px',
          height: this.height + 'px'
        }
      },
      el('div', {class: ['mc-handle', 'mc-handle-resize-top']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-left']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-bottom']}),
      el('div', {class: ['mc-handle', 'mc-handle-resize-right']})
    );
    this.el._mc = this;
  }
  addToContainer() {
    this.container.el.appendChild(this.el);
  }

  placeItems() {
    let y = 0;
    this.items.forEach((i) => {
      var res = this.options.layout.resolution;
      var v = y * res[1] + 'px';
      i.el.style.top = v;
      y += i.height;
    });
  }

  calcRect() {
    return this.el.getBoundingClientRect();
  }
}

export {Page};
