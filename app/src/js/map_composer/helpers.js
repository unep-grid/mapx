/**
 * Helpers
 */
import interact from 'interactjs';
import {el} from '@fxi/el';
//import {onNextFrame, cancelFrame} from '../mx_helper_animation_frame.js';
//var idFrame = 0;

export function makeInteract(obj) {
  // performance issue with styleCursor;
  obj.interact = interact(obj.el).styleCursor(false);
  //obj.interact = interact(obj.el);
}

export function addResizable(obj) {
  //var res = obj.options.layout.resolution;

  return obj.interact
    .resizable({
      edges: {
        left: '.mc-handle-resize-left',
        right: '.mc-handle-resize-right',
        bottom: '.mc-handle-resize-bottom',
        top: '.mc-handle-resize-top'
      },
      modifiers: [
        interact.modifiers.restrictEdges({
          restriction: obj.container.el,
          endOnly: true
        }),
        interact.modifiers.snap({
          targets: [
            function(x, y) {
              var c = obj.container;
              x = Math.round(x / 5) * 5 + c.resOffset.x;
              y = Math.round(y / 5) * 5 + c.resOffset.y;
              return {
                x: x,
                y: y
              };
            }
          ],
          relativePoints: [{x: 0, y: 0}]
        }),
        interact.modifiers.restrictEdges({
          restriction: obj.container.el,
          endOnly: true
        }),
        interact.modifiers.restrictSize({
          min: {width: 20, height: 20}
        })
      ],

      inertia: false
    })
    .on('resizemove', onResize)
    .on('resizemove', obj.onResize.bind(obj));
}

export function addDraggable(obj) {
  //var res = obj.options.layout.resolution;
  return obj.interact
    .draggable({
      allowFrom: '.mc-handle-drag',
      modifiers: [
        interact.modifiers.snap({
          targets: [
            function(x, y) {
              var c = obj.container;
              x = Math.round(x / 5) * 5 + c.resOffset.x;
              y = Math.round(y / 5) * 5 + c.resOffset.y;
              return {
                x: x,
                y: y
              };
            }
          ],
          relativePoints: [{x: 0, y: 0}]
        }),
        interact.modifiers.restrict({
          restriction: obj.container.el,
          elementRect: {top: 0, left: 0, bottom: 1, right: 1}
        })
      ]
    })
    .on('dragmove', onDrag);
}

export function onResize(event) {
  //cancelFrame(idFrame);
  //idFrame = onNextFrame(() => {
    var target = event.target;
    var data = target._mc;
    if (!data) {
      return;
    }
    var x = data.x || 0;
    var y = data.y || 0;

    // update the element's style
    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';

    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;

    target.style.webkitTransform = target.style.transform =
      'translate3d(' + x + 'px,' + y + 'px,0)';

    data.x = x;
    data.y = y;
  //});
}

export function onDrag(event) {
  //cancelFrame(idFrame);
  //idFrame = onNextFrame(() => {
    var target = event.target;
    var data = target._mc;
    if (!data) {
      return;
    }
    var x = (data.x || 0) + event.dx;
    var y = (data.y || 0) + event.dy;
    // translate the element
    target.style.webkitTransform = target.style.transform =
      'translate3d(' + x + 'px, ' + y + 'px,0)';

    // update the posiion attributes
    data.x = x;
    data.y = y;
  //});
}

export function mapNorthArrow() {}

mapNorthArrow.prototype.onAdd = function(map) {
  var elArrow;
  var imgSvg = require('./arrow-north.svg');

  var elNorthCtrl = el(
    'div',
    {
      class: 'mapboxgl-ctrl'
    },
    (elArrow = el('img', {
      src: imgSvg,
      class: 'mc-map-arrow',
      style: {
        width: '20px',
        height: '20px',
        transformOrigin: '50% 50% 0'
      }
    }))
  );

  map.on('rotate', function() {
    var b = map.getBearing();
    elArrow.style.transform = 'rotate(' + -b + 'deg)';
  });

  this._container = elNorthCtrl;

  return this._container;
};

mapNorthArrow.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};
