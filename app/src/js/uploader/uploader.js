import { isNotEmpty, isEmpty } from "./../is_test";
import { modalDialog, modalSimple } from "./../mx_helper_modal.js";
import { tt, el } from "./../el_mapx";
import { prevent } from "./../mx_helper_misc.js";
import { bindAll } from "../bind_class_methods";
//import { ws, nc, data } from "./mx.js";
import { fileFormatsVectorUpload } from "./utils";
import { Item } from "./item.js";
import { shake } from "./../elshake";
import { getDictItem as t } from "./../language";
import { waitTimeoutAsync } from "../animation_frame";
import { isArray } from "../is_test";
import { settings as mx_settings } from "./../settings";
import "./style.less";

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
    bindAll(up);
    up.init(config).catch(console.error);
    // debug
    window.up = up;
  }

  /**
   * Initialize the Uploader instance
   * @param {Object} config - Configuration for the Uploader
   * @returns {Promise<void>} Promise that resolves when the initialization is complete
   */
  async init(config) {
    const up = this;
    up._disabled = false;
    up._busy_msg = false;
    up._ready = false; // ready when ui is built;
    up._formats = [];
    up._items = [];
    up._issues = [];
    up._id_counter = 0;
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
    up.update();
    /**
     * Add item if not empty;
     */
    if (isNotEmpty(config)) {
      up.addItem(config);
    }

    up._ready = true;
  }

  /**
   * Destroy the Uploader instance
   * @returns {void}
   */
  destroy() {
    const up = this;
    if (up._destroy) {
      return;
    }
    up._destroy = true;
    up.clear();
    up._modal.close();
  }

  /**
   * Display a message to the user
   * @param {string|Array} id - ID of the message to display or an array of IDs to check for the first available message
   * @param {string} [str] - Additional string to append to the message
   * @returns {Promise<void>} Promise that resolves when the message is finished displaying
   */
  async message(id, str) {
    const up = this;
    if (isArray(id)) {
      id = id[0];
    }
    const hasMsg = isNotEmpty(id);
    const idDefault = "up_drop_or_click";
    if (up._is_msg || !up._ready) {
      return;
    }
    try {
      up.disable();
      up._busy_msg = true;
      up._el_container.classList.add("uploader--message");
      let msg = await t(idDefault);
      if (hasMsg) {
        let msgAlt = await t(id);
        if (str) {
          msgAlt += `: ${str}`;
        }
        up._el_container.setAttribute("message", msgAlt);
        await waitTimeoutAsync(config.msg_duration);
        up._el_container.setAttribute("message", msg);
      } else {
        if (str) {
          msg += `: ${str}`;
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
      message: "Drop files or click to select...",
    });

    up.message();

    up._el_button_upload = el(
      "button",
      {
        class: ["btn", "btn-default", "disabled"],
        on: ["click", up.upload],
      },
      "Upload"
    );
    up._el_button_clear = el(
      "button",
      {
        class: ["btn", "btn-default"],
        on: ["click", up.clear],
      },
      "Clear"
    );

    up._el_button_close = el(
      "button",
      {
        class: ["btn", "btn-default", "disabled"],
        on: ["click", up.destroy],
      },
      "Close"
    );

    up._modal = modalSimple({
      title: "Upload",
      content: up._el_container,
      buttons: [up._el_button_close, up._el_button_upload, up._el_button_clear],
      onClose: up.destroy,
      removeCloseButton: true,
      style: {
        minHeight: "400px",
        minWidth: "500px",
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
    up.updateButtonUpload();
    up.updateButtonClose();
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
      let i = up._items.length;
      while (i--) {
        up._items[i].counter = i + 1;
      }
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
   * @returns {void}
   */
  clear() {
    const up = this;
    const items = [...up._items];

    if (items.length === 0) {
      shake(up._el_container);
      return;
    }

    for (const item of items) {
      item.cancel();
    }

    up._items.length = 0;
    up.update();
  }

  /**
   * Upload all items in the Uploader
   * @returns {Promise<void>} Promise that resolves when all items are uploaded
   */
  async upload() {
    const up = this;
    try {
      const items = [...up._items];
      for (const item of items) {
        await item.upload();
      }
      up.clear();
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
   * Handle click events
   * @param {Event} e - The click event
   * @returns {void}
   */
  handleDropZoneClick(e) {
    const up = this;
    if (up._items.length) {
      return;
    }
    prevent(e);
    const elFile = el("input", {
      type: "file",
      style: {
        display: "none",
      },
      multiple: true,
      on: [
        "change",
        async (e) => {
          await up.filesToItems(e.target.files);
        },
      ],
    });
    document.body.appendChild(elFile);
    elFile.click();
  }

  /**
   * Convert File objects to Item objects and add them to the Uploader
   * @param {FileList} filesList - A list of File objects
   * @returns {Promise<void>} Promise that resolves when all the files are processed
   */
  async filesToItems(filesList) {
    const up = this;
    const files = [...filesList];
    const nNext = files.length + up._items.length;
    if (nNext > config.max_items) {
      await modalDialog({
        title: t("up_issue_too_many_title"),
        content: tt("up_issue_too_many", { data: { n: config.max_items } }),
      });
      return;
    }

    for (const file of files) {
      const item = new Item(file, up);
      if (!item.supported) {
        shake(up._el_container);
        await up.message("up_issue_format_not_supported", file.name);
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
