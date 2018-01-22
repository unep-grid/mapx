/*jshint esversion: 6 , node: true */ //'use strict';
import * as mx from './mx_init.js';

export function sortable(o) {

  o.listener = {};
  var sortableOpt = o;

  if (o.selector instanceof Node) {
    o.elRoot = o.selector;
  } else {
    o.elRoot = document.querySelector(o.selector);
  }

  o.classHandle = o.classHandle || "mx-drag-handle";
  o.classDraggable = o.classDraggable || "mx-draggable";
  o.classDropArea = o.classDropArea || "mx-drag-drop-area";
  o.classDragged = o.classDragged || "mx-dragged";

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

  o.elRoot.addEventListener('mousedown', o.listener.mousedown, false);


  /**
   * On drag start
   */
  o.listener.onDragStart = function(o, e) {
    setDropArea(o, o.el);
  };


  /**
   * On drag move
   */
  o.listener.onDragMove = function(o, e) {

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
  o.listener.onDragEnd = function(o, e) {
    o.elRoot.insertBefore(o.el, o.elDropArea.nextSibling);
    if(o.styleOrig){
      for(var s in o.styleOrig){
        sortableOpt.elDrag.style[s] = o.styleOrig[s];
      }
    }
    sortableOpt.elDrag = null;
    if (o.elDropArea instanceof Node) o.elDropArea.remove();
    if (sortableOpt.onSorted instanceof Function) sortableOpt.onSorted(); 
  };

  /**
   * Fetch element under dragged item
   */
  function getOver(o) {
    var els = o.elRoot.querySelectorAll("." + o.classDraggable);
    var el;
    for (var e = 0, eL = els.length; e < eL; e++) {
      el = els[e];
      if (el != o.el) {
        if (elTouchRect(el, o.rect)) {
          return (el);
        }
      }
    }
  }


  /**
   * Create drop area 
   */
  function setDropArea(o, elAfter) {

    if (!o.elDropArea) {
      o.elDropArea = document.createElement("div");
      o.elDropArea.className = o.classDropArea;
      o.elDropArea.style.width = o.rect.width + "px";
      o.elDropArea.style.height = o.rect.height + "px";
    }

    o.elRoot.insertBefore(o.elDropArea, elAfter);

  }
}


export function draggable(o) {
  if (o.selector instanceof Node) {
    o.el = o.selector;
  } else {
    o.el = document.querySelector(o.selector);
  }

  o.classHandle = o.classHandle || "mx-drag-handle";
  o.classDraggable = o.classDraggable || "mx-draggable";
  o.classDragged = o.classDragged || "mx-dragged";
  o.debounceTime = o.debounceTime || 10;
  o.forceDim = o.forceDim || false;
  o.elHandle = o.el.querySelector("." + o.classHandle);
  o.listener = {};

  /**
   * Set position value using delta from client
   */
  o.setPos = function(el, newX, newY) {
    return {
      left: o.x + newX - o.x_to,
      top: o.y + newY - o.y_to
    };
  };

  /*
   * Set dragged item position and store rect
   */
  o.setPosElement = function(el, newX, newY) {
    o.rect = el.getBoundingClientRect();
    o.pos = o.setPos(el, newX, newY);
    o.el.style.left = o.pos.left + "px";
    o.el.style.top = o.pos.top + "px";
  };

  /**
   * mouse down + move : change element coordinate
   */
  o.listener.mousemove = mx.helpers.debounce(function(event) {
    if( o.block === false ){
    event.preventDefault();
    event.stopImmediatePropagation();
    o.setPosElement(o.el, event.clientX, event.clientY);

    if (o.onDragMove instanceof Function) o.onDragMove(o, event);
    }
  },o.debouceTime);

  /*
   * mouse up : remove "up" and "move" listener
   */
  o.listener.mouseup = function(event) {

    o.block = true;

    event.preventDefault();
    event.stopImmediatePropagation();

    window.removeEventListener('mousemove', o.listener.mousemove, false);
    window.removeEventListener('mouseup', o.listener.mouseup, false);

    o.el.classList.remove(o.classDragged);

    if (o.onDragEnd instanceof Function) o.onDragEnd(o, event);

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
        margin : o.el.style.margin
      };

      o.block = false;
      
      // sumScroll was an attempt to add the scrolled
      // part to offsetLeft.
      // not needed anymore ?
      o.sumScroll =  sumScrollY(o.el) ;

      o.rect = o.el.getBoundingClientRect();
      o.x = o.el.offsetLeft;
      o.y = o.el.offsetTop;
      o.x_to = event.clientX;
      o.y_to = event.clientY;

      if( o.sumScroll ){
        o.y = o.y - o.sumScroll;
      }

      if( o.forceDim ){
        o.el.style.zIndex = 1000;
        o.el.style.width = o.rect.width + "px";
        o.el.style.height = o.rect.height + "px";
      }



      o.el.style.position = "absolute";
      o.el.style.margin = "initial";
      o.el.classList.add(o.classDragged);

      o.setPosElement(o.el, event.clientX, event.clientY);

      window.addEventListener('mousemove', o.listener.mousemove, false);
      window.addEventListener('mouseup', o.listener.mouseup, false);

      if (o.onDragStart instanceof Function) o.onDragStart(o, event);

    }
  };

  if (!o.event) {
    o.elHandle.addEventListener('mousedown', o.listener.mousedown, false);
  } else {
    o.listener.mousedown(event);
  }

}

/**
* Cumulative sum of all el parents.
*/
function sumScrollY(el) {
  var offsetY = 0;
  while (
    el instanceof Node &&
      (el = el.parentElement)
  ){offsetY+=el.scrollTop;}
  return offsetY;
}


/**
 * Test if el touch the given rect
 */
function elTouchRect(el, rect) {
  var rectA = el.getBoundingClientRect();
  var rectB = rect;
  var overlaps =
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top &&
    rectA.right > rectB.left &&
    rectA.left < rectB.right;
  return overlaps;
}

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
  );
  return el;
}
