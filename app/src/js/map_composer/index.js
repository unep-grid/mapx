import * as def from './default.js';
import {Workspace} from './components/index.js';
import {Toolbar} from './components/index.js';
import {EditorToolbar} from './components/text_editor.js';
import {el} from '@fxi/el';
import {unitConvert} from './components/helpers';
import './style/map_composer.less';

class MapComposer {
  constructor(elContainer, state) {
    var mc = this;
    window.mc = mc; // for easy access in console. To remove in prod.
    mc.state = Object.assign({}, def.state, state);
    mc.initRoot(elContainer);
    mc.toolbar = new Toolbar(mc);
    mc.workspace = new Workspace(mc);
    mc.editor = new EditorToolbar(mc, {
      boxTarget: mc.workspace.page
    });
    mc.page = mc.workspace.page;
    mc.errors = [];
    mc.ready = true;
    mc.setMode(mc.state.mode);
    mc.setDpi(mc.state.dpi);
    mc.setUnit(mc.state.unit);
  }

  initRoot(elContainer) {
    var mc = this;
    if (false && elContainer.attachShadow instanceof Function) {
      /**
       * NOTE; Render map composer in shadow dom : sounds good, doesnt work
       * HTMLtoCanvas does not work well and 
       * we need to import style for building legends, fontawesome for
       * buttons, bootstrap and mapbox gl css.
       */
      elContainer.attachShadow({mode: 'open'});
      var elRoot = elContainer.shadowRoot;
      mc.el = el('div', {class: ['mc']});
      elRoot.appendChild(mc.el);
    } else {
      mc.el = elContainer;
      mc.el.classList.add('mc');
    }

    mc.elContent = el('div', {class: ['mc-content']});
    mc.el.appendChild(mc.elContent);
  }

  setBoxLastFocus(box) {
    var mc = this;
    var boxLast = mc._box_last_focus;
    if (boxLast) {
      boxLast.removeFocus();
    }
    box.addFocus();
    mc._box_last_focus = box;
  }
  get boxLastFocus() {
    return this._box_last_focus;
  }
  destroy() {
    var mc = this;
    mc.setDpi();
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
  }

  setState(id, value) {
    var mc = this;
    return {
      mode: mc.setMode.bind(mc),
      dpi: mc.setDpi.bind(mc),
      unit: mc.setUnit.bind(mc),
      page_width: mc.setPageWidth.bind(mc),
      page_height: mc.setPageHeight.bind(mc),
      content_scale: mc.setScale.bind(mc),
      legends_n_columns: mc.setLegendColumnCount.bind(mc)
    }[id](value);
  }

  setMode(mode) {
    var mc = this;
    let modes = mc.state.modes_internal;
    mc.state.mode = mode;
    modes.forEach((m) => {
      if (mode !== m) {
        mc.el.classList.remove('mc-mode-' + m);
      } else {
        mc.el.classList.add('mc-mode-' + m);
      }
    });

    if (mode === 'layout') {
      mc.editor.enable();
    } else {
      mc.editor.disable();
    }

    return Promise.all([mc.resizeEachMap()]);
  }

  updatePageSizes() {
    mc = this;
    mc.setPageHeight();
    mc.setPageWidth();
  }

  setPageWidth(w) {
    var mc = this;
    if (!mc.ready || mc.state.page_width === w) {
      return;
    }
    w = mc.state.page_width = w || mc.state.page_width;
    mc.page.setWidth(w);
  }

  setPageHeight(h) {
    var mc = this;
    if (!mc.ready || mc.state.page_height === h) {
      return;
    }
    h = mc.state.page_height = h || mc.state.page_height;
    mc.page.setHeight(h);
  }

  setUnit(unit) {
    var mc = this;
    if (!mc.ready) {
      return;
    }
    if (unit === 'px') {
      mc.setDpi();
    } else {
      mc.setDpi(mc.state.dpi);
    }
    var dpi = mc.state.dpi;
    var sizeStep = unitConvert({
      value: mc.state.grid_snap_size * mc.state.device_pixel_ratio,
      unitFrom: 'px',
      unitTo: unit,
      dpi: dpi
    });
    mc.state.page_width = unitConvert({
      value: mc.state.page_width,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi
    });
    mc.state.page_height = unitConvert({
      value: mc.state.page_height,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi
    });
    mc.toolbar.elInputPageWidth.setAttribute('step', sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute('min', sizeStep);
    mc.toolbar.elInputPageWidth.setAttribute('max', sizeStep * 1000);
    mc.toolbar.elInputPageHeight.setAttribute('step', sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute('min', sizeStep);
    mc.toolbar.elInputPageHeight.setAttribute('max', sizeStep * 1000);
    mc.state.unit = unit || mc.state.unit;
    if (unit === 'px') {
      mc.toolbar.elFormDpi.style.display = 'none';
    } else {
      mc.toolbar.elFormDpi.style.display = 'block';
    }
    mc.updatePageSizes();
    //mc.updatePageContentScale();
  }
  setDpi(dpi) {
    var mc = this;
    if (!mc.ready) {
      return;
    }

    Object.defineProperty(window, 'devicePixelRatio', {
      get: function() {
        if (dpi) {
          return dpi / 96;
        } else {
          return mc.state.device_pixel_ratio_orig;
        }
      }
    });

    mc.state.dpi = dpi || 96 * mc.state.device_pixel_ratio_orig;
    mc.toolbar.elInputDpi.value = mc.state.dpi;
    mc.state.device_pixel_ratio = window.devicePixelRatio;
    mc.updatePageSizes();
    mc.resizeEachMap();

    //mc.updatePageContentScale();
  }
  setScale(scale) {
    var mc = this;
    if (!mc.ready) {
      return;
    }
    mc.state.scale = scale || mc.state.scale;
    mc.updatePageContentScale();
  }

  updatePageContentScale() {
    mc = this;
    if (!mc.ready) {
      return;
    }
    mc.page.items.forEach((i) => {
      i.setContentScale(mc.state.scale);
    });
  }

  displayWarning(txt) {
    alert(JSON.stringify(txt));
  }

  setContentScale(scale) {
    var mc = this;
    mc._page_scale = scale;
    mc.page.setScale(scale);
  }

  setLegendColumnCount(n) {
    var mc = this;
    n = n || 1;
    mc.page.items.forEach((i) => {
      if (i.type === 'legend') {
        var elLegendBox = i.el.querySelector('.mx-legend-box');
        if (elLegendBox) {
          elLegendBox.style.columnCount = n;
        }
      }
    });
  }

  resizeEachMap() {
    var mc = this;
    var promItems = mc.page.items.map((i) => {
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
}

export {MapComposer};
