import { ControlsPanel } from "./index.js";

const config = {
  panel: {
    id: "controls_panel",
    elContainer: document.body,
    position: "top-right",
    noHandles: true,
    button_text: "btn_panel_controls",
    button_lang_key: "btn_panel_controls",
    tooltip_position: "bottom-left",
    handles: ["free"],
    container_classes: [
      "button-panel--container-no-full-width",
      "button-panel--pinned-always",
    ],
    item_content_classes: ["button-panel--item-content-transparent-background"],
    panel_style: {
      marginTop: "40px",
    },
    container_style: {
      width: "100px",
      height: "400px",
      minWidth: "49px",
      minHeight: "49px",
    },
  },
};

export class ControlsPanelInstance extends ControlsPanel {
  constructor() {
    super(config);
  }
}
