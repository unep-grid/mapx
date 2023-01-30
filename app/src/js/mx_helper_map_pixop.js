import { Spotlight } from "./pixop/spotlight.js";
import { RadialProgress } from "./radial_progress/index.js";
import { UAParser } from "ua-parser-js";
import { events } from "./mx.js";

let prog;

window.addEventListener(
  "load",
  () => {
    events.once("mapx_ready", () => {
      const uaparser = new UAParser();
      const isNotBlink = uaparser.getEngine().name !== "Blink";
      const elPixopTools = document.getElementById("highlight_tools_box");
      if (elPixopTools && isNotBlink) {
        elPixopTools.classList.add("disabled");
      }
    });
  },
  { once: true }
);

export function toggleSpotlight(opt) {
  const h = mx.helpers;
  const map = h.getMap();
  const clActive = "active";

  /**
   * Mendatory expected ui
   */
  const elToggleMain = document.getElementById("btnOverlapSpotlight");
  const elToggle = opt.currentTarget
    ? opt.currentTarget
    : h.isElement(opt.elToggle)
    ? opt.elToggle
    : elToggleMain;

  /*
   * Select number of layer
   */
  const elSelectNum =
    document.getElementById("selectNLayersOverlap") || h.el("select");
  /*
   * Text area
   */
  const elTextArea = document.getElementById("txtAreaOverlap") || h.el("span");
  /**
   * Text resol
   */
  const elTextResol =
    document.getElementById("txtResolOverlap") || h.el("span");
  /**
   * input checkbox to enable area estimation
   */
  const elEnableCalcArea =
    document.getElementById("checkEnableOverlapArea") ||
    h.el("input", { type: "checkbox" });

  /**
   * Default
   */
  opt = Object.assign(
    {
      enable: !elToggle.classList.contains(clActive),
      calcArea: !!elEnableCalcArea.checked,
      nLayers: elSelectNum.value,
    },
    opt
  );

  /*
   * Update UI
   */
  if (elEnableCalcArea) {
    elEnableCalcArea.checked = opt.calc;
  }
  elToggle.checked = opt.enable;

  if (elSelectNum) {
    elSelectNum.value = opt.nLayers;
  }

  if (!(prog instanceof RadialProgress)) {
    prog = new RadialProgress(elToggle, {
      radius: 20,
      stroke: 2,
      strokeColor: "red",
    });
  }

  /**
   * Spotlight config
   */
  const config = {
    map: map,
    enabled: () => {
      return !!elToggle.checked;
    },
    nLayersOverlap: () => {
      return elSelectNum ? elSelectNum.value * 1 : 1;
    },
    calcArea: () => {
      return elEnableCalcArea ? !!elEnableCalcArea.checked : false;
    },
    onCalcArea: (area) => {
      if (!elEnableCalcArea) {
        return;
      }
      let resol = mx.spotlight.getResolution();
      if (h.isElement(elTextArea) && h.isElement(elTextResol)) {
        const areaKm = Math.round(area * 1e-6);
        const resolLat = formatDist(resol.lat);
        const resolLng = formatDist(resol.lng);
        elTextArea.innerText = `~ ${areaKm} km2`;
        elTextResol.innerText = `~ ${resolLat} x ${resolLng}`;
      }
    },
    onProgress: (p) => {
      prog.update(p * 100);
      if (p * 100 === 100) {
        prog.update(0);
      }
      mx.events.fire({
        type: "highlight_progress",
        data: {
          progress: p,
        },
      });
    },
    onRendered: (px) => {
      h.setBusy(false);
      px.setOpacity(0.5);
    },
    onRender: (px) => {
      h.setBusy(true);
      px.setOpacity(0.1);
    },
  };

  if (!opt.enable) {
    /**
     * Remove active class
     */
    elToggle.classList.remove(clActive);
    destroy();
  } else {
    /**
     * Remove active class
     */
    elToggle.classList.add(clActive);

    /**
     * Create if needed
     */
    if (!(mx.spotlight instanceof Spotlight) || mx.spotlight.isDestroyed()) {
      mx.spotlight = new Spotlight(config);

      if (elEnableCalcArea) {
        mx.listeners.addListener({
          target: elEnableCalcArea,
          type: "change",
          idGroup: "spotlight_pixop_ui",
          callback: render,
        });
      }
      if (elSelectNum) {
        mx.listeners.addListener({
          target: elSelectNum,
          type: "change",
          idGroup: "spotlight_pixop_ui",
          callback: render,
        });
      }
      /**
       * Destroy if other changes
       */
      map.on("movestart", clear);
      map.on("moveend", render);
      map.on("styledata", render);
    }

    /**
     * Render if non spatial change
     */
    render();
  }

  mx.events.fire({
    type: "highlight_update",
    data: opt,
  });

  return opt;
}

function formatDist(v, squared) {
  v = v || 0;
  squared = squared || false;
  const suffix = squared ? "2" : "";
  const factor = squared ? 1e-6 : 1e-3;

  if (v > 1000) {
    return Math.round(v * factor * 1000) / 1000 + " km" + suffix;
  } else {
    return Math.round(v * 1000) / 1000 + " m" + suffix;
  }
}

function clear() {
  mx.spotlight.clear();
}

let idTimeout = 0;

function render() {
  clearTimeout(idTimeout);
  idTimeout = setTimeout(() => {
    mx.spotlight.render();
  }, 100);
}

function destroy() {
  if (mx.spotlight instanceof Spotlight) {
    mx.spotlight.destroy();
    const map = mx.spotlight.pixop.map;
    map.off("moveend", render);
    map.off("movestart", clear);
    map.off("styledata", render);
    mx.listeners.removeListenerByGroup("spotlight_pixop_ui");
  }
}
