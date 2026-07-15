// @ts-check

/** @typedef {"left" | "right"} MxWindowSnapSide */

/**
 * A self-contained MapX window. The element owns every DOM reference it uses;
 * it never discovers application state through global DOM queries.
 */
export class MxWindowElement extends HTMLElement {
  constructor() {
    super();
    /** @type {Record<string, HTMLElement>} */
    this.refs = {};
    /** @type {DOMRect | null} */
    this.restoreRect = null;
    this.collapsed = false;
    this.snapSide = null;
    this._built = false;
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
  }

  connectedCallback() {
    if (!this._built) this.build();
  }

  disconnectedCallback() {
    this.stopPointerInteraction();
    this._resizeObserver?.disconnect();
  }

  build() {
    const doc = this.ownerDocument;
    const make = (tag, className) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      return node;
    };
    const header = make("header", "mx-window__header");
    this.tabIndex = -1;
    const title = make("h2", "mx-window__title");
    const actions = make("div", "mx-window__actions");
    const snapLeft = this.makeAction("arrow-left", "Snap left", "snap-left");
    const snapRight = this.makeAction(
      "arrow-right",
      "Snap right",
      "snap-right",
    );
    const collapse = this.makeAction("minus", "Collapse", "collapse");
    const close = this.makeAction("times", "Close", "close");
    actions.append(snapLeft, snapRight, collapse, close);
    header.append(title, actions);

    const body = make("div", "mx-window__body");
    const content = make("div", "mx-window__content");
    body.appendChild(content);
    const footer = make("footer", "mx-window__footer");
    const footerStart = make("div", "mx-window__footer-start");
    const status = make("div", "mx-window__status");
    const footerEnd = make("div", "mx-window__footer-end");
    footer.append(footerStart, status, footerEnd);
    const resizeHandle = make("div", "mx-window__resize-handle");
    resizeHandle.setAttribute("aria-hidden", "true");
    resizeHandle.dataset.windowAction = "resize";
    this.append(header, body, footer, resizeHandle);
    this.refs = {
      header,
      title,
      actions,
      snapLeft,
      snapRight,
      collapse,
      close,
      body,
      content,
      footer,
      footerStart,
      footerEnd,
      status,
      resizeHandle,
    };
    header.addEventListener("pointerdown", this._onPointerDown);
    resizeHandle.addEventListener("pointerdown", this._onPointerDown);
    actions.addEventListener("click", (event) => this.onAction(event));
    this._built = true;
  }

  makeAction(icon, label, action) {
    const button = this.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "btn btn-default mx-window__action";
    button.dataset.windowAction = action;
    button.setAttribute("aria-label", label);
    const glyph = this.ownerDocument.createElement("i");
    glyph.className = `fa fa-${icon}`;
    glyph.setAttribute("aria-hidden", "true");
    button.appendChild(glyph);
    return button;
  }

  /** @param {import("./manager.js").MxWindowConfig} config */
  configure(config) {
    if (!this._built) this.build();
    this.config = config;
    this.dataset.windowKey = config.key || "";
    const titleId = `mx-window-title-${String(config.key || "window").replace(
      /[^a-z0-9_-]/gi,
      "-",
    )}`;
    this.refs.title.id = titleId;
    this.setAttribute("role", "dialog");
    this.setAttribute("aria-modal", String(config.modal !== false));
    this.setAttribute("aria-labelledby", titleId);
    this.refs.title.textContent = config.title || "";
    this.refs.header.hidden = config.header === false;
    this.refs.close.hidden = config.closeable === false;
    this.refs.collapse.hidden = config.collapsible === false;
    this.refs.snapLeft.hidden = config.snappable === false;
    this.refs.snapRight.hidden = config.snappable === false;
    this.refs.resizeHandle.hidden = config.resizable === false;
    this.classList.toggle(
      "mx-window--always-on-top",
      config.alwaysOnTop === true,
    );
    this.setNodes(this.refs.content, config.content);
    this.setNodes(this.refs.footerStart, config.footerStart);
    this.setNodes(this.refs.footerEnd, config.footerEnd);
    this.setNodes(this.refs.status, config.status);
    const hasFooter =
      this.refs.footerStart.childNodes.length > 0 ||
      this.refs.footerEnd.childNodes.length > 0 ||
      this.refs.status.childNodes.length > 0;
    this.refs.footer.hidden = !hasFooter;
    this.applyGeometry(config.geometry || {});
    this.setupResizeObserver(config.onResize);
  }

  /** @param {HTMLElement} target @param {Node | string | Array<Node | string> | null | undefined} value */
  setNodes(target, value) {
    const values = Array.isArray(value) ? value : value == null ? [] : [value];
    const nodes = values.map((item) =>
      item instanceof Node
        ? item
        : this.ownerDocument.createTextNode(String(item)),
    );
    target.replaceChildren(...nodes);
  }

  /** @param {Record<string, string | number | undefined>} geometry */
  applyGeometry(geometry) {
    for (const property of [
      "width",
      "height",
      "minWidth",
      "minHeight",
      "maxWidth",
      "maxHeight",
      "top",
      "left",
    ]) {
      const value = geometry[property];
      if (value !== undefined) {
        this.style[property] = typeof value === "number" ? `${value}px` : value;
      }
    }
    if (geometry.top === undefined) this.style.top = "50%";
    if (geometry.left === undefined) this.style.left = "50%";
    this.classList.toggle(
      "mx-window--centered",
      geometry.top === undefined && geometry.left === undefined,
    );
  }

  setupResizeObserver(callback) {
    this._resizeObserver?.disconnect();
    if (typeof callback !== "function" || typeof ResizeObserver !== "function")
      return;
    this._resizeObserver = new ResizeObserver((entries) =>
      callback(entries, this),
    );
    this._resizeObserver.observe(this);
  }

  show() {
    this.hidden = false;
    this.dispatchWindowEvent("mx-window-show");
  }

  hide() {
    this.hidden = true;
    this.dispatchWindowEvent("mx-window-hide");
  }

  close(reason = "api") {
    this.manager?.close(this, reason);
  }

  setTitle(title) {
    this.refs.title.textContent = String(title || "");
  }

  collapse() {
    if (this.collapsed) return;
    this.restoreRect = this.getBoundingClientRect();
    this.collapsed = true;
    this.classList.add("mx-window--collapsed");
    this.refs.body.hidden = true;
    this.refs.footer.hidden = true;
    this.refs.resizeHandle.hidden = true;
    this.refs.collapse.setAttribute("aria-label", "Expand");
    this.refs.collapse.firstElementChild.className = "fa fa-plus";
    this.dispatchWindowEvent("mx-window-collapse");
  }

  expand() {
    if (!this.collapsed) return;
    this.collapsed = false;
    this.classList.remove("mx-window--collapsed");
    this.refs.body.hidden = false;
    this.refs.footer.hidden =
      this.refs.footerStart.childNodes.length === 0 &&
      this.refs.footerEnd.childNodes.length === 0 &&
      this.refs.status.childNodes.length === 0;
    this.refs.resizeHandle.hidden = this.config?.resizable === false;
    this.refs.collapse.setAttribute("aria-label", "Collapse");
    this.refs.collapse.firstElementChild.className = "fa fa-minus";
    if (this.restoreRect) this.setRect(this.restoreRect);
    this.dispatchWindowEvent("mx-window-expand");
  }

  /** @param {MxWindowSnapSide} side */
  snap(side) {
    if (this.collapsed) this.expand();
    if (!this.snapSide) this.restoreRect = this.getBoundingClientRect();
    this.classList.remove("mx-window--centered");
    this.style.transform = "none";
    this.style.top = "0px";
    this.style.left = side === "left" ? "0px" : "50vw";
    this.style.width = "50vw";
    this.style.height = "100vh";
    this.style.maxHeight = "100vh";
    this.snapSide = side;
    this.dispatchWindowEvent("mx-window-snap", { side });
  }

  restore() {
    if (!this.restoreRect) return;
    this.setRect(this.restoreRect);
    this.snapSide = null;
    this.dispatchWindowEvent("mx-window-restore");
  }

  constrainToViewport() {
    if (this.snapSide) {
      this.snap(this.snapSide);
      return;
    }
    if (this.classList.contains("mx-window--centered")) return;
    const rect = this.getBoundingClientRect();
    const view = this.ownerDocument.defaultView;
    const viewportWidth =
      this.ownerDocument.documentElement.clientWidth || view?.innerWidth || 0;
    const viewportHeight =
      this.ownerDocument.documentElement.clientHeight || view?.innerHeight || 0;
    if (!viewportWidth || !viewportHeight) return;
    this.setRect({
      left: Math.max(0, Math.min(rect.left, viewportWidth - 48)),
      top: Math.max(0, Math.min(rect.top, viewportHeight - 48)),
      width: Math.min(rect.width, viewportWidth),
      height: Math.min(rect.height, viewportHeight),
    });
  }

  /** @param {{left:number, top:number, width:number, height:number}} rect */
  setRect(rect) {
    this.classList.remove("mx-window--centered");
    this.style.transform = "none";
    this.style.left = `${rect.left}px`;
    this.style.top = `${rect.top}px`;
    this.style.width = `${rect.width}px`;
    this.style.height = `${rect.height}px`;
  }

  onAction(event) {
    const button = event.target.closest("[data-window-action]");
    if (!button) return;
    const action = button.dataset.windowAction;
    if (action === "close") this.close("button");
    if (action === "collapse") this.collapsed ? this.expand() : this.collapse();
    if (action === "snap-left")
      this.snapSide === "left" ? this.restore() : this.snap("left");
    if (action === "snap-right")
      this.snapSide === "right" ? this.restore() : this.snap("right");
  }

  onPointerDown(event) {
    if (event.button !== 0) return;
    const action = event.currentTarget.dataset.windowAction;
    if (action !== "resize" && event.target.closest(".mx-window__actions"))
      return;
    if (action !== "resize" && this.config?.draggable === false) return;
    const rect = this.getBoundingClientRect();
    this.setRect(rect);
    this.pointerState = {
      id: event.pointerId,
      action: action === "resize" ? "resize" : "move",
      startX: event.clientX,
      startY: event.clientY,
      rect,
    };
    this.manager?.bringToFront(this);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this.ownerDocument.addEventListener("pointermove", this._onPointerMove);
    this.ownerDocument.addEventListener("pointerup", this._onPointerUp);
    event.preventDefault();
  }

  onPointerMove(event) {
    const state = this.pointerState;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const viewportWidth =
      this.ownerDocument.documentElement.clientWidth ||
      this.ownerDocument.defaultView?.innerWidth ||
      0;
    const viewportHeight =
      this.ownerDocument.documentElement.clientHeight ||
      this.ownerDocument.defaultView?.innerHeight ||
      0;
    if (state.action === "move") {
      const left = Math.max(
        0,
        Math.min(state.rect.left + dx, viewportWidth - 48),
      );
      const top = Math.max(
        0,
        Math.min(state.rect.top + dy, viewportHeight - 48),
      );
      this.style.left = `${left}px`;
      this.style.top = `${top}px`;
      this.dispatchWindowEvent("mx-window-move", { left, top });
      return;
    }
    const minWidth = Number.parseFloat(getComputedStyle(this).minWidth) || 280;
    const minHeight =
      Number.parseFloat(getComputedStyle(this).minHeight) || 160;
    const width = Math.max(
      minWidth,
      Math.min(state.rect.width + dx, viewportWidth - state.rect.left),
    );
    const height = Math.max(
      minHeight,
      Math.min(state.rect.height + dy, viewportHeight - state.rect.top),
    );
    this.style.width = `${width}px`;
    this.style.height = `${height}px`;
    this.dispatchWindowEvent("mx-window-resize", { width, height });
  }

  onPointerUp(event) {
    if (!this.pointerState || this.pointerState.id !== event.pointerId) return;
    this.stopPointerInteraction();
  }

  stopPointerInteraction() {
    this.pointerState = null;
    this.ownerDocument.removeEventListener("pointermove", this._onPointerMove);
    this.ownerDocument.removeEventListener("pointerup", this._onPointerUp);
  }

  dispatchWindowEvent(type, detail = {}) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: { window: this, ...detail },
      }),
    );
  }
}

if (!customElements.get("mx-window"))
  customElements.define("mx-window", MxWindowElement);
