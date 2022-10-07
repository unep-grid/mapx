import { el } from "../../el/src/index.js";
import { onNextFrame } from "../../animation_frame/index.js";

let settings = {
  onDestroy: () => {},
  onSetState: () => {},
  id: Math.random().toString(32),
  type: "",
  label: "label",
  tooltip_key: null,
  tooltip_text: null,
  count: 0,
  animate: true,
  animateType: "seq_counter", // or 'class'
};

class Checkbox {
  constructor(opt) {
    const cbx = this;
    cbx.opt = Object.assign({}, settings, opt);
    cbx.id = opt.id;
    /*
     * NOTE: why copying stuff here ?
     */

    cbx._label = opt.label;
    cbx._label_key = opt.label_key;
    cbx._tooltip_text = opt.tooltip_text;
    cbx._tooltip_key = opt.tooltip_key;
    cbx._order = opt.order;
    cbx._type = opt.type;
    cbx._is_animating = false;
    cbx._destroyed = false;
    cbx._count = opt.count;
    cbx._is_enabled = true;
    cbx._count_displayed = 0;
    cbx.build();
  }

  destroy() {
    const cbx = this;
    if (cbx._destroyed || !cbx.el.parentElement) {
      return;
    }
    cbx.el.parentElement.removeChild(cbx.el);
    cbx.opt.onDestroy.bind(cbx)();
    cbx._destroyed = true;
  }

  getCountDisplayed() {
    return this._count_displayed * 1 || 0;
  }

  getCount() {
    return this._count * 1 || 0;
  }

  setOrder(i) {
    this._order = i || 0;
    this.el.style.order = this._order;
  }

  setCount(n) {
    const cbx = this;
    const nD = cbx.getCountDisplayed();

    cbx._count = n || 0;
    cbx.enable(n > 0);
    if (n === nD) {
      return;
    }
    const animate = cbx.opt.animate;
    const animating = cbx._isAnimating();

    if (animating || !animate) {
      cbx._setCountLabel(n);
    } else {
      cbx._animateCountUpdate(n);
    }
  }

  isEnabled() {
    return this._is_enabled === true;
  }

  enable(enable) {
    const cbx = this;
    const enabled = cbx.isEnabled();
    enable = enable !== false;
    //const skipEnable = enable && enabled;
    //const skipDisable = !enable && !enabled;
    if (enable) {
      this.elCheck.classList.remove("disabled");
      this.elCheck.removeAttribute("disabled");
    } else {
      this.elCheck.classList.add("disabled");
      this.elCheck.setAttribute("disabled", true);
    }
    cbx._is_enabled = enabled;
  }

  _setCountLabel(n) {
    const cbx = this;
    cbx._count_displayed = n;
    cbx.elLabelCount.dataset.count = n;
  }

  _animateCountUpdate() {
    const cbx = this;
    const animSeqCounter = cbx.opt.animateType === "seq_counter";
    if (animSeqCounter) {
      cbx._animateCountProg();
    } else {
      cbx._animateCountClass();
    }
  }
  _isAnimating() {
    return this._is_animating;
  }
  _setAnimating(enable) {
    const cbx = this;
    enable = enable || false;
    cbx._is_animating = enable;
  }

  _animateCountClass() {
    const cbx = this;
    cbx._setAnimating(true);
    cbx.elLabelCount.classList.add("updating");
    setTimeout(() => {
      onNextFrame(() => {
        const count = cbx.getCount();
        cbx._setCountLabel(count);
        cbx._setAnimating(false);
        cbx.elLabelCount.classList.remove("updating");
      });
    }, 500);
  }

  _animateCountProg() {
    const cbx = this;
    let c = 0;
    let inc = 1;
    let delta = 0;
    let count = 0;
    init();
    next();
    function next() {
      delta = d();
      count = cbx.getCount();
      if (delta !== 0) {
        cbx._setAnimating(true);
        inc = Math.ceil(Math.abs(delta) / 10);
        if (up()) {
          c += inc;
          c = c > count ? count : c;
        } else {
          c -= inc;
          c = c < 0 ? 0 : c;
        }
        cbx._setCountLabel(Math.ceil(c));
        onNextFrame(next);
      } else {
        cbx._setAnimating(false);
      }
    }
    function d() {
      return cbx.getCount() - cbx.getCountDisplayed();
    }
    function up() {
      return d() > 0;
    }
    function init() {
      c = cbx.getCountDisplayed();
    }
  }
  setLabel(txt) {
    const cbx = this;
    const curTxt = cbx.elLabelText.innerText;

    if (!txt) {
      txt = curTxt;
    }

    if (txt && txt !== curTxt) {
      cbx._label = txt;
      cbx.elLabelText.innerText = txt;
    }
  }
  setLabelKey(key) {
    const cbx = this;
    cbx._label_key = key;
    cbx.elLabelText.dataset.lang_key = cbx._label_key;
  }
  getLabelKey() {
    return this._label_key || "";
  }
  getLabel() {
    if (!this._label) {
      this.setLabel();
    }
    return this._label;
  }
  getType() {
    return this._type;
  }
  getId() {
    return this.id;
  }
  setType(type) {
    this._type = type;
    this.elLabelText.innerText = txt;
  }

  setState(val) {
    this.elCheck.checked = val === true;
    this.opt.onSetState(this);
  }

  getState() {
    return this.elCheck.checked === true;
  }

  build() {
    this.buildCheckbox();
  }

  buildCheckbox() {
    const cbx = this;
    let elLabel;
    let elLabelText;
    let elLabelCount;
    let elCheck;

    const elCheckbox = el(
      "div",
      {
        class: "vf-checkbox",
        style: {
          order: cbx._order,
        },
      },
      (elCheck = el("input", {
        id: "checkbox_" + cbx.id,
        class: ["filter", "vf-checkbox-input"],
        dataset: {
          filter: cbx.id,
          type: cbx._type,
        },
        type: "checkbox",
      })),
      (elLabel = el(
        "label",
        {
          class: ["vf-checkbox-label", "hint--bottom-right"],
          for: "checkbox_" + cbx.id,
          dataset: {
            lang_key: cbx._tooltip_key,
            lang_type: "tooltip",
          },
        },
        (elLabelText = el(
          "span",
          {
            class: "vf-checkbox-filter-text",
            dataset: {
              lang_key: cbx._label_key,
            },
          },
          cbx._label
        )),
        (elLabelCount = el("span", {
          class: "vf-checkbox-filter-count",
        }))
      ))
    );

    cbx.el = elCheckbox;
    cbx.el.checkbox = cbx;
    cbx.elLabelText = elLabelText;
    cbx.elLabelCount = elLabelCount;
    cbx.elCheck = elCheck;

    cbx.setCount(cbx._count);

    // tooltip text
    if (cbx._tooltip_text instanceof Promise) {
      cbx._tooltip_text.then((t) => {
        elLabel.setAttribute("aria-label", t);
      });
    }
  }
}

export { Checkbox };
