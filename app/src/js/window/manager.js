// @ts-check
import "./element.js";
import { ElementCreator } from "../el/src/index.js";
import { isElement } from "../is_test/index.js";

/**
 * @typedef {Object} MxWindowConfig
 * @property {string} [key]
 * @property {string} [title]
 * @property {Node | string | Array<Node | string>} [content]
 * @property {Node | string | Array<Node | string>} [footerStart]
 * @property {Node | string | Array<Node | string>} [footerEnd]
 * @property {Node | string | Array<Node | string>} [status]
 * @property {boolean} [modal]
 * @property {boolean} [replace]
 * @property {boolean} [alwaysOnTop]
 * @property {boolean} [header]
 * @property {boolean} [draggable]
 * @property {boolean} [resizable]
 * @property {boolean} [collapsible]
 * @property {boolean} [snappable]
 * @property {boolean} [closeable]
 * @property {Record<string, string | number | undefined>} [geometry]
 * @property {(entries: ResizeObserverEntry[], window: import("./element.js").MxWindowElement) => void} [onResize]
 * @property {(reason: string) => void} [onClose]
 */

export class MxWindowLayerElement extends HTMLElement {}
if (!customElements.get("mx-window-layer")) {
  customElements.define("mx-window-layer", MxWindowLayerElement);
}

/** Window coordinator scoped to an explicitly supplied application root. */
export class MxWindowManager {
  /** @param {{root: HTMLElement}} options */
  constructor({ root }) {
    if (
      !isElement(root) ||
      root.namespaceURI !== "http://www.w3.org/1999/xhtml"
    ) {
      throw new TypeError("MxWindowManager requires a root element");
    }
    this.root = root;
    this.elementCreator = new ElementCreator({
      document: root.ownerDocument,
    });
    this.el = this.elementCreator.el;
    this.layer = this.el("mx-window-layer");
    this.root.appendChild(this.layer);
    /** @type {Map<string, import("./element.js").MxWindowElement>} */
    this.windows = new Map();
    this.lastZIndex = 2000;
    this._onLayerPointerDown = (event) => {
      const targetWindow = event.target.closest("mx-window");
      if (targetWindow) {
        this.bringToFront(targetWindow);
      }
    };
    this._onKeyDown = (event) => this.onKeyDown(event);
    this._onViewportResize = () => {
      for (const element of this.windows.values()) {
        element.constrainToViewport();
      }
    };
    this._trackingViewport = false;
    this.layer.addEventListener("pointerdown", this._onLayerPointerDown);
    this.layer.addEventListener("keydown", this._onKeyDown);
  }

  /** @param {MxWindowConfig} config */
  open(config = {}) {
    const key = config.key || `mx-window-${Date.now()}-${this.windows.size}`;
    const existing = this.windows.get(key);
    if (existing && config.replace !== false) {
      const rect = existing.getBoundingClientRect();
      const scrollTop = existing.refs.body.scrollTop;
      existing.configure({ ...existing.config, ...config, key });
      if (rect.width > 0 && rect.height > 0) {
        existing.setRect(rect);
      }
      existing.refs.body.scrollTop = scrollTop;
      existing.show();
      this.bringToFront(existing);
      this.focusInitial(existing);
      return existing;
    }
    if (existing) {
      return existing;
    }

    const doc = this.root.ownerDocument;
    const backdrop = config.modal === false ? null : this.el("div");
    if (backdrop) {
      backdrop.className = "mx-window-backdrop";
      backdrop.dataset.windowKey = key;
      this.layer.appendChild(backdrop);
    }
    const element = /** @type {import("./element.js").MxWindowElement} */ (
      this.el("mx-window")
    );
    element.manager = this;
    element.backdrop = backdrop;
    element.returnFocus = isElement(doc.activeElement)
      ? doc.activeElement
      : null;
    element.configure({ ...config, key });
    this.layer.appendChild(element);
    this.windows.set(key, element);
    this.startViewportTracking();
    this.bringToFront(element);
    this.focusInitial(element);
    element.dispatchWindowEvent("mx-window-open");
    return element;
  }

  /** @param {import("./element.js").MxWindowElement | string} windowOrKey @param {string} [reason] */
  close(windowOrKey, reason = "api") {
    const element =
      typeof windowOrKey === "string"
        ? this.windows.get(windowOrKey)
        : windowOrKey;
    if (!element) {
      return false;
    }
    const key = element.dataset.windowKey;
    element.dispatchWindowEvent("mx-window-close", { reason });
    element.config?.onClose?.(reason);
    element.backdrop?.remove();
    element.remove();
    this.windows.delete(key);
    if (this.windows.size === 0) {
      this.stopViewportTracking();
    }
    element.returnFocus?.focus?.();
    return true;
  }

  /** @param {{excludeKeys?: string[]}} [options] */
  closeAll({ excludeKeys = [] } = {}) {
    for (const [key, element] of this.windows) {
      if (!excludeKeys.includes(key)) {
        this.close(element, "close-all");
      }
    }
  }

  /** @param {import("./element.js").MxWindowElement} element */
  bringToFront(element) {
    const zIndex = element.config?.alwaysOnTop
      ? this.lastZIndex + 1000
      : ++this.lastZIndex;
    element.style.zIndex = String(zIndex);
    if (element.backdrop) {
      element.backdrop.style.zIndex = String(zIndex - 1);
    }
  }

  /** @param {import("./element.js").MxWindowElement} element */
  focusInitial(element) {
    const focusable = this.getFocusable(element);
    (focusable[0] || element).focus();
  }

  /** @param {import("./element.js").MxWindowElement} element */
  getFocusable(element) {
    return Array.from(
      element.querySelectorAll(
        'button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => !node.closest("[hidden]"));
  }

  onKeyDown(event) {
    const openWindows = Array.from(this.windows.values()).filter(
      (item) => !item.hidden,
    );
    const active = openWindows.sort(
      (a, b) => Number(b.style.zIndex) - Number(a.style.zIndex),
    )[0];
    if (!active) {
      return;
    }
    if (event.key === "Escape" && active.config?.closeable !== false) {
      event.preventDefault();
      this.close(active, "escape");
      return;
    }
    if (event.key !== "Tab" || active.config?.modal === false) {
      return;
    }
    const focusable = this.getFocusable(active);
    if (focusable.length === 0) {
      event.preventDefault();
      active.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = active.ownerDocument.activeElement;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  startViewportTracking() {
    if (this._trackingViewport) {
      return;
    }
    this.root.ownerDocument.defaultView?.addEventListener(
      "resize",
      this._onViewportResize,
    );
    this._trackingViewport = true;
  }

  stopViewportTracking() {
    if (!this._trackingViewport) {
      return;
    }
    this.root.ownerDocument.defaultView?.removeEventListener(
      "resize",
      this._onViewportResize,
    );
    this._trackingViewport = false;
  }

  destroy() {
    this.closeAll();
    this.layer.removeEventListener("pointerdown", this._onLayerPointerDown);
    this.layer.removeEventListener("keydown", this._onKeyDown);
    this.stopViewportTracking();
    this.layer.remove();
  }
}

/** @type {WeakMap<HTMLElement, MxWindowManager>} */
const managersByRoot = new WeakMap();

/** Module-scoped default; deliberately not exposed on window/globalThis. */
export function getMapxWindowManager(root = document.body) {
  const current = managersByRoot.get(root);
  if (current?.layer.isConnected) {
    return current;
  }
  current?.destroy();
  const manager = new MxWindowManager({ root });
  managersByRoot.set(root, manager);
  return manager;
}
