import {
  getDict,
  getLanguageCurrent,
  updateLanguageElements,
} from "./../language";
import { isEmpty, isFunction, isObject } from "./../is_test_mapx";
import { el } from "../el/src/index.js";
import {
  clone,
  formatByteSize,
  getSizeOf,
  isShinyReady,
} from "./../mx_helper_misc.js";
import { getViewJson } from "./../map_helpers/index.js";
import { getViewMapboxStyle, getViewSldStyle } from "./../style_vt/index.js";
import { settings, data as mx_storage } from "./../mx.js";
import { moduleLoad } from "../modules_loader_async";
import { modalSimple } from "../mx_helper_modal";
import { jsonDiff } from "../mx_helper_utils_json";
import "./style.less";
import "./../../css/mx_tom_select.css";

export const jed = {
  editors: {},
  helper: {},
  monacoEditors: [],
  extend: {
    position: {},
    texteditor: {},
  },
};

window.jed = jed;

/**
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.schema JSON schema to render
 * @param {Object} o.startVal JSON of initial values
 * @param {Object} o.options JSONEditor options
 */
export async function jedInit(o) {
  const dict = await getDictJsonEditorDict();
  const { JSONEditor } = await moduleLoad("json-editor");
  const id = o.id;
  const schema = o.schema;
  const startVal = o.startVal;
  const options = o.options;

  if (dict) {
    JSONEditor.defaults.languages = dict;
  }

  JSONEditor.defaults.language = getLanguageCurrent();

  const elJed = o.target || document.getElementById(id);
  let draftLock = true;
  let draftDbTimeStamp = 0;
  let idDraft;

  if (!elJed) {
    console.warn(`jed element ${id} not found`);
    return;
  }

  const opt_final = {};

  // opt can't be changed after instantiation.
  const opt = {
    ajax: true,
    theme: "bootstrap3",
    iconlib: "bootstrap3",
    disable_collapse: false,
    disable_properties: true,
    disableSelectize: false,
    disable_edit_json: false,
    required_by_default: true,
    show_errors: "always",
    no_additional_properties: true,
    prompt_before_delete: false,
    schema: schema,
    startval: startVal,
    draftAutoSaveEnable: false,
    draftAutoSaveId: null,
    draftTimestamp: null,
    getValidationOnChange: false,
    getValuesOnChange: false,
    hooksOnGet: [],
  };

  Object.assign(opt_final, opt, options);

  if (opt_final.draftAutoSaveId && opt_final.draftAutoSaveDbTimestamp) {
    idDraft = id + "@" + opt_final.draftAutoSaveId;
    draftDbTimeStamp = opt_final.draftAutoSaveDbTimestamp;
  }

  /*
   * legacy option
   * JSONEditor.plugins.selectize.enable = !opt_final.disableSelectize;
   */

  /**
   * Remove old editor if already exists
   */
  if (jed.editors[id] && isFunction(jed.editors[id].destroy)) {
    jed.editors[id].destroy();
  }
  /**
   * Create new editor
   */
  elJed.innerHTML = "";
  elJed.dataset.jed_id = id;
  const editor = new JSONEditor(elJed, opt_final);
  jed.editors[id] = editor;

  

  /**
   * Translate not available in custom validator (not binded)..
   * we set one globaly here in jed object. Used in e.g. ./validation.js
   */
  if (!jed.helper.translate) {
    jed.helper.translate = editor.translate;
  }

  /**
   * Test for readyness
   */
  editor.on("ready", async function () {
    const hasShiny = isShinyReady();
    /**
     * Auto save draft
     */
    if (idDraft) {
      try {
        const draft = await mx_storage.draft.getItem(idDraft);
        draftLock = false;
        if (!draft || draft.type !== "draft") {
          return;
        }
        const draftClientTimeStamp = draft.timestamp;
        // add 5 sec margin
        const moreRecent = draftClientTimeStamp > draftDbTimeStamp;

        if (moreRecent) {
          await jedShowDraftRecovery({
            editor: editor,
            idDraft: idDraft,
            timeDb: opt_final.draftAutoSaveDbTimestamp,
            draft: draft,
            saved: opt_final.startval,
          });
        }
      } catch (e) {
        draftLock = false;
        throw new Error(e);
      }
    }
    /**
     * Report ready state to shiny
     */
    if (hasShiny) {
      Shiny.onInputChange(id + "_ready", new Date());
    } else {
      console.log(id + "_ready");
    }
  });

  /**
   * On editor change
   */
  editor.on("change", async function () {
    if (idDraft && !draftLock) {
      const data = editor.getValue();
      await mx_storage.draft.setItem(idDraft, {
        type: "draft",
        timestamp: Math.round(Date.now() / 1000),
        data: data,
      });
    }

    /**
     * Set custom ui classes for errors
     */
    jedAddAncestorErrors(editor);
    jedValidateSize(editor);
    if (opt_final.getValidationOnChange) {
      /**
       * Continous validation transfer on input
       */
      jedGetValidationById({ id: id, idEvent: "change" });
    }
    if (opt_final.getValuesOnChange) {
      /**
       * Continous data transfer on input
       */
      jedGetValuesById({ id: id, idEvent: "change" });
    }
  });

  return editor;
}

async function jedValidateSize(editor) {
  /**
   * Test size
   */
  const values = editor.getValue();
  const size = await getSizeOf(values, false);

  if (size <= settings.maxByteJed) {
    return;
  }
  const sizeReadable = formatByteSize(size);
  modalSimple({
    addBackground: true,
    id: "warningSize",
    title: `Warning : size greater than ${settings.maxByteJed} ( ${sizeReadable} )`,
    content: el(
      "b",
      "Warning: this form data is too big. Please remove unnecessary item(s) and/or source data (images, binary files) from a dedicated server.",
    ),
  });
}

/**
 * Add jed-error class to all ancestor of issue's element
 * @param {Object} editor json-editor
 */
function jedAddAncestorErrors(editor) {
  const elEditor = editor.element;
  const elsJedError = elEditor.querySelectorAll(".jed-error");

  for (let i = 0; i < elsJedError.length; i++) {
    elsJedError[i].classList.remove("jed-error");
  }

  const valid = editor.validate();
  const issueLength = valid.length;

  if (issueLength > 0) {
    valid.forEach((v) => {
      const p = v.path.split(".");
      const pL = p.length;
      for (let k = 0; k < pL; k++) {
        const elError = elEditor.querySelector(
          "[data-schemapath='" + p.join(".") + "']",
        );
        if (elError) {
          elError.classList.add("jed-error");
        }
        p.pop();
      }
    });
  }
}

/**
 * Get jed editors
 * @returns {Object} editors
 */
export function jedEditors() {
  return jed.editors;
}

/** Remove draft
 * @param {Object} o options
 * @param {String} o.id Id of the editor
 * @param {Object} o.idItem id of the item to remove
 */
export async function jedRemoveDraft(o) {
  const idEditor = o.id;
  const idItem = o.idItem;
  const idDraft = idEditor + "@" + idItem;
  await mx_storage.draft.removeItem(idDraft);
  console.log("item " + idDraft + "removed from mx_storage.draft");
}

/** Update jed editor
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.val JSON of initial values
 */
export function jedUpdate(o) {
  const id = o.id;
  const val = o.val;
  const editor = jed.editors[id];
  if (editor) {
    editor.setValue(val);
  }
}

/**
 * Get jed editor value
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export async function jedGetValuesById(o) {
  const id = o.id;
  const editor = jed.editors[id];
  const hasShiny = isShinyReady();
  const hasJed = isObject(jed);
  if (!hasJed) {
    return;
  }
  const values = {
    data: editor.getValue(),
    time: Date.now(),
    idEvent: o.idEvent,
  };
  if (values && hasShiny) {
    /**
     * Apply value transform on get values
     */
    const hasHooks = !isEmpty(editor.options.hooksOnGet);
    if (hasHooks) {
      await jedHooksApply(values, editor.options.hooksOnGet);
    }
    Shiny.onInputChange(id + "_values", values);
  } else {
    return values;
  }
}

/** Get jed editor validation
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export function jedGetValidationById(o) {
  const id = o.id;
  const editor = jed.editors[id];
  const hasJed = isObject(editor);
  const hasShiny = isShinyReady();
  if (!hasJed) {
    return;
  }
  const valid = {
    data: editor.validate(),
    time: Date.now(),
    idEvent: o.idEvent,
  };
  if (hasShiny) {
    Shiny.onInputChange(id + "_issues", valid);
  } else {
    return values;
  }
}
/** Show recovery panel
 * @param {Object} o options
 * @param {Object} o.editor Editor
 * @param {String} o.idDraft Id of the draft
 * @param {Object} o.draft draft to recover
 * @param {Object} o.saved data provided from db
 * @param {Number} o.timeDb Posix time stamp of the db version
 */
async function jedShowDraftRecovery(o) {
  const { draft, editor, saved, timeDb } = o;

  if (isEmpty(draft) || draft.type !== "draft") {
    throw new Error({
      msg: "Invalid draft",
      data: o.draft,
    });
  }

  const recoveredData = draft.data;
  const dbData = saved;
  const dateTimeDb = formatDateTime(timeDb);
  const dateTimeBrowser = formatDateTime(draft.timestamp);

  const diff = await getDiff();
  const hasEmptyDiff = isEmpty(diff);
  if (hasEmptyDiff) {
    return;
  }

  const btnYes = el("button", {
    type: "button",
    class: ["btn", "btn-default"],
    on: ["click", restore],
    dataset: {
      lang_key: "draft_recover_use_most_recent",
    },
  });

  const btnDiffData = el("button", {
    type: "button",
    class: ["btn", "btn-default"],
    on: ["click", previewDiff],
    dataset: {
      lang_key: "draft_recover_preview_diff",
    },
  });

  let elData;

  const modal = modalSimple({
    addBackground: true,
    id: "modalDataRecovery",
    title: el("span", { dataset: { lang_key: "draft_recover_modal_title" } }),
    buttons: [btnYes, btnDiffData],
    textCloseButton: el("span", {
      dataset: { lang_key: "draft_recover_cancel" },
    }),
    content: el(
      "div",
      el("h3", {
        dataset: {
          lang_key: "draft_recover_summary_title",
        },
      }),
      el(
        "p",
        el(
          "ul",
          el(
            "li",
            el("span", {
              dataset: { lang_key: "draft_recover_last_saved_date" },
            }),
            el("span", ": " + dateTimeDb),
          ),
          el(
            "li",
            el("span", {
              dataset: { lang_key: "draft_recover_recovered_date" },
            }),
            el("span", ": " + dateTimeBrowser),
          ),
        ),
        (elData = el("div")),
      ),
    ),
  });

  updateLanguageElements({
    el: modal,
  });

  async function getDiff() {
    const config = {
      propertyFilter: filter,
    };
    const data = await jsonDiff(dbData, recoveredData, config);
    return data;
    function filter(name) {
      const firstChar = name.slice(0, 1);
      /**
       * Set of known key that should not be used in diff
       */
      return name !== "spriteEnable" && firstChar !== "_" && firstChar !== "$";
    }
  }

  async function previewDiff() {
    const elItem = el("div", {
      class: ["mx-diff-item"],
    });
    elData.innerHTML = "";
    elData.classList.add("mx-diff-items");
    elData.appendChild(
      el("h3", el("span", { dataset: { lang_key: "draft_recover_diffs" } })),
    );
    elData.appendChild(elItem);
    const html = await jsonDiff(dbData, recoveredData, {
      toHTML: true,
      propertyFilter: function (name) {
        const firstChar = name.slice(0, 1);
        /**
         * Set of known key that should not be used in diff
         */
        return (
          name !== "spriteEnable" && firstChar !== "_" && firstChar !== "$"
        );
      },
    });
    elItem.innerHTML = html;
  }

  function restore() {
    delete recoveredData._timestamp;
    editor.setValue(recoveredData);
    modal.close();
  }
}

function formatDateTime(posix) {
  const d = new Date(posix * 1000);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString();
  return date + " at " + time;
}

/**
 * Translate MapX to JSONEditor dict
 *
 * @return {Promise} resolve to JSONEditor dict
 */
async function getDictJsonEditorDict() {
  const out = {};
  const lang = getLanguageCurrent();
  const dict = await getDict(lang);
  /**
   * For each item
   */

  for (let d of dict) {
    let k = d.id;
    /**
     * For each language
     */

    for (let l in d) {
      if (l === "id") {
        continue;
      }
      if (!out[l]) {
        out[l] = {};
      }
      out[l][k] = d[l];
    }
  }
  return out;
}

/**
 * View save, convert style
 */
async function jedHooksApply(value, hooks) {
  try {
    for (const hook of hooks) {
      switch (hook?.id) {
        case "view_style_add_sld":
          /*
           * NOTE: should match ws_handler job 'job_style_convert'
           * - Clone view for json ( clone + subset + strip local ref and circular ref )
           * - Overwrite cloned view style
           * - Get a clean mapbox style
           * - Get a sld compatible style
           * - Convert to sld
           * - Keep a reference  to _style_sld and _style_mapbox
           */
          const idView = hook.idView;
          const view = getViewJson(idView, { asString: false });
          /* NOTE: value.data becomes view's style. Clone to avoid altering editor value */
          view.data.style = Object.assign({}, clone(value.data));
          value._style_mapbox = await getViewMapboxStyle(view);
          /* if custom style, null */
          value._style_sld = await getViewSldStyle(view);

        default:
          null;
      }
    }
  } catch (e) {
    console.warn(e);
  }
}
