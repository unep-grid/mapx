import {ButtonPanel} from './../button_panel';
import {ButtonsControls} from './buttons_controls.js';
import {generateButtons} from './mapx_buttons.js';
import './style.less';

/**
 * MapX map controls panel
 */
const settings = {
  controls: {},
  panel: {
    elContainer: document.body,
    position: 'top-right',
    button_text: 'Controls',
    button_classes: ['fa', 'fa-cog']
  }
};

class ControlsPanel {
  constructor(opt) {
    const cp = this;
    cp.opt = Object.assign({}, opt);
    cp.sizeOptimizer = cp.sizeOptimizer.bind(cp);
    cp.init();
  }

  init() {
    const cp = this;
    const opt = cp.opt;
    Object.keys(settings).forEach((k) => {
      opt[k] = Object.assign({}, settings[k], opt[k]);
    });
    const buttons = generateButtons();
    cp.controls = new ButtonsControls(buttons);
    cp.panel = new ButtonPanel(cp.opt.panel);
    cp.panel.elPanelContent.appendChild(cp.controls.elGroup);
    cp.panel.on('resize-end', cp.sizeOptimizer);
    cp.controls.on('register', cp.sizeOptimizer);
    cp.controls.on('unregister', cp.sizeOptimizer);
  }

  destroy() {
    const cp = this;
    cp.panel.destroy();
    cp.controls.destroy();
  }

  sizeOptimizer() {
    const cp = this;
    const optTimeout = 100;
    clearTimeout(cp._timeout_optimizer);
    cp._timeout_optimizer = setTimeout(() => {
      const s = cp.getSizeState();
      let optimWidth = s.underWidth || s.overWidth;
      let optimHeight = s.underHeight || s.overHeight;
      cp.panel.setAnimate(true);

      if (optimHeight) {
        cp.panel.height = s.optimalHeight;
      }

      if (optimWidth) {
        cp.panel.height = s.optimalHeight;
      }
    }, optTimeout);
  }

  getSizeState() {
    const cp = this;
    const rectP = cp.panel.elPanelContent.getBoundingClientRect();
    const rectC = cp.controls.getInnerRect();
    let spacerWidth = rectC.stat.btnMaxWidth;
    let spacerHeight = rectC.stat.btnMaxHeight;

    return {
      grid: rectC.grid,
      btnWidth: rectC.stat.btnMaxWidth,
      btnHeight: rectC.stat.btnMaxHeight,
      controlsWidth: rectC.width,
      panelWidth: rectP.width,
      controlHeight: rectC.height,
      panelHeight: rectP.height,
      overHeight: rectC.top < rectP.top || rectC.bottom > rectP.bottom,
      overWidth: rectC.right > rectP.right || rectP.left < rectP.left,
      underWidth: rectP.width > rectC.width + spacerWidth,
      underHeight: rectP.height > rectC.height + spacerHeight,
      optimalHeight: rectC.height + spacerHeight,
      optimalWidth: rectC.width + spacerWidth
    };
  }
}

export {ControlsPanel};
