import { isNotEmpty, isEmpty } from "./../is_test";
import { modalSimple } from "./../mx_helper_modal.js";
import { el } from "./../el_mapx";
import "./style.less";
import { bindAll } from "../bind_class_methods";
//import { ws, nc, data } from "./mx.js";
import { fileFormatsVectorUpload } from "./utils";

const def = {
  file: null,
  geojson: null,
  image: null,
  type: "vector", // 'image','raster','vector'
};

export class Uploader {
  _items = {};
  _disabled = true;
  _formats = [];
  constructor(config) {
    const up = this;
    bindAll(up);
    up.init(config).catch(console.error)
    // debug
    window.up = up;
  }

  async init(config){
    const up = this; 
    /**
    * Update supported format;
    */
    const fileFormats = await fileFormatsVectorUpload();
    up._formats.push(...fileFormats);

    /**
    * Build initial UI 
    */ 
    up.build();

    /**
    * Add item if not empty;
    */ 
    if (isNotEmpty(config)) {
      up.add(config);
    }

    
  }
  destroy() {
    const up = this;
    up.clear();
    up.update();
    for (const cb of up._on_close) {
      cb();
    }
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
        on: [
          "click",
          () => {
            up.upload;
          },
        ],
      },
      "Upload"
    );
    up._modal = modalSimple({
      title: "Upload",
      content: up._el_container,
      buttons: [up._el_button_upload],
      onClose: () => {
        up.destroy();
      },
      style: {
        minHeight: "400px",
        minWidth: "500px",
      },
    });
    up.update();
  }

  buildItem(item) {
    const up = this;
  }

  update() {
    const up = this;
    up.validate();
  }

  disable() {
    const up = this;
    up._disabled = true;
    up.updateUI();
  }
  enable(enable) {
    const up = this;
    up._disabled = isEmpty(enable) ? false : !!enable;
    up.updateUI();
  }
  get disabled() {
    return !!this._disabled;
  }

  validate() {
    const up = this;
    const hasItems = isNotEmpty(up._items);
    const isValid = hasItems;
    up.enable(isValid);
    return isValid;
  }

  updateUI() {
    const up = this;
    up.updateButtonUpload();
  }

  updateButtonUpload() {
    const up = this;
    if (up.disabled) {
      up._el_button_upload.classList.add("disabled");
    } else {
      up._el_button_upload.classList.remove("disabled");
    }
  }

  clear() {
    const up = this;
    for (const key of Object.keys(up._items)) {
      delete up._items[key];
    }
  }

  add(config) {
    const up = this;
    const item = up.create(config);
    console.log(item);
    up.update();

    return;
    const elItem = up.buildItem(item);
    up._items.push(item);
    up._el_items.appendChild(elItem);
  }
  create(config) {
    const up = this;
    const item = Object.assign({}, def, config);
    if (item.geojson) {
    }
  }

  async upload() {
    const up = this;
    for (const item of up._items) {
      await up.uploadItem(item);
    }
    up.clear();
    up.update();
  }

  uploadItem(item) {
    return new Promise((resolve) => {
      resolve(true);
    });
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
  handleDropZoneDragDrop(e) {
    const up = this;
    const hasFiles = up.eventHasFiles(e);
    if (!hasFiles) {
      return;
    }
    up._prevent(e);

    const files = [...e.dataTransfer.files];

    for (const file of files) {
      if (up._items[file.name]) {
        up._items[file.name].push(file);
      } else {
        up._items[file.name] = [file];
      }
    }
    
    debugger;

    up._el_container.classList.remove("uploader--drag-over");
  }
  handleDropZoneClick(e) {
    const up = this;
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
