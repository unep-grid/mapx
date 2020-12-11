/* jshint esversion:6 */

export function triggerUploadForm(opt) {
  var el = mx.helpers.el;

  /*
   * Get elements
   */
  var elForm = document.getElementById(opt.idForm);
  var elTitle = elForm.querySelector('#txtUploadSourceFileName');
  var elEmail = elForm.querySelector('#txtEmailSourceUpload');
  var elButton = document.getElementById('btnSourceUpload');
  var elEpsgCode = elForm.querySelector('#epsgTextInput');
 
  /*
   * Create fake input
   */
  var elInput = el('input', {
    type: 'file',
    class: 'mx-hide',
    on: ['change', upload]
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
    elEmail.setAttribute('disabled', true);
    elTitle.setAttribute('disabled', true);
    elButton.setAttribute('disabled', true);
    elEpsgCode.setAttribute('disabled', true);

    /**
     * Get values
     */
    var title = elTitle.value;
    var file = elInput.files[0];
    var epsg = elEpsgCode.value + '';

    uploadSource({
      file: file,
      title: title,
      sourceSrs: epsg,
      selectorProgressContainer: elForm
    });
  }
}

export function uploadGeoJSONModal(idView) {
  var h = mx.helpers;
  var el = mx.helpers.el;

  mx.data.geojson.getItem(idView).then(function(item) {
    var geojson = mx.helpers.path(item, 'view.data.source.data');
    var title = mx.helpers.path(item, 'view.data.title.en');
    var hasIssue = false;
    if (!title) {
      title = idView;
    }
    if (!geojson) {
      return;
    }

    var elBtnUpload = el('buton', {
      class: 'btn btn-default',
      on: ['click', upload],
      dataset: {
        lang_key: 'btn_upload'
      }
    });

    var elInput = el('input', {
      class: 'form-control',
      id: 'txtInputSourceTitle',
      type: 'text',
      placeholder: 'Source title',
      value: title,
      on: ['input', validateTitle]
    });

    var elWarning = el('span');
    var elProgress = el('div');

    var elLabel = el('label', {
      dataset: {
        lang_key: 'src_upload_add'
      },
      for: 'txtInputSourceTitle'
    });

    var elFormGroup = el(
      'div',
      {
        class: 'form-group'
      },
      elLabel,
      elInput,
      elWarning,
      elProgress
    );

    var elFormUpload = el('div', elFormGroup);

    var elModal = h.modal({
      title: h.el('div', {
        dataset: {
          lang_key: 'src_upload_add'
        }
      }),
      content: elFormUpload,
      buttons: [elBtnUpload]
    });

    h.updateLanguageElements({
      el: elModal
    });

    function upload() {
      if (hasIssue) {
        return;
      }
      elBtnUpload.setAttribute('disabled', true);
      elBtnUpload.remove();
      uploadSource({
        title: elInput.value || title || idView,
        geojson: geojson,
        selectorProgressContainer: elProgress
      });
    }

    function validateTitle() {
      var title = elInput.value.trim();
      var v = mx.settings.validation.input.nchar;
      hasIssue = false;
      if (title.length < v.sourceTitle.min) {
        hasIssue = true;
        elWarning.innerText = 'Title too short';
      }
      if (title.length > v.sourceTitle.max) {
        hasIssue = true;
        elWarning.innerText = 'Title too long';
      }
      if (hasIssue) {
        elFormGroup.classList.add('has-error');
        elBtnUpload.setAttribute('disabled', true);
      } else {
        elBtnUpload.removeAttribute('disabled');
        elFormGroup.classList.remove('has-error');
        elWarning.innerText = '';
      }
    }
  });
}

/**
 * File size checker
 * @param {File||Object||String} file File or geojson to test
 * @param {Object} opt Options
 * @param {Boolean} opt.showModal Display a modal panel to warn the user
 * @return {Boolean} Is the file below limit =
 */
export function isUploadFileSizeValid(file, opt) {
  opt = Object.assign({}, {showModal: true}, opt);
  const h = mx.helpers;
  const sizeMax = mx.settings.api.upload_size_max;
  const isFile = file instanceof File;
  const isData = file && !isFile;

  if (!isFile && !isData) {
    throw new Error('maxSizeFileTest : input is not a file or data');
  }

  return h.getSizeOf(file, false).then((size) => {
    let sizeOk = size <= sizeMax;
    if (!sizeOk) {
      if (opt.showModal) {
        const elMessage = h.el('span');
        const sizeHuman = h.formatByteSize(sizeMax);
        const modal = h.modal({
          id: 'modal_max_size_exceeded',
          content: elMessage
        });
        h.getDictItem([
          'api_upload_file_max_size_exceeded',
          'api_upload_file_max_size_exceeded_title'
        ]).then((items) => {
          elMessage.innerText = h.parseTemplate(items[0], {size: sizeHuman});
          modal.setTitle(items[1]);
        });
      }
    }
    return sizeOk;
  });
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
export function uploadSource(o) {
  const h = mx.helpers;
  const el = h.el;
  var uploadDone = false;

  return isUploadFileSizeValid(o.file || o.geojson).then((isSizeValid) => {

    /* Server will validate token,
     * but we can avoid much trouble here
     */
    if (mx.settings.user.guest) {
      return;
    }
    if (!isSizeValid) {
      return;
    }

    /**
     ** rebuilding formdata, as append seems to add value in UI...
     **/
    var host = h.getApiUrl('uploadVector');

    if (o.geojson) {
      o.geojson = h.isString(o.geojson) ? o.geojson : JSON.stringify(o.geojson);
      var filename = o.title;

      if (o.title.search(/.geojson$/) === -1) {
        filename = h.makeId(10) + '.geojson';
      }

      o.file = new File([o.geojson], filename, {
        type: 'application/json'
      });
    }

    /*
     * create upload form
     */
    var form = new FormData();
    form.append('title', o.title);
    form.append('vector', o.file || o.geojson);
    form.append('token', o.token || mx.settings.user.token);
    form.append('idUser', o.idUser || mx.settings.user.id);
    form.append('email', o.email || mx.settings.user.email);
    form.append('project', o.idProject || mx.settings.project.id);
    form.append('sourceSrs', o.sourceSrs || '');

    /**
     * Create ui
     */
    var elOutput =
      o.selectorProgressContainer instanceof Node
      ? o.selectorProgressContainer
      : document.querySelector(o.selectorProgressContainer);

    /* log messages */
    var elLogLabel,
      elProgressBar,
      elProgressBarContainer,
      elProgressLabel,
      elProgressMessage,
      elProgressMessageContainer;

    var elProgressContainer = el(
      'div',
      /**
       * Progress bar
       */
      (elProgressLabel = el('label', {
        dataset: {lang_key: 'api_progress_title'}
      })),
      (elProgressBarContainer = el(
        'div',
        {
          class: 'mx-inline-progress-container'
        },
        (elProgressBar = el('div', {
          class: 'mx-inline-progress-bar'
        }))
      )),
      /**
       * Message box
       */
      (elLogLabel = el('label', {dataset: {lang_key: 'api_log_title'}})),
      (elProgressMessageContainer = el(
        'div',
        {
          class: ['form-control', 'mx-logs']
        },
        (elProgressMessage = el('ul'))
      ))
    );

    elOutput.appendChild(elProgressContainer);
    updateTranslation();

    mx.helpers.sendData({
      maxWait: 1e3 * 60 * 60,
      url: host,
      data: form,
      onProgress: function(progress) {
        cleanMsg(progress);
      },
      onMessage: function(data) {
        cleanMsg(data);
      },
      onSuccess: function(data) {
        cleanMsg(data);
      },
      onError: function(er) {
        cleanMsg(er);
      }
    });



    function updateTranslation() {
      h.updateLanguageElements({el: elProgressContainer});
    }

    function updateLayerList() {
      Shiny.onInputChange('mx_client_update_source_list', {
        date: new Date() * 1
      });
    }

    var messageStore = {};

    function cleanMsg(msg) {
      return mx.helpers.handleRequestMessage(msg, messageStore, {
        end: function() {
          var li = el('li', {
            dataset: {
              lang_key: 'api_upload_ready'
            },
            class: ['mx-log-item', 'mx-log-green']
          });
          elProgressMessage.appendChild(li);
          updateLayerList();
          updateTranslation();
        },
        error: function(msg) {
          var li = el(
            'li',
            {
              class: ['mx-log-item', 'mx-log-red']
            },
            msg
          );
          elProgressMessage.appendChild(li);
        },
        message: function(msg) {
          var li = el(
            'li',
            {
              class: ['mx-log-item', 'mx-log-blue']
            },
            msg
          );
          elProgressMessage.appendChild(li);
        },
        warning: function(msg) {
          var li = el(
            'li',
            {
              class: ['mx-log-item', 'mx-log-orange']
            },
            msg
          );
          elProgressMessage.appendChild(li);
        },
        progress: function(progress) {
          elProgressBar.style.width = progress + '%';
          if (progress >= 99.9 && !uploadDone) {
            uploadDone = true;
            var li = el(
              'li',
              {
                class: ['mx-log-item', 'mx-log-white'],
                dataset: {
                  lang_key: 'api_upload_done_wait_db'
                }
              },
              msg
            );
            elProgressMessage.appendChild(li);
            updateTranslation();
          }
        },
        default: function(msg) {
          if (msg && msg.length > 3) {
            var li = el(
              'li',
              {
                class: ['mx-log-item', 'mx-log-gray']
              },
              msg
            );
            elProgressMessage.appendChild(li);
          }
        }
      });
    }

  });
}
