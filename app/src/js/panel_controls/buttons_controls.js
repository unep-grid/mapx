import { el } from "./../el/src/index.js";
import { Button } from "./button.js";
import { EventSimple } from "../event_simple";
import { isArray, isEmpty } from "../is_test/index.js";

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
    this.elGroup = el("div", {
      class: ["btn-ctrl--group"],
    });
  }

  // Button registration method
  register(btns) {
    const elFrag = document.createDocumentFragment();
    const registered = [];

    if (!btns) {
      // use default buttons
      btns = this.buttons;
    }

    // Early validation and normalization
    if (isEmpty(btns)) {
      return false;
    }
    btns = isArray(btns) ? btns : [btns];

    if (isEmpty(btns)) {
      return false;
    }

    for (const btn of btns) {
      if (!(btn instanceof Button)) {
        console.warn("Skipping invalid button object:", btn);
        continue;
      }

      const buttonExists = this.getButton(btn.opt.key);
      if (buttonExists || btn.ignore === true) {
        continue;
      }

      this._btns[btn.opt.key] = btn;
      elFrag.appendChild(btn.elButton);
      registered.push(btn);

      btn.on("destroy", () => this.unregister(btn));
    }

    // Skip DOM operations if no valid buttons
    if (isEmpty(registered)) {
      return false;
    }

    this.elGroup.appendChild(elFrag);
    this.fire("register", registered);
    return registered;
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
    btnGrp.fire("unregister");
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

export { ButtonsControls };
