import * as def from './default.js';
import {Workspace} from './components/index.js';
import {Toolbar} from './components/index.js';
import html2canvas from 'html2canvas';
import download from 'downloadjs';
import {el} from '@fxi/el';
import './css/map_composer.css';

class MapComposer {
  constructor(elContainer, state) {
    var mc = this;
    window.mc = mc;
    mc.el = elContainer;
    mc.el.classList.add('mc');
    mc.elContent = el('div', {class: ['mc-content']});
    mc.el.appendChild(mc.elContent);
    mc.state = Object.assign({}, def.state, state);
    mc.toolbar = new Toolbar(mc);
    mc.workspace = new Workspace(mc);
    mc.setMode(mc.state.mode);
    mc.errors = [];
  }

  destroy() {
    var mc = this;
    //mc.setDpi();
    mc.workspace.destroy();
    mc.toolbar.destroy();
    mc.el.remove();
  }

  setMode(mode) {
    var mc = this;
    let modes = ['layout', 'normal', 'print'];
    mc.state.mode = mode;
    modes.forEach((m) => {
      if (mode !== m) {
        mc.el.classList.remove('mc-mode-' + m);
      } else {
        mc.el.classList.add('mc-mode-' + m);
      }
    });

    return Promise.all([mc.resizeEachMap()]);
  }

  setPageWidth(w) {
    var page = this.workspace.page;
    w = w || mc.state.page_width;
    mc.state.page_width = w;
    page.setWidth(w);
    mc.state.page_width = w;
  }
  setPageHeight(h) {
    var page = this.workspace.page;
    h = h || mc.state.page_height ;
    page.setHeight(h);
    console.log(h);
    mc.state.page_height = h;
  }
  setUnit(unit) {
    var mc = this;
    mc.state.unit = unit || mc.state.unit;
    mc.updatePageSizes();
    mc.updatePageContentScale();
  }
  setDpi(dpi) {
    mc = this;
    mc.state.dpi = dpi || mc.state.dpi;
    mc.updatePageSizes();
    mc.updateContentScale();
  }
  setScale(scale) {
    var mc = this;
    mc.state.scale = scale || mc.state.scale;
    mc.updatePageContentScale();
  }

  updatePageContentScale() {
    mc = this;
    mc.workspace.page.items.forEach((i) => {
      i.setContentScale(mc.state.scale);
    });
  }

  updatePageSizes(){
    mc = this;
    mc.setPageHeight();
    mc.setPageWidth();
  }

  setState(id, value) {
    var mc = this;
    return {
      mode_preview: mc.toggleModePreview.bind(mc),
      dpi: mc.setDpi.bind(mc),
      unit: mc.setUnit.bind(mc),
      page_width: mc.setPageWidth.bind(mc),
      page_height: mc.setPageHeight.bind(mc),
      content_scale: mc.setScale.bind(mc),
      legends_n_columns: mc.setLegendColumnCount.bind(mc)
    }[id](value);
  }

  handleAction(idAction) {
    var mc = this;
    if (idAction === 'export_page') {
      mc.exportPage();
    }
  }

  toggleModePreview(enable) {
    if (enable) {
      mc.setMode('normal');
    } else {
      mc.setMode('layout');
    }
  }

  exportPage() {
    var mc = this;
    var workspace = mc.workspace;
    var page = workspace.page;
    var elPrint = page.el;
    var curMode = mc.state.mode;

    mc.setMode('print')
      .then(() => {
        return html2canvas(elPrint);
      })
      .then((canvas) => {
        var data = canvas.toDataURL('image/png');
        download(data, 'map-composer-export.png', 'image/png');
        mc.setMode(curMode);
      })
      .catch((e) => {
        mc.displayWarning(
          'Oups, something went wrong during the rendering, please read the console log.'
        );
        console.warn(e);
        mc.setMode(curMode);
      });
  }

  displayWarning(txt) {
    alert(JSON.stringify(txt));
  }

  setContentScale(scale) {
    var mc = this;
    mc._page_scale = scale;
    mc.workspace.page.setScale(scale);
  }

  setLegendColumnCount(n) {
    var mc = this;
    n = n || 1;
    mc.workspace.page.items.forEach((i) => {
      if (i.type === 'legend') {
        var elLegendBox = i.el.querySelector('.mx-legend-box');
        if (elLegendBox) {
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

  //initPixelRatio() {
  //var mc = this;
  //mc.pixelRatioOrig = window.devicePixelRatio;
  /*}*/

  //Object.defineProperty(window, 'devicePixelRatio', {
  //get: function() {
  //if (dpi) {
  //return dpi / 96;
  //} else {
  //return origPixelRatio;
  //}
  //}
  //});
  //return mc.resizeEachMap();
  //}
}

export {MapComposer};
