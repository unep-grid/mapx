import {MessageFlash} from './message_flash.js';
import {el} from '../../el/src/index.js';
import {onNextFrame} from './helpers.js';
import {ListenerStore} from './../../listener_store/index.js';

class Box {
  constructor(boxParent) {
    const box = this;
    box.mc = boxParent.mc || boxParent;
    box[boxParent.title] = boxParent;
    box.boxParent = boxParent;
    box.state = boxParent.state;
    box.lStore = new ListenerStore();
    box.width = 0;
    box.height = 0;
    box.left = 0;
    box.top = 0;
    box.message = null;
    box.title = 'box';
    box.transform = {
      content: {},
      box: {}
    };
    box.listeners = [];
    box.draggers = [];
    box.resizers = [];
    box.editabel = false;
    box.resizable = false;
    box.draggable = false;
    box.removable = false;
  }

  init(opt) {
    opt = opt || {};
    const box = this;
    box.config = opt;
    box.id = Math.random().toString(32);
    box.elContent = opt.content || el('div');
    box.el = box.createEl(opt.class);
    box.elContainer = opt.boxContainer.elContent;
    box.elContainer.appendChild(box.el);
    box.el.appendChild(box.elContent);
    box.addMessageSupport();
    // bound for resize / drag
    box.boxBound = opt.boxBound || box.boxParent;
    box.boundEdges = opt.boundEdges || {
      top: true,
      left: true,
      bottom: true,
      right: true
    };

    box.lStore.addListener({
      target: box.el,
      type: 'click',
      idGroup: 'set_last_focus',
      callback: (e) => {
        if (e.currentTarget === box.el) {
          e.stopPropagation();
          box.mc.setBoxLastFocus(box);
        }
      }
    });

    if (opt.width) {
      box.setWidth(opt.width);
    }
    if (opt.height) {
      box.setHeight(opt.height);
    }

    if (opt.draggable || opt.resizable) {
      box.lStore.addListener({
        target: box.el,
        type: 'mousedown',
        idGroup: 'drag_resize',
        callback: dragResizeListener,
        bind: box
      });

      if (opt.draggable) {
        if (opt.onDrag) {
          box.draggers.push(opt.onDrag);
        }
        box.makeDraggable();
      }
      if (opt.resizable) {
        if (opt.onResize) {
          box.resizers.push(opt.onResize);
        }
        box.makeResizable({
          boxBound: opt.boxBound || box.boxParent
        });
      }
    }
    box.setContentScale(1);
    box.setTextSize(12);
  }

  isDragging() {
    return this._is_dragging === true;
  }
  setDragingFlag(s) {
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
    return this.resizers.forEach((d) => d(this));
  }

  addMessageSupport() {
    this.message = new MessageFlash(this);
  }

  createEl(classes) {
    const box = this;
    const elBox = el('div', {
      class: ['mc-box'].concat(classes || [])
    });
    elBox.box = box;
    return elBox;
  }

  addEl(e) {
    this.el.appendChild(e);
  }

  destroy() {
    const box = this;
    box.el.remove();
    box.lStore.removeListenerByGroup(box.id);
    if (box.config.onRemove) {
      box.config.onRemove();
    }
  }

  addHandle(type, opt) {
    const box = this;
    const title = box.title;
    const base = {
      title: title,
      class: ['mc-handle', 'mc-handle-' + type]
    };
    const conf = Object.assign({}, base, opt);
    box.addEl(el('div', conf));
  }

  addHandleDrag() {
    this.addHandle('drag', {
      dataset: {
        mc_action: 'box_drag',
        mc_event_type: 'mousedown'
      }
    });
  }

  addHandleResize() {
    const box = this;
    ['top', 'left', 'bottom', 'right'].forEach((d) => {
      box.addHandle('resize-' + d, {
        dataset: {
          mc_action: 'box_resize',
          mc_resize_dir: d,
          mc_event_type: 'mousedown'
        }
      });
    });
  }

  addHandleRemove() {
    this.addHandle('remove', {
      dataset: {
        mc_action: 'box_remove',
        mc_event_type: 'click'
      }
    });
  }

  addFocus() {
    this.el.classList.add('mc-focus');
  }
  removeFocus() {
    this.el.classList.remove('mc-focus');
  }

  setSize(w, h) {
    this.setWidth(w || this.width);
    this.setHeight(h || this.height);
  }

  _updateContentScale() {
    const box = this;
    if (!box.elContent) {
      return;
    }
    const scale = box.contentScale;
    if (scale === 1) {
      box.elContent.style.width = '100%';
      box.elContent.style.height = '100%';
      box.setTransform('content', 'scale', 1);
    } else {
      const hP = (1 / scale) * 100;
      const wP = hP;
      box.elContent.style.width = wP + '%';
      box.elContent.style.height = hP + '%';
      box.setTransform('content', 'scale', scale);
    }
  }

  validateSize() {
    const box = this;
    const mc = box.mc;
    const max = mc.state.canvas_max_area;
    const area = (box.width / box.state.scale) * (box.height / box.state.scale);
    if (area >= max) {
      mc.displayWarning('Your browser will not handle this kind of size');
    }
  }

  setTransform(target, type, ...args) {
    const box = this;
    const elTarget = target === 'content' ? box.elContent : box.el;
    const str = '(' + args.join(',') + ')';
    box.transform[target][type] = str;

    const out = Object.keys(box.transform[target])
      .map((k) => {
        return k + box.transform[target][k];
      })
      .join('');
    elTarget.style.transform = out;
  }

  resetContentTransform(target) {
    const box = this;
    const elTarget = target === 'content' ? box.elContent : box.el;
    box.transform[target] = {};
    elTarget.style.transform = '';
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
      height: rect.height
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
    const rMax = box.boxBound.rect;
    const b = box.boundEdges;
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
        'box',
        'translate3d',
        newLeftSnap + 'px',
        newTopSnap + 'px',
        '0'
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
      hitSomething: hitRight || hitLeft || hitTop || hitBottom
    };
  }

  snapToGrid(length) {
    const box = this;
    const res = box.state.grid_snap_size;
    //return Math.ceil(length / res) * res;
    return Math.round(length / res) * res;
  }

  setWidth(w, inPx) {
    const box = this;
    const wUnit = inPx ? w : box.toLengthPixel(w);
    const wSnap = box.snapToGrid(wUnit);
    box.width = wSnap;
    box.el.style.width = `${wSnap}px`;
    box.validateSize();
    box.onResize();
    return w;
  }

  setHeight(h, inPx) {
    const box = this;
    const hUnit = inPx ? h : box.toLengthPixel(h);
    const hSnap = box.snapToGrid(hUnit);
    box.height = hSnap;
    box.el.style.height = `${hSnap}px`;
    box.validateSize();
    box.onResize();
    return h;
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
      unit === 'in' ? Math.round(wUnit * 100) / 100 : Math.round(wUnit);
    const hDisp =
      unit === 'in' ? Math.round(hUnit * 100) / 100 : Math.round(hUnit);
    box.message.flash(`${wDisp} x ${hDisp}`);
  }

  toLengthPixel(length) {
    const box = this;
    const state = box.state;
    const r = window.devicePixelRatio;
    length /= r;
    if (state.unit === 'px') {
      return length;
    }
    if (state.unit === 'mm') {
      length /= 25.4;
    }
    return state.dpi * length;
  }

  toLengthUnit(px) {
    const state = this.state;
    const r = window.devicePixelRatio;
    px *= r;
    if (state.unit === 'px') {
      return px;
    }
    let out = px / state.dpi;
    if (state.unit === 'mm') {
      out *= 25.4;
    }
    return out;
  }

  get contentScale() {
    return this._content_scale;
  }
  setContentScale(scale) {
    const box = this;
    box._content_scale = scale;
    box._updateContentScale();
    box.onResize();
    box.validateSize();
  }

  get textSize() {
    return this._text_size;
  }

  setTextSize(size) {
    const box = this;
    size = size < 5 ? 5 : size > 30 ? 30 : size ? size : 12;
    box._text_size = size;
    box.elContent.style.fontSize = size + 'px';
  }

  sizeTextMore() {
    const box = this;
    const size = box.textSize + 1;
    box.setTextSize(size);
  }
  sizeTextLess() {
    const box = this;
    const size = box.textSize - 1;
    box.setTextSize(size);
  }

  setScale(scale) {
    const box = this;
    box._scale = scale;
    box.setTransform('box', 'scale', scale);
  }

  makeDraggable() {
    const box = this;
    box.addHandleDrag();
  }

  makeResizable() {
    const box = this;
    box.addHandleResize();
  }
}

export {Box};

function dragResizeListener(e) {
  const box = this;
  const elTarget = e.target;
  const d = elTarget.dataset;
  // read the property of the handle;
  const idAction = d.mc_action;
  const idType = d.mc_event_type;
  const isDrag = idAction === 'box_drag';
  const isResize = idAction === 'box_resize';
  const isMouseDown = idType === 'mousedown';
  const isDragResize = isDrag || isResize;

  if (isMouseDown && isDragResize) {
    if (box.isDragging() || box.isResizing()) {
      return;
    }

    e.stopImmediatePropagation();

    if (isDrag) {
      box.setDragingFlag(true);
    }
    if (isResize) {
      box.setResizingFlag(true);
    }

    startDragResize({
      e: e,
      type: idAction,
      box: box
    });
  }
}

function startDragResize(opt) {
  const box = opt.box;
  const e = opt.e;
  const isDrag = opt.type === 'box_drag';
  const oX = box.left || 0;
  const oY = box.top || 0;
  const oW = box.width || 0;
  const oH = box.height || 0;
  const cX = e.clientX;
  const cY = e.clientY;
  const rDir = e.target.dataset.mc_resize_dir;

  box.lStore.addListener({
    target: window,
    type: 'mouseup',
    idGroup: 'drag_resize_active',
    callback: cancel,
    bind: box
  });

  box.lStore.addListener({
    target: window,
    type: 'mousemove',
    idGroup: 'drag_resize_active',
    callback: isDrag ? drag : resize,
    bind: box
  });

  function drag(e) {
    e.stopPropagation();
    const box = this;
    const dX = e.clientX - cX;
    const dY = e.clientY - cY;
    box.setTopLeft({
      left: oX + dX,
      top: oY + dY,
      inPx: true
    });
  }

  function resize(e) {
    e.stopPropagation();
    const box = this;
    const dX = e.clientX - cX;
    const dY = e.clientY - cY;
    const drag = {};
    if (rDir === 'left') {
      Object.assign(
        drag,
        box.setTopLeft({
          left: oX + dX,
          top: oY,
          inPx: true
        })
      );
      if (!drag.hitLeft) {
        box.setWidth(oW - dX, true);
      }
    }
    if (rDir === 'top') {
      Object.assign(
        drag,
        box.setTopLeft({
          left: oX,
          top: oY + dY,
          inPx: true
        })
      );
      if (!drag.hitTop) {
        box.setHeight(oH - dY, true);
      }
    }
    if (rDir === 'right') {
      box.setWidth(oW + dX, true);
    }
    if (rDir === 'bottom') {
      box.setHeight(oH + dY, true);
    }
  }

  function cancel() {
    const box = this;
    box.lStore.removeListenerByGroup('drag_resize_active');

    if (box.isDragging()) {
      box.setDragingFlag(false);
    }
    if (box.isResizing()) {
      box.setResizingFlag(false);
    }
  }
}
