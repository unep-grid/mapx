import {el} from '@fxi/el';
import {Button} from './button.js';

class ButtonsControls {
  constructor(buttons) {
    this._btns = {};
    this.buttons = buttons;
    this.build();
    this.register();
    return this;
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
  }

  unregister(btns) {
    const btnGrp = this;
    if (!btns) {
      returnM;
    }
    btns = !Array.isArray(btns) ? [btns] : btns;
    for (let btn of btns) {
      btnGrp._btns[btn.opt.key] = null;
    }
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
}

export {ButtonsControls};
