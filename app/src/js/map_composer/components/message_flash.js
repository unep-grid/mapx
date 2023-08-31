import { el } from "../../el/src/index.js";
import { isString } from "../../is_test/index.js";

const DEFAULT = {
  duration: 2000,
  text: "hello",
  level: "message", //"warning","error"
  force: false,
};

class MessageFlash {
  constructor(parent) {
    this.addTo(parent.el);
    this._timeout = 0;
  }

  addTo(elContainer) {
    const mf = this;
    mf._elMessage = el("div", { class: "mc-flash-message" });
    mf._elMessageContainer = el("div", { class: ["mc-flash"] }, mf._elMessage);
    elContainer.appendChild(mf._elMessageContainer);
  }

  destroy() {
    const mf = this;
    clearTimeout(mf._msgTimeout);
    mf.elMesssageContainer.remove();
  }

  flash(opt) {
    const mf = this;
    opt = Object.assign({}, DEFAULT, isString(opt) ? { text: opt } : opt);
    mf.cancel();
    mf.activate();
    mf.setMessage(opt.text);
    mf.setLevel(opt.level);
    mf._timeout = setTimeout(() => {
      mf.disable();
    }, opt.duration);
  }

  setMessage(str) {
    const mf = this;
    mf._elMessage.dataset.message = str;
  }
  setLevel(level) {
    const mf = this;
    mf._elMessage.dataset.level = level || DEFAULT.level;
  }

  cancel() {
    const mf = this;
    clearTimeout(mf._timeout);
    mf.disable();
  }

  activate() {
    const mf = this;
    mf._elMessageContainer.classList.add("active");
  }

  disable() {
    const mf = this;
    mf._elMessageContainer.classList.remove("active");
  }
}

export { MessageFlash };
