import { getLabelFromObjectPath } from "../language";
import { el } from "../el/src/index.js";
import { isElement, isViewOpen } from "../is_test_mapx/index.js";
import { getView, getViewTitle } from "../map_helpers/index.js";
import { events } from "../mx.js";

class ViewBase {
  constructor(idView, enable) {
    let vb = this;
    const view = getView(idView);
    vb._view = view;
    vb._title = getViewTitle(view);
    view._vb = vb;
    view._open = false;
    vb.build(enable);
  }
  getEl() {
    return this.el;
  }
  isOpen() {
    return isViewOpen(this._view);
  }

  isActive() {
    this.el;
    const isOpen = this.isOpen();
    const style = window.getComputedStyle(this.el);
    const isVisible = !!style && style.display !== "none";
    return isOpen && isVisible;
  }

  open() {
    const vb = this;
    if (vb.isOpen()) {
      return;
    }
    vb._view._open = true;
    if (!vb.elInput.checked) {
      vb.elInput.checked = true;
    }
    events.fire({
      type: "view_ui_open",
      data: {
        idView: vb._view.id,
      },
    });
    return true;
  }

  close() {
    const vb = this;
    if (!vb.isOpen()) {
      return;
    }
    vb._view._open = false;
    if (vb.elInput.checked) {
      vb.elInput.checked = false;
    }
    events.fire({
      type: "view_ui_close",
      data: {
        idView: vb._view.id,
      },
    });
    return true;
  }

  toggle() {
    const vb = this;
    if (vb.isOpen()) {
      vb.close();
      return false;
    } else {
      vb.open();
      return true;
    }
  }

  destroy() {
    if (isElement(this.el)) {
      this.el.remove();
    }
  }

  build(enable) {
    enable = !!enable;
    const vb = this;
    const view = vb._view;
    const title = getLabelFromObjectPath({
      obj: view,
      path: "data.title",
    });

    const elButton = el("div", {
      class: "mx-view-tgl-btn",
    });

    const elTitle = el(
      "span",
      { class: ["mx-view-tgl-title", "li-drag-handle"] },
      title
    );

    const elBadges = el("div", {
      id: "view_badges_" + view.id,
      class: "mx-view-badges",
    });

    const elClasses = el(
      "span",
      {
        class: "mx-view-item-classes",
      },
      view.data.classes,
      view.type
    );
    const elIndex = el("span", {
      class: "mx-view-item-index",
    });
    const elToggleMore = el(
      "div",
      {
        class: "mx-view-tgl-more-container",
      },
      el("div", {
        class: "mx-view-tgl-more",
        dataset: {
          view_options_for: view.id,
        },
      })
    );

    const elInput = el("input", {
      id: "check_view_enable_" + view.id,
      class: "mx-view-tgl-input",
      type: "checkbox",
      role: "button",
      "aria-label": `Open view ${title}`,
      dataset: {
        view_action_key: "btn_toggle_view",
        view_action_target: view.id,
      },
    });

    const elLabel = el(
      "label",
      {
        class: ["mx-view-tgl-content"],
        for: "check_view_enable_" + view.id,
      },
      elButton,
      elTitle,
      elBadges,
      elClasses,
      elIndex
    );

    const elView = el(
      "div",
      {
        dataset: {
          view_id: view.id,
          view_date_modified: view.date_modified,
          view_title: title,
        },
        class: ["mx-view-item", "mx-view-item-" + view.type, "noselect"],
      },
      elInput,
      elLabel,
      elToggleMore
    );
    vb.el = elView;
    vb.elInput = elInput;
    vb.elToggleMore = elToggleMore;
    vb.el._vb = this;
    view._el = elView;
    if (enable) {
      vb.open();
    }
  }
}

export { ViewBase };
