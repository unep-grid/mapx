/*jshint esversion: 6 , node: true */ //'use strict';

export function sortable(o) {
  o.listener = {};
  var sortableOpt = o;

  if (o.selector instanceof Node) {
    o.elRoot = o.selector;
  } else {
    o.elRoot = document.querySelector(o.selector);
  }

  o.classHandle = o.classHandle || 'mx-drag-handle';
  o.classDraggable = o.classDraggable || 'mx-draggable';
  o.classDropArea = o.classDropArea || 'mx-drag-drop-area';
  o.classDragged = o.classDragged || 'mx-dragged';
  var elsDraggable = o.elRoot.querySelectorAll('.' + o.classDraggable);

  /**
   * On init
   */
  o.listener.mousedown = function(event) {
    var elHandle = event.target;
    var isHandle = elHandle.classList.contains(o.classHandle);

    if (isHandle && !o.elDrag) {
      o.elDrag = findParentByClass({
        selector: elHandle,
        class: o.classDraggable
      });

      if (o.elDrag) {
        draggable({
          event: event,
          elRoot: o.elRoot,
          selector: o.elDrag,
          selectorContainer: o.selector,
          classHandle: o.classHandle,
          classDraggable: o.classDraggable,
          classDropArea: o.classDropArea,
          onDragStart: o.listener.onDragStart,
          onDragMove: o.listener.onDragMove,
          onDragEnd: o.listener.onDragEnd,
          forceDim: true
        });
      }
    }
  };

  o.elRoot.addEventListener('pointerdown', o.listener.mousedown, false);

  /**
   * On drag start
   */
  o.listener.onDragStart = function(o) {
    setDropArea(o, o.el);
  };

  /**
   * On drag move
   */
  o.listener.onDragMove = function(o) {
    o.elOver = getOver(o);

    var isOver =
      o.elOver instanceof Node &&
      o.elOver !== o.el &&
      o.elOver !== o.elOverPrevious;

    if (isOver) {
      setDropArea(o, o.elOver);
      o.elOverPrevious = o.elOver;
    }
  };

  /**
   * On drag end
   */
  o.listener.onDragEnd = function(o) {
    o.elRoot.insertBefore(o.el, o.elDropArea.nextSibling);
    if (o.styleOrig) {
      for (var s in o.styleOrig) {
        sortableOpt.elDrag.style[s] = o.styleOrig[s];
      }
    }
    sortableOpt.elDrag = null;
    if (o.elDropArea instanceof Node) {
      o.elDropArea.remove();
    }
    if (sortableOpt.onSorted instanceof Function) {
      sortableOpt.onSorted();
    }
  };

  /**
   * Fetch element under dragged item
   */
  function getOver(o) {
    var el;
    var els = elsDraggable;
    var rectOther,
      rectDragged = o.el.getBoundingClientRect();
    for (var e = 0, eL = els.length; e < eL; e++) {
      el = els[e];
      if (el !== o.el) {
        rectOther = el.getBoundingClientRect();
        if (rectTouchRect(rectDragged, rectOther)) {
          return el;
        }
      }
    }
  }

  /**
   * Create drop area
   */
  function setDropArea(o, elAfter) {
    if (!o.elDropArea) {
      o.elDropArea = document.createElement('div');
      o.elDropArea.className = o.classDropArea;
      o.elDropArea.style.width = o.rect.width + 'px';
      o.elDropArea.style.height = o.rect.height + 'px';
    }

    o.elRoot.insertBefore(o.elDropArea, elAfter);
  }
}

export function draggable(o) {
  var xMin, xMax, yMin, yMax;

  if (o.selector instanceof Node) {
    o.el = o.selector;
  } else {
    o.el = document.querySelector(o.selector);
  }

  o.classHandle = o.classHandle || 'mx-drag-handle';
  o.classDraggable = o.classDraggable || 'mx-draggable';
  o.classDragged = o.classDragged || 'mx-dragged';
  o.debounceTime = o.debounceTime || 10;
  o.forceDim = o.forceDim || false;
  o.elHandle = o.el.querySelector('.' + o.classHandle);
  o.listener = {};
  o.selectorContainer = o.selectorContainer || 'body';
  o.elContainer =
    o.selectorContainer instanceof Node
      ? o.selectorContainer
      : document.querySelector(o.selectorContainer);
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
  o.listener.mousemove = mx.helpers.debounce(function(event) {
    if (o.block === false) {
      o.block = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      o.setPosElement(o.el, event.clientX, event.clientY);
      if (o.onDragMove instanceof Function) {
        o.onDragMove(o, event);
      }
    }
  }, o.debouceTime);

  /*
   * mouse up : remove "up" and "move" listener
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

      o.sumScroll = sumScrollY(o.el);

      o.rect = o.el.getBoundingClientRect();
      o.rectHandle = o.elHandle.getBoundingClientRect();
      o.x = o.el.offsetLeft;
      o.y = o.el.offsetTop;
      o.x_to = event.clientX;
      o.y_to = event.clientY;

      if (o.sumScroll) {
        o.y = o.y - o.sumScroll;
      }

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

/**
 * Cumulative sum of all el parents.
 */
function sumScrollY(el) {
  var offsetY = 0;
  while (el instanceof Node && (el = el.parentElement)) {
    offsetY += el.scrollTop;
  }
  return offsetY;
}

/**
 * Test if el touch the given rect
 */
function rectTouchRect(rectA, rectB) {
  var overlaps =
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top &&
    rectA.right > rectB.left &&
    rectA.left < rectB.right;
  return overlaps;
}

/**
 * Test if rectA is fully in rectB
 */
//function elInRect(el, rectB) {
  //var rectA = el.getBoundingClientRect();
  //var inside =
    //rectA.bottom <= rectB.bottom &&
    //rectA.top >= rectB.top &&
    //rectA.right <= rectB.right &&
    //rectA.left >= rectB.left;
  //return inside;
/*}*/
/**
 * Find closest parent using classname
 * @param {Object} o options;
 * @param {Element|String} o.selector Element or selector string
 * @param {String} o.class Class of the parent to find
 */
function findParentByClass(o) {
  var el;

  if (o.selector instanceof Node) {
    el = o.selector;
  } else {
    el = document.querySelector(o.selector);
  }

  while (
    el instanceof Node &&
    (el = el.parentElement) &&
    !el.classList.contains(o.class)
  ) {
    return el;
  }
}


