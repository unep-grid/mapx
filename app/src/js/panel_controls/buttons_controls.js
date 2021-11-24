import {el} from '@fxi/el';
import {Button} from './button.js';
import {EventSimple} from '../event_simple';

class ButtonsControls extends EventSimple {
  constructor(buttons) {
    super();
    const btnGrp = this;
    btnGrp._btns = {};
    btnGrp.buttons = buttons;
    btnGrp.build();
    btnGrp.register();
    return btnGrp;
  }

  build() {
    this.elGroup = el('div', {
      class: ['btn-ctrl--group']
    });
  }

  register(btns) {
    const btnGrp = this;
    if (!btns) {
      btns = btnGrp.buttons;
    }

    btns = !Array.isArray(btns) ? [btns] : btns;
    const elFrag = document.createDocumentFragment();

    for (let btn of btns) {
      if (btn instanceof Button) {
        const ok = !btnGrp.getButton(btn.opt.key);
        const ignore = btn.ignore === true;
        if (ok && !ignore) {
          btnGrp._btns[btn.opt.key] = btn;
          elFrag.appendChild(btn.elButton);
        }
        btn.on('destroy', () => {
          btnGrp.unregister(btn);
        });
      }
    }
    btnGrp.elGroup.appendChild(elFrag);
    setTimeout(() => {
      btnGrp.fire('register');
    }, 100);
  }

  unregister(btns) {
    const btnGrp = this;
    if (!btns) {
      returnM;
    }
    btns = !Array.isArray(btns) ? [btns] : btns;
    for (let btn of btns) {
      delete btnGrp._btns[btn.opt.key];
    }
    setTimeout(() => {
      btnGrp.fire('unregister');
    }, 100);
  }

  getButton(key) {
    const btnGrp = this;
    return btnGrp._btns[key];
  }

  btnApply(key, method, data) {
    /**
     * Trigger a method of the button : fire, hide, show...
     */
    const btnGrp = this;
    btnGrp.getButton(key)[method](data);
  }

  destroy() {
    const btnGrp = this;
    btnGrp.elGroup.remove();
    btnGrp.buttons.forEach((btn) => btn.destroy());
  }

  get rectGrid() {
    /**
     * Measure space taken by current
     * content. As it's flex based, only solution
     * is to put all button in a non flex container
     * and measure once. But we don't want non-flex,
     * so... measure each ?
     */
    let first = true;
    let dim = {};
    /*
     * Flex should render a grid of buttons.
     * how to keep track of the grid shape ?
     * Use object keys.
     */
    const gridX = {};
    const gridY = {};
    const stat = {itemMaxWidth: 0, itemMaxHeight: 0};
    const btnGrp = this;

    for (let key in btnGrp._btns) {
      const btn = btnGrp._btns[key];
      const r = btn.rect;
      const s = window.getComputedStyle(btn.elButton);
      const isHidden = s.display === 'none';
      if (!isHidden) {
        /**
        * Get dimensions, including margin
        */
        const mL = parseFloat(s.marginLeft);
        const mR = parseFloat(s.marginRight);
        const mT = parseFloat(s.marginTop);
        const mB = parseFloat(s.marginBottom);
        const mH = mT + mB;
        const mW = mL + mR;
        const h = r.height + mH;
        const w = r.width + mW;
        const maxX = r.x + r.width + mR;
        const maxY = r.y + r.height + mB;
        const minX = r.x - mL;
        const minY = r.y - mT;
        const cX = Math.floor(minX / w) * w;
        const cY = Math.floor(minY / h) * h;
        gridX[cX] = true;
        gridY[cY] = true;
        if (first) {
          first = false;
          stat.itemMaxWidth = w;
          stat.itemMaxHeight = h;
          dim = {
            left: minX,
            top: minY,
            right: maxX,
            bottom: maxY,
            marginTop: mT,
            marginRight: mR,
            marginLeft: mL,
            marginBottom: mB,
            marginHeight: mT + mB,
            marginWidth: mL + mR
          };
        } else {
          if (w > stat.itemMaxWidth) {
            stat.itemMaxWidth = w;
          }
          if (h > stat.itemMaxHeight) {
            stat.itemMaxHeight = h;
          }
          if (minY < dim.top) {
            dim.top = minY;
          }
          if (maxY > dim.bottom) {
            dim.bottom = maxY;
          }
          if (minX < dim.left) {
            dim.left = minX;
          }
          if (maxX > dim.right) {
            dim.right = maxX;
          }
        }
      }
    }
    dim.stat = stat;
    dim.grid = {
      nCol: Object.keys(gridX).length,
      nRow: Object.keys(gridY).length
    };
    dim.width = dim.right - dim.left;
    dim.height = dim.bottom - dim.top;
    return dim;
  }
}

export {ButtonsControls};
