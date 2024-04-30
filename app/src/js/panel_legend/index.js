import { bindAll } from "../bind_class_methods";
import { ButtonPanel } from "../button_panel";
import { el } from "../el_mapx";
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
    width: "300px",
    height: "300px",
    minWidth: "200px",
    minHeight: "200px",
    maxWidth: "50vw",
  },
};

export class ButtonPanelLegend extends ButtonPanel {
  constructor(opt) {
    opt = Object.assign({}, settings, opt);
    super(opt);
    const panel = this;
    panel.buildWrapper();
    bindAll(panel);
    panel.saveSize();
  }

  buildWrapper() {
    this._el_container = el("div", { class: "button-panel--legends" });
    this.elPanelContent.appendChild(this._el_container);
  }

  getContainer() {
    return this._el_container;
  }
}
