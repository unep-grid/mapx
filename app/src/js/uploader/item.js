import {
  updateObjectWithForm,
  getExtension,
  formatByteSize,
  makeId,
  prevent,
} from "./../mx_helper_misc.js";
import { el, elCheckbox, elSpanTranslate as tt, elDetails } from "./../el_mapx";
import { isArray, isEmpty } from "../is_test";
import { bindAll } from "../bind_class_methods";
import { SelectAuto } from "../select_auto";
import { getApiRoute } from "./../api_routes";
import { settings as mx_settings } from "./../settings";
import { ws, nc } from "./../mx.js";
import { Issue } from "./issue.js";
import { shake } from "./../elshake";

const defSettings = {
  title: null,
  create_view: true,
  enable_download: false,
  enable_wms: false,
  assign_srs: false,
  source_srs: 4326,
  language: "en",
};

/**
 * Represents an item that is being uploaded.
 * @class
 */
export class Item {
  /**
   * Constructs a new Item object.
   * @param {File} file - The file to be uploaded.
   * @param {Uploader} up - The uploader object that manages this item.
   */
  constructor(file, up) {
    const it = this;
    it._up = up;
    Object.assign(it, {
      _format: null,
      _format_valid: false,
      _key: null,
      _multiple: false,
      _driver: null,
      _exts: new Set(),
      _files: new Set(),
      _issues: new Set(),
    });
    bindAll(it);
    const name = file.name.toLowerCase();
    const ext = getExtension(name);
    const key = name.substring(0, name.lastIndexOf(ext));
    for (const format of up._formats) {
      if (it._format_valid) {
        continue;
      }
      const format_valid = format.fileExt.includes(ext) && format.upload;
      if (format_valid) {
        it._format = format;
        it._files.add(file);
        it._format_valid = true;
        it._key = key;
        it._multiple = format.multiple;
        it._driver = format.driver;
        it._exts.add(ext);
        it._ext = ext;
      }
    }
  }

  /**
   * Set the item counter;
   * @param {number} value
   */
  set counter(value) {
    const it = this;
    it._el_item.setAttribute("counter", value);
  }

  /**
   * Gets the size of the file(s) being uploaded.
   * @type {number}
   */
  get size() {
    return this.files.reduce((a, file) => {
      return a + file.size;
    }, 0);
  }

  /**
   * Gets the uploader object that manages this item.
   * @type {Uploader}
   */
  get up() {
    return this._up;
  }

  /**
   * Return an array of issues text, if any
   * @type {Array}
   */
  get issues() {
    return Array.from(this._issues || []);
  }

  /**
   * Return format config
   * @type {Object}
   */
  get format() {
    return this._format;
  }

  /**
   * Return if file is supported
   * @type {Boolean}
   */
  get supported() {
    const it = this;
    return it._format_valid;
  }

  /**
   * Gets whether the item is valid for upload.
   * @type {boolean}
   */
  get valid() {
    const it = this;
    it._issues.clear();

    if (!it._format_valid) {
      it._issues.add(new Issue("error", "up_issue_format_not_supported"));
    }

    if (isEmpty(it.files)) {
      it._issues.add(new Issue("error", "up_issue_missing_files"));
    }

    if (it.size > mx_settings.api.upload_size_max) {
      it._issues.add(new Issue("error", "up_issue_file_too_big"));
    }

    if (it.multiple) {
      const f = it.format;
      const allExts = f.fileExt.reduce((a, e) => {
        return a && it.exts.includes(e);
      }, true);
      if (!allExts) {
        const missing = f.fileExt.filter((f) => !it.exts.includes(f));
        it._issues.add(
          new Issue("error", "up_issue_missing_dependency", { ext: missing })
        );
      }
    }
    return it._issues.size === 0;
  }

  /**
   * Gets the key of the item.
   * @type {string}
   */

  get key() {
    return this._key;
  }

  /**
   * Gets whether the item allows multiple files to be uploaded.
   * @type {boolean}
   */
  get multiple() {
    return this._multiple;
  }

  /**
   * Gets the driver to be used to upload the item.
   * @type {string}
   */
  get driver() {
    return this._driver;
  }

  /**
   * Gets the extensions of the files being uploaded.
   * @type {Array.<string>}
   */
  get exts() {
    return Array.from(this._exts || []);
  }
  /**
   * Gets the extension of the file being uploaded.
   * @type {string}
   */
  get ext() {
    return this._ext;
  }

  /**
   * Gets the files being uploaded.
   * @type {Array.<File>}
   */
  get files() {
    return Array.from(this._files || []);
  }

  /**
   * Registers the item for upload.
   */
  register() {
    const it = this;
    const up = it.up;
    const isMultiFile = it.multiple;

    /**
     * Loop over existing items :
     * - test for duplicate
     * - merge if multifile
     */
    for (const item of up._items) {
      const keyExists = item.key === it.key;
      const extExists = item.exts.includes(it.ext);
      const sameDriver = item.driver === it.driver;
      /**
       * Dont allow same key twice, unless multifile
       */
      if (keyExists && extExists) {
        console.warn("duplicated item");
        return;
      }
      /**
       * Merge if key exists and multifile
       */
      if (keyExists && isMultiFile && sameDriver) {
        item.merge(it);
        return;
      }
    }

    /*
     * Add new item
     */
    it.add();
  }

  /**
   * Adds the item to the uploader's list of items to be uploaded.
   */
  add() {
    const it = this;
    const up = it.up;
    up.addItem(it);
    it.buildItem();
    it.buildFiles(it.files);
    it.validate();
    it.up.update();
  }

  /**
   * Merges this item with another item, for when multiple files are being uploaded.
   * @param {Item} item - The item to merge with.
   */
  merge(item) {
    const it = this;
    it._files.add(...item.files);
    it._exts.add(...item.exts);
    it.buildFiles(item.files);
    it.validate();
    it.up.update();
  }

  /**
   * Validate item and set classes
   */
  validate() {
    const it = this;
    if (!it.valid) {
      it._el_item.classList.add("uploader--item-error");
      //it._el_button_upload.setAttribute("disabled", true);
    } else {
      it._el_item.classList.remove("uploader--item-error");
      //it._el_button_upload.removeAttribute("disabled");
    }
    it.buildIssues();
  }

  /**
   * Cancels the upload of the item.
   * @param {Event} e - event, if any;
   */
  cancel(e) {
    const it = this;
    prevent(e);
    it.remove(true);
  }

  /**
   * Removes the item from the uploader's list of items to be uploaded.
   * @param {boolean} canceled - Whether the upload was canceled.
   */
  remove(canceled) {
    const it = this;
    const up = it.up;
    const cl = canceled
      ? "uploader--item-remove-canceled"
      : "uploader--item-remove-sent";
    it._el_item.classList.add(cl);

    setTimeout(() => {
      it._el_item.remove();
      up.removeItem(it);
    }, 500);
  }

  /**
   * Gets the settings for the item's upload.
   * @type {Object}
   */
  get settings() {
    const it = this;
    const settings = updateObjectWithForm(defSettings, it._el_form);

    for (const key of Object.keys(settings)) {
      const val = settings[key];

      if (val === "true") {
        settings[key] = true;
      }
      if (val === "false") {
        settings[key] = false;
      }
      if (key === "title" && isEmpty(val)) {
        settings[key] = it.key;
      }
    }

    if (!settings.language) {
      settings.language = mx_settings.language;
    }

    if (!settings.assign_srs) {
      settings.source_srs = null;
    }
    return settings;
  }

  /**
   * Builds the HTML for the item's files and their configuration settings.
   * @param {Array.<File>} files - The files to be uploaded.
   */
  buildFiles(files) {
    const it = this;
    if (!isArray(files)) {
      files = [files];
    }
    for (const file of files) {
      const elFile = el(
        "div",
        { class: "uploader--file" },
        el("span", { class: "text-muted" }, file.name),
        el("span", { class: "text-muted" }, formatByteSize(file.size))
      );
      it._el_group_files.appendChild(elFile);
    }
    it.updateSize();
  }

  buildIssues() {
    const it = this;
    while (it._el_issues.firstElementChild) {
      it._el_issues.firstElementChild.remove();
    }
    for (const issue of it.issues) {
      const elIssue = el(
        "li",
        {
          class: `uploader__issue_${issue.level}`,
        },
        tt(issue.type, { data: issue.data })
      );
      it._el_issues.appendChild(elIssue);
    }
  }

  /**
   * Updates the size of the files being uploaded.
   */
  updateSize() {
    const it = this;
    const size = it.size;
    it._el_size.innerText = formatByteSize(size);
    const tooBig = size > mx_settings.api.upload_size_max;
    if (tooBig) {
      it._el_size.classList.add("uploader--size-danger");
    } else {
      it._el_size.classList.remove("uploader--size-danger");
    }
  }

  /**
   * Builds the HTML for the item's files and their configuration settings.
   * @param {Array.<File>} files - The files to be uploaded.
   */
  buildItem() {
    const it = this;

    /**
     * Remove item
     */
    const elButtonRemove = el(
      "button",
      {
        type: "button",
        class: ["uploader--item-button", "uploader--item-button-remove"],
        on: ["click", it.cancel],
      },
      el("i", { class: ["fa", "fa-times"] })
    );

    const elButtonSend = el(
      "button",
      {
        type: "button",
        class: ["uploader--item-button", "uploader--item-button-send"],
        on: ["click", it.upload],
      },
      el("i", { class: ["fa", "fa-paper-plane-o"] })
    );

    /**
     * Issues
     */
    it._el_issues = el("ul", {
      class: "uploader__issues",
    });

    /**
     * Config form
     */
    const elEpsg = el(
      "div",
      {
        class: "form-group",
      },
      el("label", { for: `up_epsg_code_${it.key}` }, tt("up_select_epsg_code")),
      el("select", {
        id: `up_epsg_code_${it.key}`,
        name: "source_srs",
        dataset: { type: "epsg" },
      })
    );

    const selectEpsg = new SelectAuto(elEpsg);

    selectEpsg.once("init", () => {
      selectEpsg.disable();
    });

    const elCheckCreateView = elCheckbox("up_check_create_view", {
      name: "create_view",
      checked: defSettings.create_view,
    });
    const elCheckAllowDownlaod = elCheckbox("up_check_allow_download", {
      name: "enable_download",
      checked: defSettings.enable_download,
    });
    const elCheckEnableWMS = elCheckbox("up_check_enable_wms", {
      name: "enable_wms",
      checked: defSettings.enable_wms,
    });
    const elCheckAssignEpsg = elCheckbox("up_check_assign_epsg", {
      checked: false,
      name: "assign_srs",
      action: (e) => {
        if (e.target.checked) {
          selectEpsg.enable();
        } else {
          selectEpsg.disable();
        }
      },
    });

    /**
     * Language : not visible, but required by the default object
     * TODO: enable this as a select drop down
     */
    const elLanguage = el("input", {
      name: "language",
      value: mx_settings.language,
      style: {
        display: "none",
      },
    });

    const elTitle = el(
      "div",
      {
        class: ["form-group"],
      },
      //el("label", { for: `up_title_${it.key}` }, st("up_title")),
      el(
        "input",
        {
          class: "form-control",
          name: "title",
          id: `up_title_${it.key}`,
          type: "text",
          placeholder: it.key,
        },
        it.key
      )
    );

    /**
     * Size & files
     */
    it._el_size = el("span", formatByteSize(it.size));
    it._el_group_size = el(
      "div",
      { class: "uploader--group" },
      el("div", { class: "uploader--size" }, el("span", "Total"), it._el_size)
    );
    it._el_group_files = el("div", { class: "uploader--group" });

    /**
     * Main form
     */
    it._el_form = el("form", [
      elTitle,
      elLanguage,
      it._el_group_files,
      it._el_group_size,
      elDetails(
        "up_settings",
        el("div", [
          elCheckCreateView,
          elCheckEnableWMS,
          elCheckAllowDownlaod,
          elCheckAssignEpsg,
          elEpsg,
        ])
      ),
      it._el_issues,
    ]);
    it._el_form_wrapper = el("div", { class: "uploader--form" }, it._el_form);

    /**
     * Item
     */
    it._el_item = el("div", { class: "uploader--item" }, [
      elButtonRemove,
      elButtonSend,
      it._el_form_wrapper,
    ]);
    it.up._el_container.appendChild(it._el_item);
  }

  /**
   * Uploads the item.
   * @param {Event} e - event, if any;
   */
  async upload(e) {
    const it = this;
    prevent(e);
    const files = it.files;
    const settings = it.settings;
    const nFiles = files.length;
    const idRequest = makeId(10);
    const sChunk = 1e6;
    const chunks = [];

    if (!it.valid) {
      shake(it._el_item);
      return;
    }

    it.remove();
    up.disable();

    try {
      for (let i = 0; i < nFiles; i++) {
        const file = files[i];
        const buffer = await file.arrayBuffer();
        const nChunks = Math.ceil(buffer.byteLength / sChunk);

        for (let j = 0; j < nChunks; j++) {
          const chunk_start = j * sChunk;
          const chunk_end = (j + 1) * sChunk;
          const chunks_first = i === 0 && j === 0;
          const chunks_last = i == nFiles - 1 && j === nChunks - 1;
          const chunk = {
            id_request: idRequest,
            /*
             * Request first / last chunk
             */
            first: chunks_first,
            last: chunks_last,
            /*
             * Buffer start / end chunk
             */
            start: chunk_start,
            end: chunk_end,
            on: nChunks,
            data: buffer.slice(chunk_start, chunk_end),
            /**
             * File info
             */
            id_file: i + 1,
            n_files: nFiles,
            /*
             * Chunk writer Meta
             */
            canceled: false,
            filename: file.name,
            mimetype: file.type,
            driver: it.driver,
            /**
             * Source creation options
             * TODO: this could be sent at the end
             */
            title: settings.title,
            create_view: settings.create_view,
            enable_download: settings.enable_download,
            enable_wms: settings.enable_wms,
            assign_srs: settings.assign_srs,
            source_srs: settings.source_srs,
          };

          chunks.push(chunk);
        }
      }

      for (const chunk of chunks) {
        await it._emit_chunk(chunk);
      }
    } catch (e) {
      console.error(e);
    }
    up.enable();
  }

  /**
   * Emits a chunk of the item being uploaded.
   * @param {Object} chunk - The chunk of the item to be uploaded.
   */
  async _emit_chunk(chunk) {
    const route = getApiRoute("uploadSource");

    if (chunk.first) {
      nc.panel.height = 200;
      nc.panel.open();
    }

    return new Promise((resolve, reject) => {
      ws.emit(route, chunk, (res) => {
        if (res.status === "error") {
          return reject(res.message);
        }
        resolve(res);
      });
    });
  }
}
