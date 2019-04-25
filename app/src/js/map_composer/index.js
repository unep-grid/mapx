import {el} from '@fxi/el';
import {Toolbar} from './toolbar.js';
import {Page} from './page.js';
import './style.css';
import * as optionsDefault from './options.js';


class MapComposer {
  constructor(elContainer, options) {
    elContainer.classList.add('mc');
    this.options = Object.assign({},optionsDefault, options);
    this.el = elContainer;
    this.page = new Page(this.options, this);
    this.toobar = new Toolbar(this.options, this);
    this.addElMessage();
    this.addElPreview();
    this.pixelRatioOrig = window.devicePixelRatio;
    this.setMode('layout');
  }

  destroy(){
    this.setDpi();
    this.page.destroy();
    this.el.remove();
  }
  setMode(mode) {
    var mc =  this;
    let modes = ['layout', 'normal', 'print'];
    mc.mode = mode;
    modes.forEach((m) => {
      if (mode !== m) {
        mc.el.classList.remove('mc-mode-' + m);
      } else {
        mc.el.classList.add('mc-mode-' + m);
      }

      if (mode === 'print') {
        mc.setDpi(mc.options.print.dpi);
      } else {
        mc.setDpi();
      }

    });
    return mc.resizeEachMap();
  }

  resizeEachMap() {
    var promItems = this.page.items.map((i) => {
      return new Promise((resolve) => {
        if (i.map) {
          i.map.resize();
          i.map.once('render',()=>{
            console.log('resize done');
            resolve(true);
          });
          i.map.setBearing(i.map.getBearing());
        }else{
          resolve(true);
        }
      });
    });
    return Promise.all(promItems);
  }

  setDpi(dpi) {
    var origPixelRatio = this.pixelRatioOrig;
    Object.defineProperty(window, 'devicePixelRatio', {
      get: function() {
        if(dpi){
          return dpi / 96;
        }else{
          return origPixelRatio;
        }
      }
    });
  }

  calcRect() {
    return this.el.getBoundingClientRect();
  }

  get resOffset() {
    var res = this.options.layout.resolution;
    var rect = this.calcRect();
    return {
      x: rect.x - Math.round(rect.x / res[0]) * res[0],
      y: rect.y - Math.round(rect.y / res[1]) * res[1]
    };
  }

  addElMessage() {
    var elContainer = el(
      'div',
      {class: ['mc-flash']},
      (this.elMessage = el('div'))
    );
    this.el.appendChild(elContainer);
  }

  updatePreview(canvas) {
    this.elPreview.innerHTML = '';
    this.elPreview.appendChild(canvas);
  }

  addElPreview() {
    this.elPreview = el('div');
    this.el.parentElement.appendChild(this.elPreview);
  }

  showMessageFlash(str, duration) {
    var mc = this;
    duration = duration || 500;
    str = str || '';
    this.elMessage.innerText = str;
    this.elMessage.parentElement.classList.add('active');

    clearTimeout(this._msgTimeout);

    this._msgTimeout = setTimeout(function() {
      mc.elMessage.parentElement.classList.remove('active');
    }, duration);
  }
}

export {MapComposer};
