import {el} from '@fxi/el';
import {MessageFlash} from './message_flash.js';
import interact from 'interactjs';

class Box {
  constructor(parent) {
    this.parent = parent;
    this.options = parent.options;
    this.width = null;
    this.height = null;
    this.message = null;
    this.title = 'box';
    this.transform = {
      content: {},
      box: {}
    };
    this.cbResize = [];
    this.cbDrag = [];
  }

  init(opt) {
    opt = opt || {};
    var box = this;
    box.config = opt;
    box.createEl(opt.class);
    opt.elContainer.appendChild(box.el);
    box.el.appendChild(opt.elContent);
    box.elContent = opt.elContent;

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
          boxRestrict: opt.boxRestrict || box.parent
        });
      }
      if (opt.resizable) {
        if (opt.onResize) {
          box.cbResize.push(opt.onResize);
        }
        makeResizable(box, {
          boxRestrict: opt.boxRestrict || box.parent
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
    box.el = el('div', {class: ['mc-box'].concat(classes || [])});
    box.el.box = box;
  }

  onResize() {
    var box = this;
    console.log('box on resize');
    box.cbResize.forEach((cb) => cb(box));
    box.updateContent();
  }

  onDrag() {
    var box = this;
    console.log('box on drag');
    box.cbDrag.forEach((cb) => cb(box));
    box.updateContent();
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
  }

  addHandle(type) {
    var box = this;
    var title = box.title;
    box.addEl(
      el('div', {
        'title' : title,
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

  setContentScale(scale) {
    var box = this;
    box._content_scale = scale;
    box.updateContent();
    box.onResize();
  }

  updateContent() {
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

  setWidth(w) {
    var box = this;
    var res = box.resolution;
    box.width = w || 10;
    box.el.style.width = box.width * res[1] + 'px';
    box.updateContent();
  }

  setHeight(h) {
    var box = this;
    var res = box.resolution;
    box.height = h || 10;

    box.el.style.height = box.height * res[0] + 'px';
    box.updateContent();
  }

  calcRect() {
    return this.el.getBoundingClientRect();
  }

  displayDim() {
    var box = this;
    if (!box.message) {
      box.addMessageSupport();
    }
    var s = this.calcRect();
    var w = Math.round(s.width);
    var h = Math.round(s.height);
    var r = window.devicePixelRatio;
    this.message.flash(Math.round(w * r) + ' x ' + Math.round(h * r) + '');
  }

  get resOffset() {
    var res = this.resolution;
    var rect = this.calcRect();
    return {
      x: rect.x - Math.round(rect.x / res[0]) * res[0],
      y: rect.y - Math.round(rect.y / res[1]) * res[1]
    };
  }

  get resolution() {
    return this.options.layout.resolution;
  }
  get contentScale() {
    return this._content_scale;
  }
}

export {Box};

export function makeInteract(box) {
  box.el.classList.add('mc-interact');
  box.interact = interact(box.el).styleCursor(false);
}

function makeResizable(box, opt) {
  opt = opt || {};
  var restrict = opt.boxRestrict;
  box.addHandleResize(); 
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
          restriction: restrict.elContent,
          endOnly: true
        }),
        interact.modifiers.snap({
          targets: [snapTo(restrict)],
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

function snapTo(box) {
  return function(x, y) {
    x = Math.round(x / 5) * 5 + box.resOffset.x;
    y = Math.round(y / 5) * 5 + box.resOffset.y;
    return {
      x: x,
      y: y
    };
  };
}

function makeDraggable(box, opt) {
  opt = opt || {};
  var restrict = opt.boxRestrict;
  box.addHandleDrag(); 
  var out = box.interact
    .draggable({
      allowFrom: '.mc-handle-drag',
      modifiers: [
        interact.modifiers.snap({
          targets: [snapTo(restrict)],
          relativePoints: [{x: 0, y: 0}]
        }),
        interact.modifiers.restrict({
          restriction: restrict.elContent,
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

  // update the element's style
  target.style.width = event.rect.width + 'px';
  target.style.height = event.rect.height + 'px';

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
