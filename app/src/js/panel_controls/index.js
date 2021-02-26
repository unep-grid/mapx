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
    this.opt = Object.assign({}, opt);
    this.init();
  }

  init() {
    const opt = this.opt;
    Object.keys(settings).forEach((k) => {
      opt[k] = Object.assign({}, settings[k], opt[k]);
    });
    const buttons = generateButtons();
    this.controls = new ButtonsControls(buttons);
    this.panel = new ButtonPanel(this.opt.panel);
    this.panel.elPanelContent.appendChild(this.controls.elGroup);
  }

  destroy(){
   this.panel.destroy();
   this.controls.destroy();
  }

}

export {ControlsPanel};
