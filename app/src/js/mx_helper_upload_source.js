import { el, elSpanTranslate } from "./el_mapx";
import { modal, modalDialog, modalPrompt } from "./mx_helper_modal.js";
import { updateLanguageElements } from "./language";
import { elSpanTranslate as tt } from "./el_mapx";
import { getApiRoute, getApiUrl } from "./api_routes";
import { isString } from "./is_test";
import { ws, nc, data } from "./mx.js";
import { getDictItem } from "./language";
import {
  handleRequestMessage,
  sendData,
  getSizeOf,
  formatByteSize,
  path,
  makeId,
} from "./mx_helper_misc.js";
import { settings } from "./settings";

export function triggerUploadForm(opt) {
  /*
   * Get elements
   */
  const elForm = document.getElementById(opt.idForm);
  const elTitle = elForm.querySelector("#txtUploadSourceFileName");
  const elEmail = elForm.querySelector("#txtEmailSourceUpload");
  const elButton = document.getElementById("btnSourceUpload");
  const elEpsgCode = elForm.querySelector("#epsgTextInput");

  /*
   * Create fake input
   */
  const elInput = el("input", {
    type: "file",
    class: "mx-hide",
    on: ["change", upload],
  });

  elForm.appendChild(elInput);
  elInput.click();

  /**
   * Upload file helper
   */
  function upload() {
    /*
     * Disable inputs
     */
    elEmail.setAttribute("disabled", true);
    elTitle.setAttribute("disabled", true);
    elButton.setAttribute("disabled", true);
    elEpsgCode.setAttribute("disabled", true);

    /**
     * Get values
     */
    const title = elTitle.value;
    const file = elInput.files[0];
    const epsg = elEpsgCode.value + "";

    uploadSource({
      file: file,
      title: title,
      sourceSrs: epsg,
      selectorProgressContainer: elForm,
    });
  }
}

export async function uploadGeoJSONModal(idView) {
  try {
    const item = await data.geojson.getItem(idView);
    const geojson = path(item, "view.data.source.data");

    if (!geojson) {
      return;
    }
    const language = settings.language;

    const title = await modalPrompt({
      title: tt("upl_title"),
      label: tt("upl_title_layer_name", { data: { language } }),
      confirm: tt("upl_upload_btn"),
      inputOptions: {
        type: "text",
        value: path(item, "view.data.title.en", idView),
        placeholder: await getDictItem("upl_name_placeholder"),
      },
    });

    if (!title) {
      return;
    }

    return uploadSource({
      title: title,
      geojson: geojson,
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * File size checker
 * @param {File||Object||String} file File or geojson to test
 * @param {Object} opt Options
 * @param {Boolean} opt.showModal Display a modal panel to warn the user
 * @return {Promise<Boolean>} Is the file below limit =
 */
export async function isUploadFileSizeValid(file, opt) {
  opt = Object.assign({}, { showModal: true }, opt);
  const sizeMax = settings.api.upload_size_max;
  const isFile = file instanceof File;
  const isData = file && !isFile;

  if (!isFile && !isData) {
    throw new Error("maxSizeFileTest : input is not a file or data");
  }

  const size = await getSizeOf(file, false);
  const sizeOk = size <= sizeMax;

  if (sizeOk) {
    return true;
  }

  if (opt.showModal) {
    const sizeHuman = formatByteSize(sizeMax);
    await modalDialog({
      title: elSpanTranslate("api_upload_file_max_size_exceeded_title"),
      id: "modal_max_size_exceeded",
      content: tt("api_upload_file_max_size_exceeded", {
        tooltip: false,
        data: { size: sizeHuman },
      }),
    });
  }
  return sizeOk;
}

/**
 * Upload source wrapper
 *
 * @param {Object} o Options
 * @param {String} o.idUser id of the user
 * @param {String} o.idProject id of the project
 * @param {String} o.token user token
 * @param {String} o.email user email
 * @param {String} o.title title of the source
 * @param {File} o.file Single file object
 * @param {Object|String} o.geojson GeoJSON data
 * @param {Node|String} o.selectorProgressContainer Selector or element where to put the progress bar container
 */
export async function uploadSource(o) {
  const isSizeValid = await isUploadFileSizeValid(o.file || o.geojson);
  let uploadDone = false;

  /*
   * Server will validate token of the user,
   * but we can avoid much trouble here
   */
  if (settings.user.guest) {
    return;
  }
  if (!isSizeValid) {
    return;
  }

  /**
   ** rebuilding formdata, as append seems to add value in UI...
   **/
  const host = getApiUrl("uploadVector");

  if (o.geojson) {
    o.geojson = isString(o.geojson) ? o.geojson : JSON.stringify(o.geojson);
    let filename = o.title;

    if (o.title.search(/.geojson$/) === -1) {
      filename = makeId(10) + ".geojson";
    }

    o.file = new File([o.geojson], filename, {
      type: "application/json",
    });
  }

  nc.panel.open();
  const route = getApiRoute("uploadSource");
  await uploader(o.file, route, { title: o.title });

  if (1 === 1) {
    return;
  }
  /*
   * create upload form
   */
  const form = new FormData();
  form.append("title", o.title);
  form.append("vector", o.file || o.geojson);
  form.append("token", o.token || settings.user.token);
  form.append("idUser", o.idUser || settings.user.id);
  form.append("email", o.email || settings.user.email);
  form.append("project", o.idProject || settings.project.id);
  form.append("sourceSrs", o.sourceSrs || "");

  /**
   * Create ui
   */
  const elOutput =
    o.selectorProgressContainer instanceof Node
      ? o.selectorProgressContainer
      : document.querySelector(o.selectorProgressContainer);

  /* log messages */
  let elProgressBar, elProgressMessage;

  const elProgressContainer = el(
    "div",
    /**
     * Progress bar
     */
    el("label", {
      dataset: { lang_key: "api_progress_title" },
    }),
    el(
      "div",
      {
        class: "mx-inline-progress-container",
      },
      (elProgressBar = el("div", {
        class: "mx-inline-progress-bar",
      }))
    ),
    /**
     * Message box
     */
    el("label", { dataset: { lang_key: "api_log_title" } }),
    el(
      "div",
      {
        class: ["form-control", "mx-logs"],
      },
      (elProgressMessage = el("ul"))
    )
  );

  elOutput.appendChild(elProgressContainer);
  updateTranslation();

  sendData({
    maxWait: 1e3 * 60 * 60,
    url: host,
    data: form,
    onProgress: function (progress) {
      cleanMsg(progress);
    },
    onMessage: function (data) {
      cleanMsg(data);
    },
    onSuccess: function (data) {
      cleanMsg(data);
    },
    onError: function (er) {
      cleanMsg(er);
    },
  });

  function updateTranslation() {
    updateLanguageElements({ el: elProgressContainer });
  }

  function updateLayerList() {
    Shiny.onInputChange("mx_client_update_source_list", {
      date: new Date() * 1,
    });
  }

  const messageStore = {};

  function cleanMsg(msg) {
    return handleRequestMessage(msg, messageStore, {
      end: function () {
        const li = el("li", {
          dataset: {
            lang_key: "api_upload_ready",
          },
          class: ["mx-log-item", "mx-log-green"],
        });
        elProgressMessage.appendChild(li);
        updateLayerList();
        updateTranslation();
      },
      error: function (msg) {
        const li = el(
          "li",
          {
            class: ["mx-log-item", "mx-log-red"],
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      message: function (msg) {
        const li = el(
          "li",
          {
            class: ["mx-log-item", "mx-log-blue"],
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      warning: function (msg) {
        const li = el(
          "li",
          {
            class: ["mx-log-item", "mx-log-orange"],
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      progress: function (progress) {
        elProgressBar.style.width = progress + "%";
        if (progress >= 99.9 && !uploadDone) {
          uploadDone = true;
          const li = el(
            "li",
            {
              class: ["mx-log-item", "mx-log-white"],
              dataset: {
                lang_key: "api_upload_done_wait_db",
              },
            },
            msg
          );
          elProgressMessage.appendChild(li);
          updateTranslation();
        }
      },
      default: function (msg) {
        if (msg && msg.length > 3) {
          const li = el(
            "li",
            {
              class: ["mx-log-item", "mx-log-gray"],
            },
            msg
          );
          elProgressMessage.appendChild(li);
        }
      },
    });
  }
}

async function uploader(file, route, config) {
  const data = await file.arrayBuffer();

  //const x = await new Blob([a, b]).arrayBuffer();

  let start, end;
  const idRequest = makeId(10);
  const n = data.byteLength;
  const sChunk = 1e6;
  const nChunk = Math.ceil(n / sChunk);
  let id = 0;

  for (let i = 0; i < nChunk; i++) {
    start = i * sChunk;
    end = (i + 1) * sChunk;

    const message = Object.assign(
      {},
      {
        idRequest: idRequest,
        id: id++,
        from: start,
        to: end,
        on: n,
        last: i === nChunk - 1,
        first: i === 0,
        data: data.slice(start, end),
        title: config.title,
        canceled: false,
        filename: file.name,
        mimetype: file.type,
        sourceSrs: 4326,
        language: settings.language,
      },
      config
    );

    ws.emit(route, message);
  }
}
