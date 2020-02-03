import {Widget} from './widget.js';
import {ButtonPanel} from './../button_panel';
import {modulesLoad} from './../mx_helper_module_loader.js';
import Muuri from 'muuri';
import './style.css';

const defaults = {
  dashboard: {
    widgets: [],
    modules: ['highcharts'],
    language : 'en'
  },
  grid: {
    dragEnabled: true,
    dragSortPredicate: {
      action: 'move',
      threshold: 10
    },
    dragStartPredicate: {
      handle: '.handle'
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
    d.panel = new ButtonPanel(d.opt.panel);
    d.grid = new Muuri(d.panel.elPanelContent, d.opt.grid);
    d.panel.elPanelContent.classList.add('dashboard');
    d.panel.on('resize', () => {
      d.grid.refreshItems().layout();
    });
    d.panel.on('open', () => {
      d.show();
    });
    d.panel.on('close', () => {
      d.hide();
    });
  }

  show() {
    const d = this;
    d.panel.open();
    d.grid.show();
    console.log(d.fitPanelToWidgetsWidth());
    d.grid.refreshItems().layout();
  }

  hide() {
    const d = this;
    d.panel.close();
    d.grid.hide();
  }

  fitPanelToWidgetsWidth(){
    const d = this;
    const wmax = d.widgets.reduce((a,w)=>{
       const ww = w.width;
       return ww > a ? ww : a;
    },0);
    if(wmax > 0 && wmax > d.panel.width){  
     d.panel.width = wmax + 10 ;
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
