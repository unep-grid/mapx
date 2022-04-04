import { modal } from "./../mx_helper_modal";
import { SelectAuto } from "../select_auto";
import { buildForm } from "./form.js";
import { el, elSpanTranslate, elButtonFa, elAlert } from "./../el_mapx";
import { getLanguageCurrent, getLanguageItem } from "./../language";
import { isEmail } from "../is_test";
import { getApiUrl } from "../api_routes";
import { FlashItem } from "../icon_flash";
import { isSourceDownloadable } from "../mx_helpers";
import { fetchSourceMetadata } from "../mx_helper_map_view_metadata";
import { EventSimple } from "../event_simple";
//import {settings} from './../settings';

const options = {
  idSource: null,
  idSocket: null,
  idUser: null,
  idProject: null,
  token: null,
  email: null,
  format: "GPKG",
  srid: 4326,
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

    if (window._download_source_modal instanceof DownloadSourceModal) {
      window._download_source_modal.close();
    }
    window._download_source_modal = md;

    md._opt = Object.assign({}, options, opt);
    try {
      md._select_auto_store = [];
      const isDownloadable = await isSourceDownloadable(md._opt.idSource);
      if (!isDownloadable) {
        return md.buildNotAllowed();
      }
      if (!opt.language) {
        md._opt.language = getLanguageCurrent();
      }

      if (!opt.filename) {
        const meta = await fetchSourceMetadata(md._opt.idSource);
        md._opt.filename = getLanguageItem(
          meta?.text?.title || {},
          md._opt.language
        );
      }

      await md.build();
      md.fire("init");
    } catch (e) {
      console.error(e);
    }
  }

  close() {
    const md = this;
    if (md._closed) {
      return;
    }
    md._closed = true;
    for (const d of md._select_auto_store) {
      if (d.destroy) {
        d.destroy();
      }
    }
    md._modal.close();
    md.fire("closed");
  }

  download() {
    const md = this;
    const opt = md._opt;
    const formIsValid = md.isValid();
    if (formIsValid) {
      const url = new URL(getApiUrl("getSourceDownload"));
      for (const k in opt) {
        url.searchParams.set(k, opt[k]);
      }
      md.fire("download_start", { url });

      fetch(url)
        .then(() => {
          md.fire("download_end", { url });
        })
        .catch(console.error);

      mx.nc.panel.open();
      md.close();
      new FlashItem("bell");
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
      const value = formData.get(id);
      md._opt[id] = value;
      md.validate();
      return;
    }
    /* full update  */
    for (const k of formData.keys()) {
      md._opt[k] = formData.get(k);
    }
    md.validate();
    md.fire("updated");
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
    const elContent = el("div", elForm, elMsgContainer);

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

    md._select_auto_store.push(selectEpsg);
    md._select_auto_store.push(selectFormat);
    md._select_auto_store.push(selectCountries);

    for (const s of md._select_auto_store) {
      if (!s._init) {
        await s.once("init");
      }
    }

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
