import { modal } from "./../mx_helper_modal";
import { SelectAuto } from "../select_auto";
import { buildForm } from "./form.js";
import { fetchSourceMetadata } from "./../mx_helper_map_view_metadata";
import { el, elSpanTranslate, elButtonFa, elAlert } from "./../el_mapx";
import { getLanguageCurrent, getLanguageItem } from "./../language";
import { isEmail } from "../is_test";
import { getApiUrl } from "../api_routes";
import {FlashItem} from "../icon_flash";
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

export class ModalDownloadSource {
  constructor(opt) {
    const md = this;
    md.destroy = md.destroy.bind(md);
    md.download = md.download.bind(md);
    md.validate = md.validate.bind(md);
    md.update = md.update.bind(md);
    md.init(opt).catch(console.error);
  }

  async init(opt) {
    const md = this;
    md._opt = Object.assign({}, options, opt);
    try {
      md._destroy_store = [];
      const meta = await fetchSourceMetadata(md._opt.idSource);
      md._src_meta = meta;
      const isDownloadable = !!meta?._services?.includes("mx_download");
      if (!isDownloadable) {
        return await md.buildNotAllowed();
      }
      if (!opt.language) {
        md._opt.language = getLanguageCurrent();
      }

      if (!opt.filename) {
        md._opt.filename = getLanguageItem(
          meta?.text?.title || {},
          md._opt.language
        );
      }

      await md.build();
    } catch (e) {
      console.error(e);
    }
  }

  destroy() {
    const md = this;
    if (md._destroyed) {
      return;
    }
    md._destroyed = true;
    for (const d of md._destroy_store) {
      if (d.destroy) {
        d.destroy();
      }
    }
    md._modal.close();
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
      fetch(url).catch(console.error);
      mx.nc.panel.open();
      md.destroy();
      new FlashItem('bell');
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
    //const meta = md._src_meta;
    md._modal = modal({
      title: elSpanTranslate("dl_title_not_allowed"),
      content: el("div", elSpanTranslate("dl_title_not_allowed")),
      onClose: md.destroy,
      addSelectize: false,
      noShinyBinding: true,
    });
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
      action: md.destroy,
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
      onClose: md.destroy,
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
    md._destroy_store.push(selectEpsg);
    md._destroy_store.push(selectFormat);
    md._destroy_store.push(selectCountries);
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
