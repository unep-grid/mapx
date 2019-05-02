import * as optionsDefault from './options.js';
import {Workspace} from './components/index.js';
import {Toolbar} from './components/index.js';
import {el} from '@fxi/el';
import './css/map_composer.css';

class MapComposer {
  constructor(elContainer, options) {
    var mc = this;
    window.mc = mc;
    mc.el = elContainer;
    mc.el.classList.add('mc');
    mc.elContent = el('div', {class: ['mc-content']});
    mc.el.appendChild(mc.elContent);
    mc.options = Object.assign({}, optionsDefault, options);
    mc.toolbar = new Toolbar(mc);
    mc.workspace = new Workspace(mc);
    mc.initPixelRatio();
    mc.setDpi(mc.options.print.dpi);
    mc.setMode('layout');
    mc.scale = 1;
  }

  destroy() {
    var mc = this;
    mc.setDpi();
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
  }

  setMode(mode) {
    var mc = this;
    let modes = ['layout', 'normal', 'print'];
    mc.mode = mode;
    modes.forEach((m) => {
      if (mode !== m) {
        mc.el.classList.remove('mc-mode-' + m);
      } else {
        mc.el.classList.add('mc-mode-' + m);
      }
    });

    if (mode === 'print') {
      mc.setDpi('print');
    }

    return Promise.all([
      mc.resizeEachMap()
    ]);
  }

  setScale(scale) {
    var mc = this;
    mc.scale = scale;
    mc.workspace.page.items.forEach((i) => {
      i.setContentScale(mc.scale);
    });
  }

  setLegendColumnCount(n) {
    var mc = this;
    n = n || 1;
    mc.workspace.page.items.forEach((i) => {
      if (i.type === 'legend') {
        
        var elLegendBox = i.el.querySelector('.mx-legend-box');
        if(elLegendBox){
          elLegendBox.style.columnCount = n;
        }
      }
    });
  }

  resizeEachMap() {
    var workspace = this.workspace;
    var promItems = workspace.page.items.map((i) => {
      return new Promise((resolve) => {
        if (i.map) {
          i.map.resize();
          i.map.once('render', () => {
            resolve(true);
          });
          i.map.setBearing(i.map.getBearing());
        } else {
          resolve(true);
        }
      });
    });
    return Promise.all(promItems);
  }
  
  initPixelRatio() {
    var mc = this;
    mc.pixelRatioOrig = window.devicePixelRatio;
  }

  setDpi(dpi) {
    mc = this;
    var origPixelRatio = mc.pixelRatioOrig;
    if (dpi === 'print') {
      dpi = mc.options.print.dpi;
    }
    if (dpi) {
      mc.options.print.dpi = dpi;
    }

    Object.defineProperty(window, 'devicePixelRatio', {
      get: function() {
        if (dpi) {
          return dpi / 96;
        } else {
          return origPixelRatio;
        }
      }
    });
    return mc.resizeEachMap();
  }
}

export {MapComposer};
