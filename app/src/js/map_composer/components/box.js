import { MessageFlash } from "./message_flash.js";
import { el } from "../../el/src/index.js";
import { onNextFrame } from "./helpers.js";
import { ListenerStore } from "./../../listener_store/index.js";
import { isNotEmpty } from "../../is_test/index.js";

class Box {
  constructor(boxParent) {
    const box = this;
    box.mc = boxParent.mc || boxParent;
    box[boxParent.title] = boxParent;
    box.boxParent = boxParent;
    box.state = boxParent.state;
    box._lStore = new ListenerStore();
    box._width = 0;
    box._height = 0;
    box._left = 0;
    box._top = 0;
    box.message = null;
    box.title = "box";
    box.transform = {
      content: {},
      box: {},
    };
    box.listeners = [];
    box.draggers = [];
    box.resizers = [];
    box.removers = [];
    box._scale = 1;
  }
  init(opt) {
    opt = opt || {};
    const box = this;
    box.id = `box_${Math.random().toString(32)})`;
    box.title = opt.title || box.title;
    box.elContent = opt.content || el("div");
    box.el = box.createEl(opt.class);
    box.elContainer = opt.boxContainer.elContent;
    box.elContainer.appendChild(box.el);
    box.el.appendChild(box.elContent);
    box.addMessageSupport();
    // bound for resize / drag
    box._boxBound = opt.boxBound || box.boxParent;
    box._boundEdges = opt.boundEdges || {
      top: true,
      left: true,
      bottom: true,
      right: true,
    };

    box._lStore.addListener({
      target: box.el,
      type: "click",
      idGroup: box.id,
      callback: (e) => {
        if (e.currentTarget === box.el) {
          e.stopPropagation();
          box.mc.setBoxLastFocus(box);
        }
      },
    });

    if (opt.width) {
      box.setWidth(opt.width, true);
    }

    if (opt.height) {
      box.setHeight(opt.height, true);
    }

    if (opt.removable) {
      box.addHandleRemove();

      if (isNotEmpty(opt.removers)) {
        box.removers.push(...opt.removers);
      }
    }

    if (opt.draggable || opt.resizable) {
      box._lStore.addListener({
        target: box.el,
        type: "mousedown",
        idGroup: box.id,
        callback: box.dragResizeListener,
        bind: box,
      });

      if (opt.draggable) {
        box.addHandleDrag();
        if (isNotEmpty(opt.draggers)) {
          box.draggers.push(...opt.draggers);
        }
      }
      if (opt.resizable) {
        box.addHandleResize();
        if (isNotEmpty(opt.resizers)) {
          box.resizers.push(...opt.resizers);
        }
      }
    }
  }

  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  set width(v) {
    this._width = v;
  }
  set height(v) {
    this._height = v;
  }
  get top() {
    return this._top;
  }
  get left() {
    return this._left;
  }
  set top(v) {
    this._top = v;
  }
  set left(v) {
    this._left = v;
  }

  get lStore() {
    return this._lStore;
  }

  isDragging() {
    return this._is_dragging === true;
  }
  setDraggingFlag(s) {
    this._is_dragging = s === true;
  }
  isResizing() {
    return this._is_resizing === true;
  }
  setResizingFlag(s) {
    this._is_resizing = s === true;
  }

  onDrag() {
    return this.draggers.forEach((d) => d(this));
  }
  onResize() {
    this.displayDim();
    return this.resizers.forEach((d) => d(this));
  }

  addMessageSupport() {
    this.message = new MessageFlash(this);
  }

  createEl(classes) {
    const box = this;
    const elBox = el("div", {
      class: ["mc-box"].concat(classes || []),
    });
    elBox.box = box;
    return elBox;
  }

  addEl(e) {
    this.el.appendChild(e);
  }

  destroy() {
    const box = this;
    if (box._destroyed) {
      return;
    }
    box._destroyed = true;
    box.el.remove();
    box._lStore.removeListenerByGroup(box.id);
    for (const remover of box.removers) {
      remover();
    }
  }

  addHandle(type, opt, children) {
    const box = this;
    const title = box.title;
    const base = {
      title: title,
      class: ["mc-handle", "mc-handle-" + type],
    };
    const conf = Object.assign({}, base, opt);
    box.addEl(el("div", conf, children));
  }

  addHandleDrag() {
    this.addHandle("drag", {
      dataset: {
        mc_action: "box_drag",
        mc_event_type: "mousedown",
      },
    });
  }

  addHandleResize() {
    const box = this;
    ["top", "left", "bottom", "right"].forEach((d) => {
      box.addHandle("resize-" + d, {
        dataset: {
          mc_action: "box_resize",
          mc_resize_dir: d,
          mc_event_type: "mousedown",
        },
      });
    });
  }

  addHandleRemove() {
    console.log("add handle remove");
    const box = this;
    box.addHandle(
      "remove",
      {
        dataset: {
          mc_action: "box_remove",
          mc_event_type: "click",
        },
        on: ["click", box.destroy.bind(box)],
      },
      el("i", { class: ["mc-handle-icon", "fa", "fa-times"] })
    );
  }

  addFocus() {
    this.el.classList.add("mc-focus");
  }
  removeFocus() {
    this.el.classList.remove("mc-focus");
  }

  setTransform(target, type, ...args) {
    const box = this;
    const elTarget = target === "content" ? box.elContent : box.el;
    const str = "(" + args.join(",") + ")";
    box.transform[target][type] = str;
    const out = Object.keys(box.transform[target])
      .map((k) => {
        return k + box.transform[target][k];
      })
      .join("");
    elTarget.style.transform = out;
    if (type === "scale") {
    }
  }

  calcRect() {
    return this.el.getBoundingClientRect();
  }

  get rect() {
    const sTop = this.el.scrollTop;
    const sLeft = this.el.scrollLeft;
    const rect = this.calcRect();
    return {
      bottom: rect.bottom - sTop,
      top: rect.top - sTop,
      left: rect.left - sLeft,
      right: rect.right - sLeft,
      width: rect.width,
      height: rect.height,
    };
  }

  setTopLeft(opt) {
    const box = this;
    // unit conversion
    const newLeft = opt.inPx
      ? opt.left || box.left || 0
      : box.toLengthPixel(opt.left) || box.left || 0;
    const newTop = opt.inPx
      ? opt.top || box.top || 0
      : box.toLengthPixel(opt.top) || box.top || 0;

    // get limits
    const rBox = box.rect;
    const rParent = box.boxParent.rect;
    const rMax = box._boxBound.rect;
    const b = box._boundEdges;
    const dTop = rMax.top - rParent.top;
    const dLeft = rMax.left - rParent.left;

    // test colisions
    const hitLeft = b.left && rMax.left + newLeft - dLeft <= rMax.left;
    const hitRight =
      b.right && rMax.left + newLeft + rBox.width - dLeft >= rMax.right;
    const hitTop = b.top && rMax.top + newTop - dTop < rMax.top;
    const hitBottom =
      b.bottom && rMax.top + newTop + rBox.height - dTop >= rMax.bottom;

    // apply limits
    const newLeftLimit = hitLeft || hitRight ? box.left || 0 : newLeft;
    const newTopLimit = hitBottom || hitTop ? box.top || 0 : newTop;

    // snapping
    const newLeftSnap = box.snapToGrid(newLeftLimit);
    const newTopSnap = box.snapToGrid(newTopLimit);

    onNextFrame(() => {
      box.setTransform(
        "box",
        "translate3d",
        newLeftSnap + "px",
        newTopSnap + "px",
        "0"
      );
      box.top = newTopSnap;
      box.left = newLeftSnap;
      box.onDrag();
    });
    return {
      newLeft: newLeft,
      newTop: newTop,
      hitTop: hitTop,
      hitBottom: hitBottom,
      hitLeft: hitLeft,
      hitRight: hitRight,
      hitSomething: hitRight || hitLeft || hitTop || hitBottom,
    };
  }

  setTopLeftOrigin() {
    const box = this;
    box.setTransform("box", "translate3d", 0 + "px", 0 + "px", "0");
    box.top = 0;
    box.left = 0;
  }

  snapToGrid(length) {
    const box = this;
    const res = box.state.grid_snap_size;
    return Math.round(length / res) * res;
  }

  setWidth(w, inPx = false) {
    const box = this;
    const wPx = inPx ? w : box.toLengthPixel(w);
    let wSnap = box.snapToGrid(wPx);
    const valid = box.checkAndWarnSize(wSnap, box.height);
    if (!valid) {
      wSnap = box.width;
    }
    box.width = wSnap;
    box.el.style.width = `${wSnap}px`;
    box.onResize();
    return wSnap;
  }

  setHeight(h, inPx = false) {
    const box = this;
    const hPx = inPx ? h : box.toLengthPixel(h);
    let hSnap = box.snapToGrid(hPx);
    const valid = box.checkAndWarnSize(box.width, hSnap);
    if (!valid) {
      hSnap = box.height;
    }
    box.height = hSnap;
    box.el.style.height = `${hSnap}px`;
    box.onResize();
    return hSnap;
  }

  /*
   * Set width and height at the same time
   */
  setSize(w, h, inPx = false) {
    const box = this;
    const hPx = inPx ? h : box.toLengthPixel(h);
    const wPx = inPx ? w : box.toLengthPixel(w);
    let hSnap = box.snapToGrid(hPx);
    let wSnap = box.snapToGrid(wPx);
    const valid = box.checkAndWarnSize(wSnap, hSnap);
    if (!valid) {
      hSnap = box.height;
      wSnap = box.width;
    }
    box.height = hSnap;
    box.width = wSnap;
    box.el.style.height = `${hSnap}px`;
    box.el.style.width = `${wSnap}px`;
    box.onResize();
    return hSnap;
  }

  checkAndWarnSize(width, height) {
    const box = this;
    const mc = box.mc;
    const dpr = window.devicePixelRatio;
    const area = mc.state.canvas_max_area;
    const areaPrint = width * dpr * height * dpr;
    if (areaPrint > area) {
      const msger = mc.workspace.message;
      msger.flash({
        text: `Maximum area exceeded`,
        level: "warning",
      });
      console.warn("mc max area exceeded", { area, areaPrint });
      return false;
    }
    return true;
  }

  displayDim() {
    const box = this;
    if (box.isBusy) {
      return;
    }
    const unit = box.state.unit;
    const wUnit = box.toLengthUnit(box.width);
    const hUnit = box.toLengthUnit(box.height);

    const wDisp =
      unit === "in" ? Math.round(wUnit * 100) / 100 : Math.round(wUnit);
    const hDisp =
      unit === "in" ? Math.round(hUnit * 100) / 100 : Math.round(hUnit);
    box.message.flash(`${wDisp} x ${hDisp}`);
  }

  toLengthPixel(length) {
    const box = this;
    const state = box.state;
    const r = window.devicePixelRatio;
    length /= r;
    if (state.unit === "px") {
      return length;
    }
    if (state.unit === "mm") {
      length /= 25.4;
    }
    return state.dpi * length;
  }

  toLengthUnit(px) {
    const state = this.state;
    const r = window.devicePixelRatio;
    px *= r;
    if (state.unit === "px") {
      return px;
    }
    let out = px / state.dpi;
    if (state.unit === "mm") {
      out *= 25.4;
    }
    return out;
  }

  getContentScale() {
    return this._content_scale;
  }

  getTextSize() {
    const box = this;
    return Number(
      window.getComputedStyle(box.el).fontSize.split("px")[0] || 12
    );
  }

  setTextSize(size) {
    const box = this;
    size = size < 5 ? 5 : size > 30 ? 30 : size ? size : 12;
    box.el.style.fontSize = size + "px";
  }

  sizeTextMore() {
    const box = this;
    const size = box.getTextSize() + 1;
    box.setTextSize(size);
  }

  sizeTextLess() {
    const box = this;
    const size = box.getTextSize() - 1;
    box.setTextSize(size);
  }

  zoomIn() {
    const box = this;
    box.setScale(box.scale + (1 / 10) * box.scale);
  }

  zoomOut() {
    const box = this;
    box.setScale(box.scale - (1 / 10) * box.scale);
  }
  zoomFitHeight() {
    const box = this;
    const dH = box.rect.top - box.workspace.rect.top;
    const h = box.rect.height / box.scale + dH * 2;
    const scaleHeight = box.workspace.rect.height / h;
    box.setScale(scaleHeight);
  }

  zoomFitWidth() {
    const box = this;
    const dW = box.rect.left - box.workspace.rect.left;
    const w = box.rect.width / box.scale + dW * 2;
    const scaleWidth = box.workspace.rect.width / w;
    box.setScale(scaleWidth);
  }

  setScale(scale) {
    const box = this;
    box._scale = scale;
    box.el.style.setProperty(`--mc-box-scale`, box.scale);
    box.setTransform("box", "scale", scale);
  }

  get scale() {
    const box = this;
    return box._scale;
  }

  getScaleParent() {
    const box = this;
    const scaleStack =
      box.boxParent instanceof Box ? box.boxParent.getScaleParent() : 1;
    const scale = box.scale * scaleStack;
    return scale || 1;
  }

  dragResizeListener(e) {
    const box = this;
    const elTarget = e.target;
    const d = elTarget.dataset;
    // read the property of the handle;
    const idAction = d.mc_action;
    const idType = d.mc_event_type;
    const isDrag = idAction === "box_drag";
    const isResize = idAction === "box_resize";
    const isMouseDown = idType === "mousedown";
    const isDragResize = isDrag || isResize;

    if (isMouseDown && isDragResize) {
      if (box.isDragging() || box.isResizing()) {
        return;
      }

      e.stopImmediatePropagation();

      if (isDrag) {
        box.setDraggingFlag(true);
      }
      if (isResize) {
        box.setResizingFlag(true);
      }

      box.startDragResize({
        e: e,
        type: idAction,
        scale: box.getScaleParent(),
      });
    }
  }

  startDragResize(opt) {
    const box = this;
    const scale = box.getScaleParent();
    const { e, type } = opt;
    const isDrag = type === "box_drag";
    const oX = box.left || 0;
    const oY = box.top || 0;
    const oW = box.width || 0;
    const oH = box.height || 0;
    const cX = e.clientX;
    const cY = e.clientY;
    const rDir = e.target.dataset.mc_resize_dir;

    box._lStore.addListener({
      target: window,
      type: "mouseup",
      idGroup: "drag_resize_active",
      callback: cancel,
      bind: box,
    });

    box._lStore.addListener({
      target: window,
      type: "mousemove",
      idGroup: "drag_resize_active",
      callback: isDrag ? drag : resize,
      bind: box,
    });

    function drag(e) {
      e.stopPropagation();
      const box = this;
      const dX = (e.clientX - cX) / scale;
      const dY = (e.clientY - cY) / scale;
      box.setTopLeft({
        left: oX + dX,
        top: oY + dY,
        inPx: true,
      });
    }

    function resize(e) {
      e.stopPropagation();
      const box = this;
      const dX = (e.clientX - cX) / scale;
      const dY = (e.clientY - cY) / scale;
      const drag = {};
      if (rDir === "left") {
        Object.assign(
          drag,
          box.setTopLeft({
            left: oX + dX,
            top: oY,
            inPx: true,
          })
        );
        if (!drag.hitLeft) {
          box.setWidth(oW - dX, true);
        }
      }
      if (rDir === "top") {
        Object.assign(
          drag,
          box.setTopLeft({
            left: oX,
            top: oY + dY,
            inPx: true,
          })
        );
        if (!drag.hitTop) {
          box.setHeight(oH - dY, true);
        }
      }
      if (rDir === "right") {
        box.setWidth(oW + dX, true);
      }
      if (rDir === "bottom") {
        box.setHeight(oH + dY, true);
      }
    }

    function cancel() {
      box._lStore.removeListenerByGroup("drag_resize_active");

      if (box.isDragging()) {
        box.setDraggingFlag(false);
      }
      if (box.isResizing()) {
        box.setResizingFlag(false);
      }
    }
  }
}

export { Box };
