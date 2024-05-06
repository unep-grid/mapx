import { bindAll } from "../bind_class_methods";
import { ButtonPanel } from "../button_panel";
import { el } from "../el_mapx";
import { patchObject } from "../mx_helper_misc";
import "./style.css";

const settings = {
  id: "button_panel_legend_default",
  elContainer: document.body,
  panelFull: true,
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
    maxHeight: "calc(100% - 50px)",
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
    this._el_container = el("div", { class: "button-panel--legends" });
    this.elPanelContent.appendChild(this._el_container);
  }

  getContainer() {
    return this._el_container;
  }
}
