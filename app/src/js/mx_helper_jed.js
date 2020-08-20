/*jshint esversion: 6 , node: true */

/**
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.schema JSON schema to render
 * @param {Object} o.startVal JSON of initial values
 * @param {Object} o.options JSONEditor options
 */
export function jedInit(o) {
  var h = mx.helpers;

  return Promise.all([
    getDictJsonEditorDict(),
    h.moduleLoad('json-editor')
  ]).then((m) => {
    var dict = m[0];
    var id = o.id;
    var schema = o.schema;
    var startVal = o.startVal;
    var options = o.options;
    var JSONEditor = window.JSONEditor;
    if (dict) {
      JSONEditor.defaults.languages = dict;
    }
    JSONEditor.defaults.language = mx.settings.language;
    var el = document.getElementById(id);
    var idDraft;
    var draftLock = true;
    var draftDbTimeStamp = 0;

    var jed = window.jed;

    if (!el) {
      console.warn(`jed element ${id} not found`);
      return;
    }

    if (!jed) {
      window.jed = jed = {
        editors: {},
        helper: {},
        extend: {
          position: {},
          texteditor: {}
        }
      };
    }

    var opt_final = {};

    if (!options) {
      options = {};
    }

    // opt can't be changed after instantiation.
    var opt = {
      ajax: true,
      theme: 'bootstrap3',
      iconlib: 'bootstrap3',
      disable_collapse: false,
      disable_properties: true,
      disableSelectize: false,
      disable_edit_json: false,
      required_by_default: true,
      show_errors: 'always',
      no_additional_properties: true,
      schema: schema,
      startval: startVal,
      draftAutoSaveEnable: false,
      draftAutoSaveId: null,
      draftTimestamp: null,
      getValidationOnChange: false,
      getValuesOnChange: false
    };

    opt_final = Object.assign({},opt, options);

    if (opt_final.draftAutoSaveId && opt_final.draftAutoSaveDbTimestamp) {
      idDraft = id + '@' + opt_final.draftAutoSaveId;
      draftDbTimeStamp = opt_final.draftAutoSaveDbTimestamp;
    }

    JSONEditor.plugins.ace.theme = 'github';
    JSONEditor.plugins.selectize.enable = !opt_final.disableSelectize;

    /**
     * Remove old editor if already exists
     */
    if (jed.editors[id] && h.isFunction(jed.editors[id].destroy)) {
      jed.editors[id].destroy();
    }
    /**
     * Create new editor
     */
    el.innerHTML = '';
    el.dataset.jed_id = id;
    var editor = new JSONEditor(el, opt_final);

    /**
     * Test for readyness
     */
    editor.on('ready', function() {
      jed.editors[id] = editor;


      /**
       * Auto save draft
       */
      if (idDraft) {
        mx.data.draft
          .getItem(idDraft)
          .then((draft) => {
            draftLock = false;
            if (!draft || draft.type !== 'draft') {
              return;
            }
            var draftClientTimeStamp = draft.timestamp;
            var moreRecent = draftClientTimeStamp > draftDbTimeStamp;

            if (moreRecent) {
              jedShowDraftRecovery({
                id: id,
                idDraft: idDraft,
                timeDb: opt_final.draftAutoSaveDbTimestamp,
                draft: draft,
                saved: opt_final.startval
              });
            }
          })
          .catch((e) => {
            draftLock = false;
            throw new Error(e);
          });
      }
      /**
       * Report ready state to shiny
       */
      if (window.Shiny) {
        Shiny.onInputChange(id + '_ready', new Date());
      } else {
        console.log(id + '_ready');
      }
    });

    /**
     * On editor change
     */
    editor.on('change', function() {
      if (idDraft && !draftLock) {
        var data = editor.getValue();
        mx.data.draft
          .setItem(idDraft, {
            type: 'draft',
            timestamp: Math.round(Date.now() / 1000),
            data: data
          })
          .then(() => {
            //console.log( "Auto save " + idDraft );
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
        jedGetValidationById({id: id, idEvent: 'change'});
      }
      if (opt_final.getValuesOnChange) {
        /**
         * Continous data transfer on input
         */
        jedGetValuesById({id: id, idEvent: 'change'});
      }
    });
  });
}

function jedValidateSize(editor) {
  /**
   * Test size
   */
  const h = mx.helpers;
  var values = editor.getValue();

  return h.getSizeOf(values, false)
    .then(function(size) {
      if (size > mx.settings.maxByteJed) {
        var sizeReadable = h.formatByteSize(size);
        h.modal({
          addBackground: true,
          id: 'warningSize',
          title:
          'Warning : size greater than ' +
          mx.settings.maxByteJed +
          ' ( ' +
          sizeReadable +
          ')',
          content: h.el(
            'b',
            'Warning: this form data is too big. Please remove unnecessary item(s) and/or source data (images, binary files) from a dedicated server.'
          )
        });
      }
    });
}

/**
 * Add jed-error class to all ancestor of issue's element
 * @param {Object} editor json-editor
 */
function jedAddAncestorErrors(editor) {
  var elEditor = editor.element;
  var elsJedError = elEditor.querySelectorAll('.jed-error');

  for (var i = 0; i < elsJedError.length; i++) {
    elsJedError[i].classList.remove('jed-error');
  }

  var valid = editor.validate();
  var issueLength = valid.length;

  if (issueLength > 0) {
    valid.forEach((v) => {
      var p = v.path.split('.');
      var pL = p.length;
      for (var k = 0; k < pL; k++) {
        var elError = elEditor.querySelector(
          "[data-schemapath='" + p.join('.') + "']"
        );
        if (elError) {
          elError.classList.add('jed-error');
        }
        p.pop();
      }
    });
  }
}
/** Remove draft
 * @param {Object} o options
 * @param {String} o.id Id of the editor
 * @param {Object} o.idItem id of the item to remove
 */
export function jedRemoveDraft(o) {
  var idEditor = o.id;
  var idItem = o.idItem;
  var idDraft = idEditor + '@' + idItem;
  mx.data.draft.removeItem(idDraft).then(() => {
    console.log('item ' + idDraft + 'removed from mx.data.draft');
  });
}

/** Update jed editor
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.val JSON of initial values
 */
export function jedUpdate(o) {
  var id = o.id;
  var val = o.val;
  var jed = mx.helpers.path(window, 'jed.editors.' + id);
  if (jed) {
    jed.setValue(val);
  }
}

/** Get jed editor value
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export function jedGetValuesById(o) {
  var id = o.id;
  var jed = mx.helpers.path(window, 'jed.editors.' + id);
  if (jed) {
    var values = {
      data: jed.getValue(),
      time: Date.now(),
      idEvent: o.idEvent
    };
    if (values && window.Shiny) {
      Shiny.onInputChange(id + '_values', values);
    } else {
      return values;
    }
  }
}

/** Get jed editor validation
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export function jedGetValidationById(o) {
  var id = o.id;
  var jed = mx.helpers.path(window, 'jed.editors.' + id);
  if (jed) {
    var valid = {
      data: jed.validate(),
      time: Date.now(),
      idEvent: o.idEvent
    };
    if (window.Shiny) {
      Shiny.onInputChange(id + '_issues', valid);
    } else {
      return values;
    }
  }
}
/** Show recovery panel
 * @param {Object} o options
 * @param {String} o.id Id of the editor
 * @param {String} o.idDraft Id of the draft
 * @param {Object} o.draft draft to recover
 * @param {Object} o.saved data provided from db
 * @param {Number} o.timeDb Posix time stamp of the db version
 */
function jedShowDraftRecovery(o) {
  const h = mx.helpers;
  const el = h.el;

  if (!o.draft || o.draft.type !== 'draft') {
    throw new Error({
      msg: 'Invalid draft',
      data: o.draft
    });
  }

  var jed = h.path(window, 'jed.editors.' + o.id);
  var recoveredData = o.draft.data;
  var dbData = o.saved;
  var dateTimeDb = formatDateTime(o.timeDb);
  var dateTimeBrowser = formatDateTime(o.draft.timestamp);

  var btnYes = el('button', {
    type: 'button',
    class: ['btn', 'btn-default'],
    on: ['click', restore],
    dataset: {
      lang_key: 'draft_recover_use_most_recent'
    }
  });

  var btnDiffData = el('button', {
    type: 'button',
    class: ['btn', 'btn-default'],
    on: ['click', previewDiff],
    dataset: {
      lang_key: 'draft_recover_preview_diff'
    }
  });

  var elData;
  var modal = h.modal({
    addBackground: true,
    id: 'modalDataRecovery',
    title: h.el('span', {dataset: {lang_key: 'draft_recover_modal_title'}}),
    buttons: [btnYes, btnDiffData],
    textCloseButton: el('span', {dataset: {lang_key: 'draft_recover_cancel'}}),
    content: el(
      'div',
      el('h3', {
        dataset: {
          lang_key: 'draft_recover_summary_title'
        }
      }),
      el(
        'p',
        el(
          'ul',
          el(
            'li',
            el('span', {dataset: {lang_key: 'draft_recover_last_saved_date'}}),
            el('span', ': ' + dateTimeDb)
          ),
          el(
            'li',
            el('span', {
              dataset: {lang_key: 'draft_recover_recovered_date'}
            }),
            el('span', ': ' + dateTimeBrowser)
          )
        ),
        (elData = el('div'))
      )
    )
  });

  h.updateLanguageElements({
    el: modal
  });

  function previewDiff() {
    var elItem = el('div', {
      class: ['mx-diff-item']
    });
    elData.innerHTML = '';
    elData.classList.add('mx-diff-items');
    elData.appendChild(
      el('h3', el('span', {dataset: {lang_key: 'draft_recover_diffs'}}))
    );
    elData.appendChild(elItem);

    h.jsonDiff(dbData, recoveredData, {
      toHTML: true,
      propertyFilter: function(name) {
        var firstChar = name.slice(0, 1);
        /**
         * Set of known key that should not be used in diff
         */
        return (
          name !== 'spriteEnable' && firstChar !== '_' && firstChar !== '$'
        );
      }
    }).then((html) => {
      elItem.innerHTML = html;
    });
  }

  function restore() {
    delete recoveredData._timestamp;
    jed.setValue(recoveredData);
    modal.close();
  }
}

function formatDateTime(posix) {
  var d = new Date(posix * 1000);
  var date = d.toLocaleDateString();
  var time = d.toLocaleTimeString();
  return date + ' at ' + time;
}

/**
 * Translate MapX to JSONEditor dict
 *
 * @return {Promise} resolve to JSONEditor dict
 */
function getDictJsonEditorDict() {
  const h = mx.helpers;
  var out = {};
  return h.getDict(mx.settings.language).then((dict) => {
    dict.forEach((d) => {
      var k = d.id;
      Object.keys(d).forEach((l) => {
        if (l === 'id') {
          return;
        }
        if (!out[l]) {
          out[l] = {};
        }
        out[l][k] = d[l];
      });
    });
    return out;
  });
}
