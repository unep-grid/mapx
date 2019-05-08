import {MessageFlash} from './message_flash.js';
import {el} from '@fxi/el';
import interact from 'interactjs';

class Box {
  constructor(boxParent) {
    var box = this;
    box.mc = boxParent.mc || boxParent;
    box[boxParent.title] = boxParent;
    box.boxParent = boxParent;
    box.state = boxParent.state;
    //box.busy = false;
    box.width = 0;
    box.height = 0;
    box.y = 0;
    box.y = 0;
    box.message = null;
    box.title = 'box';
    box.transform = {
      content: {},
      box: {}
    };
    box.cbResize = [];
    box.cbDrag = [];
  }

  init(opt) {
    opt = opt || {};
    var box = this;
    box.config = opt;

    box.elContent = opt.content || el('div');
    box.el = box.createEl(opt.class);
    box.elContainer = opt.boxContainer.elContent;
    box.elContainer.appendChild(box.el);
    box.el.appendChild(box.elContent);
    box.addMessageSupport();

    if (opt.width) {
      box.setWidth(opt.width);
    }
    if (opt.height) {
      box.setHeight(opt.height);
    }

    if (opt.draggable || opt.resizable) {
      makeInteract(box);

      if (opt.draggable) {
        if (opt.onDrag) {
          box.cbDrag.push(opt.onDrag);
        }
        makeDraggable(box, {
          boxRestrict: opt.boxRestrict || box.boxParent
        });
      }
      if (opt.resizable) {
        if (opt.onResize) {
          box.cbResize.push(opt.onResize);
        }
        makeResizable(box, {
          boxRestrict: opt.boxRestrict || box.boxParent
        });
      }
    }
    box.setContentScale(1);
  }

  addMessageSupport() {
    this.message = new MessageFlash(this);
  }

  createEl(classes) {
    var box = this;
    var elBox = el('div', {
      class: ['mc-box'].concat(classes || [])
    });
    elBox.box = box;
    return elBox;
  }

  onResize() {
    var box = this;
    box.cbResize.forEach((cb) => cb(box));
  }

  onDrag() {
    var box = this;
    console.log('box on drag');
    box.cbDrag.forEach((cb) => cb(box));
  }

  addEl(e) {
    this.el.appendChild(e);
  }

  destroy() {
    var box = this;
    box.el.remove();
    if (box.config.onRemove) {
      box.config.onRemove();
    }
    console.log("Removed box " + box.title);
  }

  addHandle(type) {
    var box = this;
    var title = box.title;
    box.addEl(
      el('div', {
        title: title,
        class: ['mc-handle', 'mc-handle-' + type]
      })
    );
  }

  addHandleDrag() {
    this.addHandle('drag');
  }

  addHandleResize() {
    this.addHandle('resize-top');
    this.addHandle('resize-left');
    this.addHandle('resize-bottom');
    this.addHandle('resize-right');
  }

  setSize(w, h) {
    this.setWidth(w || this.width);
    this.setHeight(h || this.height);
  }

  _updateContentScale() {
    var box = this;
    if (!box.elContent) {
      return;
    }
    var scale = box._content_scale;
    if (scale === 1) {
      box.elContent.style.width = '100%';
      box.elContent.style.height = '100%';
      box.setTransform('content', 'scale', 1);
    } else {
      var hP = (1 / scale) * 100;
      var wP = hP;
      box.elContent.style.width = wP + '%';
      box.elContent.style.height = hP + '%';
      box.setTransform('content', 'scale', scale);
    }
  }

  validateSize() {
    var box = this;
    var mc = box.mc;
    var max = mc.state.canvas_max_area;
    var area = (box.width / box.state.scale) * (box.height / box.state.scale);
    if (area >= max) {
      mc.displayWarning('Your browser will not handle this kind of size');
    }
  }

  setTransform(target, type, ...args) {
    var box = this;
    var elTarget = target === 'content' ? box.elContent : box.el;
    var str = '(' + args.join(',') + ')';
    box.transform[target][type] = str;

    var out = Object.keys(box.transform[target])
      .map((k) => {
        return k + box.transform[target][k];
      })
      .join('');
    elTarget.style.transform = out;
  }

  resetContentTransform(target) {
    var elTarget = target === 'content' ? box.elContent : box.el;
    box.transform[target] = {};
    elTarget.style.transform = '';
  }

  calcRect() {
    return this.el.getBoundingClientRect();
  }

  get rect() {
    return this.calcRect();
  }

  boxIsInside(otherBox) {
    var box = this;
    var rA = box.rect;
    var rB = otherBox.rect;
    rectIsInsideRect(rA, rB);
  }

  get gridOffset() {
    var box = this;
    var res = box.state.grid_snap_size;
    var rect = box.calcRect();
    return {
      x: rect.x - Math.round(rect.x / res) * res,
      y: rect.y - Math.round(rect.y / res) * res
    };
  }
  setY(y, inPx) {
    var box = this;
    box.y = inPx ? y : box.toLengthPixel(y);
    box.el.style.top = y + 'px';
  }
  setX(x, inPx) {
    var box = this;
    box.x = inPx ? x : box.toLengthPixel(x);
    box.el.style.left = x + 'px';
  }
  setWidth(w, inPx) {
    var box = this;
    box.width = inPx ? w : box.toLengthPixel(w);
    box.el.style.width = box.width + 'px';
    box.validateSize();
    return w;
  }

  setHeight(h, inPx) {
    var box = this;
    box.height = inPx ? h : box.toLengthPixel(h);
    box.el.style.height = box.height + 'px';
    box.validateSize();
    return h;
  }

  displayDim() {
    var box = this;
    if(box.isBusy){
      return;
    }
    var unit = box.state.unit;
    var w = box.toLengthUnit(box.width);
    var h = box.toLengthUnit(box.height);
    w = unit === 'in' ? Math.round(w * 100) / 100 : Math.round(w);
    h = unit === 'in' ? Math.round(h * 100) / 100 : Math.round(h);
    box.message.flash(w + ' [' + unit + '] x ' + h + ' [' + unit + '] ');
  }

  toLengthPixel(length) {
    var state = this.state;
    var r = window.devicePixelRatio;
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
    var state = this.state;
    var r = window.devicePixelRatio;
    px *= r;
    if (state.unit === 'px') {
      return px;
    }
    var out = px / state.dpi;
    if (state.unit === 'mm') {
      out *= 25.4;
    }
    return out;
  }

  get contentScale() {
    return this._content_scale;
  }
  setContentScale(scale) {
    var box = this;
    box._content_scale = scale;
    box._updateContentScale();
    box.onResize();
    box.validateSize();
  }
  setScale(scale) {
    var box = this;
    box._scale = scale;
    box.setTransform('box', 'scale', scale);
  }
}

export {Box};

export function makeInteract(box) {
  box.el.classList.add('mc-interact');
  box.interact = interact(box.el).styleCursor(false);
}

function makeResizable(box, opt) {
  opt = opt || {};
  var boxRestrict = opt.boxRestrict;
  box.addHandleResize();
  box.boxRestrict = boxRestrict;
  var out = box.interact
    .resizable({
      edges: {
        left: '.mc-handle-resize-left',
        right: '.mc-handle-resize-right',
        bottom: '.mc-handle-resize-bottom',
        top: '.mc-handle-resize-top'
      },
      modifiers: [
        interact.modifiers.restrict({
          restriction: boxRestrict.el,
          endOnly: true
        }),
        interact.modifiers.snap({
          targets: [snapToBox(boxRestrict)],
          relativePoints: [{x: 0, y: 0}]
        }),
        interact.modifiers.restrictSize({
          min: {width: 20, height: 20}
        })
      ],
      inertia: false
    })
    .on('resizemove', onResizeBase)
    .on('resizemove', box.onResize.bind(box));

  return out;
}

function snapToBox(box) {
  return function(x, y) {
    x = Math.round(x / 5) * 5 + box.gridOffset.x;
    y = Math.round(y / 5) * 5 + box.gridOffset.y;
    return {
      x: x,
      y: y
    };
  };
}

function makeDraggable(box, opt) {
  opt = opt || {};
  var boxRestrict = opt.boxRestrict;
  box.addHandleDrag();
  box.boxRestrict = boxRestrict;
  var out = box.interact
    .draggable({
      allowFrom: '.mc-handle-drag',
      modifiers: [
        interact.modifiers.snap({
          targets: [snapToBox(boxRestrict)],
          relativePoints: [{x: 0, y: 0}]
        }),
        interact.modifiers.restrict({
          restriction: boxRestrict.el,
          elementRect: {top: 0, left: 0, bottom: 1, right: 1}
        })
      ]
    })
    .on('dragmove', onDragBase)
    .on('dragmove', box.onDrag.bind(box));
  return out;
}

function onResizeBase(event) {
  var target = event.target;
  var box = target.box;

  if (!box) {
    return;
  }

  var x = box.x || 0;
  var y = box.y || 0;

  var w = event.rect.width;
  var h = event.rect.height;

  box.setWidth(w, true);
  box.setHeight(h, true);

  // translate when resizing from top or left edges
  x += event.deltaRect.left;
  y += event.deltaRect.top;

  box.setTransform('box', 'translate3d', x + 'px', y + 'px', '0');

  box.x = x;
  box.y = y;
}

function onDragBase(event) {
  var target = event.target;
  var box = target.box;
  if (!box) {
    return;
  }
  var x = (box.x || 0) + event.dx;
  var y = (box.y || 0) + event.dy;
  // translate the element
  box.setTransform('box', 'translate3d', x + 'px', y + 'px', '0');

  // update the posiion attributes
  box.x = x;
  box.y = y;
}

function rectIsInsideRect(rectA, rectB) {
  var inside =
    rectB.bottom <= rectA.bottom &&
    rectB.top >= rectA.top &&
    rectB.right <= rectA.right &&
    rectB.left >= rectA.left;
  return inside;
}
