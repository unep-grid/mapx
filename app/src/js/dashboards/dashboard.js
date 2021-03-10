import {Widget} from './widget.js';
import {ButtonPanel} from './../button_panel';
import {modulesLoad} from './../mx_helper_module_loader.js';
import {el} from '@fxi/el';
import Muuri from 'muuri';
import './style.css';

const defaults = {
  dashboard: {
    widgets: [],
    modules: ['highcharts'],
    language: 'en',
    marginFitWidth: 20,
    marginFitHeight: 50,
    layout: 'fit'
  },
  grid: {
    dragEnabled: true,
    dragHandle: '.handle',
    dragSortPredicate: {
      action: 'move',
      threshold: 10
    },
    layout: {
      horizontal: true,
      fillGaps: true,
      alignRight: true,
      alignBottom: true,
      rounding: true
    }
  },
  panel: {
    panelFull: true,
    elContainer: document.body,
    title_text: '',
    title_lang_key: '',
    button_text: '',
    button_lang_key: 'button_dashboard_panel',
    button_classes: ['fa', 'fa-pie-chart'],
    tooltip_position: 'top-left',
    container_classes : ['button-panel--container-no-full-height'],
    position: 'bottom-right'
  }
};

class Dashboard {
  constructor(opt) {
    const d = this;
    d.opt = {};
    for (var k in defaults) {
      d.opt[k] = Object.assign({}, defaults[k], opt[k]);
    }
    d.init();
  }

  init() {
    const d = this;
    if (d._init) {
      return;
    }
    d.modules = {};
    d.widgets = [];
    d.cb = [];
    d.panel = new ButtonPanel(d.opt.panel);
    if(d.panel.isSmallHeight()){
      d.panel.height = '50vh';
    }
    d.elDashboard = el('div', {class: 'dashboard'});
    d.panel.elPanelContent.appendChild(d.elDashboard);
    d.grid = new Muuri(d.elDashboard, d.opt.grid);
    d.panel.on('resize', () => {
      d.grid.refreshItems().layout();
    });
    d.panel.on('open', () => {
      d.show();
    });
    d.panel.on('close', () => {
      d.hide();
    });
    d.fire('init');
  }

  fire(type, data) {
    const d = this;
    d.cb.forEach((c) => {
      if (c.type === type) {
        c.cb(d, data);
      }
    });
  }

  on(type, cb) {
    const d = this;
    const item = d.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (!item) {
      d.cb.push({
        type: type,
        cb: cb
      });
    }
  }
  off(type, cb) {
    const d = this;
    const item = d.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (item) {
      const pos = d.cb.indexOf(item);
      d.cb.splice(pos, 1);
    }
  }

  show() {
    const d = this;
    d.panel.open();
    d.grid.show(d.grid.getItems());
    d.setPanelInitSize();
    d.grid.refreshItems().layout();
    d._visible = true;
    d.fire('show');
  }

  isVisible() {
    const d = this;
    return d._visible === true;
  }

  hide() {
    const d = this;
    d.panel.close();
    d.grid.hide(d.grid.getItems());
    d._visible = false;
    d.fire('hide');
  }

  toggle() {
    const d = this;
    const show = !d._visible;
    if (show) {
      d.show();
    } else {
      d.hide();
    }
    d.fire('toggle');
  }

  setPanelInitSize() {
    const d = this;
    const layout = d.opt.dashboard.layout;
    switch (layout) {
      case 'fit':
        d.fitPanelToWidgets();
        break;
      case 'vertical':
        d.panel.resizeAuto('half-width');
        break;
      case 'horizontal':
        d.panel.resizeAuto('half-height');
        break;
      case 'full':
        d.panel.resizeAuto('full');
        break;
      default:
        d.fitPanelToWidgets();
    }
  }

  fitPanelToWidgets() {
    const d = this;
    d.fitPanelToWidgetsWidth();
    d.fitPanelToWidgetsHeight();
  }

  fitPanelToWidgetsWidth() {
    const d = this;
    if(d.panel.isSmallWidth()){
      return;
    }
    const m = d.opt.dashboard.marginFitWidth;
    const wmax = d.widgets.reduce((a, w) => {
      const ww = w.width;
      return ww > a ? ww : a;
    }, 0);
    if (wmax > 0 && wmax !== d.panel.width + m) {
      d.panel.width = wmax + m;
    }
  }

  fitPanelToWidgetsHeight() {
    const d = this;
    if(d.panel.isSmallHeight()){
      return;
    }
    const m = d.opt.dashboard.marginFitHeight;
    const hmax = d.widgets.reduce((a, w) => {
      const hw = w.height;
      return hw > a ? hw : a;
    }, 0);
    if (hmax > 0 && hmax !== d.panel.height + m) {
      d.panel.height = hmax + m;
    }
  }
  isDestroyed() {
    return this._destroyed;
  }

  destroy() {
    const d = this;
    if (d.isDestroyed()) {
      return;
    }
    d._destroyed = true;
    d.removeWidgets();
    d.panel.destroy();
    d.grid.destroy();
    d.fire('destroy');
  }

  removeWidgets() {
    const d = this;
    while (d.widgets.length) {
      d.widgets[d.widgets.length - 1].destroy();
      d.widgets.pop();
    }
    d.autoDestroy();
  }

  removeWidget(widget) {
    const d = this;
    const pos = d.widgets.indexOf(widget);
    if (pos > -1) {
      d.widgets[pos].destroy();
      d.widgets.splice(pos, 1);
    }
    d.autoDestroy();
  }

  autoDestroy() {
    const d = this;
    if (d.widgets.length === 0) {
      d.destroy();
    }
  }

  addWidgetsAsync(conf) {
    const d = this;
    d.opt.dashboard.modules.push(...(conf.modules || []));
    return modulesLoad(d.opt.dashboard.modules)
      .then((modules) => {
        /**
         * Store modules
         */
        d.opt.dashboard.modules.forEach((n, i) => {
          d.modules[n] = modules[i];
        });
      })
      .then(() => {
        /**
         * Build widgets
         */
        const widgets = conf.widgets.map((w) => {
          return new Widget({
            conf: w,
            grid: d.grid,
            dashboard: d,
            modules: d.modules,
            view: conf.view,
            map: conf.map
          });
        });
        d.widgets.push(...widgets);
        /**
         * Return only added widgets
         */
        return widgets;
      });
  }
}

export {Dashboard};
