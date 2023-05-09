import { modalSimple } from "./../mx_helper_modal.js";
import { el, elSelect, elButtonFa } from "./../el_mapx/index.js";
import { moduleLoad } from "./../modules_loader_async/index.js";
import * as template_maplibre_simple from "./templates/maplibre_gl_app.html";
import { getDictItem } from "../language/index.js";
import { getViewMapboxStyle, getViewSldStyle } from "./../style_vt";

import { parseTemplate } from "./../mx_helper_misc";
import { FlashItem } from "../icon_flash/index.js";
import {
  getViewsBounds,
  getView,
  getStyleBaseMap,
} from "../map_helpers/index.js";
import { isViewVtWithStyleCustom } from "../is_test/index.js";
import { downloadHTML, downloadJSON } from "../download/index.js";

export class ModalCodeIntegration {
  constructor(idView, config) {
    const mci = this;
    mci._config = Object.assign(
      {},
      { idView: idView, darkMode: false },
      config
    );
    mci.updateCode = mci.updateCode.bind(mci);
    mci.updateLayout = mci.updateLayout.bind(mci);
    mci.destroy = mci.destroy.bind(mci);
    mci.copy = mci.copy.bind(mci);
    mci.download = mci.download.bind(mci);
  }
  async init() {
    const mci = this;
    try {
      await mci.build();
    } catch (e) {
      console.error(e);
    }
    return mci;
  }

  destroy() {
    const mci = this;
    if (mci._destroyed) {
      return;
    }
    mci._destroyed = true;
    const model = mci.editor.getModel();
    if (model) {
      model.dispose();
    }
    mci._modal.close();
  }

  async build() {
    const mci = this;

    mci._el_select = elSelect("code_integration_select_template", {
      action: mci.updateCode,
      items: mci.templates.map((t) => {
        return el(
          "option",
          {
            value: t.id,
          },
          getDictItem(t.key)
        );
      }),
    });
    mci._el_code = el("div", {
      style: { width: "100%", flex: 1, overflow: "hidden" },
    });
    mci._el_form = el(
      "form",
      {
        style: {
          display: "flex",
          "flex-direction": "column",
          width: "100%",
          height: "100%",
          flex: 1,
        },
      },
      [mci._el_select, mci._el_code]
    );

    const elButtonCopy = elButtonFa("btn_copy", {
      icon: "clipboard",
      action: mci.copy,
    });
    const elButtonDownload = elButtonFa("btn_download", {
      icon: "download",
      action: mci.download,
    });
    const elButtonClose = elButtonFa("btn_close", {
      icon: "times",
      action: mci.destroy,
    });

    const buttons = [elButtonClose, elButtonCopy, elButtonDownload];

    mci._modal = modalSimple({
      title: "code share",
      content: mci._el_form,
      onClose: mci.destroy,
      removeCloseButton: true,
      buttons: buttons,
      style: {
        height: "500px",
      },
      onMutation: mci.updateLayout,
    });
    const monaco = await moduleLoad("monaco-editor");
    mci._monaco = monaco;
    mci._editor = monaco.editor;
    mci._editor = monaco.editor.create(mci._el_code, {
      value: "",
      language: "html",
      theme: mci._config.darkMode ? "vs-dark" : "vs-light",
    });
    await mci.updateCode();
  }

  updateLayout(mut) {
    const mci = this;
    if (mci.editor && mut.type === "attributes") {
      clearTimeout(mci._updating_layout_to);
      mci._updating_layout_to = setTimeout(() => {
        mci.editor.layout();
      }, 150);
    }
  }

  get idTemplate() {
    const mci = this;
    const idTemplate = mci.formdata.get("code_integration_select_template");
    return idTemplate;
  }

  async getData() {
    const mci = this;
    const idTemplate = mci.idTemplate;
    const tData = await mci.getTemplateData(idTemplate);
    return tData;
  }

  async updateCode() {
    const mci = this;
    const data = await mci.getData();
    const model = mci.editor.getModel();
    await mci._monaco.editor.setModelLanguage(model, data.language);
    await model.setValue(data.str);
    if (data.language !== "json") {
      await mci.editor.getAction("editor.action.formatDocument").run();
    }
  }

  copy() {
    const mci = this;
    navigator.clipboard.writeText(mci.code);
    new FlashItem("clipboard");
  }

  async download() {
    const mci = this;
    const data = await mci.getData();
    let done;
    switch (data.language) {
      case "json":
        done = await downloadJSON(data.str, "mapx.json");
        break;
      case "html":
        done = await downloadHTML(data.str, "index.html");
        break;
      default:
        null;
    }
    if (done) {
      new FlashItem("download");
    }
  }

  get formdata() {
    const mci = this;
    const data = new FormData(mci._el_form);
    return data;
  }

  get type() {
    return this._el_select.value;
  }

  get code() {
    return this._editor.getValue();
  }

  get editor() {
    return this._editor;
  }

  get templates() {
    const mci = this;
    const view = getView(mci._config.idView);
    const isCustom = isViewVtWithStyleCustom(view);
    const base = [
      {
        id: "template_maplibre_simple_app",
        key: "code_integration_template_maplibre_simple_app",
      },
      {
        id: "template_mapbox_layers",
        key: "code_integration_template_mapbox_layers",
      },
      {
        id: "template_mapbox_style",
        key: "code_integration_template_mapbox_style",
      },
      {
        id: "template_mapbox_style_basemap",
        key: "code_integration_template_mapbox_style_basemap",
      },
    ];
    if (!isCustom) {
      base.push({
        id: "template_sld_layers",
        key: "code_integration_template_sld_layers",
      });
    }
    return base;
  }

  async getTemplateData(id) {
    const mci = this;
    const out = {
      str: "",
      language: "html",
    };

    const style = await getViewMapboxStyle(mci._config.idView);

    switch (id) {
      case "template_maplibre_simple_app":
        const bounds = await getViewsBounds(mci._config.idView);
        out.str = parseTemplate(template_maplibre_simple, {
          title: style.name,
          style: JSON.stringify(style, 0, 2),
          version: "1.15.2",
          bounds: JSON.stringify(bounds || [-180, 90, 180, -90]),
        });
        out.str = out.str;
        out.language = "html";
        break;
      case "template_mapbox_layers":
        out.str = JSON.stringify(style.layers, 0, 2);
        out.language = "json";
        break;
      case "template_mapbox_style":
        out.str = JSON.stringify(style, 0, 2);
        out.language = "json";
        break;
      case "template_mapbox_style_basemap":
        const styleBaseMap = getStyleBaseMap();
        out.str = JSON.stringify(styleBaseMap, 0, 2);
        out.language = "json";
        break;
      case "template_sld_layers":
        const styleSld = await getViewSldStyle(mci._config.idView);
        out.str = styleSld;
        out.language = "html";
    }

    return out;
  }
}
