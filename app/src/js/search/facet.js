import { isBoolean } from "./../is_test/index.js";

import { el, elSpanTranslate } from "../el_mapx/index.js";

export class Facet {
  constructor(opt) {
    const fc = this;
    fc._opt = Object.assign(
      {},
      {
        count: 0,
        label: null,
        id: null,
        group: null,
        checked: false,
        order: 0,
        enable: true,
      },
      opt,
    );
    fc.init();
  }
  init() {
    const fc = this;
    if (fc._init) {
      return;
    }
    fc.build();
    fc._init = true;
  }
  destroy() {
    const fc = this;
    fc._elTag.remove();
  }
  build() {
    const fc = this;
    fc._elCheckbox = el("input", {
      class: "search--filter-facet-item-input",
      type: "checkbox",
      dataset: {
        action: "update_facet_filter",
      },
      id: Math.random().toString(32),
    });
    const elLabelContent = elSpanTranslate(fc._opt.label);
    fc._elLabel = el(
      "label",
      { class: "search--filter-facet-item-label", for: fc._elCheckbox.id },
      elLabelContent,
    );
    fc._elCount = el("span", {
      count: fc._opt.count,
      class: "search--filter-facet-item-count",
    });
    fc._elTag = el(
      "div",
      {
        class: "search--filter-facet-item",
      },
      [fc._elCheckbox, fc._elLabel, fc._elCount],
    );
    fc.order = -fc._opt.count;
  }
  set order(pos) {
    this._elTag.style.order = pos;
  }
  get id() {
    return this._opt.id;
  }
  get group() {
    return this._opt.group;
  }
  get el() {
    return this._elTag;
  }
  get checked() {
    return this._elCheckbox.checked === true;
  }
  set checked(enable) {
    this._elCheckbox.checked = enable;
  }
  get enable() {
    return this._opt.enable;
  }
  set enable(value) {
    const fc = this;
    if (!isBoolean(value)) {
      value = true;
    }
    if (value === fc.enable) {
      return;
    }
    fc._opt.enable = value;
    if (value) {
      fc._elTag.classList.remove("disabled");
    } else {
      fc._elTag.classList.add("disabled");
    }
  }
  get order() {
    return this._opt.order;
  }
  get label() {
    return this._opt.label;
  }

  get text() {
    return this._elLabel.innerText || this.label;
  }

  /**
   * Set facet position
   * @param {number} pos Numeric position
   */
  set order(pos) {
    const fc = this;
    if (pos === fc.order) {
      return;
    }
    fc._opt.order = pos;
    fc._elTag.style.order = pos;
  }
  get count() {
    return this._opt.count;
  }
  set count(c) {
    const fc = this;
    if (c === fc.count) {
      return;
    }
    fc._opt.count = c;
    fc._elCount.setAttribute("count", c);
    fc.enable = !!c;
    /*
     * Avoid reordening, as this produce
     * a lot of layout shifts. The facet even disapears.
     * scrollIntoView could help, but in > 2 columns, shift
     * could be also horizontal. It does not work well in nested
     * scrollable items. See handle_click > update_facet_filter.
     */
    if (0) {
      fc.order = 1000 - c;
    }
  }
}
