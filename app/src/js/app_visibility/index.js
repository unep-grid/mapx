import { HOST_VISIBILITY_MESSAGE_TYPE } from "../sdk/src/host_visibility.js";

/**
 * Parse the small parent-to-frame visibility message without accepting other
 * SDK traffic.
 *
 * @param {unknown} value
 * @returns {{ type?: string, visible?: boolean } | null}
 */
function parseVisibilityMessage(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (_) {
      return null;
    }
  }
  return value && typeof value === "object" ? value : null;
}

/**
 * Shared document/embedding visibility state. Consumers use a
 * VisibilityGate to add visibility of their own DOM root.
 */
export class AppVisibility {
  /**
   * @param {{ document?: Document, window?: Window }} [options]
   */
  constructor(options = {}) {
    this._document = options.document ?? document;
    this._window = options.window ?? window;
    this._hostVisible = true;
    this._listeners = new Set();
    this._onDocumentVisibility = () => this._emitIfChanged();
    this._onPageHide = () => this._setPageVisible(false);
    this._onPageShow = () => this._emitIfChanged();
    this._onMessage = (event) => {
      if (event.source !== this._window.parent) {
        return;
      }
      const message = parseVisibilityMessage(event.data);
      if (
        message?.type !== HOST_VISIBILITY_MESSAGE_TYPE ||
        typeof message.visible !== "boolean"
      ) {
        return;
      }
      this._hostVisible = message.visible;
      this._emitIfChanged();
    };
    this._pageVisible = !this._document.hidden;
    this._visible = this._computeVisible();
    this._document.addEventListener(
      "visibilitychange",
      this._onDocumentVisibility,
    );
    this._window.addEventListener("pagehide", this._onPageHide);
    this._window.addEventListener("pageshow", this._onPageShow);
    this._window.addEventListener("message", this._onMessage);
  }

  isVisible() {
    return this._visible;
  }

  /**
   * @param {(visible: boolean) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  destroy() {
    this._document.removeEventListener(
      "visibilitychange",
      this._onDocumentVisibility,
    );
    this._window.removeEventListener("pagehide", this._onPageHide);
    this._window.removeEventListener("pageshow", this._onPageShow);
    this._window.removeEventListener("message", this._onMessage);
    this._listeners.clear();
  }

  _setPageVisible(visible) {
    this._pageVisible = visible;
    this._updateVisible();
  }

  _emitIfChanged() {
    this._pageVisible = !this._document.hidden;
    this._updateVisible();
  }

  _computeVisible() {
    return this._pageVisible && this._hostVisible;
  }

  _updateVisible() {
    const visible = this._computeVisible();
    if (visible === this._visible) {
      return;
    }
    this._visible = visible;
    for (const listener of this._listeners) {
      listener(visible);
    }
  }
}

/**
 * Combines app visibility with a component-owned DOM root.
 */
export class VisibilityGate {
  /**
   * @param {{ root?: Element | null, appVisibility?: AppVisibility }} [options]
   */
  constructor(options = {}) {
    this._appVisibility = options.appVisibility ?? appVisibility;
    const root = options.root;
    const canObserveRoot = !!root && typeof IntersectionObserver === "function";
    this._rootVisible = !canObserveRoot;
    this._listeners = new Set();
    this._visible = this._computeVisible();
    this._unsubscribeApp = this._appVisibility.subscribe(() => this._update());
    if (canObserveRoot) {
      this._observer = new IntersectionObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === root);
        if (!entry) {
          return;
        }
        this._rootVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        this._update();
      });
      this._observer.observe(root);
    }
  }

  isVisible() {
    return this._visible;
  }

  /**
   * @param {(visible: boolean) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  destroy() {
    this._observer?.disconnect();
    this._unsubscribeApp?.();
    this._listeners.clear();
  }

  _computeVisible() {
    return this._appVisibility.isVisible() && this._rootVisible;
  }

  _update() {
    const visible = this._computeVisible();
    if (visible === this._visible) {
      return;
    }
    this._visible = visible;
    for (const listener of this._listeners) {
      listener(visible);
    }
  }
}

export const appVisibility = new AppVisibility();

/**
 * @param {Element | null | undefined} root
 * @returns {VisibilityGate}
 */
export function createVisibilityGate(root) {
  return new VisibilityGate({ root });
}
