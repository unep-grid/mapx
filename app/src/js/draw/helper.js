import { moduleLoad } from "./../modules_loader_async";
import { getMap } from "./../map_helpers";
import { makeId } from "./../mx_helper_misc.js";
import { spatialDataToView } from "./../mx_helper_map_dragdrop.js";
import { viewsListAddSingle } from "./../views_list_manager";

const drawConfig = {
  enabled: false,
  idButton: "btnDrawMode",
  position: "top-right",
  elBtn: null,
  draw: null,
  map: null,
};

export async function drawModeToggle(e) {
  const c = drawConfig;
  c.elBtn =
    e instanceof Event ? e.currentTarget : document.getElementById(c.idButton);
  c.map = getMap();

  if (drawConfig.enabled) {
    disableDraw();
  } else {
    await enableDraw();
  }
  return c.enabled;
}

async function initDraw() {
  const MapboxDraw = await moduleLoad("mapbox-gl-draw");
  const c = drawConfig;
  c.draw = new MapboxDraw();

  const drawBar = new extendDrawBar({
    draw: c.draw,
    buttons: [
      {
        on: "click",
        action: save,
        classes: ["fa", "fa-floppy-o"],
      },
    ],
  });
  c.map.addControl(drawBar, c.position);
  window.MapboxDraw = MapboxDraw;
  window.draw = c.draw;
  return c.draw;
}

function disableDraw() {
  var c = drawConfig;
  c.elBtn.classList.remove("active");
  c.map.removeControl(c.draw, c.position);
  c.draw = null;
  c.enabled = false;
  mx.helpers.setClickHandler({
    type: "draw",
    enable: c.enabled,
  });
}

async function enableDraw() {
  const c = drawConfig;
  c.enabled = true;
  c.elBtn.classList.add("active");
  if (c.draw) {
    disableDraw();
  }
  await initDraw();
  mx.helpers.setClickHandler({
    type: "draw",
    enable: c.enabled,
  });
}

async function save() {
  const c = drawConfig;
  const gj = c.draw.getAll();
  const fileName = `mx_draw_${makeId()}.geojson`;

  if (gj.features.length === 0) {
    return;
  }

  const view = await spatialDataToView({
    title: fileName,
    fileName: fileName,
    fileType: "geojson",
    data: gj,
    save: true,
  });

  await viewsListAddSingle(view, {
    open: true,
  });

  c.draw.deleteAll();
}

/**
 * Controls
 */

class extendDrawBar {
  constructor(opt) {
    const ctrl = this;
    ctrl.draw = opt.draw;
    ctrl.buttons = opt.buttons || [];
    ctrl.onAddOrig = opt.draw.onAdd;
    ctrl.onRemoveOrig = opt.draw.onRemove;
  }
  onAdd(map) {
    const ctrl = this;
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
    const ctrl = this;
    const elButton = document.createElement("button");
    elButton.className = "mapbox-gl-draw_ctrl-draw-btn";
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
