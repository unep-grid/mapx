import { patchObject } from "../mx_helper_misc";
import { ButtonPanel } from "./../button_panel";
import { ButtonsControls } from "./buttons_controls.js";
import { generateButtons } from "./mapx_buttons.js";
import "./style.less";

/**
 * MapX map controls panel
 */
const settings = {
  controls: {},
  panel: {
    useCompact: false,
    id: "controls_panel",
    elContainer: document.body,
    position: "top-right",
    noHandles: true,
    button_text: "btn_panel_controls",
    button_lang_key: "btn_panel_controls",
    tooltip_position: "bottom-left",
    save_size_on_resize: false,
    resize_on_exclusive: false,
    handles: ["free"],
    container_classes: [
      "button-panel--container-no-full-width",
      //"button-panel--pinned-always" // mess with dashbpards,
    ],
    item_content_classes: ["button-panel--item-content-transparent-background"],
    panel_style: {
      marginTop: "40px",
    },
    container_style: {
      width: "110px",
      height: "500px",
      minWidth: "110px",
      minHeight: "110px",
      maxHeight: "calc(100% - 50px)",
      maxWidth: "calc(100% - 50px)",
    },
  },
};

class ControlsPanel {
  constructor(opt) {
    const cp = this;
    cp.opt = patchObject(settings, { ...opt });
    cp.sizeOptimizer = cp.sizeOptimizer.bind(cp);
    cp.init();
  }

  // Panel initialization
  init() {
    const cp = this;
    const buttons = generateButtons();
    cp.controls = new ButtonsControls(buttons);
    cp.panel = new ButtonPanel(cp.opt.panel);
    cp.panel.elPanelContent.appendChild(cp.controls.elGroup);

    // Set up event listeners
    cp.panel.on("resize-end", cp.sizeOptimizer);
    cp.panel.on("reset-style", cp.sizeOptimizer);
    cp.controls.on("register", cp.sizeOptimizer);
    cp.controls.on("unregister", cp.sizeOptimizer);
    window.addEventListener("resize", cp.sizeOptimizer);

    // Run initial size optimization after setup
    cp.sizeOptimizer();
  }
  /**
   * Controls -> get control by id
   * @param {string} id  ctrl id
   */
  get(id) {
    return this.controls.getButton(id);
  }

  /*
   * controls -> register
   * @param {object} ctrl ctrl/button to register
   */
  register(ctrl) {
    return this.controls.register(ctrl);
  }

  destroy() {
    const cp = this;
    cp.panel.destroy();
    cp.controls.destroy();
    window.removeEventListener("resize", cp.sizeOptimizer);
  }

  sizeOptimizer() {
    const cp = this;
    clearTimeout(cp._size_opt_to);
    cp._size_opt_to = setTimeout(() => {
      cp.panel.resizeAuto("content-parent");
    }, 400);
  }
}

export { ControlsPanel };
