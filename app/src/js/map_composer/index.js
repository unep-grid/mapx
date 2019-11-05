import * as def from './default.js';
import {Workspace} from './components/index.js';
import {Toolbar} from './components/index.js';
import {EditorToolbar} from './components/text_editor.js';
import {el} from '@fxi/el';
import {unitConvert} from './components/helpers';
import './style/map_composer.less';
const getDevicePixelRatio = Object.getOwnPropertyDescriptor(
  window,
  'devicePixelRatio'
).get;

class MapComposer {
  constructor(elContainer, state, options) {
    const mc = this;
    window.mc = mc; // for easy access in console. To remove in prod.
    mc.options =  Object.assign({}, def.options, options);
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
    mc.setDpi(mc.state.dpi);
    mc.setUnit(mc.state.unit);
    mc.setMode(mc.state.mode);
  }

  initRoot(elContainer) {
    const mc = this;
    if (false && elContainer.attachShadow instanceof Function) {
      /**
       * NOTE; Render map composer in shadow dom : sounds good, doesnt work
       * HTMLtoCanvas does not work well and
       * we need to import style for building legends, fontawesome for
       * buttons, bootstrap and mapbox gl css.
       */
      elContainer.attachShadow({mode: 'open'});
      const elRoot = elContainer.shadowRoot;
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
    const mc = this;
    const boxLast = mc._box_last_focus;
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
    const mc = this;
    mc.setDpi();
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
    mc.options.onDestroy();
  }

  setState(id, value) {
    const mc = this;
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
    const mc = this;
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
    const mc = this;
    if (!mc.ready || mc.state.page_width === w) {
      return;
    }
    w = mc.state.page_width = w || mc.state.page_width;
    mc.page.setWidth(w);
  }

  setPageHeight(h) {
    const mc = this;
    if (!mc.ready || mc.state.page_height === h) {
      return;
    }
    h = mc.state.page_height = h || mc.state.page_height;
    mc.page.setHeight(h);
  }

  setUnit(unit) {
    const mc = this;
    if (!mc.ready) {
      return;
    }
    if (unit === 'px') {
      mc.setDpi();
    } else {
      mc.setDpi(mc.state.dpi);
    }
    const dpi = mc.state.dpi;
    const sizeStep = Math.ceil(unitConvert({
      value: mc.state.grid_snap_size * window.devicePixelRatio,
      unitFrom: 'px',
      unitTo: unit,
      dpi: dpi
    }));
    mc.state.page_width = Math.floor(unitConvert({
      value: mc.state.page_width,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi
    }));
    mc.state.page_height = Math.floor(unitConvert({
      value: mc.state.page_height,
      unitFrom: mc.state.unit,
      unitTo: unit,
      dpi: dpi
    }));
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
    const mc = this;
    if (!mc.ready) {
      return;
    }
    if (dpi && dpi >= 72 && dpi <= 300) {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return dpi / 96;
        }
      });
    } else {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: getDevicePixelRatio
      });
    }
    const nDpi = dpi || 96 * window.devicePixelRatio;
    const changed = mc.state.dpi !== nDpi;
    if (changed) {
      mc.state.dpi = nDpi;
      mc.toolbar.elInputDpi.value = mc.state.dpi;
      mc.updatePageSizes();
      mc.resizeEachMap();
    }
    //mc.updatePageContentScale();
  }
  setScale(scale) {
    const mc = this;
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
    const mc = this;
    mc._page_scale = scale;
    mc.page.setScale(scale);
  }

  setLegendColumnCount(n) {
    const mc = this;
    n = n || 1;
    mc.page.items.forEach((i) => {
      if (i.type === 'legend') {
        const elLegendBox = i.el.querySelector('.mx-legend-box');
        if (elLegendBox) {
          elLegendBox.style.columnCount = n;
        }
      }
    });
  }

  resizeEachMap() {
    const mc = this;
    const promItems = mc.page.items.map((i) => {
      return new Promise((resolve) => {
        if (i.map) {
          setTimeout(() => {
            /**
            * Add a timeout : the UI is not always fully rendered : the resize 
            * operate on old dimension. 
            * alternative, set an MultationObserver ...
            */
            i.map.resize();
            i.map.once('render', () => {
              resolve(true);
            });
            i.map.setBearing(i.map.getBearing());
          }, 10);
        } else {
          resolve(true);
        }
      });
    });
    return Promise.all(promItems);
  }
}

export {MapComposer};
