import { el } from "../el/src/index.js";
import { getDictItem } from "./../mx_helpers.js";
import { FlashCircle } from "./../icon_flash/index.js";
import { bindAll } from "./../bind_class_methods/index.js";
import { EventSimple } from "../event_simple";
import { shake } from "../elshake/index.js";

class Button extends EventSimple {
  constructor(opt) {
    super();
    const btn = this;
    const def = {
      action: () => {},
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
    const hasFun = btn.opt.action instanceof Function;
    if (!hasFun) {
      btn.opt.action = () => {};
    }
    btn.opt.action = btn.opt.action.bind(btn);
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

  enable() {
    return this.elButton.classList.add("active");
  }

  disable() {
    return this.elButton.classList.remove("active");
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
