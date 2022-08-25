import { el } from "../../el/src/index.js";
import { debounce } from "./helpers.js";

class MessageFlash {
  constructor(parent) {
    this.addTo(parent.el);
    this.timeout = 0;
    this.flash = debounce(this._flash, 50);
  }

  addTo(elContainer) {
    const mf = this;

    mf.elMessageContainer = el(
      "div",
      { class: ["mc-flash"] },
      (mf.elMessage = el("div", { class: "mc-flash-message" }))
    );
    elContainer.appendChild(mf.elMessageContainer);
  }

  destroy() {
    const mf = this;
    clearTimeout(mf._msgTimeout);
    mf.elMesssageContainer.remove();
  }

  _flash(str, duration) {
    const mf = this;
    duration = duration || 2000;
    str = str || "";
    mf.cancel();
    mf.activate();
    mf.setMessage(str);
    mf.timeout = setTimeout(() => {
      mf.disable();
    }, duration);
  }

  setMessage(str) {
    const mf = this;
    mf.elMessage.dataset.message = str;
  }

  cancel() {
    const mf = this;
    clearTimeout(mf.timeout);
    mf.disable();
  }

  activate() {
    const mf = this;
    mf.elMessageContainer.classList.add("active");
  }

  disable() {
    const mf = this;
    mf.elMessageContainer.classList.remove("active");
  }
}

export { MessageFlash };
