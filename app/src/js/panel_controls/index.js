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
    button_classes: ['fa', 'fa-cog'],
    animateDurationMs: 300
  }
};

class ControlsPanel {
  constructor(opt) {
    const cp = this;
    cp.opt = Object.assign({}, opt);
    cp.sizeOptimizer = cp.sizeOptimizer.bind(cp);
    cp.sizeOptimizerHandler = cp.sizeOptimizerHandler.bind(cp);
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
    window.addEventListener('resize', cp.sizeOptimizer);
  }

  destroy() {
    const cp = this;
    cp.panel.destroy();
    cp.controls.destroy();
    window.removeEventListener('resize', cp.sizeOptimizer);
  }

  /*resetPanelSize(){*/
  /*const cp = this;*/
  /*cp.panel.resetSize();*/
  /*}*/

  sizeOptimizer() {
    const cp = this;
    const optTimeout = 250;
    clearTimeout(cp._timeout_optimizer);
    cp._optimizer_n = 0;
    cp._timeout_optimizer = setTimeout(cp.sizeOptimizerHandler, optTimeout);
  }

  sizeOptimizerHandler() {
    const cp = this;
    const n = cp._optimizer_n;
    const debug = true;
    if (n > 2) {
      if (debug) {
        console.warn(`Panel optimization failed after ${n} attempts, reset`);
      }
      cp._optimizer_n = 0;
      cp.panel.resetSize();
      return;
    }
    cp.panel.setAnimate(true);
    cp._optimizer_n++;

    const rectP = cp.panel.rectContent;
    const rectC = cp.controls.rectGrid;
    const maxHeight = cp.panel.rectParent.height;
    const maxWidth = cp.panel.rectParent.width;

    const itemWidth = rectC.stat.itemMaxWidth;
    const itemHeight = rectC.stat.itemMaxHeight;
    const animTimeout = cp.panel.getAnimateDuration();

    /**
     * NOTE: rectGrid includes dim with margin:
     * ---
     * itemWidth * rectC.grid.nCol
     * 392
     * rectC.width
     * 392
     * ---
     */

    /**
     * Small mode, always reset first :
     * There is no handles and the container can't be manually resized.
     * Hoever, the window could have been resized in sdk/responsive mode:
     * Reseting make sure to start from a known state.
     */
    if (cp.panel.isSmall() && cp._optimizer_n === 1) {
      cp.panel.resetSize();
      setTimeout(cp.sizeOptimizerHandler, animTimeout);
      return;
    }
    /**
     * Height to small
     */
    if (rectC.height > rectP.height) {
      const dH = rectC.height - rectP.height;
      const newHeight = Math.ceil((rectP.height + dH) / 10) * 10; // panel will use rounding;
      if (newHeight <= maxHeight) {
        cp.panel.height = newHeight;
      } else {
        /**
         * Add columns
         */
        const nByColMax = Math.floor(rectP.height / itemHeight);
        const nOverflow = Math.ceil(dH / itemHeight) * rectC.grid.nCol;
        const nNewCol = Math.ceil(nOverflow / nByColMax);
        const newWidth = cp.panel.width + nNewCol * itemWidth;
        cp.panel.width = newWidth;
      }
      setTimeout(cp.sizeOptimizerHandler, animTimeout);
      return;
    }

    /**
     * Width to small
     */
    if (rectC.width > rectP.width) {
      const dW = rectC.width - rectP.width;
      const newWidth = Math.ceil((rectP.width + dW) / 10) * 10; // panel will use rounding;
      if (newWidth <= maxWidth) {
        cp.panel.width = newWidth;
      } else {
        /**
         * lines
         */
        const nByLineMax = Math.floor(rectP.width / itemWidth);
        const nOverflow = Math.ceil(dW / itemWidth) * rectC.grid.nLine;
        const nNewLine = Math.ceil(nOverflow / nByLineMax);
        const newHeight = cp.panel.height + nNewLine * itemHeigt;
        cp.panel.height = newHeight;
      }
      setTimeout(cp.sizeOptimizerHandler, animTimeout);
      return;
    }

    /**
     * If no small mode, remove space if needed
     */
    if (!cp.panel.isSmall()) {
      if (rectC.width < rectP.width) {
        cp.panel.width = rectC.width;
      }
      if (rectC.height < rectP.height) {
        cp.panel.height = rectC.height;
      }
    }
  }
}

export {ControlsPanel};
