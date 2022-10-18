import { EventSimple } from "./../event_simple";
import { el } from "./../el/src/index.js";
import { bindAll } from "./../bind_class_methods";
import "./style.less";

const config = {
  position: "top",
  elAnchor: null,
  width: null,
  height: null,
  minWidth: 100,
  minHeight: 100,
  content: null,
  classHidden: "popup--hidden",
};

export class Popup extends EventSimple {
  constructor(opt) {
    super();
    const p = this;
    p._opt = Object.assign({}, config, opt);
    bindAll(p);
    p.init();
  }

  init() {
    const p = this;
    p.build();
    p.hide();
    p.fire("init");
  }

  build() {
    const p = this;
    p._el_popup = el("div", { class: "popup", on: ["click", p.hide] });
    p._el_box = el("div", { class: "popup--box" }, p._opt.content);
    p._el_popup.appendChild(p._el_box);
    document.body.appendChild(p._el_popup);
    p.fire("built");
  }

  get visible() {
    const p = this;
    return !p?._el_popup?.classList?.contains(p._opt.classHidden);
  }

  show() {
    const p = this;
    p._el_popup.classList.remove(p._opt.classHidden);
    p.updatePosition();
  }

  hide() {
    const p = this;
    p._el_popup.classList.add(p._opt.classHidden);
  }

  toggle() {
    const p = this;
    p.visible ? p.hide() : p.show();
  }

  updatePosition() {
    const p = this;
    const rectA = p._opt.elAnchor.getBoundingClientRect();
    const rectB = p._el_box.getBoundingClientRect();
    switch (p._opt.position) {
      case "top":
        p._el_box.style.top = `${rectA.top - rectB.height}px`;
        p._el_box.style.left = `${rectA.left}px`;
        break;
      default:
        p._el_box.style.top = `${rectA.bottom}px`;
        p._el_box.style.left = `${rectA.left}px`;
    }

    if (p._opt.width) {
      p._el_box.style.width = `${p._opt.width}px`;
    } else {
      p._el_box.style.width = `${rectA.width}`;
    }

    if (p._opt.height) {
      p._el_box.style.height = `${p._opt.height}px`;
    }
  }

  destroy() {
    const p = this;
    p._el_popup.remove();
    p.fire("destroyed");
  }
}
