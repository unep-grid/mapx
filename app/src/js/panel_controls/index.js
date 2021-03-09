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
  }

  destroy() {
    const cp = this;
    cp.panel.destroy();
    cp.controls.destroy();
  }

  sizeOptimizer() {
    const cp = this;
    const rectP = cp.panel.elPanelContent.getBoundingClientRect();
    const rectC = cp.controls.getInnerRect();
    const oHeight = rectC.top < rectP.top || rectC.bottom > rectP.bottom || rectP.height > rectC.height + 60 ;
    const oWidth = rectC.right > rectP.right || rectP.left < rectP.left || rectP.width > rectC.width + 60 ;
    cp.panel.setAnimate(true);
    if (oHeight) {
      cp.panel.height = rectC.height + 60;
    }
    if (oWidth) {
      cp.panel.width =  rectC.width + 60;
    }
  }
}

export {ControlsPanel};
