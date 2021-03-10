import {el} from '@fxi/el';
import {Button} from './button.js';
import {EventSimple} from '../listener_store/index.js';

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

  getInnerRect() {
    /**
     * Measure space taken by current
     * content. As it's flex based, only solution
     * is to put all button in a non flex container
     * and measure once. But we don't want non-flex,
     * so... measure each ?
     */
    let count = 0;
    let dim = {};
    /*
     * Flex should render a grid of buttons.
     * how to keep track of the grid shape ?
     * Use object keys.
     */
    const gridX = {};
    const gridY = {};
    const stat = {btnMaxWidth: 0, btnMaxHeight: 0};
    const btnGrp = this;
    for (let key in btnGrp._btns) {
      const btn = btnGrp._btns[key];
      //const dim = btnGrp.buttons.reduce((a, btn) => {
      const r = btn.rect;
      const mX = r.x + r.width;
      const mY = r.y + r.height;
      if (r.y && r.x) {
        gridX[Math.floor(r.x / r.width)] = true;
        gridY[Math.floor(r.y / r.height)] = true;
        count++;
        if (count === 1) {
          stat.btnMaxWidth = r.width;
          stat.btnMaxHeight = r.height;
          dim = {
            left: r.x,
            top: r.y,
            right: mX,
            bottom: mY
          };
        } else {
          if (r.width > stat.btnMaxWidth) {
            stat.btnMaxWidth = r.width;
          }
          if (r.height > stat.btnMaxHeight) {
            stat.btnMaxHeight = r.height;
          }
          if (r.y < dim.top) {
            dim.top = r.y;
          }
          if (mY > dim.bottom) {
            dim.bottom = mY;
          }
          if (r.x < dim.left) {
            dim.left = r.x;
          }
          if (mX > dim.right) {
            dim.right = mX;
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
