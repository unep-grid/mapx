import { modal } from "./../../mx_helper_modal";
import { SelectAuto } from "../../select_auto";
import { el, elSpanTranslate, elButtonFa, elAlert } from "./../../el_mapx";
import { getLanguageCurrent, getLanguageItem } from "./../../language";
import { isEmail, isArray, isNotEmpty } from "../../is_test";
import { FlashItem } from "../../icon_flash";
import { isSourceDownloadable } from "../../map_helpers";
import { getSourceMetadata } from "../../metadata/utils.js";
import { EventSimple } from "../../event_simple";
import { ws, nc } from "../../mx.js";
import { buildForm } from "./form.js";

const options = {
  idSource: null,
  idSocket: null,
  idUser: null,
  idProject: null,
  token: null,
  email: null,
  format: "GPKG",
  epsgCode: 4326,
  filename: null,
  iso3codes: [],
  language: "en",
};

export class DownloadSourceModal extends EventSimple {
  constructor(opt) {
    super();
    const md = this;
    md.close = md.close.bind(md);
    md.download = md.download.bind(md);
    md.validate = md.validate.bind(md);
    md.update = md.update.bind(md);
    md.init(opt).catch(console.error);
  }

  async init(opt) {
    const md = this;

    if (md._init) {
      return;
    }
    md._init = true;

    if (window._download_source_modal instanceof DownloadSourceModal) {
      window._download_source_modal.close();
    }
    window._download_source_modal = md;

    md._opt = Object.assign({}, options, opt);
    md._select_auto_store = [];
    const isDownloadable = await isSourceDownloadable(md._opt.idSource);
    if (!isDownloadable) {
      return md.buildNotAllowed();
    }
    if (!opt.language) {
      md._opt.language = getLanguageCurrent();
    }

    if (!opt.filename) {
      const meta = await getSourceMetadata(md._opt.idSource);
      if (isNotEmpty(meta)) {
        const mainMeta = meta[0];
        md._opt.filename = getLanguageItem(
          mainMeta?.text?.title || {},
          md._opt.language,
        );
      }
    }

    await md.build();
    md.fire("init");
    return true;
  }

  close() {
    const md = this;
    if (md._closed) {
      return;
    }
    md._closed = true;
    for (const select_auto of md._select_auto_store) {
      if (select_auto.destroy) {
        select_auto.destroy();
      }
    }
    md._modal.close();
    md.fire("closed");
  }

  async download() {
    try {
      const md = this;
      const opt = md._opt;
      const formIsValid = md.isValid();
      if (formIsValid) {
        ws.emit("/client/source/download", opt);
        nc.panel.open();
        md.close();
        new FlashItem("bell");
        return true;
      }
    } catch (e) {
      console.error(e);
    }
  }

  update(id) {
    /* argument "id" can be change event from form update */
    const md = this;
    const formData = new FormData(md._el_form);
    const ids = Object.keys(md._opt);
    const isSingleUpdate = ids.includes(id);

    /* partial update  */
    if (isSingleUpdate) {
      const value = md.isMultiple(id) ? formData.getAll(id) : formData.get(id);
      md._opt[id] = value;
      md.validate();
      return;
    }
    /* full update  */
    for (const id of formData.keys()) {
      md._opt[id] = md.isMultiple(id) ? formData.getAll(id) : formData.get(id);
    }
    md.validate();
    md.fire("updated");
  }

  isMultiple(id) {
    return isArray(options[id]);
  }

  validate() {
    const md = this;
    const opt = md._opt;
    const msgs = [];

    /**
     * Tests
     */
    if (!isEmail(opt.email)) {
      msgs.push({
        type: "danger",
        key: "dl_error_email_not_valid",
      });
    }

    md._valid = msgs.length === 0;
    md._validate_msgs(msgs);

    /**
     * Enable buttons
     */
    md.allowBtnDownload(md._valid);

    /* return result */
    return msgs;
  }

  _validate_msgs(msgs) {
    const md = this;
    /**
     * Display messages
     */
    const elMsgContainer = md._el_msg_container;
    while (elMsgContainer.firstElementChild) {
      elMsgContainer.firstElementChild.remove();
    }
    for (const msg of msgs) {
      const elMsg = elAlert(msg.key, msg.type, msg.data);
      elMsgContainer.appendChild(elMsg);
    }
  }

  isValid() {
    return !!this._valid;
  }

  async buildNotAllowed() {
    const md = this;
    md._modal = modal({
      title: elSpanTranslate("dl_title_not_allowed"),
      content: el("div", elSpanTranslate("dl_title_not_allowed")),
      onClose: md.close,
      addSelectize: false,
      noShinyBinding: true,
    });
    md.fire("built");
  }

  async build() {
    const md = this;
    const {
      elMsgContainer,
      elForm,
      elFormEpsg,
      elFormFormat,
      elFormCountries,
    } = buildForm(md);

    /**
     * Validation message and form
     */
    md._el_msg_container = elMsgContainer;
    md._el_form = elForm;

    /**
     * Modal buttons
     */
    md._el_button_close = elButtonFa("btn_close", {
      icon: "times",
      action: md.close,
    });
    md._el_button_download = elButtonFa("btn_download", {
      icon: "download",
      action: md.download,
    });

    const elModalButtons = [md._el_button_close, md._el_button_download];

    /**
     * Modal content
     */
    const elContent = el("div", [elForm, elMsgContainer]);

    md._modal = modal({
      title: elSpanTranslate("dl_title"),
      content: elContent,
      onClose: md.close,
      buttons: elModalButtons,
      removeCloseButton: true,
      addBackground: true,
      addSelectize: false,
      noShinyBinding: true,
    });

    /**
     * Build drop down select
     */
    const selectEpsg = new SelectAuto(elFormEpsg);
    const selectFormat = new SelectAuto(elFormFormat);
    const selectCountries = new SelectAuto(elFormCountries);
    const promInit = [
      selectFormat.init(),
      selectEpsg.init(),
      selectCountries.init(),
    ];
    md._select_auto_store.push(selectEpsg);
    md._select_auto_store.push(selectFormat);
    md._select_auto_store.push(selectCountries);

    for (const select_auto of md._select_auto_store) {
      if (!select_auto._built) {
        await select_auto.once("built");
      }
    }

    await Promise.all(promInit);

    md.fire("built");
  }

  /**
   * Helpers
   */
  setAttrDisable(target, disable) {
    if (disable) {
      target.setAttribute("disabled", true);
    } else {
      target.removeAttribute("disabled");
    }
  }
  allowBtnDownload(enable) {
    const md = this;
    md.setAttrDisable(md._el_button_download, !enable);
  }
}
