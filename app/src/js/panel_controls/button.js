import { el } from "../el/src/index.js";
import { getDictItem } from "./../mx_helpers.js";
import { FlashCircle } from "./../icon_flash/index.js";
import { bindAll } from "./../bind_class_methods/index.js";
import { EventSimple } from "../event_simple";
import { shake } from "../elshake/index.js";
import { isFunction } from "../is_test/index.js";

class Button extends EventSimple {
  constructor(opt) {
    super();
    const btn = this;
    const def = {
      action: () => {},
      onInit: null,
      classesButton: [],
      classesIcon: [],
      key: null,
      display: true,
      disabled: false,
    };
    bindAll(btn);
    btn.opt = Object.assign({}, def, opt);
    btn.init();
    btn.build();
  }

  init() {
    const btn = this;
    btn.setAction(btn.opt.action);
    if (isFunction(btn.opt.onInit)) {
      btn.opt.onInit(btn);
    }
  }

  setAction(action) {
    const btn = this;
    action = isFunction(action) ? action : () => {};
    btn.opt.action = action.bind(btn);
  }

  get rect() {
    const btn = this;
    if (!btn.elButton) {
      return {};
    }
    return btn.elButton.getBoundingClientRect();
  }

  build() {
    const btn = this;
    const opt = btn.opt;

    if (opt.disabled) {
      btn.action = () => {
        console.log("disabled");
      };
      opt.classesButton.push("disabled-with-events");
    }

    /**
     * Build button ui.
     */
    btn.elButton = el(
      "button",
      {
        on: { click: btn.action },
        class: [
          "btn-ctrl--item",
          "btn",
          "btn-circle",
          "btn-circle-medium",
          "hint--left",
          "shadow",
          ...opt.classesButton,
        ],
        dataset: {
          lang_key: opt.key,
          lang_type: "tooltip",
        },
        "aria-label": getDictItem(opt.key),
      },
      el("i", {
        class: opt.classesIcon,
      })
    );
    if (opt.display === false) {
      btn.hide();
    }
    /**
     * Initial tooltip text.
     * NOTE: el can ingest promises as children.
     */
    getDictItem(btn.opt.key).then((txt) =>
      btn.elButton.setAttribute("aria-label", txt)
    );
  }

  shake(type) {
    shake(this.elButton, {
      type: type,
    });
  }

  action(event) {
    const btn = this;
    if (btn.isLocked()) {
      btn.shake();
      return null;
    }
    btn.flash(event);
    return btn.opt.action(event);
  }

  flash(event) {
    if (event instanceof Event) {
      new FlashCircle({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }

  isActive() {
    return this.elButton.classList.contains("active");
  }

  activate(value) {
    if (value) {
      this.enable();
    } else {
      this.disable();
    }
  }

  enable() {
    if (this.isLocked()) {
      return;
    }
    return this.elButton.classList.add("active");
  }

  disable() {
    if (this.isLocked()) {
      return;
    }
    return this.elButton.classList.remove("active");
  }

  toggle() {
    if (this.isLocked()) {
      return;
    }
    if (this.isActive()) {
      this.disable();
    } else {
      this.enable();
    }
  }

  lock() {
    this.elButton.classList.add("locked");
  }

  unlock() {
    this.elButton.classList.remove("locked");
  }

  isLocked() {
    return this.elButton.classList.contains("locked");
  }

  show() {
    this.elButton.style.display = "flex";
    this.fire("show");
  }

  hide() {
    this.elButton.style.display = "none";
    this.fire("hide");
  }

  destroy() {
    this.elButton.remove();
    this.fire("destroy");
  }
  isSmall() {
    return this.isSmallHeight() || this.isSmallWidth();
  }
  isSmallHeight() {
    return window.innerHeight < 800;
  }
  isSmallWidth() {
    return window.innerWidth < 800;
  }
}

export { Button };
