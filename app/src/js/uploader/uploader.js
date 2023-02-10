import { isNotEmpty, isEmpty } from "./../is_test";
import { modalSimple } from "./../mx_helper_modal.js";
import { el } from "./../el_mapx";
import "./style.less";
import { bindAll } from "../bind_class_methods";
//import { ws, nc, data } from "./mx.js";
import { fileFormatsVectorUpload } from "./utils";
import { Item } from "./item.js";
import { shake } from "./../elshake";

const config = {
  max_items: 4,
};

export class Uploader {
  constructor(config) {
    const up = this;
    bindAll(up);
    up.init(config).catch(console.error);
    // debug
    window.up = up;
  }

  async init(config) {
    const up = this;
    up._disabled = false;
    up._formats = [];
    up._items = [];
    up._issues = [];

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
      up.add(config);
    }
  }
  destroy() {
    const up = this;
    if (up._destroy) {
      return;
    }
    up._destroy = true;
    up.clear();
    up._modal.close();
  }

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
    });

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

  update() {
    const up = this;
    up.validate();
    up.updateUI();
  }

  disable() {
    const up = this;
    up._disabled = true;
    up.updateUI();
  }

  enable() {
    const up = this;
    up._disabled = false;
    up.updateUI();
  }

  get disabled() {
    return !!this._disabled;
  }

  get valid() {
    return !!this._valid;
  }

  add(it) {
    const up = this;
    up._items.push(it);
    up.update();
  }

  validate() {
    const up = this;
    const hasNoItems = isEmpty(up._items);
    const hasItems = !!hasNoItems;
    const hasTooMany = hasItems && up._items.length > config.max_items;
    const hasInvalid =
      hasItems &&
      up._items.reduce((a, item) => {
        return a && item.valid;
      }, true);
    up._issues.length = 0;

    if (hasNoItems) {
      up._issues.push("up_warn_missing_items");
    }

    if (hasInvalid) {
      up._issues.push("up_warn_invalid_items");
    }
    if (hasTooMany) {
      up._issues.push("up_warn_too_many_items");
    }
    up._valid = up._issues.length === 0;
    return up._valid;
  }

  updateUI() {
    const up = this;
    up.updateButtonUpload();
    up.updateButtonClose();
    up.updateIssues();
  }

  updateIssues() {}

  updateButtonUpload() {
    const up = this;
    if (up.disabled || !up.valid) {
      up._el_button_upload.classList.add("disabled");
    } else {
      up._el_button_upload.classList.remove("disabled");
    }
  }

  updateButtonClose() {
    const up = this;
    if (up.disabled) {
      up._el_button_close.classList.add("disabled");
    } else {
      up._el_button_close.classList.remove("disabled");
    }
  }

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
   * Required for drop event :
   *  - does nothing
   */
  handleDropZoneDragOver(e) {
    const up = this;
    up._prevent(e);
  }
  handleDropZoneDragEnter(e) {
    const up = this;
    up._prevent(e);
    up._el_container.classList.add("uploader--drag-over");
  }
  handleDropZoneDragLeave(e) {
    const up = this;
    up._prevent(e);
    up._el_container.classList.remove("uploader--drag-over");
  }
  async handleDropZoneDragDrop(e) {
    const up = this;
    try {
      const hasFiles = up.eventHasFiles(e);
      if (!hasFiles) {
        return;
      }
      let countIssue = 0;
      up._prevent(e);

      const files = [...e.dataTransfer.files];

      for (const file of files) {
        const item = new Item(file, up);
        if (!item.valid) {
          countIssue++;
          continue;
        }
        item.register();
      }

      if (countIssue >= files.length) {
        shake(up._el_container);
      }

      up._el_container.classList.remove("uploader--drag-over");
    } catch (e) {
      console.error(e);
    }
  }

  handleDropZoneClick(e) {
    const up = this;
    if (up._items.length) {
      return;
    }
    up._prevent(e);
    console.log(e);
  }

  eventHasFiles(e) {
    return e?.dataTransfer?.files?.length > 0;
  }

  _prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}
