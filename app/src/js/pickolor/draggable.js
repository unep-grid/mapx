
export function draggable(o) {
  var xMin, xMax, yMin, yMax;

  o.classHandle = o.classHandle || 'mx-drag-handle';
  o.classDraggable = o.classDraggable || 'mx-draggable';
  o.classDragged = o.classDragged || 'mx-dragged';

  o.el =
    o.selector instanceof Element
      ? o.selector
      : document.querySelector(o.selector);
  o.elHandle =
    o.selectorHandle instanceof Element
      ? o.selectorHandle
      : o.el.querySelector(o.selectorHandle) || o.el;
  o.elContainer =
    o.selectorContainer instanceof Element
      ? o.selectorContainer
      : document.querySelector(o.selectorContainer) || document.body;

  o.el.style.zIndex = 1000;
  o.el.style.position = 'absolute';
  o.el.style.top = '0px';

  o.forceDim = o.forceDim || false;
  o.listener = {};
  o.containerRect = o.elContainer.getBoundingClientRect();

  xMin = o.containerRect.left;
  xMax = o.containerRect.right;
  yMin = o.containerRect.top;
  yMax = o.containerRect.bottom;

  /**
   * Set position value using delta from client
   */
  o.setPos = function(newX, newY) {
    var x = o.x + newX - o.x_to;
    var y = o.y + newY - o.y_to;

    if (x + o.rectHandle.width >= xMax) {
      x = xMax - o.rectHandle.width;
    }
    if (x <= xMin) {
      x = xMin;
    }
    if (y + o.rectHandle.height >= yMax) {
      y = yMax - o.rectHandle.height;
    }
    if (y <= yMin) {
      y = yMin;
    }
    return {
      left: x,
      top: y
    };
  };

  /*
   * Set dragged item position and store rect
   */
  o.setPosElement = function(el, newX, newY) {
    //o.rect = el.getBoundingClientRect();
    o.pos = o.setPos(newX, newY);
    o.el.style.left = o.pos.left + 'px';
    o.el.style.top = o.pos.top + 'px';
    o.block = false;
  };

  /**
   * mouse down + move : change element coordinate
   */
  o.listener.mousemove = function(event) {
    if (o.block === false) {
      o.block = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      o.setPosElement(o.el, event.clientX, event.clientY);
      if (o.onDragMove instanceof Function) {
        o.onDragMove(o, event);
      }
    }
  };

  /*
   * mouse up : remove 'up' and 'move' listener
   */
  o.listener.mouseup = function(event) {
    o.block = true;

    event.preventDefault();
    event.stopImmediatePropagation();

    window.removeEventListener('pointermove', o.listener.mousemove, false);
    window.removeEventListener('pointerup', o.listener.mouseup, false);

    o.el.classList.remove(o.classDragged);

    if (o.onDragEnd instanceof Function) {
      o.onDragEnd(o, event);
    }
  };

  /**
   * mouse down : make it draggable
   */
  o.listener.mousedown = function(event) {
    var isHandle = event.target.classList.contains(o.classHandle);
    if (isHandle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      o.styleOrig = {
        left: o.el.style.left,
        top: o.el.style.top,
        width: o.el.style.width,
        height: o.el.style.height,
        zIndex: o.el.style.zIndex,
        position: o.el.style.position,
        margin: o.el.style.margin
      };

      o.block = false;

      o.rect = o.el.getBoundingClientRect();
      o.rectHandle = o.elHandle.getBoundingClientRect();
      o.x = o.el.offsetLeft;
      o.y = o.el.offsetTop;
      o.x_to = event.clientX;
      o.y_to = event.clientY;

      if (o.forceDim) {
        o.el.style.zIndex = 1000;
        o.el.style.width = o.rect.width + 'px';
        o.el.style.height = o.rect.height + 'px';
      }

      o.el.style.position = 'absolute';
      o.el.style.margin = 'initial';
      o.el.classList.add(o.classDragged);

      o.setPosElement(o.el, event.clientX, event.clientY);

      window.addEventListener('pointermove', o.listener.mousemove, false);
      window.addEventListener('pointerup', o.listener.mouseup, false);

      if (o.onDragStart instanceof Function) {
        o.onDragStart(o, event);
      }
    }
  };

  if (!o.event) {
    o.elHandle.addEventListener('pointerdown', o.listener.mousedown, false);
  } else {
    o.listener.mousedown(event);
  }
}
