var drawConfig = {
  enabled: false,
  position: 'top-right',
  elBtn: null,
  draw: null
};

export function drawModeToggle(e) {
  const h = mx.helpers;
  var c = drawConfig;
  c.elBtn = e.currentTarget;
  c.map = h.getMap();

  if (drawConfig.enabled) {
    disableDraw();
  } else {
    enableDraw();
  }
}

function initDraw() {
  var c = drawConfig;
  return mx.helpers.moduleLoad('mapbox-gl-draw').then((MapboxDraw) => {
    c.draw = new MapboxDraw();

    var drawBar = new extendDrawBar({
      draw: c.draw,
      buttons: [
        {
          on: 'click',
          action: save,
          classes: ['fa', 'fa-floppy-o']
        }
      ]
    });

    c.map.addControl(drawBar, c.position);

    c.map.on('draw.delete', function() {
      console.log('deleted');
    });

    window.MapboxDraw = MapboxDraw;
    window.draw = c.draw;
    return c.draw;
  });
}

function disableDraw() {
  var c = drawConfig;
  c.elBtn.classList.remove('active');
  c.map.removeControl(c.draw, c.position);
  c.draw = null;
  c.enabled = false;
  mx.helpers.setClickHandler({
    type: 'draw',
    enable: c.enabled 
  });
}

function enableDraw() {
  var c = drawConfig;
  c.enabled = true;
  c.elBtn.classList.add('active');
  if (c.draw){
    disableDraw();
  }
  initDraw();
  mx.helpers.setClickHandler({
    type: 'draw',
    enable: c.enabled 
  });
}

function save() {
  var c = drawConfig;
  var gj = c.draw.getAll();
  var fileName = 'MX-GJ-' + mx.helpers.makeId(10) + '.geojson';

  if (gj.features.length === 0) {
    return;
  }

  return mx.helpers
    .saveSpatialDataAsView({
      title : 'New layer ' + (new Date()).toLocaleString() ,
      fileName: fileName,
      fileType: 'geojson',
      data: gj
    })
    .then(() => {
      c.draw.deleteAll();
    });
}

/**
 * Controls
 */

class extendDrawBar {
  constructor(opt) {
    let ctrl = this;
    ctrl.draw = opt.draw;
    ctrl.buttons = opt.buttons || [];
    ctrl.onAddOrig = opt.draw.onAdd;
    ctrl.onRemoveOrig = opt.draw.onRemove;
  }
  onAdd(map) {
    let ctrl = this;
    ctrl.map = map;
    ctrl.elContainer = ctrl.onAddOrig(map);
    ctrl.buttons.forEach((b) => {
      ctrl.addButton(b);
    });
    return ctrl.elContainer;
  }
  onRemove(map) {
    ctrl.buttons.forEach((b) => {
      ctrl.removeButton(b);
    });
    ctrl.onRemoveOrig(map);
  }
  addButton(opt) {
    let ctrl = this;
    var elButton = document.createElement('button');
    elButton.className = 'mapbox-gl-draw_ctrl-draw-btn';
    if (opt.classes instanceof Array) {
      opt.classes.forEach((c) => {
        elButton.classList.add(c);
      });
    }
    elButton.addEventListener(opt.on, opt.action);
    ctrl.elContainer.appendChild(elButton);
    opt.elButton = elButton;
  }
  removeButton(opt) {
    opt.elButton.removeEventListener(opt.on, opt.action);
    opt.elButton.remove();
  }
}
