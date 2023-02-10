import {
  formDataToObject,
  getExtension,
  formatByteSize,
  makeId,
} from "./../mx_helper_misc.js";
import { el, elCheckbox, elSpanTranslate, elDetails } from "./../el_mapx";
import { isArray, isEmpty } from "../is_test";
import { bindAll } from "../bind_class_methods";
import { SelectAuto } from "../select_auto";
import { getApiRoute } from "./../api_routes";
import { settings as mx_settings } from "./../settings";
import { ws, nc } from "./../mx.js";

const st = elSpanTranslate;

const defSettings = {
  title: null,
  create_view: true,
  enable_download: false,
  enable_wms: false,
  assign_srs: false,
  source_srs: 4326,
  language: "en",
};

export class Item {
  constructor(file, up) {
    const it = this;
    bindAll(it);
    it._up = up;
    Object.assign(it, {
      _valid: false,
      _files: [],
      _key: null,
      _multiple: false,
      _driver: null,
      _exts: [],
    });
    const name = file.name;
    const ext = getExtension(name);
    const key = name.substring(0, name.lastIndexOf(ext));
    for (const format of up._formats) {
      if (it.valid) {
        continue;
      }
      const valid = format.fileExt.includes(ext) && format.upload;
      if (valid) {
        it._files.push(file);
        it._valid = true;
        it._key = key;
        it._multiple = format.multiple;
        it._driver = format.driver;
        it._exts.push(ext);
        it._ext = ext;
      }
    }
  }

  get size() {
    return this.files.reduce((a, file) => {
      return a + file.size;
    }, 0);
  }

  get up() {
    return this._up;
  }
  get valid() {
    return this._valid && this.size < mx_settings.api.upload_size_max;
  }
  get key() {
    return this._key;
  }
  get multiple() {
    return this._multiple;
  }
  get driver() {
    return this._driver;
  }
  get exts() {
    return this._exts;
  }
  get ext() {
    return this._ext;
  }
  get files() {
    return this._files || [];
  }
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
      if (keyExists && isMultiFile) {
        item.merge(it);
        return;
      }
    }

    /*
     * Add new item
     */
    it.add();
  }

  add() {
    const it = this;
    const up = it.up;
    up.add(it);
    it.buildItem();
    it.buildFiles(it.files);
    console.log("add");
  }

  merge(item) {
    const it = this;
    it._files.push(...item.files);
    it._exts.push(...item.exts);
    it.buildFiles(item.files);
    console.log("merge");
  }

  cancel() {
    const it = this;
    it.remove(true);
  }

  remove(canceled) {
    const it = this;
    const up = it.up;
    const cl = canceled
      ? "uploader--item-remove-canceled"
      : "uploader--item-remove-sent";
    it._el_item.classList.add(cl);

    setTimeout(() => {
      it._el_item.remove();
      const pos = up._items.indexOf(it);
      if (pos > -1) {
        up._items.splice(pos, 1);
        up.update();
      }
    }, 500);
  }

  get settings() {
    const it = this;
    const data = new FormData(it._el_form);
    const settings = Object.assign({}, defSettings, formDataToObject(data));

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
      it._el_group.appendChild(elFile);
    }
    it.updateSize();
  }

  updateSize() {
    const size = this.size;
    this._el_size.innerText = formatByteSize(size);
    const tooBig = size > mx_settings.api.upload_size_max;
    if (tooBig) {
      this._el_size.classList.add("uploader--size-danger");
    } else {
      this._el_size.classList.remove("uploader--size-danger");
    }
  }

  buildItem() {
    const it = this;

    /**
     * Remove item
     */
    const elButtonRemove = el(
      "button",
      {
        type: "button",
        class: ["uploader--item-button", "uploader--item-button-left"],
        on: ["click", it.cancel],
      },
      el("i", { class: ["fa", "fa-times"] })
    );

    const elButtonSend = el(
      "button",
      {
        type: "button",
        class: ["uploader--item-button", "uploader--item-button-right"],
        on: ["click", it.upload],
      },
      el("i", { class: ["fa", "fa-paper-plane-o"] })
    );

    /**
     * Config form
     */
    const elEpsg = el(
      "div",
      {
        class: "form-group",
      },
      el("label", { for: `up_epsg_code_${it.key}` }, st("up_select_epsg_code")),
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
      action: (e) => {
        if (e.target.checked) {
          selectEpsg.enable();
        } else {
          selectEpsg.disable();
        }
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

    it._el_form = el("form", [
      elTitle,
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
    ]);

    /**
     * Size
     */
    it._el_size = el("span", formatByteSize(it.size));
    it._el_group_size = el(
      "div",
      { class: "uploader--group" },
      el("div", { class: "uploader--size" }, el("span", "Total"), it._el_size)
    );

    /**
     * Group of files
     */

    it._el_group = el("div", { class: "uploader--group" });
    it._el_config = el("div", { class: "uploader--form" }, it._el_form);
    it._el_item = el("div", { class: "uploader--item" }, [
      elButtonRemove,
      elButtonSend,
      it._el_config,
      it._el_group,
      it._el_group_size,
    ]);
    it.up._el_container.appendChild(it._el_item);
  }

  async upload() {
    const it = this;
    const files = it.files;
    const settings = it.settings;
    const nFiles = files.length;
    const idRequest = makeId(10);
    const sChunk = 1e6;
    const chunks = [];

    if (nFiles === 0) {
      return;
    }

    if (!it.valid) {
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

  async _emit_chunk(chunk) {
    const route = getApiRoute("uploadSource");

    if (chunk.first) {
      nc.panel.height = 200;
      nc.panel.open();
    }

    return new Promise((resolve, reject) => {
      console.log("emit");
      ws.emit(route, chunk, (res) => {
        if (res.status === "error") {
          return reject(res.message);
        }
        console.log("emit-ok");
        resolve(res);
      });
    });
  }
}
