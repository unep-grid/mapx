import { Button } from "./button.js";
import screenfull from "screenfull";
import { mapComposerModalAuto } from "./../map_composer";
import {
  getMap,
  getLayerNamesByPrefix,
  setMapProjection,
} from "./../map_helpers/index.js";
import { ShareModal } from "./../share_modal/index.js";
import {
  storyMapLock,
  storyClose,
} from "./../story_map/index.js";
import { settings } from "./../settings";
import { theme, draw } from "./../mx.js";
import { IssueReporterClient } from "../issue_reporter/index.js";
import { modalIframe } from "../modal_iframe/index.js";
import { GeocoderModal } from "../geocoder/modal.js";

export function generateButtons() {
  return [
    new Button({
      key: "btn_story_close",
      display: false,
      classesIcon: ["fa", "fa-arrow-left"],
      action: storyClose,
    }),
    new Button({
      key: "btn_story_unlock_map",
      display: false,
      classesIcon: ["fa", "fa-lock"],
      action: storyMapLock,
    }),
    new Button({
      key: "btn_zoom_in",
      classesIcon: ["fa", "fa-plus"],
      action: () => {
        const map = getMap();
        map.zoomIn();
      },
    }),
    new Button({
      key: "btn_zoom_out",
      classesIcon: ["fa", "fa-minus"],
      action: () => {
        const map = getMap();
        map.zoomOut();
      },
    }),
    new Button({
      key: "btn_map_rotate_left",
      classesIcon: ["fa", "fa-rotate-left"],
      action: () => {
        const map = getMap();
        const b = map.getBearing();
        map.flyTo({ bearing: b + 30 });
      },
    }),
    new Button({
      key: "btn_map_rotate_right",
      classesIcon: ["fa", "fa-rotate-right"],
      action: () => {
        const map = getMap();
        const b = map.getBearing();
        map.flyTo({ bearing: b - 30 });
      },
    }),
    new Button({
      key: "btn_north_arrow",
      classesIcon: ["mx-north-arrow", "mx-icon"],
      action: () => {
        const map = getMap();
        map.easeTo({ bearing: 0, pitch: 0 });
      },
    }),

    new Button({
      key: "btn_fullscreen",
      classesIcon: ["fa", "fa-expand"],
      classesButton: ["btn-ctrl--item-no-mobile"],
      action: toggleFullScreen,
    }),
    new Button({
      key: "gc_geocoder",
      classesIcon: ["fa", "fa-search"],
      action: async () => {
        const gcm = new GeocoderModal();
        await gcm.init();
      },
    }),
    new Button({
      key: "btn_toggle_theme_dark",
      classesIcon: ["fa", "fa-moon-o"],
      classesIconActive: ["fa", "fa-sun-o"],
      onInit: (btn) => {
        theme.registerButton(btn, "dark");
      },
    }),
    new Button({
      key: "btn_toggle_theme_tree",
      classesIcon: ["fa", "fa-tree"],
      onInit: (btn) => {
        theme.registerButton(btn, "tree");
      },
    }),
    new Button({
      key: "btn_toggle_theme_water",
      classesIcon: ["mx-water","mx-icon"],
      onInit: (btn) => {
        theme.registerButton(btn, "water");
      },
    }),
    new Button({
      key: "btn_3d_terrain",
      classesIcon: ["mx-mountain","mx-icon"],
      action: function (cmd) {
        const btn = this;
        const action = typeof cmd === "string" ? cmd : "toggle";
        let enabled;

        switch (action) {
          case "hide":
          case "disable":
            enabled = false;
            break;
          case "show":
          case "enable":
            enabled = true;
            break;
          default:
            enabled = !btn.isActive();
        }

        if (enabled) {
          btn.enable();
          theme.enableTopography();
        } else {
          btn.disable();
          theme.disableTopography();
        }
        return enabled;
      },
    }),
    new Button({
      key: "btn_theme_sat",
      classesIcon: ["fa", "fa-plane"],
      action: function (cmd) {
        const btn = this;
        cmd = typeof cmd === "string" ? cmd : "toggle";
        if (cmd === "hide") {
          theme.disableSatellite();
          btn.elButton.classList.remove("active");
        } else if (cmd === "show") {
          theme.enableSatellite();
          btn.elButton.classList.add("active");
        } else {
          theme.toggleSatellite();
          btn.elButton.classList.toggle("active");
        }
      },
    }),
    new Button({
      key: "btn_globe",
      classesIcon: ["fa", "fa-globe"],
      action: async function (cmd) {
        const choice = ["toggle", "enable", "disable"];
        await setMapProjection({
          globe: choice.includes(cmd) ? cmd : "toggle",
          origin: "button",
        });
      },
    }),
    new Button({
      key: "btn_map_composer",
      classesIcon: ["fa", "fa-map-o"],
      classesButton: ["btn-ctrl--item-no-mobile"],
      action: mapComposerModalAuto,
    }),
    new Button({
      key: "draw_btn_toggle",
      classesIcon: ["mx-draw--btn-edit","mx-icon"],
      classesButton: ["btn-ctrl--item-no-mobile"],
      action: () => {
        draw.toggle();
      },
    }),
    new Button({
      key: "btn_share",
      classesIcon: ["fa", "fa-share-alt"],
      action: () => {
        new ShareModal();
      },
    }),
    new Button({
      key: "btn_report",
      classesIcon: ["fa", "fa-flag"],
      action: async () => {
        const ir = new IssueReporterClient();
        await ir.init();
      },
    }),
    new Button({
      key: "btn_doc_wiki",
      classesIcon: ["fa", "fa-book"],
      action: () => {
        return modalIframe({
          doc_id: "doc_home",
        });
      },
    }),
    new Button({
      key: "btn_source_code",
      classesIcon: ["fa", "fa-github", "fa-2x"],
      action: () => {
        window.open(settings.links.repository, "_blank");
      },
    }),
    new Button({
      key: "btn_about",
      classesIcon: ["fa", "fa-info"],
      action: async () => {
        // replace ./../../md/disclaimer.md
        return modalIframe({
          doc_id: "doc_legal_notice",
        });
      },
    }),
  ];
}

/**
 * Helpers
 * NOTE: If use 'this', function must be named. Anonymous,
 * even 'bound', do not have 'this' in event callback;
 */

function toggleFullScreen() {
  const btn = this;
  const enabled = !!btn._fullscreen;
  const cl = btn.elButton.classList;
  if (enabled) {
    cl.add("fa-expend");
    cl.remove("fa-compress");
    screenfull.exit();
    btn._fullscreen = false;
  } else {
    cl.remove("fa-expend");
    cl.add("fa-compress");
    screenfull.request();
    btn._fullscreen = true;
  }
}

/**
 * Toggle visibility for existing layer in style
 * TODO: This is quite messy : simplify, generalize
 * @param {Object} opt options
 * @param {String} opt.idLayer Layer id to toggle
 * @param {Button} opt.button Button to add 'active' class
 * @param {String} opt.action hide, show, toggle
 * @return {String} Toggled
 */
function toggleLayer(opt) {
  const def = {
    action: "toggle",
  };
  opt = Object.assign({}, def, opt);
  const altLayers = [];
  const map = getMap();
  const btn = opt.button;
  const layer = map.getLayer(opt.idLayer);
  if (!layer) {
    return false;
  }
  const isAerial = opt.idLayer === "mapbox_satellite";
  const isVisible = layer.visibility === "visible";
  const reqShow = opt.action === "show";
  const reqHide = opt.action === "hide";
  const reqToggle = opt.action === "toggle";
  const toShow = reqToggle ? !isVisible : reqShow || !reqHide;

  if (isAerial) {
    /**
     * Special case : aerial mode should not have hillshading or bathymetry.
     */
    altLayers.push(...getLayerNamesByPrefix({ prefix: "hillshading" }));
    altLayers.push(...getLayerNamesByPrefix({ prefix: "bathymetry" }));
    map.setLayoutProperty(
      opt.idLayer,
      "visibility",
      toShow ? "visible" : "none",
    );
  }

  for (let id of altLayers) {
    map.setLayoutProperty(id, "visibility", toShow ? "none" : "visible");
  }
  if (btn) {
    if (toShow) {
      btn.enable();
    } else {
      btn.disable();
    }
  }
  return toShow;
}
