import { isNotEmpty, isEmpty } from "./../is_test";
import { modalConfirm, modalSimple } from "./../mx_helper_modal.js";
import { tt, el } from "./../el_mapx";
import { fileSelector, formatByteSize, prevent } from "./../mx_helper_misc.js";
import { bindAll } from "../bind_class_methods";
import { fileFormatsVectorUpload } from "./utils";
import { Item } from "./item.js";
import { shake } from "./../elshake";
import { getDictItem as t } from "./../language";
import { waitTimeoutAsync } from "../animation_frame";
import { isArray } from "../is_test";
import { settings as mx_settings } from "./../settings";
import "./style.less";
import { isBoolean } from "../is_test";

const config = {
  max_items: 20,
  max_size: mx_settings.api.upload_size_max,
  msg_duration: 3000,
};

export class Uploader {
  /**
   * Creates an instance of Uploader.
   * @param {Object} config - Configuration for the Uploader
   */
  constructor(config) {
    const up = this;
    up._config = config; 
  }

  /**
   * Initialize the Uploader instance
   * @param {Object} config - Configuration for the Uploader
   * @returns {Promise<void>} Promise that resolves when the initialization is complete
   */
  async init(config) {
    const up = this;
    if (up._init) {
      return;
    }
    config = config || up._config;
    up._init = true;
    up._disabled = false;
    up._busy_msg = false;
    up._ready = false; // ready when ui is built;
    up._formats = [];
    up._items = [];
    up._issues = [];
    up._id_counter = 0;
    up._destroy_cb = [];

    bindAll(up);
    /**
     * Update supported format;
     * e.x.
     * {
     *  "default": true,
     * "name": "GeoPackage",
     * "driver": "GPKG",
     * "type": "vector",
     * "fileExt": [".gpkg"],
     * "multiple": false,
     * "upload": true,
     * "download": true
     * }
     */
    const fileFormats = await fileFormatsVectorUpload();
    up._formats.push(...fileFormats);

    /**
     * Build initial UI
     */
    up.build();

    /**
     * Initial message
     */
    await up.message("up_drop_or_click", { wait: 0 });

    /**
     * Add item if not empty;
     */
    if (isNotEmpty(config?.file)) {
      await up.filesToItems(config.file);
    }

    up._ready = true;
    up.update();
  }

  /**
   * Add destroy cb
   * @param {Function} cb
   * @returns {void}
   */
  addDestroyCb(cb) {
    this._destroy_cb.push(cb);
  }

  /**
   * Destroy the Uploader instance
   * @returns {Promise<boolean>}
   */
  async destroy() {
    const up = this;
    if (up._destroy) {
      return;
    }
    const cleared = await up.reset();
    if (!cleared) {
      return;
    }
    for (const cb of up._destroy_cb) {
      cb();
    }
    up._destroy = true;
    up._modal.close();
    return true;
  }

  /**
   * Display a message to the user
   * @param {string|Array} id - ID of the message to display or an array of IDs to check for the first available message
   * @pram {Object} opt Options
   * @param {string} opt.str - Additional string to append to the message
   * @param {number} opt.wait - Message wait duration
   * @returns {Promise<void>} Promise that resolves when the message is finished displaying
   */
  async message(id, opt) {
    opt = Object.assign(
      {},
      {
        wait: config.msg_duration,
        str: "",
      },
      opt
    );

    const up = this;
    if (isArray(id)) {
      id = id[0];
    }
    const hasMsg = isNotEmpty(id);
    const idDefault = "up_drop_or_click";
    if (up._busy_msg) {
      return;
    }
    try {
      up.disable();
      up._busy_msg = true;
      up._el_container.classList.add("uploader--message");
      let msg = await t(idDefault);
      if (hasMsg) {
        let msgAlt = await t(id);
        if (opt.str) {
          msgAlt += `: ${opt.str}`;
        }
        up._el_container.setAttribute("message", msgAlt);
        await waitTimeoutAsync(opt.wait);
        up._el_container.setAttribute("message", msg);
      } else {
        if (opt.str) {
          msg += `: ${opt.str}`;
        }
        up._el_container.setAttribute("message", msg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      up._busy_msg = false;
      up._el_container.classList.remove("uploader--message");
      up.enable();
    }
  }

  /**
   * Build the Uploader UI
   * @returns {void}
   */
  build() {
    const up = this;

    up._el_container = el("div", {
      on: {
        click: up.handleDropZoneClick,
        dragover: up.handleDropZoneDragOver,
        dragenter: up.handleDropZoneDragEnter,
        dragleave: up.handleDropZoneDragLeave,
        drop: up.handleDropZoneDragDrop,
      },
      class: "uploader",
      message: "",
    });

    up._el_button_upload = el(
      "button",
      {
        class: ["btn", "btn-default", "disabled"],
        on: ["click", up.upload],
      },
      tt("up_button_upload")
    );
    up._el_button_add = el(
      "button",
      {
        class: ["btn", "btn-default", "disabled"],
        on: ["click", up.handleButtonAddFile],
      },
      tt("up_button_add_files")
    );
    up._el_button_reset = el(
      "button",
      {
        class: ["btn", "btn-default"],
        on: ["click", up.reset],
      },
      tt("up_button_reset")
    );

    up._el_button_close = el(
      "button",
      {
        class: ["btn", "btn-default", "disabled"],
        on: ["click", up.destroy],
      },
      tt("up_button_close")
    );

    up._modal = modalSimple({
      title: "Upload",
      content: up._el_container,
      buttons: [up._el_button_close, up._el_button_add],
      buttonsAlt: [up._el_button_reset, up._el_button_upload],
      onClose: up.destroy,
      removeCloseButton: true,
      style: {
        minWidth: "500px",
        resize: "none",
      },
    });
  }

  /**
   * Update
   * @returns {void}
   */
  update() {
    const up = this;
    up.updateUI();
    up.updateCounters();
  }

  /**
   * Disable the Uploader UI
   * @returns {void}
   */
  disable() {
    const up = this;
    up._disabled = true;
    up.updateUI();
  }

  /**
   * Enable the Uploader UI
   * @returns {void}
   */
  enable() {
    const up = this;
    up._disabled = false;
    up.updateUI();
  }

  /**
   * Check if the Uploader is disabled
   * @returns {boolean} - True if the Uploader is disabled, false otherwise
   */
  get disabled() {
    return !!this._disabled;
  }

  /**
   * Get ready state
   * @returns {Boolean}
   */
  get ready() {
    return !!this._ready;
  }

  /**
   * Check if all the items in the Uploader are valid
   * @returns {boolean} - True if all items in the Uploader are valid, false otherwise
   */
  get valid() {
    const up = this;
    const hasNoItems = isEmpty(up._items);
    const hasItems = !hasNoItems;
    const allValid =
      hasItems &&
      up._items.reduce((valid, item) => {
        return valid && item.valid;
      }, true);
    return hasItems && allValid;
  }

  /**
   * Uploader items count
   * @return {number} number of items
   */
  get count() {
    const up = this;
    return up._items.length;
  }

  /**
   * Get size
   * @returns {number} sum of all item size
   */
  get size() {
    const up = this;
    let sum = 0;

    for (const item of up.items) {
      sum += item.size;
    }

    return sum;
  }

  /**
   * Uploader items as an array
   * @return {Array} array of items
   */
  get items() {
    const up = this;
    return [...up._items];
  }

  /**
   * Check if the uploader is full
   * @returns  {boolean} - True if the uploader is full
   */
  get full() {
    const up = this;
    return up.count >= config.max_items;
  }

  /**
   * Check if the uploader is empty
   * @returns  {boolean} - True if the uploader is empty
   */
  get empty() {
    const up = this;
    return up.count === 0;
  }

  /**
   * Add an item to the Uploader
   * @param {Object} it - Item to add
   * @returns {void}
   */
  addItem(it) {
    const up = this;
    up._items.push(it);
    up.update();
  }

  /**
   * Remove an item from the Uploader
   * @param {Object} it - Item to remove
   * @returns {void}
   */
  removeItem(it) {
    const up = this;
    const pos = up._items.indexOf(it);
    if (pos > -1) {
      up._items.splice(pos, 1);
      up.update();
    }
  }

  /**
   * Update the Uploader UI
   * @returns {void}
   */
  updateUI() {
    const up = this;
    if (!up.ready) {
      return;
    }

    up.updateButtonUpload();
    up.updateButtonClose();
    up.updateButtonAddFiles();
    up.updateButtonReset();
  }

  /**
   * Update the Uploader counters
   * @returns {void}
   */
  updateCounters() {
    const up = this;
    clearTimeout(up._id_counter);
    up._id_counter = setTimeout(_up_counter, 100);
    function _up_counter() {
      let i = up.count;
      while (i--) {
        up._items[i].counter = i + 1;
        up._items[i]._el_item.style.order = i;
      }
    }
  }

  /**
   * Update upload button
   * @returns {void}
   */
  updateButtonReset() {
    const up = this;
    if (up.empty) {
      up._el_button_reset.classList.add("disabled");
    } else {
      up._el_button_reset.classList.remove("disabled");
    }
  }

  /**
   * Update upload button
   * @returns {void}
   */
  updateButtonUpload() {
    const up = this;
    if (up.disabled || !up.valid) {
      up._el_button_upload.classList.add("disabled");
    } else {
      up._el_button_upload.classList.remove("disabled");
    }
  }

  /**
   * Update add file button
   * @returns {void}
   */
  updateButtonAddFiles() {
    const up = this;
    if (up.disabled || up.full) {
      up._el_button_add.classList.add("disabled");
    } else {
      up._el_button_add.classList.remove("disabled");
    }
  }

  /**
   * Update close button
   * @returns {void}
   */
  updateButtonClose() {
    const up = this;
    if (up.disabled) {
      up._el_button_close.classList.add("disabled");
    } else {
      up._el_button_close.classList.remove("disabled");
    }
  }

  /**
   * Clear all items from the Uploader
   * @param {boolean} force skip confirmation step
   * @returns {Promise<boolean>} cleared
   */
  async reset(force) {
    const up = this;

    if (up.empty) {
      return true;
    }

    const items = up.items;

    // can be event through the button
    force = isBoolean(force) && force === true;

    if (!force && up.count > 1) {
      const ok = await modalConfirm({
        title: t("up_confirm_reset_title"),
        content: tt("up_confirm_reset", { data: { n: up.count } }),
      });
      if (!ok) {
        return false;
      }
    }

    for (const item of items) {
      item.cancel();
    }

    up._items.length = 0;
    up.update();
    up.message("up_drop_or_click", { wait: 0 });
    return true;
  }

  /**
   * Upload all items in the Uploader
   * @returns {Promise<void>} Promise that resolves when all items are uploaded
   */
  async upload() {
    const up = this;
    try {
      if (up.count > 1) {
        const ok = await modalConfirm({
          title: t("up_confirm_upload_title"),
          content: tt("up_confirm_upload", {
            data: { n: up.count, size: formatByteSize(up.size) },
          }),
        });
        if (!ok) {
          return false;
        }
      }

      const items = [...up._items];
      for (const item of items) {
        await item.upload();
      }
      await up.reset(true);
      up.update();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Handle dragover events
   * @param {Event} e - The dragover event
   * @returns {void}
   */
  handleDropZoneDragOver(e) {
    prevent(e);
  }

  /**
   * Handle dragenter events
   * @param {Event} e - The dragenter event
   * @returns {void}
   */
  handleDropZoneDragEnter(e) {
    const up = this;
    if (e.target !== e.currentTarget) {
      return;
    }
    prevent(e);
    up._el_container.classList.add("uploader--drag-over");
  }

  /**
   * Handle dragleave
   * Handle dragleave events
   * @param {Event} e - The dragleave event
   * @returns {void}
   */
  handleDropZoneDragLeave(e) {
    const up = this;
    if (e.target !== e.currentTarget) {
      return;
    }
    prevent(e);
    up._el_container.classList.remove("uploader--drag-over");
  }

  /**
   * Handle drop events
   * @param {Event} e - The drop event
   * @returns {Promise<void>} Promise that resolves when the dropped files are processed
   */
  async handleDropZoneDragDrop(e) {
    const up = this;
    try {
      const hasFiles = up.eventHasFiles(e);
      if (!hasFiles) {
        return;
      }
      prevent(e);
      await up.filesToItems(e.dataTransfer.files);
      up._el_container.classList.remove("uploader--drag-over");
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Handle click events on drop zone
   * @param {Event} e - The click event
   * @returns {void}
   */
  handleDropZoneClick(e) {
    const up = this;
    if (e.target !== e.currentTarget) {
      return;
    }
    if (!up.empty) {
      return;
    }
    prevent(e);
    up.fileChooser();
  }

  /**
   * Handle add file  click
   * @param {Event} e - The click event
   * @returns {void}
   */
  handleButtonAddFile(e) {
    const up = this;
    prevent(e);
    up.fileChooser();
  }

  /**
   * File chooser
   * -> trigger filesToItems after change
   * @returns {Promise[]}
   */
  async fileChooser() {
    const up = this;
    const files = await fileSelector();
    await up.filesToItems(files);
    return true;
  }

  /**
   * Convert File objects to Item objects and add them to the Uploader
   * @param {FileList} filesList - A list of File objects
   * @returns {Promise<void>} Promise that resolves when all the files are processed
   */
  async filesToItems(filesList) {
    const up = this;

    if (up.full) {
      console.warn("Max items reached");
      return;
    }

    if (filesList instanceof File) {
      filesList = [filesList];
    }
    const files = [...filesList];
    const nNext = files.length + up.count;
    if (nNext > config.max_items) {
      await up.message("up_issue_too_many", { str: config.max_items });
      return;
    }

    for (const file of files) {
      const item = new Item(file, up);
      if (!item.supported) {
        shake(up._el_container);
        await up.message("up_issue_format_not_supported", { str: file.name });
        continue;
      }
      item.register();
    }
  }

  /**
   * Check if the event has files
   * @param {Event} e - The event to check
   * @returns {boolean} - True if the event has files, false otherwise
   */
  eventHasFiles(e) {
    return e?.dataTransfer?.files?.length > 0;
  }

  /**
   * Prevent event default behavior and propagation
   * @param {Event} e - The event to prevent
   * @returns {void}
   */
  _prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}
