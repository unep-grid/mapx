import { bindAll } from "../bind_class_methods";
import { ButtonPanel } from "../button_panel";
import { patchObject } from "../mx_helper_misc";
import "./style.less";

const settings = {
  id: "button_panel_legend_default",
  elContainer: document.body,
  useCompact: true,
  position: "bottom-left",
  tooltip_position: "right",
  button_lang_key: "button_legend_button",
  button_classes: ["fa", "fa-list-ul"],
  container_classes: ["button-panel--container-no-full-width"],
  container_style: {
    width: "330px",
    height: "100px",
    minWidth: "100px",
    minHeight: "100px",
    maxWidth: "50%",
    maxHeight: "calc(100% - 60px)",
  },
  save_size_on_resize: false,
};

export class ButtonPanelLegend extends ButtonPanel {
  constructor(opt) {
    opt = patchObject(settings, { ...opt });
    super(opt);
    const panel = this;
    panel.buildContent();
    bindAll(panel);
  }

  buildContent() {
    this.elPanelContent.classList.add("button-panel--legends");
  }

  getContainer() {
    return this.elPanelContent;
  }
}
