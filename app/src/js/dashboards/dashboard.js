import {Widget} from './widget.js';
import {ButtonPanel} from './../button_panel';
import {modulesLoad} from './../modules_loader_async';
import {all} from './../mx_helper_misc.js';
import {el} from '@fxi/el';
import Muuri from 'muuri';
import './style.css';
import {waitFrameAsync} from '../animation_frame/index.js';
import {EventSimple} from '../event_simple';
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
    container_classes: ['button-panel--container-no-full-height'],
    position: 'bottom-right'
  }
};

class Dashboard extends EventSimple {
  constructor(opt) {
    super();
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
    d._open = false;
    d.modules = {};
    d.widgets = [];
    //d.cb = [];
    d.elDashboard = el('div', {class: 'dashboard'});

    /*
     * Panel
     */
    d.panel = new ButtonPanel(d.opt.panel);
    if (d.panel.isSmallHeight()) {
      d.panel.height = '50vh';
    }
    d.panel.elPanelContent.appendChild(d.elDashboard);
    d.panel.on('resize', () => {
      d.updateGridLayout();
    });
    d.panel.on('open', () => {
      d.show();
    });
    d.panel.on('close', () => {
      d.hide();
    });

    /**
     * If the dashboard panel is automatically resizing,
     * fit to widgets
     */
    d.panel.on('resize-auto', (type) => {
      if (type === 'half-width') {
        d.fitPanelToWidgetsWidth();
      }
      if (type === 'half-height') {
        d.fitPanelToWidgetsHeight();
      }
    });

    /*
     * Grid
     */
    d.grid = new Muuri(d.elDashboard, d.opt.grid);

    /**
     * Init event
     */

    d.fire('init');
  }

  isVisible() {
    const d = this;
    return d.panel.isVisible();
  }

  isActive() {
    const d = this;
    return d.panel.isActive();
  }

  show() {
    const d = this;
    if (d._open === false) {
      d._open = true;
      d.panel.open();
      d.grid.show(d.grid.getItems());
      d.updateGridLayout();
      d.fire('show');
    }
  }

  hide() {
    const d = this;
    if (d._open === true) {
      d._open = false;
      d.panel.close();
      d.grid.hide(d.grid.getItems());
      d.fire('hide');
    }
  }

  toggle() {
    const d = this;
    d.panel.toggle();
    d.fire('toggle');
  }

  updatePanelLayout() {
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

  updateGridLayout() {
    const d = this;
    d.grid.refreshItems().layout();
  }

  fitPanelToWidgets() {
    const d = this;
    d.fitPanelToWidgetsWidth();
    d.fitPanelToWidgetsHeight();
  }

  fitPanelToWidgetsWidth() {
    const d = this;
    if (d.panel.isSmallWidth()) {
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
    if (d.panel.isSmallHeight()) {
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
    d.clearCallbacks();  
    d.panel.destroy();
    d.grid.destroy();
    d.fire('destroy');
  }

  removeWidgets() {
    const d = this;
    while (d.widgets.length) {
      const id = d.widgets.length - 1;
      d.widgets[id].destroy();
      d.widgets.pop();
    }
    d.updateGridLayout();
  }

  removeWidget(widget) {
    const d = this;
    const pos = d.widgets.indexOf(widget);
    if (pos > -1) {
      d.widgets[pos].destroy();
      d.widgets.splice(pos, 1);
    }
    d.updateGridLayout();
  }

  allWidgetsDisabled() {
    const d = this;
    const disabled = [];
    for (const w of d.widgets) {
      disabled.push(w.isDisabled());
    }
    return all(disabled);
  }

  autoDestroy() {
    const d = this;
    const allDisabled = d.allWidgetsDisabled();
    const destroy = d.widgets.length === 0 || allDisabled;
    if (destroy) {
      d.destroy();
    }
  }

  async addWidgetsAsync(conf) {
    const d = this;
    const widgets = [];
    d.opt.dashboard.modules.push(...(conf.modules || []));
    const modules = await modulesLoad(d.opt.dashboard.modules);
    /**
     * Store modules
     */
    d.opt.dashboard.modules.forEach((n, i) => {
      d.modules[n] = modules[i];
    });
    /**
     * Build widgets
     */
    for (const cw of conf.widgets) {
      if (!cw.disabled) {
        const widget = new Widget({
          conf: cw,
          grid: d.grid,
          dashboard: d,
          modules: d.modules,
          view: conf.view,
          map: conf.map
        });
        d.widgets.push(widget);
        widget._id = conf.view.id;
        widgets.push(widget);
      }
    }

    /**
     * Layout update
     */
    await waitFrameAsync();
    d.updatePanelLayout();
    d.updateGridLayout();

    /**
     * Return only added widgets
     */
    return widgets;
  }

  shakeButton(opt) {
    const d = this;
    d.panel.shakeButton(opt);
  }
}

export {Dashboard};
