const CSS_ID = "mx-map-compare-style";

loadStyle();

export class MapCompare {
  constructor({ container, orientation = "vertical", handle = {} } = {}) {
    if (!container) {
      throw new Error("MapCompare requires a container");
    }

    this._container = container;
    this._horizontal = orientation === "horizontal";
    this._handle = {
      iconClass: ["fa", "fa-bars", "fa-rotate-90"],
      ...handle,
    };
    this._mapA = null;
    this._mapB = null;
    this._dragging = false;
    this._syncing = false;
    this._position = null;

    this._onResize = () => this.resize();
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this.ui = this._buildUi();
    this._container.appendChild(this.ui.elContainer);

    this.ui.elDivider.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    window.addEventListener("resize", this._onResize);
  }

  setMaps(mapA, mapB) {
    this._unsetMaps();
    this._mapA = mapA;
    this._mapB = mapB;
    this._syncAtoB = this._makeSyncHandler(mapA, mapB);
    this._syncBtoA = this._makeSyncHandler(mapB, mapA);
    mapA.on("move", this._syncAtoB);
    mapB.on("move", this._syncBtoA);
    this.resize();
  }

  unsetMaps() {
    this._unsetMaps();
  }

  resize() {
    const size = this._getSize();
    this.setSlider(this._position === null ? size / 2 : this._position);
  }

  setSlider(value) {
    const size = this._getSize();
    const position = Math.max(0, Math.min(size, value));
    this._position = position;

    if (this._horizontal) {
      if (this._mapA) {
        this._mapA.getContainer().style.clipPath =
          `inset(0 0 ${size - position}px 0)`;
      }
      this.ui.elDivider.style.top = `${position}px`;
    } else {
      if (this._mapA) {
        this._mapA.getContainer().style.clipPath =
          `inset(0 ${size - position}px 0 0)`;
      }
      this.ui.elDivider.style.left = `${position}px`;
    }
  }

  remove() {
    this.ui.elDivider.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    window.removeEventListener("resize", this._onResize);
    this._unsetMaps();
    this.ui.elContainer.remove();
  }

  destroy() {
    this.remove();
  }

  _unsetMaps() {
    if (this._mapA && this._syncAtoB) {
      this._mapA.off("move", this._syncAtoB);
      this._mapA.getContainer().style.clipPath = "";
    }

    if (this._mapB && this._syncBtoA) {
      this._mapB.off("move", this._syncBtoA);
    }

    this._mapA = null;
    this._mapB = null;
    this._syncAtoB = null;
    this._syncBtoA = null;
  }

  _onPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    this._dragging = true;
    this.ui.elDivider.setPointerCapture?.(e.pointerId);
    this._move(e);
  }

  _onPointerMove(e) {
    if (!this._dragging) {
      return;
    }
    e.preventDefault();
    this._move(e);
  }

  _onPointerUp(e) {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    if (this.ui.elDivider.hasPointerCapture?.(e.pointerId)) {
      this.ui.elDivider.releasePointerCapture(e.pointerId);
    }
  }

  _move(e) {
    const rect = this.ui.elContainer.getBoundingClientRect();
    const position = this._horizontal
      ? e.clientY - rect.top
      : e.clientX - rect.left;
    this.setSlider(position);
  }

  _getSize() {
    return this._horizontal
      ? this.ui.elContainer.clientHeight
      : this.ui.elContainer.clientWidth;
  }

  _makeSyncHandler(source, target) {
    return () => {
      if (this._syncing) {
        return;
      }
      this._syncing = true;
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
      this._syncing = false;
    };
  }

  _buildUi() {
    const elContainer = createElement("div", {
      className: [
        "mx-map-compare",
        this._horizontal ? "mx-map-compare--horizontal" : null,
      ],
    });
    const elMapB = createElement("div", {
      className: ["mx-map-compare__map", "mx-map-compare__map--b"],
    });
    const elMapA = createElement("div", {
      className: ["mx-map-compare__map", "mx-map-compare__map--a"],
    });
    const elControls = createElement("div", {
      className: ["mx-map-compare__controls"],
    });
    const elDivider = createElement("div", {
      className: ["mx-map-compare__divider"],
    });
    const elHandle = createElement("div", {
      className: ["mx-map-compare__handle"],
    });

    if (
      typeof HTMLElement !== "undefined" &&
      this._handle.el instanceof HTMLElement
    ) {
      elHandle.appendChild(this._handle.el);
    } else if (Array.isArray(this._handle.iconClass)) {
      elHandle.appendChild(
        createElement("i", { className: this._handle.iconClass }),
      );
    }

    elDivider.appendChild(elHandle);
    elContainer.append(elMapB, elMapA, elDivider, elControls);

    return {
      elContainer,
      elControls,
      elDivider,
      elHandle,
      elMapA,
      elMapB,
    };
  }
}

function createElement(tag, { className } = {}) {
  const el = document.createElement(tag);
  const classes = Array.isArray(className)
    ? className.filter(Boolean)
    : [className].filter(Boolean);

  if (classes.length > 0) {
    el.classList.add(...classes);
  }

  return el;
}

function loadStyle() {
  if (typeof document === "undefined" || document.getElementById(CSS_ID)) {
    return;
  }

  const elCss = document.createElement("style");
  elCss.id = CSS_ID;
  elCss.textContent = `
.mx-map-compare {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

.mx-map-compare__map {
  position: absolute;
  inset: 0;
}

.mx-map-compare__map--a {
  z-index: 2;
}

.mx-map-compare__map--b {
  z-index: 1;
}

.mx-map-compare__controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4;
}

.mx-map-compare__divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 44px;
  z-index: 3;
  cursor: col-resize;
  transform: translateX(-50%);
  touch-action: none;
  user-select: none;
}

.mx-map-compare--horizontal .mx-map-compare__divider {
  top: auto;
  bottom: auto;
  left: 0;
  right: 0;
  width: auto;
  height: 44px;
  cursor: row-resize;
  transform: translateY(-50%);
}

.mx-map-compare__divider::before {
  content: "";
  position: absolute;
  inset: 0;
  left: 50%;
  width: 3px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.mx-map-compare--horizontal .mx-map-compare__divider::before {
  inset: auto 0 0 0;
  top: 50%;
  width: auto;
  height: 3px;
  transform: translateY(-50%);
}

.mx-map-compare__handle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 38px;
  height: 38px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--mx_ui_background, #fff);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
  document.head.appendChild(elCss);
}
