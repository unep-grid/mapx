import { el } from "./../el/src/index.js";
import { ListenerStore } from "../listener_store";
import { EventSimple } from "../event_simple";
import { isNotEmpty, isNumeric } from "../is_test/index.js";
import { shake } from "../elshake";
import "./style.less";
import { ButtonPanelManager } from "./manager.js";
import { bindAll } from "../bind_class_methods/index.js";
import { getContentSize, patchObject } from "../mx_helper_misc.js";

const settings = {
  id: "panel",
  elContainer: document.body,
  button_text: "Toggle",
  button_lang_key: null,
  button_classes: ["fa", "fa-list-ul"],
  position: "top-right",
  tooltip_position: "bottom-left",
  container_style: { height: "0px", width: "0px" },
  container_classes: [],
  item_content_classes: [],
  on_open_close_others: [],
  panel_style: {},
  add: true,
  add_footer: false,
  handles: ["free", "resize"],
  animate_duration: 200,
  save_size_on_resize: true,
  resize_handlers: {},
};

export class ButtonPanel extends EventSimple {
  constructor(opt) {
    super();
    const panel = this;
    panel.manager = new ButtonPanelManager();
    panel.opt = patchObject(settings, { ...opt });
    panel.ls = new ListenerStore();
    panel.init();
    bindAll(panel);
    panel.initListeners();
  }

  init() {
    const panel = this;
    panel.manager.register(panel);
    panel.build();
    panel.setAnimateDuration();
    panel.setButtonLabel();
    panel.setExclusiveMode(); // close other panel automatically;
    panel.show();
  }

  initListeners() {
    const panel = this;
    panel.ls.addListener({
      target: panel.elBtnPanel,
      bind: panel,
      callback: panel.toggle,
      group: "base",
      type: ["click", "tap"],
    });
    panel.ls.addListener({
      target: panel.elContainer,
      bind: panel,
      callback: panel.setPinned,
      group: "base",
      type: ["mouseenter"],
    });

    panel.ls.addListener({
      target: panel.elHandles,
      bind: panel,
      callback: panel.handleResize,
      group: "base",
      type: ["mousedown", "touchstart"],
      options: {
        passive: true,
      },
    });

    panel.ls.addListener({
      target: window,
      bind: panel,
      callback: panel.setExclusiveMode,
      group: "base",
      type: "resize",
    });

    if (panel.opt.save_size_on_resize) {
      panel.restoreSize();
    }
    panel.on("resize-end", () => {
      if (panel.opt.save_size_on_resize) {
        panel.saveSize();
      }
    });
    panel.on("resize-auto", () => {
      if (panel.opt.save_size_on_resize) {
        panel.saveSize();
      }
    });
  }

  get id() {
    return this.opt.id;
  }

  destroy() {
    const panel = this;
    if (panel._destroyed) {
      return;
    }
    panel._destroyed = true;
    panel.ls.destroy();
    panel.clearCallbacks();
    panel.manager.remove(panel);
    panel.elMain.removeChild(panel.elContainer);
    panel.fire("destroy");
  }

  setAnimmateDuration(ms) {
    const panel = this;
    ms = typeof ms === "undefined" ? panel.opt.animate_duration : ms;
    panel.elMain.style.setProperty("--animate-transition-ms", `${ms}ms`);
  }

  saveSize() {
    const panel = this;
    const id = panel.opt.id;
    if (panel.isMediaSmall()) {
      return;
    }
    if (id && window.localStorage) {
      clearTimeout(panel._timeout_size);
      panel._timeout_size = setTimeout(() => {
        try {
          const size = JSON.stringify({
            w: panel.width,
            h: panel.height,
          });
          localStorage.setItem(`button_panel@${id}`, size);
        } catch (e) {
          console.warn(e);
        }
      }, 1000);
    }
  }

  restoreSize() {
    const panel = this;
    const id = panel.opt.id;
    if (panel.isMediaSmall()) {
      return;
    }
    if (id && window.localStorage) {
      const size = localStorage.getItem(`button_panel@${id}`);
      if (size) {
        try {
          const sizeRestore = JSON.parse(size);
          if (sizeRestore.w) {
            this.width = sizeRestore.w;
          }
          if (sizeRestore.h) {
            this.height = sizeRestore.h;
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }

  setPinned() {
    const panel = this;
    const elMain = panel.opt.elContainer.querySelector(`.button-panel--main`);
    const elsPanel = elMain.querySelectorAll(`.button-panel--container`);
    if (!elsPanel) {
      return;
    }
    elsPanel.forEach((elPanelOther) => {
      if (elPanelOther === panel.elContainer) {
        elPanelOther.classList.add("button-panel--pinned");
      } else {
        elPanelOther.classList.remove("button-panel--pinned");
      }
    });
  }

  resetSize() {
    const panel = this;
    const id = panel.opt.id;
    if (id && window.localStorage) {
      const size = localStorage.getItem(`button_panel@${id}`);
      if (size) {
        localStorage.removeItem(`button_panel@${id}`);
      }
      panel.resetStyle();
    }
  }

  build() {
    const panel = this;

    if (!panel.opt.elContainer) {
      panel.opt.elContainer = document.body;
    }

    const elMain = panel.opt.elContainer.querySelector(`.button-panel--main`);

    if (!elMain) {
      panel.elMain = panel._el_main();
      panel.opt.elContainer.appendChild(panel.elMain);
    } else {
      panel.elMain = elMain;
    }

    /**
     * Flag to indicate.. an event
     */
    panel.elBtnFlag = el("span", {
      class: ["button-panel--btn-flag", "button-panel--hidden"],
    });

    /**
     * The button
     */
    panel.elBtnPanel = el(
      "button",
      {
        class: [
          "button-panel--btn",
          `button-panel--${panel.opt.position}`,
          "button-panel--shadow",
        ],
        role: "button",
        dataset: {
          button_panel_action: "toggle",
        },
      },
      [
        el("span", {
          class: ["button-panel--btn-icon", ...panel.opt.button_classes],
        }),
        el("span", {
          dataset: {
            lang_key: panel.opt.button_lang_key,
            lang_type: "tooltip",
          },
          class: [
            "button-panel--btn-hint",
            "hint",
            `hint--${panel.opt.tooltip_position}`,
          ],
        }),
        panel.elBtnFlag,
      ],
    );

    /**
     * Where the content will appear
     */
    panel.elPanelContent = el("div", {
      class: [
        "button-panel--item-content",
        "button-panel--shadow",
        ...panel.opt.item_content_classes,
      ],
    });

    /**
     * Handles / Buttons
     */
    panel.elHandles = el(
      "div",
      {
        class: "button-panel--item-handles",
      },
      panel._el_handles("top-left"),
      panel._el_handles("top-right"),
      panel._el_handles("bottom-right"),
      panel._el_handles("bottom-left"),
    );

    /**
     * Footer
     */
    if (panel.opt.add_footer) {
      panel.elFooter = el("div", {
        class: "button-panel--item-footer",
      });
    }
    /**
     * Panel
     */
    panel.elPanel = el(
      "div",
      {
        on: [
          "transitionend",
          (e) => {
            const to_repport = ["transform", "width", "height"];
            if (to_repport.includes(e.propertyName)) {
              panel.fire("resize-end");
            }
          },
        ],
        class: [
          "button-panel--item",
          panel.opt.panelFull ? "button-panel--item-full" : null,
        ],
        style: panel.opt.panel_style,
      },
      panel.elPanelContent,
      panel.elFooter,
      panel.elHandles,
    );

    /**
     * Panel and button
     */
    panel.elContainer = el(
      "div",
      {
        class: [
          "button-panel--container",
          `button-panel--${panel.opt.position}`,
          ...panel.opt.container_classes,
        ],
        style: panel.opt.container_style,
      },
      panel.elBtnPanel,
      panel.elPanel,
    );

    panel.elMain.appendChild(panel.elContainer);
  }

  _el_main() {
    return el("div", {
      class: "button-panel--main",
    });
  }

  _el_handles(pos) {
    const panel = this;
    /**
     *  Prevent buttons next to the main button location
     *  -> top=top => no.
     */
    if (pos === panel.opt.position) {
      return; // no handles near the button
    }
    const handles = panel.opt.handles;
    const addResize = handles.includes("resize");
    const addFree = handles.includes("free");

    const p = pos.split("-");
    const loc = p[0]; // top, bottom
    const side = p[1]; // left right
    const op = `${loc === "top" ? "bottom" : "top"}-${
      side === "left" ? "right" : "left"
    }`;
    const cl = ["button-panel--item-handles-group", `button-panel--${pos}`];

    const elHandles = el("div", {
      class: cl,
    });

    const elResizes = addResize ? panel._el_resize_btns(op) : null;
    const elFree = addFree ? panel._el_resize(pos) : null;
    /**
     * free - resize
     */
    if (loc === "top") {
      if (elFree) {
        elHandles.appendChild(elFree);
      }
      if (elResizes) {
        elHandles.appendChild(elResizes);
      }

      return elHandles;
    }
    /**
     * resize - free
     */
    if (elResizes) {
      elHandles.appendChild(elResizes);
    }
    if (elFree) {
      elHandles.appendChild(elFree);
    }
    return elHandles;
  }

  _build_el_handle(config) {
    return el(
      "div",
      {
        class: ["button-panel--item-handle"],
        dataset: config.dataset,
        ...config.el,
      },
      el("i", {
        class: ["button-panel--item-handle-icon", ...config.iconClasses],
      }),
    );
  }

  _el_resize(pos) {
    const config = {
      dataset: { action: "resize", type: "free", corner: pos },
      iconClasses: ["fa", "fa-circle"],
    };
    return this._build_el_handle(config);
  }

  _el_resize_btns(pos) {
    const panel = this;
    const add = panel.opt.position === pos;
    const elGroup = new DocumentFragment();

    if (add) {
      const configs = [
        {
          dataset: { action: "resize", type: "auto", id: "half-width" },
          iconClasses: [],
        },
        {
          dataset: { action: "resize", type: "auto", id: "half-height" },
          iconClasses: [],
        },
        {
          dataset: { action: "resize", type: "auto", id: "full" },
          iconClasses: [],
        },
        {
          dataset: { action: "resize", type: "auto", id: "content" },
          iconClasses: [],
        },
        {
          dataset: { action: "resize", type: "auto", id: "reset" },
          iconClasses: [],
        },
      ];

      for (const config of configs) {
        elGroup.appendChild(this._build_el_handle(config));
      }
    }

    return elGroup;
  }

  setButtonLabel(txt) {
    txt = txt || this.opt.button_text;
    txtResolve(txt).then((t) => {
      this.elBtnPanel.setAttribute("aria-label", t);
      this.elPanelContent.dataset.empty_title = t;
    });
  }

  hintHandles() {
    const panel = this;
    clearTimeout(panel._hint_handles_timeout);
    panel.elHandles.classList.add("button-panel--handle-hint");
    panel._hint_handles_timeout = setTimeout(() => {
      panel.elHandles.classList.remove("button-panel--handle-hint");
    }, 1000);
  }

  showFlag() {
    const panel = this;
    if (!panel.isActive()) {
      this.elBtnFlag.classList.remove("button-panel--hidden");
    }
  }

  hideFlag() {
    this.elBtnFlag.classList.add("button-panel--hidden");
  }

  handleResize(e) {
    const panel = this;
    const target = e.target;

    if (target.dataset.action !== "resize") {
      return;
    }

    if (target.dataset.type === "auto") {
      panel.resizeAuto(target.dataset.id);
      return;
    }

    //e.preventDefault(); // can't be used in passive mode
    panel.elContainer.classList.add("button-panel--container-resize");

    panel._resize = {
      rect: panel.rect,
      x: e.clientX,
      y: e.clientY,
      corner: target.dataset.corner,
      position: panel.opt.position,
    };

    panel.ls.addListener({
      target: window,
      bind: panel,
      callback: () => {
        panel.ls.removeListenerByGroup("resize");
        panel._rect = null;
        panel.elContainer.classList.remove("button-panel--container-resize");
        panel.fire("resize-end");
      },
      group: "resize",
      type: [
        "mouseup",
        "mouseleave",
        "contextmenu",
        "dblclik",
        "touchend",
        "touchcancel",
      ],
    });

    panel.ls.addListener({
      target: window,
      bind: panel,
      callback: panel.resize,
      group: "resize",
      type: ["mousemove", "touchmove"],
      debounce: true,
      debouceTime: 100,
    });
  }

  resize(e) {
    const panel = this;
    const orig = panel._resize;
    const a = posCornerResolver(orig.position, orig.corner);
    if (a.w_allow) {
      const dW = orig.x - e.clientX;
      const newW = orig.rect.width + (a.w_dir ? -dW : dW);
      panel.setWidth(newW, true);
    }
    if (a.h_allow) {
      const dH = orig.y - e.clientY;
      const newH = orig.rect.height + (a.h_dir ? -dH : dH);
      panel.setHeight(newH, true);
    }
    panel.fire("resize-free");
    panel.fire("resize-button");
  }

  getAnimateDuration() {
    const panel = this;
    return panel.opt.animate_duration;
  }

  setAnimateDuration(ms) {
    const panel = this;
    ms = typeof ms === "undefined" ? panel.opt.animate_duration : ms;
    panel.opt.animate_duration = ms;
    panel.elContainer.style.setProperty("--animate-transition-ms", `${ms}ms`);
  }

  setAnimate(enable) {
    const panel = this;
    if (enable) {
      panel.elContainer.classList.add("button-panel--container-animate");
      panel.elContainer.classList.add("button-panel--container-resize");
      clearTimeout(panel._to_set_animate);
      panel._to_set_animate = setTimeout(() => {
        panel.setAnimate(false);
      }, panel.opt.animate_duration);
    } else {
      panel.elContainer.classList.remove("button-panel--container-animate");
      panel.elContainer.classList.remove("button-panel--container-resize");
    }
  }

  shake(opt) {
    const panel = this;
    shake(panel.elContainer, opt);
  }

  shakeButton(opt) {
    const panel = this;
    shake(panel.elBtnPanel, opt);
  }

  resizeAuto(type, animate = true, silent = false) {
    const panel = this;

    if (panel._destroyed) {
      return;
    }

    panel.setAnimate(animate);

    /**
     * Solve bug where the first animation did not work
     */
    panel.setWidth(panel.width, silent);
    panel.setHeight(panel.height, silent);

    /**
     * Set dimension
     */

    const resizeHandler = {
      reset: () => {
        panel.resetSize();
      },
      content: () => {
        const ri = panel.rectInnerContent;
        panel.setWidth(ri.width, silent);
        panel.setHeight(ri.height, silent);
      },
      "content-parent": () => {
        const rip = panel.rectInnerContentParent;
        panel.setWidth(rip.width, silent);
        panel.setHeight(rip.height, silent);
      },
      half: () => {
        panel.setWidth(panel.rectParent.width / 2, silent);
        panel.setHeight(panel.rectParent.height / 2, silent);
      },
      "half-width": () => {
        panel.setWidth(panel.rectParent.width / 2, silent);
        panel.setHeight(panel.rectParent.height, silent);
      },
      "half-height": () => {
        panel.setWidth(panel.rectParent.width, silent);
        panel.setHeight(panel.rectParent.height / 2, silent);
      },
      "full-width": () => {
        panel.setHeight(30, silent);
        panel.setWidth(panel.rectParent.width, silent);
      },
      "full-height": () => {
        panel.setWidth(30, silent);
        panel.setHeight(panel.rectParent.height, silent);
      },
      full: () => {
        panel.setWidth(panel.rectParent.width, silent);
        panel.setHeight(panel.rectParent.height, silent);
      },
      ...panel.opt.resize_handlers,
    }[type];

    if (resizeHandler) {
      resizeHandler();
    } else {
      console.warn(`Handlers ${type} not supported`);
      return;
    }

    if (!silent) {
      setTimeout(
        () => {
          panel.fire("resize-auto", type);
          panel.fire("resize-button");
        },
        animate ? panel.opt.animate_duration : 0,
      );
    }
  }
  get rectParent() {
    return this.elContainer.parentElement.getBoundingClientRect();
  }
  get rectContent() {
    return this.elPanel.getBoundingClientRect();
  }
  get rectInnerContent() {
    return getContentSize(this.elPanelContent);
  }
  get rectInnerContentParent() {
    return getContentSize(this.elPanelContent, false);
  }
  get rectButton() {
    return this.elBtnPanel.getBoundingClientRect();
  }
  get rect() {
    return this.elContainer.getBoundingClientRect();
  }
  get width() {
    return this.rect.width;
  }
  get height() {
    return this.rect.height;
  }

  set width(w) {
    this.setWidth(w, false);
  }

  setWidth(w, silent = false) {
    const panel = this;
    if (!w) {
      return;
    }
    const isNum = isNumeric(w);
    const wBefore = panel.width;
    panel.elContainer.style.width = isNum ? w + "px" : w;
    const wAfter = panel.width;
    if (!silent && wAfter !== wBefore) {
      panel.fire("resize", { wBefore, wAfter });
    }
  }

  set height(h) {
    return this.setHeight(h, false);
  }

  setHeight(h, silent = false) {
    const panel = this;
    if (!h) {
      return;
    }
    const isNum = isNumeric(h);
    const hBefore = panel.height;
    panel.elContainer.style.height = isNum ? h + "px" : h;
    const hAfter = panel.height;
    if (!silent && hAfter !== hBefore) {
      panel.fire("resize", { hBefore, hAfter });
    }
  }

  resetStyle() {
    const panel = this;
    panel.setAnimate(true);
    for (let s in panel.opt.container_style) {
      panel.elContainer.style[s] = panel.opt.container_style[s];
    }
  }

  isVisible() {
    const panel = this;
    return !panel.elContainer.classList.contains("button-panel--hidden");
  }

  hide() {
    const panel = this;
    panel.elContainer.classList.add("button-panel--hidden");
    panel.fire("hide");
  }

  show() {
    const panel = this;
    panel.elContainer.classList.remove("button-panel--hidden");
    panel.fire("show");
  }

  isActive() {
    return this.elContainer.classList.contains("active");
  }

  isOpen() {
    return this.isActive();
  }

  open(skipFire) {
    const panel = this;
    if (panel.isActive()) {
      return;
    }

    if (panel.exclusiveMode) {
      panel.manager.closeAllOther(panel);
    }

    const closeOthers = panel.opt.on_open_close_others;
    if (isNotEmpty(closeOthers)) {
      panel.manager.close(closeOthers);
    }
    panel.hideFlag();
    panel.elContainer.classList.add("active");
    panel.hintHandles();
    if (!skipFire) {
      setTimeout(() => {
        panel.fire("open");
      }, panel.opt.animate_duration || 0);
    }
  }

  close(skipFire) {
    const panel = this;
    if (!panel.isActive()) {
      return;
    }
    panel.elContainer.classList.remove("active");
    if (!skipFire) {
      setTimeout(() => {
        panel.fire("close");
      }, panel.opt.animate_duration || 0);
    }
  }
  toggle() {
    const panel = this;
    if (panel.isActive()) {
      panel.close();
    } else {
      panel.open();
    }
    panel.fire("toggle");
  }
  isEmpty() {
    return this.elPanelContent.childElementCount === 0;
  }

  isMediaSmall() {
    return this.isMediaSmallHeight() || this.isMediaSmallWidth();
  }
  isMediaSmallHeight() {
    // should match @media (max-height: 640px) {
    return window.innerHeight <= 640;
  }
  isMediaSmallWidth() {
    // should match @media (max-width: 640px) {
    return window.innerWidth <= 640;
  }

  isSmallHeight() {
    return this.rect.height <= 200;
  }
  isSmallWidth() {
    return this.rect.height <= 200;
  }
  isSmall() {
    return this.isSmallHeight() || this.isSmallWidth();
  }

  setExclusiveMode(enable) {
    const panel = this;
    panel.exclusiveMode =
      typeof enable === "boolean" ? enable : panel.isMediaSmallWidth();
  }
}

function txtResolve(txt) {
  return new Promise((resolve) => {
    if (txt instanceof Promise) {
      txt.then((t) => {
        resolve(t);
      });
    } else {
      resolve(txt);
    }
  });
}

function posCornerResolver(position, corner) {
  const d = [
    {
      position: "bottom-left",
      corner: "bottom-right",
      h_allow: false,
      w_allow: true,
      w_dir: true,
      h_dir: false,
    },
    {
      position: "bottom-left",
      corner: "top-left",
      h_allow: true,
      w_allow: false,
      w_dir: true,
      h_dir: false,
    },
    {
      position: "bottom-left",
      corner: "top-right",
      h_allow: true,
      w_allow: true,
      w_dir: true,
      h_dir: false,
    },
    {
      position: "bottom-right",
      corner: "bottom-left",
      h_allow: false,
      w_allow: true,
      w_dir: false,
      h_dir: false,
    },
    {
      position: "bottom-right",
      corner: "top-left",
      h_allow: true,
      w_allow: true,
      w_dir: false,
      h_dir: false,
    },
    {
      position: "bottom-right",
      corner: "top-right",
      h_allow: true,
      w_allow: false,
      w_dir: false,
      h_dir: false,
    },
    {
      position: "top-left",
      corner: "bottom-left",
      h_allow: true,
      w_allow: false,
      w_dir: true,
      h_dir: true,
    },
    {
      position: "top-left",
      corner: "bottom-right",
      h_allow: true,
      w_allow: true,
      w_dir: true,
      h_dir: true,
    },
    {
      position: "top-left",
      corner: "top-right",
      h_allow: false,
      w_allow: true,
      w_dir: true,
      h_dir: true,
    },
    {
      position: "top-right",
      corner: "bottom-right",
      h_allow: true,
      w_allow: false,
      w_dir: false,
      h_dir: true,
    },
    {
      position: "top-right",
      corner: "bottom-left",
      h_allow: true,
      w_allow: true,
      w_dir: false,
      h_dir: true,
    },
    {
      position: "top-right",
      corner: "top-left",
      h_allow: false,
      w_allow: true,
      w_dir: false,
      h_dir: true,
    },
  ];
  return (
    d.reduce((a, x) => {
      return !a && x.position === position && x.corner === corner ? x : a;
    }, false) || {}
  );
}
